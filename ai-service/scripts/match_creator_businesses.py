"""Exploratory: embeds creator text and every BusinessQuestionnaire's free text, then ranks
businesses by cosine similarity. Not the matching engine — a check on whether the semantic
signal discriminates at all before any schema/migration work happens.

Textul de business = Description + ProductsToPromote. Values e exclus din axa semantica pe motiv
de separare a axelor (domeniu vs. registru) — vezi business_text() pentru argumentul complet.

Usage:
    export DATABASE_URI=postgresql://user:pass@host:port/db
    export GOOGLE_API_KEY=...
    python scripts/match_creator_businesses.py                    # compara TOTI creatorii cu portret
    python scripts/match_creator_businesses.py "Creator Name"      # un singur creator, raport complet
    python scripts/match_creator_businesses.py --fallback          # ClipAnalyses: tot
    python scripts/match_creator_businesses.py --content-only      # ClipAnalyses: topic+subtopics+visualDescription
    python scripts/match_creator_businesses.py --topics-only       # ClipAnalyses: doar topic+subtopics
    python scripts/match_creator_businesses.py --hubness           # doar businessuri, fara niciun creator
    python scripts/match_creator_businesses.py --biz-products-only # business: doar ProductsToPromote (fara Description)
    python scripts/match_creator_businesses.py --topics-only --biz-products-only  # ambele, combinate
    python scripts/match_creator_businesses.py "Creator Name" --content-only

Modul fara nume compara TOTI creatorii — testul de etapa 2: daca mai multi creatori din nise
diferite scot topuri diferite, semnalul discrimineaza pe continut. Daca acelasi grup de
businessuri apare in top-10 la toata lumea, e bias de popularitate — un artefact al
modelului/textelor, nu potrivire reala.

--fallback compune textul creatorului din ClipAnalyses (topic, subtopics, contentFormat,
visualDescription, audioDescription) in loc de CreatorPortraits.NarrativeDossier. Testeaza
ipoteza ca propozitia narativa de preferinte din dossier ("Declara ca prefera X si valorizeaza
Y") contamineaza semnalul semantic — businessuri cu text la fel de abstract/valorizant (brand
tone, fara substantive concrete) devin "hub"-uri care apar in top-10 la aproape toata lumea,
indiferent de continutul lor real. Fara clauza de preferinte, comparatia ramane doar pe conturul
observat al continutului. Preferintele nu dispar din matching — raman pe drumul lor propriu,
CreatorQuestionnaires.Values/Goals/PreferredFormats vs. BusinessQuestionnaires.Values/Requirements
(semnalele "values"/"format" din docs/Matching-AI-vs-Backend, separate de "semantic").

--content-only si --topics-only taie progresiv campurile care descriu *productia*, nu continutul.
Impartirea e masurata pe datele reale (vezi observational_text pentru detalii): audioDescription
e ~0% continut ("Romanian" in 11/13 analize, "music" in 10/13 — boilerplate identic la toata
lumea), contentFormat e un vocabular inchis reciclat, iar visualDescription e ~50/50 substantive
concrete ("gaming laptop", "home kitchen") amestecate cu vocabular de camera ("handheld",
"medium shot").

  --content-only pastreaza visualDescription: substantivele concrete de-acolo fac discriminarea
  buna (ex. "rochie neagra cu guler alb" e continutul real de fashion al unui creator, pe care
  subtopics il reduce la tagul abstract "Style").

  --topics-only scoate si visualDescription: cel mai curat, dar lasa ~9-15 cuvinte per creator —
  prea putin context ca un tag scurt si ambiguu ("Style") sa se dezambiguizeze.

Nota: campul visualStyle (Clean, Trendy, Minimal, Raw/UGC) NU intra in niciuna din variante.
Cuvintele de stil de tipul "trendy" ajung in comparatie doar prin dossier, nu prin ClipAnalyses.

Modul cu un singur creator printeaza plus min/max/mean/stdev + z-score per business. O distributie
fara outlieri (|z|>1.5) inseamna ca modelul nu separa businessurile dupa continut.

--hubness testeaza direct daca un business e un "hub" geometric — comparat DOAR cu restul
businessurilor, fara niciun creator implicat. Daca similaritatea lui medie fata de celelalte
~48 e un outlier (z>1.5), e dovada ca pozitia lui centrala vine din geometria embeddingului
(text scurt, putine substantive concrete), nu din vreo contaminare de continut creator sau
de vocabular narativ — pentru ca in acest calcul nu exista deloc text de creator.
"""

