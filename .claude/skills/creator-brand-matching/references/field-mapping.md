# Maparea câmpurilor business ↔ creator

Referință pentru skill-ul `creator-brand-matching`: ce câmp de pe o parte se compară cu ce câmp de
pe cealaltă, la ce strat, și dacă se poate implementa azi.

Prescurtări: `BQ` = `BusinessQuestionnaires`, `CQ` = `CreatorQuestionnaires`. Câmpurile în
paranteze drepte, ca `BQ.[City]`, **nu există încă în schemă**.

## Sursele de date

| Parte | Tabele |
|---|---|
| Business | `Businesses`, `BusinessQuestionnaires`, `Campaigns` |
| Creator | `Creators`, `CreatorQuestionnaires`, `CreatorClips`, `ClipAnalyses`, `CreatorPortraits` |

`ClipAnalyses.AnalysisJson` e JSONB cu câmpurile din `VideoAnalysis`
(`ai-service/app/models.py:306`). `observedProducts` stă în `CreatorPortraits.ExtensionsJson`, nu
într-o coloană — ADR-016 nu a fost oglindit în .NET.

## Filtre dure și veto (L0/L1)

| Business | Creator | Regulă | Stare |
|---|---|---|---|
| `BQ.Verticals[]`, `Campaign.Category` | `CQ.ExcludedCategories[]` | intersecție ≠ ∅ → veto | activ |
| `Businesses.CompanyName` | `CQ.ExcludedBrands[]` (nume de brand) | potrivire normalizată → veto | activ |
| `BQ.ProductsToPromote` | `CQ.ExcludedBrands[]` (termen de categorie) | potrivire → penalizare + review | activ |
| `BQ.CompetitorBrands[]` | `CQ.PriorSponsorships[].BrandName` | intersecție → veto | activ |
| `BQ.CompetitorBrands[]` | `observedProducts[].name` | intersecție → avertisment | activ |
| `Campaign.AccessRule.MinFollowerThreshold` | `Creators.FollowerCount` | sub prag + `ProductPlacement` → `LockedByFollowerGate` | activ |
| `Campaign.Brief.Requirements` (produs trimis) | `CQ.AcceptsShippedProducts` | cere + `false` → incompatibil | activ |
| `Campaign.Brief.Requirements` (deplasare) | `CQ.TravelWillingness` | cere + `None` → incompatibil | activ |
| limba campaniei (implicit `ro`) | `CQ.ContentLanguages[]` | `ro` absent → exclus | activ |
| `Campaign.Status`, `Deadline` | `Creators.ClipsSelected` | eligibilitate de bază | activ |
| `BQ.[IsLocalOnly]`, `BQ.[City]` | `Creators.City` / `County` | local + oraș diferit → exclus | blocat |
| — | `CQ.CollabCapacityPerMonth` | capacitate atinsă → indisponibil | necesită contor colaborări |
| `BQ.Avoids{Alcohol,Gambling,Political}` | `CQ.Allows{...}` | inutilizabil (vezi pasul 2 din skill) | blocat |

Trei din treisprezece perechi sunt blocate. Celelalte zece se pot implementa azi.

## Semnale scorate (L2)

| Business | Creator | Semnal | Pondere |
|---|---|---|---|
| `BQ.Verticals[]`, `Campaign.Category` | `CQ.PreferredCategories[]` | categorie declarată | 0.20 (⅓) |
| idem | `ClipAnalyses.topic` + `subtopics[]` | categorie observată | 0.20 (⅔) |
| `BQ.BudgetBand` | `Creators.FollowerCount` | reach | 0.15 |
| `Campaign.Budget` | engagement din `CreatorClips` | ajustare reach | în 0.15 |
| `BQ.CompanySize` | `Creators.FollowerCount` | plauzibilitate | mic |
| `Campaign.AccessRule.ProductPlacement` | `contentFormat`, `creatorPresence`, `StyleVector.demonstration` | format | 0.10 |
| `Campaign.Brief.Requirements[]`, `DurationPreset` | `CQ.PreferredFormats[]` | format declarat | în 0.10 |
| `BQ.Values[]` | `CQ.Values[]` | valori | 0.10 |
| `BQ.[City]` | `Creators.City` / `County` | geo | 0.10 (inactiv) |
| `BQ.PrimaryGoal` | `ClipAnalyses.cta`, `hook` | obiectiv ↔ CTA | mic |
| `Campaign.TargetStyleVector` | `CreatorPortraits.StyleVector` | cosine mascat | 0 (inactiv) |
| `BQ.TargetAudienceAges[]` | `CQ.SelfDescribedAudience` | enum vs. text liber | inutilizabil |

## Perechi de text pentru cosine

Compoziția de mai jos e testată empiric pe date reale (8-13 creatori × 49 businessuri), nu doar
presupusă — vezi pasul 5 din `SKILL.md` pentru argumentul complet și pentru ce variante au fost
respinse.

