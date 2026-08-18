---
name: creator-brand-matching
description: Proiectează și implementează matching-ul creator ↔ campanie din Vira — filtre dure, veto-uri, scor ponderat determinist în ICampaignMatcher și similaritate semantică pgvector peste embeddings. Folosește când înlocuiești StubCampaignMatcher, când adaugi coloane de embedding, sau când decizi ce criteriu intră în scor și cu ce pondere.
---

# Construiește matching-ul creator ↔ campanie

Unitatea de matching este perechea `Campaign × Creator`. Campania poartă `Brief`, `AccessRule`,
`Category`, `Budget`, `Deadline`; businessul din spate contribuie cu `BusinessQuestionnaire`;
creatorul contribuie cu `Creator`, `CreatorQuestionnaire`, `CreatorClips`, `ClipAnalyses` și — dacă
există — `CreatorPortrait`.

Skill-ul acoperă **regulile deterministe și interogarea semantică**. Nu acoperă generarea de
`CreatorPortrait` (vezi `creator-profile-generator`), nu acoperă analiza video, nu execută campanii
și nu decide plăți. Matching-ul este **informație, nu poartă** — exact cum spune comentariul din
`backend/src/Vira.Abstractions/Models/Campaigns/Match.cs`: se arată și se explică, dar creatorul
alege liber. Un veto absolut forțează 0%.

## Unde stă asta azi

Citește lista de mai jos înainte să scrii cod — patru presupuneri rezonabile sunt false.

- **Seam-ul există deja.** `ICampaignMatcher.Match(Creator, Campaign)` în
  `backend/src/Vira.Application/Services/CampaignMatcher.cs`, înregistrat la
  `backend/src/Vira.Application/ApplicationExtensions.cs:56`, consumat de
  `backend/src/Vira.Application/Services/CreatorService.cs:42`. `StubCampaignMatcher` returnează
  `new(100, [])` pentru orice pereche. Nu construi un serviciu nou — înlocuiește stub-ul.
- **Semnătura e prea îngustă.** `Match(Creator, Campaign)` nu primește chestionarele, portretul
  sau analizele. Trebuie lărgită (un `MatchInputs` care agregă tot, încărcat o dată per creator),
  altfel fiecare semnal ajunge să facă query propriu.
- **`Campaign.TargetStyleVector` este zero în toate cele 17 campanii din bază.** Nu există sursă
  pentru vectorul de stil al brandului. Vezi pasul 3 pentru cum tratăm asta fără să ghicim.
- **Extensia `vector` este deja instalată** (`SELECT extname FROM pg_extension` → `plpgsql`,
  `vector`), dar nu există nicio coloană de embedding. Pașii de server din skill-ul
  `enable-pgvector` sunt deja făcuți; sar direct la `ALTER TABLE`.
- **Acoperirea datelor e subțire și inegală:** 14 creatori, dintre care 1 cu portret, 5 cu analize
  de clipuri, 9 cu chestionar. 39 businessuri, toate cu chestionar complet. Orice formulă care
  presupune că toate semnalele există va da scoruri fără sens pentru majoritatea creatorilor.

## Cele patru straturi

Ordinea contează, și e ordinea costului crescător: L0 taie în SQL, L1 taie logic, L2 calculează,
L3 apelează AI doar pentru perechile care au supraviețuit.

| Strat | Ce face | Unde rulează |
|---|---|---|
| L0 Eligibilitate | `WHERE` în SQL, reduce setul de candidați | .NET / Postgres |
| L1 Veto | forțează `Score = 0`, `VetoTriggered = true` | .NET |
| L2 Scor | 0..1 ponderat, plus `coverage` | .NET |
| L3 Explicație | text din factorii deja calculați | ai-service (opțional) |

## Maparea câmpurilor business ↔ creator

Tabelul complet — ce câmp de pe o parte se compară cu ce câmp de pe cealaltă, la ce strat, și dacă
se poate implementa azi — stă în **`references/field-mapping.md`**. Citește-l înainte să adaugi
sau să scoți un criteriu; conține și câmpurile fără pereche și ordinalele enum-urilor, de care ai
nevoie ca să citești rândurile brute din Postgres.

