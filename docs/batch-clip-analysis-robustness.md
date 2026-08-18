# Robustețe pentru `batch_clip_analysis.py`

## NOT IMPLEMENTED YET
## Context

Rularea în masă a analizei de clipuri peste cei 38 de creatori a scos la iveală trei fragilități în
[batch_clip_analysis.py](../ai-service/scripts/batch_clip_analysis.py):

1. **Un link mort omoară tot batch-ul creatorului.** `download_missing()` (liniile 119-133) apelează
   `yt-dlp` o singură dată cu *toate* URL-urile și `check=True`. yt-dlp continuă peste link-ul stricat,
   dar iese cu cod 1 → `CalledProcessError` → `run()` crapă *înainte* de `ensure_clip_rows()` și de faza
   de analiză. La **Larisa Travel** două clipuri se descărcaseră deja cu succes, dar nu au mai fost
   analizate deloc din cauza celui de-al treilea (404).

2. **Erorile tranzitorii de rețea nu sunt reîncercate.** `_analyze_with_retry()` (liniile 183-196)
   prinde doar `APIError` și reîncearcă la cod ≥ 500. Un `BrokenPipeError` (`[Errno 32]`, subclasă de
   `OSError`) nu e `APIError`, deci trece direct la `except Exception` din `_process_one()` și clipul e
   marcat FAILED fără nicio reîncercare — exact ce s-a întâmplat la **Daiana Caragioiu**, unde o simplă
   re-rulare manuală a mers din prima.

