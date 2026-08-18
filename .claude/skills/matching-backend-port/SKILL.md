---
name: matching-backend-port
description: Portează în .NET motorul de matching creator ↔ campanie validat în Python (ADR-017 + ADR-018) — migrare EF Core pentru coloanele de embedding, apel POST /embeddings la write-time, înlocuirea StubCampaignMatcher cu L0-L3 real, și endpoint de feed paginat calculat live. Folosește când lucrezi în backend/ la matching, embeddings, ICampaignMatcher sau feed-ul creatorului.
---

# Portează matching-ul în backend (.NET)

Partea de AI e terminată și validată pe date reale. Ce urmează e **port**, nu design: formula,
ponderile, veto-urile și textele de explicație sunt deja decise și testate. Nu re-deriva regulile —
citește ADR-017 și ADR-018 din `docs/decisions.md` și implementarea de referință.

**Referința executabilă:** `ai-service/scripts/score_creator_business.py`. Rulează-l cu `--json`
ca să vezi exact payload-ul așteptat (`businessId`, `companyName`, `matchPercent`, `coverage`,
`vetoed`, `vetoReason`, `why[]`). E Python — îl portezi ca specificație, nu ca sursă.

Design-ul complet și motivația fiecărei reguli stau în skill-ul `creator-brand-matching`. Acesta
acoperă doar **ce mai are de făcut backend-ul**.

## Ce e deja gata (nu reface)

- 13 creatori cu `CreatorPortrait` complet (`Embedding` + `StyleVector` + `StyleEvidence`), 49
  businessuri cu `BusinessQuestionnaire.Embedding`. Backfill făcut.
- `Campaign.TargetStyleVector` populat pe toate cele 49 de campanii reale.
- Formula L1+L2+L3 funcțională, rulată pe toate perechile.

## Patru presupuneri false — citește înainte să scrii cod

- **Coloanele de embedding există în DB, dar nu în modelul EF Core.** Au fost aplicate direct pe
  dev DB, nu printr-o migrare. Pe `CreatorPortraits` și `BusinessQuestionnaires`: `Embedding
  vector(1536)`, `EmbeddingModel text`, `EmbeddingGeneratedAt timestamptz`, plus
  `UQ_CreatorPortraits_CreatorId` și `UQ_BusinessQuestionnaires_BusinessId`. Migrarea trebuie
  scrisă ca să *formalizeze* starea existentă, nu să o recreeze.
- **Seam-ul există deja.** `ICampaignMatcher.Match(Creator, Campaign)` în
  `backend/src/Vira.Application/Services/CampaignMatcher.cs`, înregistrat la
  `ApplicationExtensions.cs:56`, consumat în `CreatorService.cs:205` (`GetFeedAsync`). Înlocuiește
  stub-ul, nu construi serviciu nou.
- **Semnătura e prea îngustă.** `Match(Creator, Campaign)` nu primește chestionarele, portretul sau
  analizele. Lărgește-o la un agregat `MatchInputs`, încărcat o dată per creator — altfel fiecare
  semnal face query propriu.
- **Nu există tabela `Matches`.** `Match.cs` e model fără tabelă, și așa rămâne: ADR-010 spune că
  matching-ul e interogare la cerere, nu clasament stocat. Nu adăuga `DbSet<Match>`.

## 1. Migrarea EF Core

Mapează cele 6 coloane + 2 constrângeri deja aplicate. `vector(1536)` are nevoie de
`Pgvector.EntityFrameworkCore`. Verifică pe dev DB că migrarea iese **no-op** — dacă vrea să creeze
coloane, mapările nu se potrivesc cu ce e deja acolo.

## 2. Embeddings la write-time

`POST /embeddings` (ai-service, stateless: text în, vector afară — `gemini-embedding-001`, 1536
dimensiuni). Apelează-l când se salvează un portret nou sau un chestionar de business editat, în
aceeași tranzacție cu textul — altfel un dossier regenerat lasă în urmă un vector vechi.

**Compoziția textului nu e negociabilă** (testată empiric, ADR-017; alternativele au fost respinse):

- **creator** = `topic` + `subtopics` agregate din `ClipAnalyses` — **niciodată** `NarrativeDossier`.
  Asta e singura parte care cere muncă reală în C#: extragerea din JSONB.
- **business** = `Description` + `ProductsToPromote` — **niciodată** `Values`.

La match-time nu se apelează niciun model: e SQL pur (`"Embedding" <=> $1`).

## 3. Înlocuiește StubCampaignMatcher cu L0-L3

**L0 (SQL `WHERE`):** campanie activă, deadline netrecut, creator activ cu `ClipsSelected`.
`MinFollowerThreshold` **nu** e filtru — când `ProductPlacement = true` și creatorul e sub prag,
setează `LockedByFollowerGate = true` și lasă perechea în listă.

**L1 — trei veto-uri, toate declarate explicit de o parte:**