Rezumat: din 13 perechi de filtre dure, 10 sunt implementabile acum. Trei sunt blocate — geo
(lipsesc coloanele de locație), flagurile de conținut (pasul 2), și `CollabCapacityPerMonth` (nu
există contor de colaborări active).

## 1. Filtrează eligibilitatea (L0)

Filtre binare, ieftine, exprimabile în `WHERE`. Rulează-le înainte de orice matematică vectorială.

- campania e activă și `Deadline` nu a trecut;
- creatorul e activ și are `ClipsSelected`;
- **geo**, când businessul e local — vezi mai jos.

`AccessRule.MinFollowerThreshold` **nu** e filtru. Când `ProductPlacement = true` și creatorul e
sub prag, setează `LockedByFollowerGate = true` și lasă perechea în listă. `Match.cs` distinge
deliberat între *exclus* și *blocat*; nu le colapsa.

Geo e cel mai important filtru pentru jumătate din businessuri și **nu se poate implementa încă**:
`Businesses` are doar `Id`, `AccountId`, `CompanyName`, `CreatedAt`. Locația există exclusiv ca
text liber în `BusinessQuestionnaire.Description` ("Barbershop de cartier în Sector 3",
"Cofetărie de familie în Iași", "Shaormerie de cartier în Mănăștur"). Din 39 de businessuri, ~15
sunt micro-businessuri hiperlocale pentru care un creator din alt oraș e inutil, și ~17 sunt
branduri naționale pentru care geografia nu contează deloc.

Până intră coloana, ține geo ca semnal cu pondere 0, dar scrie codul acum: `IsLocalOnly` pe
business comută filtrul din L0, iar `City`/`County` alimentează scorul din L2. Nu extrage locația
din `Description` cu regex — e o inferență nemarcată peste text scris de utilizator.

## 2. Aplică veto-urile (L1)

Un veto forțează `Score = 0` și `VetoTriggered = true`. Rezervă-l pentru refuzuri declarate
explicit de una dintre părți.

**Veto sigur:**

- `CreatorQuestionnaire.ExcludedCategories` ∩ (`Campaign.Category` ∪
  `BusinessQuestionnaire.Verticals`) ≠ ∅.
- `CreatorQuestionnaire.ExcludedBrands` conține numele businessului. Normalizează cu aceeași
  strategie ca `_normalize_brand` din `ai-service/app/routers/portrait.py:63`
  (`" ".join(name.split()).casefold()`) — deliberat naivă, dar consecventă pe ambele capete.
  Veto **doar** pe potrivire de nume de brand; pentru termenii de categorie vezi mai jos.
- `BusinessQuestionnaire.CompetitorBrands` ∩ `CreatorQuestionnaire.PriorSponsorships[].BrandName`.
  O sponsorizare declarată e o relație comercială reală.

**Doar avertisment, niciodată veto:**

- `CompetitorBrands` ∩ `observedProducts[].name`. ADR-016 e explicit: un rând din
  `observedProducts` spune că un brand **a apărut pe ecran**, nu că există o relație. Gabriela
  Musat are `Lidl`, `Sephora`, `Oral-B` în `observedProducts` doar pentru că erau în cadru.
  Păstrează `disclosed` lângă nume oriunde afișezi asta.
- `brandSafety = Unsafe` în `ClipAnalyses`. Una-cinci clipuri nu stabilesc un tipar permanent.
- **Termeni de categorie din `ExcludedBrands`**, cum e `"Fast-food"` la Gabriela Musat, alături de
  `"Băuturi energizante"`. Câmpul se numește *Brands*, dar creatorii scriu în el și categorii.
  Caută-i în `ProductsToPromote`, **nu** în `Description`, și produce penalizare plus flag de
  review — nu veto tăcut.

  Motivul e concret și verificabil în bază: descrierea Salad Box începe cu "Al treilea cel mai mare
  lanț de **fast-food** din România", deci termenul se potrivește — dar
  `ProductsToPromote = "Salatele personalizate și supele de sezon"`, iar `Values` sunt "mâncare
  proaspătă" și "opțiuni sănătoase". Termenul exclus a nimerit autodescrierea corporativă, nu
  produsul promovat. Un veto pe `Description` ar bloca o potrivire bună; un veto tăcut ar și
  ascunde motivul. Regula din proiect e ca un conflict să rămână vizibil, nu să fie rezolvat în
  tăcere într-o direcție.