import os
import sys
from collections import Counter

import numpy as np
import psycopg2
import psycopg2.extras
from google import genai
from google.genai import types

EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 1536  # sub limita de 2000 a unei coloane vector indexate in pgvector

CREATOR_QUERY = """
SELECT c."DisplayName" AS display_name, c."Niche" AS niche, p."NarrativeDossier" AS dossier
FROM "CreatorPortraits" p
JOIN "Creators" c ON c."Id" = p."CreatorId"
WHERE c."DisplayName" = %s
ORDER BY p."CreatedAt" DESC
LIMIT 1;
"""

# CreatorPortraits n-are UNIQUE(CreatorId) (vezi docs/Matching-AI-vs-Backend §3) — un creator poate
# avea mai multe randuri. Se ia cel mai recent per creator, nu se presupune 1:1.
ALL_CREATORS_QUERY = """
SELECT DISTINCT ON (c."Id")
    c."DisplayName" AS display_name, c."Niche" AS niche, p."NarrativeDossier" AS dossier
FROM "CreatorPortraits" p
JOIN "Creators" c ON c."Id" = p."CreatorId"
ORDER BY c."Id", p."CreatedAt" DESC;
"""

# Doar creatorii cu portret intra in comparatie (dossier sau nu) — fara portret nu exista niciun
# semnal narativ de comparat, iar ClipAnalyses fara context de portret nu-i identifica pe cei fara.
ANALYSES_QUERY = """
SELECT ca."AnalysisJson" AS analysis
FROM "ClipAnalyses" ca
JOIN "CreatorClips" cl ON cl."Id" = ca."ClipId"
JOIN "Creators" c ON c."Id" = cl."CreatorId"
WHERE c."DisplayName" = %s;
"""

# brand_values e citit dar NU intra in business_text() — vezi motivul acolo. Ramane disponibil
# pentru explicatie (L3) si pentru un eventual semnal separat, in afara axei semantice.
BUSINESS_QUERY = """
SELECT b."Id" AS business_id, b."CompanyName" AS company_name,
       q."Description" AS description, q."ProductsToPromote" AS products_to_promote,
       q."Values" AS brand_values
FROM "Businesses" b
JOIN "BusinessQuestionnaires" q ON q."BusinessId" = b."Id"
ORDER BY b."CompanyName";
"""