1. `CreatorQuestionnaire.ExcludedCategories` ∩ (`Campaign.Category` ∪ `BusinessQuestionnaire.Verticals`)
2. `ExcludedBrands` potrivire de nume cu businessul (normalizare: `" ".join(split()).casefold()`)
3. `BusinessQuestionnaire.CompetitorBrands` ∩ `PriorSponsorships[].BrandName`

Termenii de categorie ajunși în `ExcludedBrands` (ex. `"Fast-food"`) se caută în
`ProductsToPromote`, **nu** în `Description`, și dau penalizare `-0.15` + flag de review, niciodată
veto tăcut. Restul veto-urilor tentante sunt respinse motivat în `creator-brand-matching` — nu le
rewira.

**L2 — ponderi (ADR-017, amendat de ADR-018):**

| semnal | pondere | calculabil azi |
|---|---|---|
| `semantic` | 0.35 | da — cosine pe `Embedding` |
| `category` | 0.20 | da — observat:declarat 2:1 |
| `style` | 0.15 | da — cosine mascat (ADR-018) |
| `reach` | 0.15 | nu — cere `Campaign.BudgetBand` |
| `format` | 0.10 | nu — cere `Brief`/`ProductPlacement` |
| `values` | 0.10 | nu — regula de scor nedecisă |
| `geo` | 0.00 | nu — lipsesc coloanele de locație |

`score = Σ(pondere·valoare) / Σ(ponderi prezente)` — semnalele absente **ies din ambii termeni**,
nu scorează 0. `coverage = Σ(ponderi prezente) / Σ(toate ponderile)`, raportat separat, niciodată
pliat în scor.

`style` e **cosine mascat**: contribuie doar dimensiunile unde `TargetStyleVector[d] > 0`. Dacă
toate sunt 0 (fixture-ul `Brand Demo`), semnalul e absent, nu zero.

**L3 — explicații deterministe, fără apel de model.** Fiecare linie repetă un fapt deja verificat:

- produs observat: `disclosed = true` → „parteneriat"; altfel „ai integrat" (ADR-016 — apariția pe
  ecran nu e relație comercială)
- categorie: 4 formulări pentru match observat, 3 pentru declarat, alese **determinist** prin hash
  pe `creatorId:businessId` (nu random — aceeași pereche dă mereu același text)
- stil: citează `StyleEvidence.rationale` al creatorului pentru dimensiunea unde ambele părți
  scorează cel mai sus — **doar dacă** `creator[d] × target[d] ≥ 0.5` **și** `confidence ≥ 0.55`.
  Sub prag: tace. Nu coborî pragurile ca să apară mai multe linii; azi doar 5 din 13 câștigători au
  linie de stil, și asta e corect.
- adjective, nu substantive: „Stilul tău energic", nu „Stilul tău la energie"

Explicațiile intră în `FeedCampaignDto.MatchReasons` (există deja).

## 4. Endpoint de feed paginat

Calculat live per cerere de pagină — nu per scroll, nu cache-uit, nu persistat (ADR-010).

## Capcane

**Scala.** `StubCampaignMatcher` returnează `MatchResult(100, [])` — 0..100 — dar `Match.Score` e
documentat 0..1. Alege o scală și convertește la margine, o singură dată.

**`observedProducts` nu e coloană.** Trăiește în `CreatorPortraits.ExtensionsJson` (ADR-016 nu a
fost oglindit în `CreatorPortrait.cs`). Citește-l din JSONB și nu presupune că e în `PortraitDto`.

**`StyleVector`/`TargetStyleVector` sunt JSONB PascalCase** (`OwnsOne(...).ToJson()`), nu coloane
numerice — cheile sunt `Warmth`, `Energy`, …, nu `warmth`. Tipul C# `StyleVector` e deja `double`
0..1 pe cele 8 proprietăți, deci se dezserializează direct.

**`coverage` n-are unde să ajungă azi.** `MatchResult` e `(double Percent, IReadOnlyList<string>
Reasons)`, iar `FeedCampaignDto` are doar `MatchPercent` + `MatchReasons`. Lărgește `MatchResult`
să ducă și `Coverage`, `Vetoed`/`VetoReason` și flag-ul de review — altfel semnalul cel mai
important pentru „cât de mult din formulă susține scorul ăsta" se pierde la margine. Câmpurile
există deja pe entitatea `Match`, dar entitatea nu e pe drumul feed-ului.

**Scoruri mari la creatori aproape fără date.** Renormalizarea funcționează prea bine — un creator
cu un singur semnal poate lua 1.0. Impune un prag minim de `coverage` sub care perechea nu se
afișează, sau se afișează marcată ca incertă.

**`TargetStyleVector` de azi e estimare AI, nu ground truth.** ADR-018 e un override deliberat, cu
scop de demo: valorile vin dintr-un model care a citit `Description` + `Brief.Message`, fără nicio
dovadă video, spre deosebire de `StyleVector`-ul creatorului care e ancorat în clipuri analizate.
Când apare UI-ul de sliders la crearea campaniei (sursa pe care ADR-017 o prevedea inițial),
valorile estimate se **înlocuiesc**, nu coexistă cu cele setate de brand.