3. **Re-rulările produc analize duplicate.** `ClipAnalyses` e append-only prin design în backend
   ([CreatorService.cs:95](../backend/src/Vira.Application/Services/CreatorService.cs#L95)), deci fiecare
   reluare adaugă încă un rând. În baza de date există acum 7 clipuri cu câte 2 analize (Valy Adrian ×3,
   Theo Zeciu ×2, Daiana Caragioiu ×2), rezultate din reîncercări.

**Rezultatul dorit:** un clip problematic degradează doar propriul rezultat, nu întregul creator; erorile
de rețea trecătoare se auto-repară; iar o re-rulare nu costă apeluri Gemini inutile și nu murdărește baza.

**Atenție la o capcană:** momentan crash-ul de la punctul 1 *previne accidental* inserarea de rânduri
orfane în `CreatorClips` — la Larisa Travel link-ul mort nu a primit rând tocmai pentru că scriptul a
murit înainte de `ensure_clip_rows()`. Dacă facem doar download-ul tolerant, fără să filtrăm și inserarea,
am *începe* să creăm clipuri fantomă (rând în profil, URL 404, nicio analiză). Cele două modificări merg
obligatoriu împreună.

## Modificări

Toate în `ai-service/scripts/batch_clip_analysis.py` (fișier untracked în git).

### 1. Download tolerant la erori parțiale

În `download_missing()`:
- Scoate `check=True` și adaugă `--ignore-errors` la argumentele yt-dlp, ca un link stricat să nu mai
  ridice excepție.
- Păstrează *o singură* eroare fatală: `FileNotFoundError` de la `subprocess.run` (yt-dlp neinstalat) →
  re-ridicat ca `RuntimeError` cu mesaj clar. Asta e o problemă de mediu, nu de date.

### 2. Partiționare în `run()`: ce s-a descărcat vs. ce nu

După `download_missing(links)`, împarte lista folosind helper-ul existent `_video_path()` (liniile 135-140):

```python
available = [l for l in links if self._video_path(l.tiktok_video_id) is not None]
unavailable = [l for l in links if self._video_path(l.tiktok_video_id) is None]
```

- `ensure_clip_rows(available)` — **doar** clipurile descărcate primesc rând în `CreatorClips`. Un link
  mort nu atinge deloc baza de date (decizia confirmată: skip complet).
- `unavailable` se raportează ca `[SKIPPED] <id>: could not download` și intră în sumarul final.
- Faza de analiză procesează doar `available`.

Sumarul devine ceva de forma `{ok}/{total} clips analyzed and sent ({n} skipped: could not download)`,
iar `main()` iese cu cod 1 dacă a existat cel puțin un eșec real — util pentru orchestrarea în shell,
unde acum totul iese 0 indiferent de rezultat.

### 3. Reîncercare pe erori tranzitorii de rețea

Înlocuiește predicatul din `_analyze_with_retry()` cu un helper explicit, păstrând regula existentă
„4xx nu se reîncearcă":

```python
def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, APIError):
        return exc.code is not None and exc.code >= 500
    return isinstance(exc, (OSError, httpx.TransportError))
```

- `OSError` acoperă `BrokenPipeError`, `ConnectionResetError` și `TimeoutError` (inclusiv cel ridicat de
  `_wait_until_active` din [ai_client.py:119-128](../ai-service/app/ai_client.py#L119-L128)).
- `httpx.TransportError` acoperă `ConnectError` / `ReadError` / `RemoteProtocolError` / `PoolTimeout`.
  `httpx` e deja dependință (`requirements.txt:6`), deci doar un `import httpx` în plus.

Backoff-ul exponențial cu jitter existent (`_GEMINI_RETRY_BASE_SECONDS`, liniile 60-61) rămâne neschimbat.

> Notă: nu pot demonstra că broken pipe-ul a venit din `GeminiClient`-ul partajat între cele 3 fire
> (`run()`, linia 221). Reîncercarea rezolvă simptomul cu certitudine; dacă erorile persistă, pasul
> următor ar fi un client per fir prin `threading.local()`.

### 4. Flag `--skip-analyzed` (implicit oprit)

Metodă nouă `already_analyzed_ids() -> set[str]`, același tipar psycopg2 ca `ensure_clip_rows()`:

```sql
SELECT cc."TikTokVideoId"
FROM "CreatorClips" cc
JOIN "ClipAnalyses" ca ON ca."ClipId" = cc."Id"
WHERE cc."CreatorId" = %s
```

Când flag-ul e activ, clipurile din acest set se scot din `available` și se raportează ca
`[SKIPPED] <id>: already analyzed`. Default-ul rămâne comportamentul actual (re-analizează), deci nimic
nu se schimbă pentru rulările existente — flag-ul e pentru reluarea unui batch după o eroare, fără să
plătești Gemini din nou. Se adaugă în `main()` la argparse (liniile 237-243).

### 5. Curățare duplicate existente în bază

O singură comandă, prin MCP-ul Postgres, care păstrează analiza cea mai recentă per clip:

```sql
DELETE FROM "ClipAnalyses"
WHERE "Id" IN (
  SELECT "Id" FROM (
    SELECT "Id", ROW_NUMBER() OVER (
      PARTITION BY "ClipId" ORDER BY "AnalyzedAt" DESC, "CreatedAt" DESC
    ) AS rn
    FROM "ClipAnalyses"
  ) t WHERE t.rn > 1
);
```

Trebuie să șteargă exact **7 rânduri**. Verific numărătoarea înainte și după.

## Verificare

1. **Link mort nu mai omoară batch-ul** — re-rulează Larisa Travel pe fișierul original de link-uri
   (`samples/video-links.txt`, liniile 73-75, unde `7371822245141892384` e 404):
   `python scripts/batch_clip_analysis.py 1e358bcd-7646-4312-8e38-493a9a58d707 "Larisa Travel"`
   Așteptat: 2 clipuri OK, 1 SKIPPED, exit code 1, și **niciun** rând nou în `CreatorClips` pentru
   id-ul mort (confirm prin MCP).

2. **Idempotență** — aceeași comandă cu `--skip-analyzed`: toate clipurile raportate ca
   `already analyzed`, zero apeluri Gemini, zero rânduri noi în `ClipAnalyses`.

3. **Fără duplicate noi** — după curățare, interogarea `GROUP BY "ClipId" HAVING COUNT(*) > 1` trebuie
   să întoarcă zero rânduri, atât imediat, cât și după verificarea de la pasul 2.

4. **Retry-ul pe rețea** e greu de declanșat determinist; îl validez prin inspecția codului plus o
   rulare normală a unui creator deja funcțional (ex. Valy Adrian, cu `--skip-analyzed` scos), ca să
   confirm că refactorizarea predicatului nu a stricat calea fericită.

5. **Total final în bază** — după toate rulările: 155 analize minus 7 duplicate șterse = **148**, și
   fiecare clip cu exact o analiză.