**Ce nu poți face încă — alcool, jocuri de noroc, politic.** Tentația e să împerechezi
`BusinessQuestionnaire.Avoids{Alcohol,Gambling,Political}` cu
`CreatorQuestionnaire.Allows{Alcohol,Gambling,Political}`. Nu funcționează, fiindcă cele două
seturi de booleeni măsoară lucruri diferite:

- `Avoids* = true` înseamnă "brandul nu vrea campania lângă acest tip de conținut";
- `Allows* = true` înseamnă "creatorul acceptă colaborări din această zonă".

Niciunul nu spune dacă *campania însăși* e din categoria restricționată. În baza reală, cinci
businessuri au un flag pe `false`: **Wizz Air**, **Ink Rebels**, **Open Mic Underground**,
**Netflix România** și **Berea Zimbrului** — dar doar ultimul vinde alcool. Pentru celelalte
patru, `false` înseamnă toleranță, nu identitate. Un veto construit pe `AvoidsAlcohol = false` ar
bloca greșit patru businessuri din cinci.

Deci: **nu activa acest veto până nu există un câmp explicit** de tip `ContentFlags` /
`IsRestrictedCategory` pe business, completat de business. Până atunci, cel mult marchează
perechea pentru review când `Avoids* = false` **și** descrierea/produsele sunt semantic apropiate
de categoria restricționată — și etichetează rezultatul ca inferență, nu ca fapt.

## 3. Calculează scorul ponderat (L2)

Determinist, în C#. Fiecare semnal produce un scor 0..1 și intră în `Match.Factors` ca JSON, chiar
și când e absent.

| Semnal | Pondere | Sursă |
|---|---|---|
| `semantic` | 0.35 | cosine pgvector, text creator vs. text campanie + business |
| `category` | 0.20 | `PreferredCategories` (declarat) + `topic` din `ClipAnalyses` (observat) |
| `reach` | 0.15 | `FollowerCount` + engagement vs. `BudgetBand` |
| `format` | 0.10 | `PreferredFormats` / `contentFormat` vs. `Brief` + `ProductPlacement` |
| `values` | 0.10 | `CreatorQuestionnaire.Values` vs. `BusinessQuestionnaire.Values` |
| `geo` | 0.10 | oraș exact > județ > național; pondere 0 până intră coloana |
| `logistics` | poartă | `AcceptsShippedProducts`, `CanPurchaseProducts`, `TravelWillingness`, `CollabCapacityPerMonth` |

**Renormalizează peste semnalele disponibile.** Un semnal fără date iese din numitor, nu intră cu
0 — altfel fiecare creator fără portret e penalizat pentru o lipsă care nu-i aparține.

```csharp
var present = signals.Where(s => s.HasValue).ToList();
var score    = present.Sum(s => s.Weight * s.Value) / present.Sum(s => s.Weight);
var coverage = present.Sum(s => s.Weight) / signals.Sum(s => s.Weight);
```

Raportează `coverage` **separat** de `score`, exact cum `_build_confidence`
(`ai-service/app/routers/portrait.py:42`) raportează încrederea separat de conținutul portretului.
Un 0.8 pe două semnale nu e același lucru cu un 0.8 pe șapte, iar UI-ul trebuie să poată spune
diferența.

**`semantic` are ponderea cea mai mare pentru că `category` e aproape inutilizabil.**
`CreatorCategory` are 10 valori și nu conține Fashion, Home, Finance sau Parenting, deci Answear,
Zara, Dedeman, Revolut, One United Properties și Maxi Pet cad toate în `Lifestyle` — **13 din 39
de businessuri**. Categoria nu poate separa un dezvoltator imobiliar de un magazin de haine
second-hand; textul poate. De asta `category` primește 0.20, nu 0.40.

În interiorul lui `category`, cântărește observatul peste declarat: `topic` din `ClipAnalyses` e
dovadă cu citare de clip, `PreferredCategories` e preferință declarată. Un raport 2:1 e un punct
de plecare rezonabil.

