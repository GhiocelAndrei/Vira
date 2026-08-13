# Backend Integration Contract — ai-service ↔ .NET backend

**Status:** draft — describes the API surface as implemented. Read the "Known gaps" section before
wiring anything up; two of them block the analysis ingest path today.

## Purpose

The ai-service never talks to TikTok or the database directly. It reads creator data through the
.NET backend and posts analyzer results back to it, using `app/backend_client.py`
(`BackendClient`). This document is the contract for that boundary, so changes on either side are
made deliberately by both teams.

## Ownership boundary

- **Backend owns:** creator identity, TikTok clip metadata, aggregate stats, the creator
  quiz/questionnaire, and persistence of analyzer output.
- **ai-service owns:** video understanding (`POST /video-analyzer`) and portrait/profile
  generation (`POST /portrait`, currently a stub in `app/routers/portrait.py`). It also owns the
  **shape of the analysis payload** — see "Who owns the analysis shape" below.
- ai-service must not re-derive creator data from TikTok or a database directly; if a field is
  missing from the backend response, that is a backend contract gap, not something to reconstruct
  client-side.

## Two creator surfaces — do not confuse them

The backend exposes creators under two different routes backed by two different data stores.
This is the single easiest thing to get wrong here.

| | `/creators` (plural) | `/creator` (singular) |
|---|---|---|
| Controller | `CreatorsController.cs` | `CreatorController` |
| Data source | `IMockCreatorSeed` — **in-memory**, 50 seeded Romanian creators | Postgres (`db.Creators`, `db.CreatorClips`) |
| Auth | anonymous | creator session (`AuthConstants.CreatorPolicy`), except the analysis ingest |
| Purpose | the brand-facing roster / demo data | the signed-in creator's own real TikTok data |

`MockCreatorSeed` rebuilds its records at construction and its **Guids are not stable across
restarts** — the seed's own docstring says callers must key by an id discovered from `All`, never
a hardcoded Guid.

## Configuration

| Env var | Default | Notes |
|---|---|---|
| `BACKEND_BASE_URL` | — | Preferred base URL for `BackendClient`. |
| `VIRA_BACKEND_URL` | — | Legacy fallback, used only if `BACKEND_BASE_URL` is unset. |
| (neither set) | `http://localhost:8080` | |
| `BACKEND_SERVICE_KEY` | `""` | Sent as `X-Service-Key` on the analysis ingest call. |

Backend side reads the expected key from configuration key **`Service:ApiKey`**
(`config["Service:ApiKey"]` in `CreatorController`).

**None of these are currently declared in `.env.example`, `docker-compose.yml`, or
`appsettings.json`** — see "Known gaps".

## Endpoints

### Read path — seeded roster (`/creators`)

| Method & path | Client method | Returns |
|---|---|---|
| `GET /health` | `health()` | raw dict |
| `GET /creators?category=` | `list_creators(category=None)` | `list[CreatorSummary]` |
| `GET /creators/{id}` | `get_creator(creator_id)` | `PortraitRequest` |
| `POST /creators/{id}/portrait` | `generate_portrait(creator_id)` | raw dict — backend assembles the `PortraitRequest` and forwards it to ai-service `POST /portrait` |

`fetch_all(category=None)` lists creators, then fetches full detail for each. `category` accepts a
`CreatorCategory` enum member or its raw string value.

### Write path — analysis ingest (`/creator`)