class CreatorBusinessMatcher:
    """Embeds creator text + all business profiles, ranks businesses by cosine similarity.
    A prototype for validating the semantic signal, not the matching engine — see
    .claude/skills/creator-brand-matching/SKILL.md for the full L0-L3 design."""

    def __init__(self, dsn: str | None = None) -> None:
        self.dsn = dsn or os.environ["DATABASE_URI"]
        self._client = genai.Client()

    def fetch_creator(self, display_name: str) -> dict:
        with psycopg2.connect(self.dsn) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(CREATOR_QUERY, (display_name,))
                row = cur.fetchone()
        if row is None:
            raise SystemExit(
                f"no CreatorPortraits row for a creator named {display_name!r} "
                "(only creators with a generated portrait have a NarrativeDossier)"
            )
        return dict(row)

    def fetch_all_creators(self) -> list[dict]:
        with psycopg2.connect(self.dsn) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(ALL_CREATORS_QUERY)
                rows = [dict(row) for row in cur.fetchall()]
        if not rows:
            raise SystemExit("no CreatorPortraits rows at all — generate at least one portrait first")
        return rows

    def fetch_analyses(self, display_name: str) -> list[dict]:
        with psycopg2.connect(self.dsn) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(ANALYSES_QUERY, (display_name,))
                return [row["analysis"] for row in cur.fetchall()]

    def fetch_businesses(self) -> list[dict]:
        with psycopg2.connect(self.dsn) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
                cur.execute(BUSINESS_QUERY)
                return [dict(row) for row in cur.fetchall()]

    def embed(self, text: str) -> np.ndarray:
        resp = self._client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
        )
        vector = np.array(resp.embeddings[0].values, dtype=np.float32)
        # MRL truncation cere renormalizare la lungime unitara dupa taiere la EMBEDDING_DIM,
        # altfel cosine similarity iese sistematic distorsionat (vezi docs/Matching-AI-vs-Backend).
        return vector / np.linalg.norm(vector)

    @staticmethod
    def business_text(row: dict, mode: str = "full") -> str:
        """Compune textul de business in doua variante, ca sa izoleze daca Description insusi
        e sursa unei punti artificiale — nu doar Values, deja exclus din ambele variante.

        full          — Description + ProductsToPromote (implicit)
        products-only — doar ProductsToPromote

        Testul C: cazul Daiana Caragioiu x Jynx Active a supravietuit scoaterii lui Values —
        puntea probabila e "pentru femei" din Description, comparat cu "Female Empowerment" din
        subtopics-urile ei. products-only scoate Description complet, ramane doar
        "Colectia de activewear (leggings, sport bras, hanorace) pentru antrenament si
        streetwear" — maximal concret, fara nicio fraza de pozitionare. Daca Jynx Active cade de
        pe locul 1 aici, confirma puntea exacta. Daca ramane, puntea e mai adanca decat o fraza.

        Values nu dispare din matching in niciuna din variante — isi pierde doar locul in
        embedding (vezi BUSINESS_QUERY). Refuzurile dure stau in ExcludedBrands/ExcludedCategories,
        neatinse de asta.
        """
        if mode == "products-only":
            return row["products_to_promote"].strip()
        return f"{row['description']} {row['products_to_promote']}".strip()

    @staticmethod
    def observational_text(analyses: list[dict], mode: str = "fallback") -> str:
        """Compune textul creatorului din ClipAnalyses (nu din dossier), in trei variante care
        difera prin cate campuri de *productie* lasa inauntru. Fara text narativ de preferinte
        in niciuna — ClipAnalyses e observatie video, nu chestionar.

        Impartirea pe campuri, masurata pe datele reale:
          topic, subtopics    — continut curat (subiectul clipului)
          visualDescription   — ~50/50: substantive concrete ("gaming laptop", "home kitchen",
                                "leg machine", "rochie neagra cu guler alb") amestecate cu
                                vocabular de camera ("medium shot", "handheld", "close-ups")
          audioDescription    — ~0% continut: cine vorbeste + limba + muzica + ritm. "Romanian"
                                in 11/13 analize, "music" in 10/13 — boilerplate care apropie
                                artificial toti creatorii intre ei, indiferent de nisa
          contentFormat       — vocabular inchis reciclat (Unboxing/Review, Voiceover+B-roll...),
                                aceleasi valori la toata lumea, zero discriminare

        Modurile:
          fallback      — tot (reteta din SKILL.md pentru creatorii fara portret)
          content-only  — topic + subtopics + visualDescription: pastreaza substantivele concrete
                          din descrierea vizuala, scoate boilerplate-ul audio si formatul
          topics-only   — doar topic + subtopics: cel mai curat, dar ~9-15 cuvinte per creator,
                          prea putin context pentru dezambiguizarea tagurilor scurte ("Style")
        """
        topics, subtopics, formats, descriptions = set(), [], set(), []
        for a in analyses:
            topic = (a.get("topic") or {}).get("value")
            if topic:
                topics.add(topic)
            subtopics.extend(a.get("subtopics") or [])

            if mode in ("fallback", "content-only"):
                val = (a.get("visualDescription") or {}).get("value")
                if val:
                    descriptions.append(val)
            if mode == "fallback":
                fmt = (a.get("contentFormat") or {}).get("value")
                if fmt:
                    formats.add(fmt)
                val = (a.get("audioDescription") or {}).get("value")
                if val:
                    descriptions.append(val)

        parts = [
            ", ".join(sorted(topics)),
            ", ".join(dict.fromkeys(subtopics)),  # dedup, pastreaza ordinea
            ", ".join(sorted(formats)),
            " ".join(descriptions),
        ]
        return " ".join(p for p in parts if p)

    def creator_text(self, creator: dict, text_source: str) -> str:
        if text_source == "dossier":
            return creator["dossier"]
        analyses = self.fetch_analyses(creator["display_name"])
        text = self.observational_text(analyses, mode=text_source)
        if not text:
            raise SystemExit(
                f"{creator['display_name']!r} n-are ClipAnalyses de folosit pentru {text_source!r}"
            )
        return text

    def run(
        self, display_name: str, text_source: str = "dossier", biz_mode: str = "full"
    ) -> tuple[list[str], np.ndarray]:
        creator = self.fetch_creator(display_name)
        text = self.creator_text(creator, text_source)
        print(f"creator: {creator['display_name']}  (niche: {creator['niche']})")
        print(f"text [{text_source}]: {text}\n")

        creator_vec = self.embed(text)

        businesses = self.fetch_businesses()
        names, vectors = [], []
        for row in businesses:
            btext = self.business_text(row, mode=biz_mode)
            if not btext:
                continue
            names.append(row["company_name"])
            vectors.append(self.embed(btext))

        # toate vectorii sunt deja normalizati -> produsul matriceal e direct cosine similarity
        matrix = np.stack(vectors)
        scores = matrix @ creator_vec
        return names, scores

    def business_hubness(self, top_n: int = 15, biz_mode: str = "full") -> None:
        """Testeaza daca unele businessuri sunt 'hub'-uri geometrice — vectori neobisnuit de
        apropiati de multi alti vectori — indiferent de orice creator. Foloseste doar cele
        ~49 de embeddinguri de business, comparate INTRE ELE, fara niciun text de creator
        implicat. Daca un business are similaritate medie neobisnuit de mare fata de restul
        businessurilor, e dovada geometrica directa de hubness — independenta de esantionul
        de creatori testat pana acum, si nu se mai poate explica prin continutul dossier-ului
        sau al ClipAnalyses (care nici nu intra in calculul asta).
        """
        businesses = self.fetch_businesses()
        names, vectors = [], []
        for row in businesses:
            text = self.business_text(row, mode=biz_mode)
            if not text:
                continue
            names.append(row["company_name"])
            vectors.append(self.embed(text))
        matrix = np.stack(vectors)  # N x D, toate normalizate

        sim = matrix @ matrix.T  # N x N cosine similarity
        np.fill_diagonal(sim, np.nan)  # exclude auto-similaritatea (mereu 1.0)
        avg_sim = np.nanmean(sim, axis=1)

        mean, std = avg_sim.mean(), avg_sim.std()
        z = (avg_sim - mean) / std
        order = np.argsort(avg_sim)[::-1]

        print("hubness geometrica — similaritatea medie a fiecarui business fata de restul (fara creatori)\n")
        print(f"{'#':>3}  {'business':<32} {'avg cosine':>10} {'z':>7}")
        print("-" * 58)
        for rank, idx in enumerate(order[:top_n], start=1):
            flag = "  <- hub geometric" if z[idx] > 1.5 else ""
            print(f"{rank:>3}  {names[idx]:<32} {avg_sim[idx]:>10.4f} {z[idx]:>+7.2f}{flag}")
        print("-" * 58)
        print(f"n={len(avg_sim)}  mean={mean:.4f}  stdev={std:.4f}")

    def compare_all(self, top_n: int = 10, text_source: str = "dossier", biz_mode: str = "full") -> None:
        creators = self.fetch_all_creators()
        businesses = self.fetch_businesses()

        # embed o singura data, refolosit pentru fiecare creator -> N_businesses apeluri,
        # nu N_businesses x N_creatori
        names, vectors = [], []
        for row in businesses:
            btext = self.business_text(row, mode=biz_mode)
            if not btext:
                continue
            names.append(row["company_name"])
            vectors.append(self.embed(btext))
        matrix = np.stack(vectors)

        print(f"sursa text creator: {text_source}  |  sursa text business: {biz_mode}\n")
        tops: dict[str, set[str]] = {}
        for c in creators:
            text = self.creator_text(c, text_source)
            cvec = self.embed(text)
            scores = matrix @ cvec
            order = np.argsort(scores)[::-1][:top_n]
            label = f"{c['display_name']} ({c['niche']})"
            tops[label] = {names[i] for i in order}

            print(f"\n{label}  — top {top_n}")
            for rank, i in enumerate(order, start=1):
                print(f"  {rank:>2}. {names[i]:<30} {scores[i]:.4f}")

        print(f"\n{'-' * 56}\nbusinessuri care apar in top-{top_n} la mai mult de un creator")
        print(f"(bias de popularitate daca apar la majoritatea, indiferent de nisa)\n")
        overlap = Counter(biz for s in tops.values() for biz in s)
        shared = [(biz, cnt) for biz, cnt in overlap.most_common() if cnt > 1]
        if not shared:
            print("  niciunul — fiecare creator are un top distinct, semn bun")
        for biz, cnt in shared:
            who = [label for label, s in tops.items() if biz in s]
            print(f"  {biz:<30} {cnt}/{len(creators)}: {', '.join(who)}")