**`reach` este potrivire buget-anvergură, nu judecată de calitate.** Formulează-l explicit ca
"poate bugetul ăsta să cumpere plauzibil anvergura asta". CLAUDE.md interzice transformarea
engagement-ului brut în afirmații cauzale despre calitate sau performanță — nu scrie "creator
performant", scrie "anvergură compatibilă cu banda de buget".

`BudgetBand` are patru trepte (`Under1k`, `From1kTo5k`, `From5kTo20k`, `Over20k`). Pune
`FollowerCount` în patru trepte paralele și scorează distanța dintre indici:

```csharp
static int ReachBand(long followers) => followers switch {
    <  10_000 => 0,
    < 100_000 => 1,
    < 500_000 => 2,
    _         => 3,
};
var reach = 1.0 - Math.Abs(ReachBand(followers) - (int)budgetBand) / 3.0;
```

Engagement rate se calculează din `CreatorClips`: `(LikeCount + CommentCount + ShareCount) /
NULLIF(ViewCount, 0)`, mediat pe clipuri. Folosește-l ca ajustare mică peste `reach`, nu ca semnal
propriu — 1-6 clipuri per creator nu susțin mai mult.

**`style_vector` nu intră în scorul v1.** Vectorul creatorului există și e bun; cel al brandului
nu are sursă. Nu-l genera cu AI din `Description` — ar fi exact ghicitul pe care regulile
proiectului îl interzic. Implementează-l ca **cosine mascat**, care se auto-activează dacă apare
vreodată un UI de sliders la crearea campaniei:

```csharp
// Doar dimensiunile setate explicit de brand contribuie. TargetStyleVector zero => pondere 0.
var dims = StyleDimensions.Where(d => target[d] > 0).ToList();
if (dims.Count == 0) return Signal.Absent("style");
```

Vectorul creatorului rămâne util la L3, pentru explicație.

`logistics` funcționează ca poartă, nu ca scor gradat: dacă brieful cere produs trimis prin curier
iar creatorul are `AcceptsShippedProducts = false`, perechea e incompatibilă practic, chiar dacă
restul se potrivește. La fel `TravelWillingness` față de un business local din alt oraș, și
`CollabCapacityPerMonth` față de angajamentele curente.

## 4. Generează explicația (L3)

`Match.Factors` — breakdown JSON per semnal, mereu, determinist. Asta e sursa de adevăr.

`Match.Explanation` — text opțional, generat **din** `Factors` plus citările care există deja:
`styleEvidence.evidenceClipIds` și `observedProducts.clipIds` din portret. Nu produce scorul, nu
introduce afirmații noi, nu citează un clip care nu e în input. Aceeași disciplină ca
`_sanitize_style_evidence` din `portrait.py`: orice citare invalidă se aruncă și se semnalează.

Română neutră și concisă, ca peste tot în proiect.

## 5. Pregătește embeddings

Provider: `gemini-embedding-001` prin `google-genai`, deja în `ai-service/requirements.txt` și deja
configurat cu cheie pentru video analyzer. Nicio dependență nouă.

Dimensiune **1536** prin MRL truncation, cu renormalizare după trunchiere. Motivul e concret: o
coloană `vector` indexată în pgvector acceptă maximum 2000 de dimensiuni, iar ieșirea implicită a
modelului e 3072. Fără renormalizare după trunchiere, cosine similarity iese sistematic distorsionat
— scorurile arată plauzibil, dar ordinea e greșită. Verificat empiric: aceeași cerere de embedding
pe același text întoarce mereu același vector (4 zecimale identice pe rulări separate) — determinist,
nu ai nevoie să tratezi non-determinism ca sursă de discrepanțe la debugging.

### Stocare: coloană pe rândul existent, nu tabel separat