| Method & path | Client method | Auth |
|---|---|---|
| `POST /creator/{creatorId}/clips/{tikTokVideoId}/analysis` | `post_clip_analysis(creator_id, tik_tok_video_id, payload)` | `X-Service-Key` header (service-to-service; `[AllowAnonymous]` overrides the controller's creator policy) |

Responses: **202 Accepted** on success, **404** if that creator has no clip with that TikTok video
id, **401** if the service key is missing or does not match.

The creator/clip linkage lives **in the URL path**, which is why the analysis body carries no
`videoId` or `creatorId` of its own. Backend resolves `(creatorId, tikTokVideoId)` → `CreatorClip.Id`
and stores the row against that FK.

### Not wrapped by `BackendClient`

`GET /creator/profile` → `CreatorProfileDto` (`id`, `displayName`, `followerCount`, `avatarUrl`,
`niche`, `clips[]`, `aggregates`) is the signed-in creator's own profile screen. It requires a
creator session cookie, so the ai-service has no way to call it and no Python method exists.

## Data shapes

All models live in `app/models.py`. The backend serializes camelCase with string enums
(`JsonStringEnumConverter` in `Program.cs`); the Pydantic models declare both the camelCase alias
and `populate_by_name=True`, so either key works when constructing a model directly in Python.
**Enum values must match the C# member names exactly** (e.g. `"Ugc"`, not `"ugc"`).

### `CreatorCategory` (enum)

`Food | Sport | Tech | Beauty | Travel | Comedy | Education | Lifestyle | Gaming | Music`

### `TravelWillingness` (enum)

`None | SameCounty | Nationwide | OutOfCountry`

### `CreatorSummary` — row from `GET /creators`

| Field | Wire key | Type |
|---|---|---|
| id | `id` | string |
| display_name | `displayName` | string |
| category | `category` | `CreatorCategory` |
| follower_count | `followerCount` | int |
| city | `city` | string \| null |
| clip_count | `clipCount` | int |

### `PortraitRequest` — full detail from `GET /creators/{id}`

Mirrors `PortraitRequestDto`.

| Field | Wire key | Type |
|---|---|---|
| creator_id | `creatorId` | string (GUID) |
| display_name | `displayName` | string |
| follower_count | `followerCount` | int |
| category | `category` | `CreatorCategory` |
| city | `city` | string \| null |
| county | `county` | string \| null |
| clips | `clips` | `Clip[]` |
| aggregates | `aggregates` | `Aggregates` |
| questionnaire | `questionnaire` | `Questionnaire` |

### `Clip`

`tikTokVideoId`, `title`, `coverImageUrl`, `embedLink`, `viewCount`, `likeCount`, `commentCount`,
`shareCount`, `tikTokCreateTime`.

### `Aggregates`

`avgViews`, `avgLikes`, `avgComments`, `avgShares`, `engagementRate` (float ratio 0–1 — a ratio,
not money, so it is deliberately not integer minor units).

### `Questionnaire`

`preferredCategories`, `excludedCategories`, `acceptsShippedProducts`, `canPurchaseProducts`,
`travelWillingness`, `goals`, `values`, `preferredFormats`, `contentLanguages`, `excludedBrands`,
`allowsAlcohol`, `allowsGambling`, `allowsPolitical`, `collabCapacityPerMonth`,
`selfDescribedAudience`, `priorSponsorships[]` (each `{brandName, category}`).

## The analysis payload

### Who owns the shape

`ClipAnalysisDto` types only the four version stamps and takes the analysis itself as a raw
`JsonElement`; `ClipAnalysis.AnalysisJson` stores it verbatim as one JSONB column, opaque to the
backend. That is deliberate — the ontology is versioned config that evolves, and a hand-maintained
C# mirror would silently drop fields.

The consequence: **nothing downstream validates the analysis body.** The authored shape is the
Pydantic contract in `ai-service/app/models.py`, paired with the system prompt in
`app/ai_client.py` (`_VIDEO_ANALYZER_SYSTEM_PROMPT`) — the ontology is enforced there or nowhere.
The model is passed to Gemini as `response_schema`, so the closed vocabularies are enforced at
generation time, not only on parse.

Rows are **append-only** — a clip can be re-analysed and every result is kept, each stamped with
the model, prompt, and ontology versions that produced it (CLAUDE.md rule 8; AI outputs are never
regenerable).

### Envelope — matches `ClipAnalysisDto` field for field

| Wire key | C# type | Source |
|---|---|---|
| `analysis` | `JsonElement` (stored verbatim) | `VideoAnalysis` |
| `aiModel` | `string` | `MODEL_ID` |
| `promptVersion` | `string` | `VIDEO_ANALYZER_PROMPT_VERSION` |
| `ontologyVersion` | `string` | `VIDEO_ANALYZER_ONTOLOGY_VERSION` |
| `analyzedAt` | `DateTimeOffset` | generation time, UTC |

This is exactly `VideoAnalysisResult.model_dump(by_alias=True, mode="json")`.

### `analysis` body — ontology `video-analyzer-ontology-v2`

Every scored field is `{value, confidence, evidence[]}`, so a label traces back to the moment in
the clip that produced it. `evidence` entries are `{source, reference}` where `reference` is a
timestamp or range. `subtopics` stays a plain string list (free-form tags, no closed vocabulary);
`products` is a list of the same scored shape with an open `value`.

Closed vocabularies — **every one of them also accepts `"unknown"`**, used when the clip gives too
little to decide (paired with low confidence and empty evidence). `"None"` and `"unknown"` are
different: `"None"` means *observed to have no hook/CTA*, `"unknown"` means *could not tell*.

| Field | Vocabulary |
|---|---|
| `topic` | Beauty, Fashion, Food, Fitness, Tech, Comedy, Lifestyle, Travel, Gaming, Finance, Parenting, Home |
| `tone` | Educational, Entertaining, Inspirational, Comedic, Promotional, Raw/Authentic |
| `visualStyle` | Clean, Cinematic, Raw/UGC, Trendy, Minimal |
| `hook` | Question, Bold statement, Pattern interrupt, Before/after, Text-on-screen, None |
| `cta` | Follow, Buy now, Link in bio, Comment, Save, Share, None |
| `sentiment` | Positive, Neutral, Negative |
| `brandSafety` | Safe, Caution, Unsafe |

```json
{
  "analysis": {
    "topic":   {"value": "Food", "confidence": 0.97,
                "evidence": [{"source": "video", "reference": "0:00-0:04"}]},
    "subtopics": ["Baking", "Recipe"],
    "tone":    {"value": "Educational", "confidence": 0.90,
                "evidence": [{"source": "video", "reference": "0:02-0:15"}]},
    "visualStyle": {"value": "Clean", "confidence": 0.85,
                "evidence": [{"source": "video", "reference": "0:00-0:20"}]},
    "hook":    {"value": "Before/after", "confidence": 0.80,
                "evidence": [{"source": "video", "reference": "0:00-0:03"}]},
    "products": [{"value": "Dr. Oetker Finesse", "confidence": 0.93,
                "evidence": [{"source": "video", "reference": "0:05-0:09"}]}],
    "cta":     {"value": "unknown", "confidence": 0.30, "evidence": []},
    "sentiment": {"value": "Positive", "confidence": 0.92,
                "evidence": [{"source": "video", "reference": "0:00-0:20"}]},
    "brandSafety": {"value": "Safe", "confidence": 0.99,
                "evidence": [{"source": "video", "reference": "0:00-0:20"}]}
  },
  "aiModel": "gemini-3.1-flash-lite",
  "promptVersion": "video-analyzer-v2",
  "ontologyVersion": "video-analyzer-ontology-v2",
  "analyzedAt": "2026-08-04T17:55:23.636213Z"
}
```

Changing any vocabulary member is an `ontologyVersion` bump, because a stored analysis is only
interpretable against the version stamped on it.

## Known gaps

These are unresolved as of this writing and affect anyone wiring the two services together.

1. **The analysis ingest cannot be used with the seeded creators.** `POST /creators` data comes
   from the in-memory `MockCreatorSeed`, but `CreatorService.SaveClipAnalysisAsync` looks the clip
   up in `db.CreatorClips`. A creator id taken from `fetch_all()` therefore has no matching DB row
   and the call returns **404**. The ingest path only works for a creator who signed in through
   TikTok OAuth and whose clips were persisted. Either the seed needs persisting, or the ingest
   needs a seed-aware path.
2. **`Service:ApiKey` is not configured anywhere.** `CreatorController` returns `Unauthorized()`
   when the expected key is null or empty, so with no configuration **every ingest call 401s**,
   regardless of what the client sends. It needs adding to `appsettings.json` / environment before
   the endpoint can work at all.
3. **The client env vars are undeclared.** `BACKEND_BASE_URL`, `VIRA_BACKEND_URL`, and
   `BACKEND_SERVICE_KEY` appear in no `.env.example`, and `docker-compose.yml` passes neither a
   backend URL nor a service key into the `ai-service` container.
4. **`POST /video-analyzer` results carry no clip identity.** The endpoint takes `files[]` and
   returns a positional `list[VideoAnalysisResult]`; the caller must zip results back to the
   uploaded files to know which `tikTokVideoId` to pass to `post_clip_analysis`. Persistence
   linkage is fine (it is in the URL), but the in-flight association is by array order only.
5. **Two topic vocabularies that do not match.** The analyzer's `topic` (Beauty, Fashion, Food,
   Fitness, Tech, Comedy, Lifestyle, Travel, Gaming, Finance, Parenting, Home) and the backend's
   `CreatorCategory` (Food, Sport, Tech, Beauty, Travel, Comedy, Education, Lifestyle, Gaming,
   Music) are deliberately separate — a clip's subject may differ from the creator's registered
   category — but nothing documents how they map when the profile generator needs both.