def print_report(names: list[str], scores: np.ndarray, top_n: int | None = None) -> None:
    # z-score conteaza mai mult decat cosine brut: pe text scurt de marketing, in aceeasi limba,
    # toate scorurile se ingramadesc intr-o banda absoluta ingusta (aici 0.51-0.65) — abaterea
    # fata de medie, nu valoarea bruta, spune daca un rezultat e semnal sau doar mijlocul plutonului.
    mean, std = scores.mean(), scores.std()
    z = (scores - mean) / std
    order = np.argsort(scores)[::-1]
    shown = order if top_n is None else order[:top_n]

    print(f"{'#':>3}  {'business':<32} {'cosine':>8} {'z':>7}  ")
    print("-" * 56)
    for rank, idx in enumerate(shown, start=1):
        flag = "  <- outlier" if abs(z[idx]) > 1.5 else ""
        print(f"{rank:>3}  {names[idx]:<32} {scores[idx]:>8.4f} {z[idx]:>+7.2f}{flag}")

    print("-" * 56)
    print(f"n={len(scores)}  min={scores.min():.4f}  max={scores.max():.4f}  "
          f"mean={mean:.4f}  stdev={std:.4f}")
    n_outliers = int((np.abs(z) > 1.5).sum())
    print(f"outlieri (|z|>1.5): {n_outliers} din {len(scores)}", end="  ")
    if n_outliers <= 1:
        print("<- prea puțini outlieri distincți, verifică dacă semnalul discriminează real")
    else:
        print("<- ordonarea separă un grup distinct de restul, semn bun")


TEXT_SOURCE_FLAGS = {
    "--fallback": "fallback",
    "--content-only": "content-only",
    "--topics-only": "topics-only",
}
BIZ_MODE_FLAGS = {"--biz-products-only": "products-only"}


def main() -> None:
    args = sys.argv[1:]
    matcher = CreatorBusinessMatcher()

    biz_mode = "full"
    for flag, mode in BIZ_MODE_FLAGS.items():
        if flag in args:
            biz_mode = mode
    args = [a for a in args if a not in BIZ_MODE_FLAGS]

    if "--hubness" in args:
        matcher.business_hubness(biz_mode=biz_mode)
        return

    text_source = "dossier"
    for flag, source in TEXT_SOURCE_FLAGS.items():
        if flag in args:
            text_source = source
    names_args = [a for a in args if a not in TEXT_SOURCE_FLAGS]

    if names_args:
        names, scores = matcher.run(names_args[0], text_source=text_source, biz_mode=biz_mode)
        print_report(names, scores)
    else:
        matcher.compare_all(text_source=text_source, biz_mode=biz_mode)


if __name__ == "__main__":
    main()