```sql
ALTER TABLE "CreatorPortraits" ADD COLUMN "Embedding" vector(1536);
ALTER TABLE "CreatorPortraits" ADD COLUMN "EmbeddingModel" text;
ALTER TABLE "CreatorPortraits" ADD COLUMN "EmbeddingGeneratedAt" timestamptz;
ALTER TABLE "CreatorPortraits" ADD CONSTRAINT "UQ_CreatorPortraits_CreatorId" UNIQUE ("CreatorId");

ALTER TABLE "BusinessQuestionnaires" ADD COLUMN "Embedding" vector(1536);
ALTER TABLE "BusinessQuestionnaires" ADD COLUMN "EmbeddingModel" text;
ALTER TABLE "BusinessQuestionnaires" ADD COLUMN "EmbeddingGeneratedAt" timestamptz;
ALTER TABLE "BusinessQuestionnaires" ADD CONSTRAINT "UQ_BusinessQuestionnaires_BusinessId" UNIQUE ("BusinessId");
```

Nu un tabel `CreatorEmbeddings` separat — o coloană pe `CreatorPortraits`, simetric pe
`BusinessQuestionnaires`. Trei motive, nu unul:

1. **Vectorul și textul din care provine stau pe același rând.** Nu pot ajunge niciodată în
   dezacord — dossier-ul nu se poate rescrie fără ca embedding-ul corespunzător să fie rescris în
   aceeași tranzacție. Cu tabel separat, un dossier regenerat lasă în urmă un vector vechi până la
   următoarea sincronizare — un bug tăcut.
2. **`UNIQUE(CreatorId)` face portretul obligatoriu 1:1**, nu doar „de obicei un rând". Fără ea, un
   index vectorial ar putea conține două rânduri pentru același creator, iar o căutare de
   similaritate ar întoarce același creator de două ori în top-K — nu doar inestetic, strică
   ordonarea. Constrângerea trebuie adăugată **înainte** de popularea și indexarea coloanei; dacă
   apar duplicate între timp, se propagă în index și curățarea cere reconstruirea lui.
3. **Proveniența embedding-ului e distinctă de proveniența dossier-ului.** `CreatorPortraits` ține
   deja `AiModel`/`PromptVersion` pentru modelul care a scris `NarrativeDossier` — un model diferit
   de cel care produce vectorul. `EmbeddingModel`/`EmbeddingGeneratedAt` sunt coloane separate ca să
   știi ce trebuie regenerat când se schimbă modelul de embedding, fără să atingi provenance-ul
   portretului.

### Compoziția textului — testată empiric pe date reale, nu presupusă

**Pe partea de creator: NU `NarrativeDossier`.** Contraintuitiv, dat fiind că embedding-ul stă pe
același rând — dar dossier-ul se termină mereu cu o clauză narativă de tip *„Declară că preferă
tutorial și review, valorizează autenticitate și educație"* (parafrazare a
`CreatorQuestionnaire.Values`/`Goals`, generată de model pentru cititor, per ADR-015). Testat pe 8-13
creatori din nișe diferite: businessuri al căror text era la fel de abstract/valorizant („aromă ca
semnătură", „stil de viață activ") deveneau „hub"-uri — apăreau în top-10 la 7-8 din 8 creatori,
indiferent de domeniul real al conținutului lor, pentru că textele rezonau pe *registru* (ton de
brand), nu pe *domeniu* (subiect).

Sursa corectă: `ClipAnalyses.topic` + `subtopics[]`, agregate pe toate clipurile creatorului — text
strict observațional, fără nicio urmă de limbaj de preferință prin construcție. Câmpurile
intermediare testate și respinse:

| Câmp | De ce nu | Verificat |
|---|---|---|
| `audioDescription` | ~0% conținut — cine vorbește, în ce limbă, cu/fără muzică. „Romanian" în 11/13 analize, „music" în 10/13 — boilerplate identic la orice nișă | pe 13 analize reale |
| `contentFormat` | vocabular închis reciclat (`Unboxing/Review`, `Voiceover+B-roll`...), aceleași valori la toată lumea, zero discriminare | idem |
| `visualDescription` | ~50/50 substantive concrete („gaming laptop", „rochie neagră cu guler alb") amestecate cu vocabular de cameră („medium shot", „handheld") — la agregare pe mai multe clipuri, efectul net a fost o creștere a hub-urilor (un business fără nicio legătură reală a urcat de la 7/10 la 10/10 creatori), nu o scădere | comparație directă `topics-only` vs. `content-only` pe 10 creatori |