6. ~~The live prompt does not live in `prompts/`~~ **Resolved.** The prompt now lives in
   `prompts/<VIDEO_ANALYZER_PROMPT_VERSION>.md` (currently `video-analyzer-v3.md`) and is loaded
   verbatim by `app/ai_client.py` at import time — one file per prompt version, named after the
   version string itself, so a stored `ClipAnalysis.PromptVersion` always resolves to the exact
   text that produced it (older versions, e.g. `video-analyzer-v2.md`, stay on disk rather than
   being overwritten). `prompts/video-analyzer.md` (no version suffix) no longer exists; do not
   reference it.

## Open question — the portrait/profile output contract

`docs/creator-profile.md` specifies a `CreatorProfile v0.1` envelope (`contract_version`,
`profile`, `provenance`, `confidence`, `limitations`, `extensions`). No such model exists in code.
Instead:

- `POST /portrait` (stub, `app/routers/portrait.py`) takes `PortraitRequest` and returns an
  untyped dict with no `response_model` — it does not receive analyzer output at all.
- `app/models.py` carries a different vocabulary as a TODO: `PortraitClaim` (evidence required),
  `CreatorPortrait`, and the score contract `{value?, confidence, factors[], evidence[]}`, built on
  the existing `StyleVector`. The .NET side matches that naming (`PortraitDto`, `CreatorPortrait`).

So there are two competing designs for the same output — the doc's `CreatorProfile` envelope and
the code's `CreatorPortrait`/`PortraitClaim`. Resolving that is a contract decision and should get
an ADR in `docs/decisions.md` before `/portrait` is built out.

## Manual verification

```python
from app.backend_client import BackendClient

URL = "https://vira-backend.lemonfield-d6638dd6.westeurope.azurecontainerapps.io"
with BackendClient(URL) as client:
    creators = client.fetch_all()
    print(len(creators), creators[0].display_name, creators[0].aggregates.engagement_rate)

    food = client.list_creators("Food")
    full = client.get_creator(food[0].id)
    result = client.generate_portrait(food[0].id)
```

Or `python3 scripts/test_backend_client.py [category]` for the same flow as a script, and
`python3 -m app.backend_client` for a quick health + roster smoke test.

Note that `post_clip_analysis` is **not** exercised by either, for the reasons in "Known gaps".