| Text business | Text creator | Stare |
|---|---|---|
| `Description` + `ProductsToPromote` | `ClipAnalyses.topic` + `subtopics[]` | **recomandat** — singura pereche testată care nu produce hub-uri sistematice |
| `Values[]` | `CQ.Values[]` | **exclus din semantic** — axă de registru, nu de domeniu; contaminează potrivirea indiferent de unicitate lexicală. Păstrat pentru L3/explicație |
| `NarrativeDossier` | — | **exclus** — clauza narativă de preferințe de la finalul dossier-ului produce hub-uri la 7-8 din 8 creatori testați |
| `ProductsToPromote` singur | — | **exclus** — fără `Description`, lipsește ancorarea de categorie; a înrăutățit rezultatul, nu l-a îmbunătățit |
| `visualDescription`/`audioDescription`/`contentFormat` | — | **exclus** — zgomot de producție (cameră, limbă vorbită, format reciclat), nu conținut |
| `Brief.Message` + `Requirements[]` | `ClipAnalyses.topic` + `subtopics[]` | la nivel de campanie, peste textul de business — brieful e scurt, adaugă doar intenția campaniei |

**Limitare cunoscută, netestată la fix:** chiar cu compoziția recomandată, un creator al cărui
conținut atinge un registru comun cu un business (ex. „empowerment" pe ambele părți) poate ieși sus
peste alternative cu domeniu mai apropiat. Nu e o problemă de compoziție de text — testat exhaustiv,
cazul supraviețuiește tuturor variantelor de mai sus. Vezi „Limitare cunoscută, netranșată" din pasul
5 al `SKILL.md`.

**`TargetAudienceAges` nu se poate compara cu nimic azi.** Brandul declară un enum
(`Teens`, `A18_24`, `A25_34`, `A35_44`, `A45Plus`), creatorul scrie text liber
("Femei de 20-35 de ani din România"). Cosine pe intervale de vârstă e slab — numerele nu se
vectorizează util. Rezolvarea e la nivel de produs: pune creatorului aceeași întrebare cu enum, sau
extrage intervalul într-un câmp structurat la salvarea chestionarului. Până atunci, semnalul de
audiență rămâne nefolosit, deși ambele părți au datele.

## Câmpuri fără pereche

Utile de știut ca să nu le cauți degeaba.

**Pe partea de business:** `Businesses.Website`, `Campaign.Title`, `Campaign.Brief.Hashtags`,
`Campaign.Brief.Mention`, `Campaign.Brief.ExtraRequirements` — detalii de execuție, nu criterii de
potrivire.

**Pe partea de creator:**

- `CQ.Goals[]` ("Să ajung la 1 milion de urmăritori", "Să colaborez pe termen lung cu un brand") —
  n-are omolog pe partea de brand. `BQ.PrimaryGoal` e obiectivul campaniei, nu al creatorului; cele
  două nu se compară. Util la explicație, nu la scor.
- `CQ.CanPurchaseProducts` — n-are câmp de campanie care să declare "creatorul trebuie să cumpere
  produsul". Se poate deduce doar din `Brief.Requirements`, text liber. Merită un câmp explicit.
- `Creators.Niche` — text liber, redundant cu `PreferredCategories`; comentariul din
  `CreatorCategory.cs` spune explicit că rămâne doar pentru afișare.
- `ClipAnalyses.tone`, `visualStyle`, `hook`, `sentiment`, `creatorPresence` — alimentează
  `StyleVector`, nu se compară direct cu nimic de partea brandului.
- `ClipAnalyses.disclosure` — semnal slab de experiență (un creator care declară parteneriate a mai
  lucrat cu branduri). Nu-l transforma în afirmație de calitate.
- `CreatorClips.TikTokCreateTime` — prospețimea conținutului, nefolosită încă.
- `CreatorPortraits.Limitations`, `Confidence` — meta despre portret; intră în `coverage`, nu în
  scor.

## Ordinalele enum-urilor

Coloanele enum sunt stocate ca `integer` în Postgres. Verificate în
`backend/src/Vira.Abstractions/Common/`.

| Enum | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| `CreatorCategory` | Food | Sport | Tech | Beauty | Travel |
| *(continuare)* | **5** Comedy | **6** Education | **7** Lifestyle | **8** Gaming | **9** Music |
| `CompanySize` | Solo | Small | Medium | Large | — |
| `BudgetBand` | Under1k | From1kTo5k | From5kTo20k | Over20k | — |
| `AudienceAge` | Teens | A18_24 | A25_34 | A35_44 | A45Plus |
| `CampaignObjective` | Awareness | Visits | Offer | Launch | Community |
| `TravelWillingness` | None | SameCounty | Nationwide | OutOfCountry | — |

`CreatorCategory` e folosit de ambele părți: `BQ.Verticals[]`, `Campaign.Category`,
`CQ.PreferredCategories[]`, `CQ.ExcludedCategories[]`, `CQ.PriorSponsorships[].Category`. Pentru
maparea `TopicLabel` → `CreatorCategory` vezi pasul 6 din skill.