Deci: `topic + subtopics`, nimic altceva din `ClipAnalyses`, și nimic din `NarrativeDossier`.
**Notă pentru implementare:** embedding-ul stă pe rândul de portret din motive de integritate (mai
sus), dar textul care-l generează nu e `NarrativeDossier`-ul de pe același rând — e derivat separat
din `ClipAnalyses`. Nu presupune că poți regenera embedding-ul doar din câmpurile portretului.

**Pe partea de business: `Description` + `ProductsToPromote`, FĂRĂ `Values`.** `Values` a fost
testat și exclus — nu pentru că termenii se repetă (doar 16 din ~145 de valori din bază se repetă,
lexical sunt destul de unice), ci pentru că ocupă aceeași axă de „registru" ca și clauza de
preferințe de mai sus: „rafinament olfactiv", „hidratare curată", „confort activ" stau toate în
regiunea semantică de „calitate abstractă de brand", indiferent de domeniul real al businessului.
Cu `Values` inclus, un business de huse de telefon (`personalizare, exprimare prin design,
comunitate`) apărea în top-10 la toți cei 10 creatori testați, din nișe complet diferite.

**Nu scoate și `Description`, rămânând doar cu `ProductsToPromote`** — testat separat, a ieșit mai
rău, nu mai bine. `ProductsToPromote` singur e adesea o frază scurtă de catalog, fără ancorarea de
categorie pe care `Description` o oferă („cel mai mare retailer de...", „platformă globală de...").
Fără cadrul ăla, un business de bilete la festival (`ProductsToPromote` = „Bilete la evenimente,
experiențe de entertainment...") a devenit hub la 10 din 10 creatori — mai rău decât cu `Description`
inclus, nu mai bine.

`Values` nu dispare din matching — doar din axa semantică. Rămâne util pentru explicație (L3, „amândoi
pun preț pe sustenabilitate") și, eventual, pentru un semnal separat de tip `values` — dar niciodată
amestecat în textul care alimentează `semantic`.

### Limitare cunoscută, netranșată: domeniu vs. registru

Chiar cu compoziția de mai sus, un tip de eroare rămâne, verificat concret: un creator al cărui
conținut e despre dezvoltare personală/empowerment (`subtopics`: „Female Empowerment,
Self-Improvement, Mindset") a ieșit #1 la un brand de activewear pentru femei, peste businessuri cu
legătură de domeniu mult mai directă. Potrivirea e apărabilă comercial — branduri de activewear chiar
se poziționează pe empowerment — dar problema e că a ieșit **#1**, nu că a apărut deloc.

Cosine pe un singur text amestecat nu poate distinge „domeniu diferit, registru identic" de „domeniu
identic, registru diferit" — întoarce un singur număr. Testat exhaustiv (4 variante de text pe
creator × 2 variante pe business, 8 combinații) — cazul a supraviețuit tuturor. **Nu e o problemă de
compoziție de text, e o problemă de formulă.** Suma ponderată din pasul 3 e aditivă: un registru
foarte potrivit poate compensa complet un domeniu slab potrivit.

Fixul, neimplementat încă (decizie amânată pentru după primul demo): separă `domain_sim` (conținut
observat vs. `ProductsToPromote`) de `register_sim` (`Values` vs. `Values`, separat), și combină-le
multiplicativ sau cu `domain_sim` ca poartă — nu aditiv. Nicio axă nu trebuie să poată substitui
complet absența celeilalte. Până atunci, tratează cazurile de genul ăsta ca limitare cunoscută, nu ca
bug de patch-uit prin curățare suplimentară de text — s-a încercat de trei ori (clauza de preferințe,
`visualDescription`, `Description`) și de fiecare dată fixul de text a mutat problema, n-a rezolvat-o.

### Hub geometric — cum îl testezi izolat de orice creator

Unele businessuri au similaritate cosine medie neobișnuit de mare față de *restul* businessurilor,
independent de orice creator — proprietate de geometrie a embedding-ului (text scurt, fără ancorare
de domeniu), nu contaminare de conținut. Testabil direct: embedezi toate businessurile, calculezi
similaritatea fiecăruia față de toate celelalte (excluzând auto-similaritatea), și cauți z-score mare
pe media rezultată.

**Hub geometric ≠ nediscriminare față de creatori** — verificat concret. Un business poate fi cel mai
puternic hub din toată baza (z > 2, comparat doar cu alte businessuri) și tot să lipsească exact de la
creatorii fără conținut relevant, când e comparat cu text de creator real. Sunt două axe diferite; nu
presupune că rezolvarea uneia rezolvă și cealaltă.

Multe cazuri suspectate de „hub" s-au dovedit, verificate direct în bază, probleme de **calitate a
datelor de business**, nu artefacte de model — un business descris cu un cuvânt nepotrivit domeniului
lui (ex. un termen de ton generic care nu descrie ce vinde de fapt) a produs potriviri largi până
când descrierea a fost corectată. Verifică întâi textul de business înainte să presupui o eroare de
algoritm.

### Interogarea și unealta de validare

```sql
SELECT "CreatorId", 1 - ("Embedding" <=> $1) AS similarity
FROM "CreatorPortraits"
ORDER BY "Embedding" <=> $1
LIMIT 50;
```

Index HNSW cosine exact ca în skill-ul `enable-pgvector` — nu-l rescrie aici. La zeci de creatori
planner-ul va face oricum sequential scan; indexul e pentru mai târziu și nu costă nimic acum.

Calculul embedding-ului se face în ai-service (`POST /embeddings`), fiindcă backendul .NET n-are SDK
de AI. Se întâmplă **o dată, la scriere** — portret nou generat, chestionar business salvat sau
modificat — nu la fiecare cerere de matching. La citire, interogarea de mai sus e SQL pur; niciun
apel către ai-service nu se întâmplă pe drumul unei cereri de matching. Detaliu complet al împărțirii
AI/backend: `docs/Matching-AI-vs-Backend.docx`.

**Înainte să scrii vreo migrare**, validează compoziția de text pe date reale cu
`ai-service/scripts/match_creator_businesses.py` — scriptul folosit pentru toate testele de mai sus.
Suportă variante de text pe creator (`--fallback`/`--content-only`/`--topics-only`, implicit
`dossier`), pe business (`--biz-products-only`, implicit `full`), și un mod `--hubness` care rulează
testul de hub geometric fără niciun creator. Rulează-l pe orice schimbare de compoziție înainte s-o
implementezi în backend — mai ieftin să prinzi un hub nou într-un script Python decât după o migrare.

## 6. Mapează vocabularele o singură dată

`ClipAnalyses` emite `TopicLabel` (12 valori, `ai-service/app/models.py:140`), iar businessurile
declară `Verticals` ca `CreatorCategory` (10 valori,
`backend/src/Vira.Abstractions/Common/CreatorCategory.cs`). Vocabularele nu coincid, iar patru
etichete n-au corespondent:

| `TopicLabel` | `CreatorCategory` |
|---|---|
| Fashion | Lifestyle |
| Home | Lifestyle |
| Finance | Tech |
| Parenting | Education |

Ține maparea într-un singur loc, ca tabel explicit. Fiecare dintre cele patru mapări pierde
informație — încă un motiv pentru care `category` are pondere mică și `semantic` mare.

## Cazuri de test pe date reale

Trei perechi din baza actuală care trebuie să iasă vizibil diferit. Folosește-le ca test de sanity
după orice modificare de ponderi.

1. **Gabriela Musat × Salad Box** — scor bun, **penalizat și marcat pentru review, fără veto**.
   Cazul cel mai instructiv din bază, fiindcă semnalele arată în direcții opuse: ambele sunt Food,
   valorile se aliniază ("Alimentație echilibrată" vs. "opțiuni sănătoase"), `PreferredFormats`
   include `review de produs`, `BudgetBand = From5kTo20k` se potrivește cu 29.500 de urmăritori —
   dar `"Fast-food"` din `ExcludedBrands` se potrivește pe `Description`. Verifică explicit că
   implementarea **nu** ridică veto aici și că motivul apare în `Factors`. `coverage` trebuie să
   fie ridicat: e unul dintre puținii creatori cu chestionar **și** trei analize de clipuri.

   Perechea vecină **Gabriela Musat × Spartan** ("Lanț 100% românesc de fast-food", produse
   "Meniurile cu gyros și souvlaki") trebuie să iasă mai jos: acolo termenul exclus se potrivește
   și pe autodescriere, și pe zona produsului.
2. **Gabriela Musat × Berea Zimbrului** — scor mic, dar **fără veto**. `ExcludedBrands` conține
   "Băuturi energizante", nu bere, iar `AllowsAlcohol = false` nu poate declanșa veto cât timp
   nimic nu marchează Berea Zimbrului drept brand de alcool (vezi pasul 2). Perechea trebuie să
   pice pe `semantic` și `values`, și să apară în coada de review — nu la 0%.
3. **Jamila Cuisine × Barba & Foarfecă** — scor mic. 1.900.000 de urmăritori (banda 3) față de
   `BudgetBand = Under1k` (banda 0) dă `reach = 0`; verticalele diferă (Food vs. Beauty). Odată ce
   intră coloana de locație, geo elimină perechea în L0: Constanța vs. Sector 3, business local.
   Jamila n-are chestionar, deci `coverage` trebuie să iasă scăzut — verifică asta explicit.
4. **Creator de dezvoltare personală × brand de activewear** — scor mare pe `semantic`, apărabil
   comercial (empowerment e o poziționare reală de marketing pentru activewear), dar exemplu concret
   al limitării documentate în pasul 5: domeniu diferit, registru identic. Nu trata asta ca bug de
   corectat prin curățare de text — e limitarea cunoscută, netranșată, a formulei aditive. Testul
   util aici nu e „dispare potrivirea", e „nu mai iese #1 peste alternative cu domeniu mai apropiat"
   — semn că separarea domain/register (când se implementează) funcționează.

## Depanare

**Toți creatorii primesc scoruri apropiate.** Aproape sigur `semantic` nu contribuie: verifică
dacă `CreatorPortraits.Embedding` e populat. Fără el rămân doar `category` și `reach`, iar cu 13 din
39 de businessuri în `Lifestyle`, categoria nu separă nimic.

**Același grup de businessuri apare în top-10 la aproape toți creatorii, indiferent de nișă.**
Verifică întâi dacă e hub geometric (`--hubness` din `match_creator_businesses.py`, fără niciun
creator implicat) sau specific eșantionului de creatori testat. Dacă e hub geometric, verifică textul
de business înainte să bănuiești modelul — de cele mai multe ori businessul are un `Description`
prea scurt sau prea abstract, nu embedding-ul e stricat. Dacă nu e hub geometric (nu iese la testul
business-vs-business), dar tot apare des la un eșantion mic de creatori, e prea devreme să tragi o
concluzie — lărgește eșantionul înainte să corectezi text.

**Scoruri mari pentru creatori aproape fără date.** Renormalizarea funcționează prea bine — un
creator cu un singur semnal prezent poate lua 1.0. Impune un prag minim de `coverage` sub care
perechea nu se afișează deloc, sau se afișează marcată ca incertă.

**Un business apare pentru creatori din alt oraș.** Coloana de locație nu a intrat încă. Până
atunci, aproape jumătate din businessuri (micro-businessurile locale) vor genera potriviri
geografic absurde. E cunoscut și acceptat temporar; nu-l masca cu heuristici pe `Description`.

**`observedProducts` lipsește din răspuns.** Trăiește în `CreatorPortraits.ExtensionsJson`, nu
într-o coloană — ADR-016 nu a fost oglindit în `backend/src/Vira.Abstractions/Models/Creators/CreatorPortrait.cs`.
Citește-l din JSONB, și nu presupune că e prezent în `PortraitDto`, care e încă un stub cu două
câmpuri.

**`Match.Score` iese 1.0 peste tot.** `StubCampaignMatcher` e încă înregistrat la
`ApplicationExtensions.cs:56`. Stub-ul returnează `MatchResult(100, [])` — scală 0..100 — în timp
ce `Match.Score` e documentat ca 0..1. Când înlocuiești stub-ul, alege o singură scală și
convertește la margine, o singură dată.
