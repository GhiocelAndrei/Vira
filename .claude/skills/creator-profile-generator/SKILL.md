---
name: creator-profile-generator
description: Define the CreatorPortrait output schema and build the Claude call that fills it, aggregating Aggregates + Questionnaire + VideoAnalysisResult[] into one portrait. Use when implementing or changing POST /portrait in ai-service, the portrait Pydantic models, or prompts/creator-profile-v1.md.
---

# Build the Creator Portrait generator

Reference for the portrait lane: `Aggregates + Questionnaire + VideoAnalysisResult[] → CreatorPortrait`.
This component aggregates structured analyzer output. It never inspects a video asset, never calls
Gemini, never re-derives a `VideoAnalysis`, and never matches a creator to a brand — those belong to
the Video Analyzer and to the matching component respectively.

Contract settled in ADR-011 (`docs/decisions.md`). Anthropic API shapes below were verified against
the current platform docs, not recalled — keep them that way when editing.

## Where this sits today

Read this before writing code; several things you would reasonably assume are wired are not.

- `POST /portrait` (`ai-service/app/routers/portrait.py`) is a stub that echoes its request back. It
  has no `response_model` and does not call any model.
- `ai-service/app/models.py:342` still carries `CreatorPortrait` as a `TODO`. Nothing in the file
  implements it.
- `PortraitRequest` (`ai-service/app/models.py:95`) carries clips, aggregates and questionnaire but
  **no analyses field** — see step 3.
- Nothing persists. `CreatorPortrait` is not a `DbSet` in `ViraDbContext`, `Vira.DataAccess/Migrations/`
  is empty, and the backend reads the response as an untyped `JsonElement` and discards it
  (`backend/src/Vira.Application/Services/AiServiceClient.cs:25-30`).

So the deliverable of this lane is a correct, well-shaped JSON response. Storage is a separate slice.

## 1. Define the output schema

Use two models. This split is the load-bearing decision, not a stylistic one.

**`PortraitGeneration`** — the only model passed to `output_format=`. The model decides exactly three
things:

```python
class PortraitGeneration(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    narrative_dossier: str
    style_vector: StyleVector
    limitations: list[str]     # only gaps the model can observe, e.g. conflicting signals
```

**`CreatorPortrait`** — the public envelope, assembled in application code:

| Field | Filled by | Why |
|---|---|---|
| `narrative_dossier`, `style_vector` | `PortraitGeneration` | genuine judgment |
| `provenance` | **code** — `ai_model`, `prompt_version`, `ontology_version`, `generated_at` | code already knows these; asking the model invites it to invent a version string |
| `confidence` | **code** — deterministic, see below | specified as "how many clips analysed successfully", which is arithmetic |
| `limitations` | **code** deterministic ∪ model-observed | missing inputs are countable |
| `extensions` | `dict = {}` | reserved for additive enrichment |

Never ask the model for its own model id, prompt version, or timestamp.

### Confidence

Deterministic and reproducible — the same inputs must always produce the same number:

```python
confidence = successful_analyses / max(expected_clips, 1)   # clamped to [0.0, 1.0]
```

then apply documented deductions (no questionnaire on file, no cover images available). Keep the
deduction weights as named module constants, not inline literals — CLAUDE.md rule 8 requires weights
and thresholds to be tunable configuration, and every stored portrait must stay reproducible against
the versions stamped in `provenance`.

Confidence reflects evidence coverage and completeness. It must never be derived from view, like, or
follower counts — that would turn engagement magnitude into a quality claim.

### StyleVector

Reuse the existing 8 dimension names so the axes stay comparable with `Campaign.TargetStyleVector`:
`warmth`, `energy`, `authority`, `refinement`, `convention`, `humor`, `demonstration`, `intimacy`.

Change the type from `int = 0` to a bounded float (ADR-011):

```python
class StyleVector(BaseModel):
    """8 scored style dimensions, 0.0–1.0 each (ADR-011)."""
    warmth: float = Field(default=0.0, ge=0, le=1)
    # ... same for the other seven
```

The current model (`ai-service/app/models.py:9`) states its 0–100 range only in a docstring and
enforces nothing, so add the `ge`/`le` bounds while you are there. Several of these dimensions have
no single source field in the `video-analyzer-ontology-v6` vocabulary — the model infers them from
the analyses as a whole, so they are inferences and the dossier should not present them as measured
facts.

## 2. Wire the Claude call

### Input assembly

Serialize with the same call the analyzer path already uses
(`ai-service/scripts/send_clip_analysis.py`):

```python
payload = {
    "aggregates":    req.aggregates.model_dump(mode="json", by_alias=True),
    "questionnaire": req.questionnaire.model_dump(mode="json", by_alias=True),
    "analyses":     [a.model_dump(mode="json", by_alias=True) for a in req.analyses],
}
```

Cover images go in as image content blocks — Claude has no native video input, so a clip's cover
image is the only visual signal available:

```python
blocks = [
    {"type": "image", "source": {"type": "url", "url": clip.cover_image_url}}
    for clip in req.clips
    if clip.cover_image_url          # required — see Troubleshooting
]
blocks.append({"type": "text", "text": json.dumps(payload, ensure_ascii=False)})
```

### The call

```python
response = client.messages.parse(
    model="claude-sonnet-5",
    max_tokens=16000,
    system=_SYSTEM_PROMPT,
    messages=[{"role": "user", "content": blocks}],
    output_format=PortraitGeneration,
)
generated = response.parsed_output
```

`messages.parse()` with `output_format=` takes the Pydantic class directly — no schema helper, no
manual `json.loads`. The parsed instance is on `response.parsed_output`.

### Prompt file

Keep model instructions in `prompts/creator-profile-v1.md` and load them at import time by version
constant, mirroring `ai-service/app/ai_client.py:29-34`:

```python
CREATOR_PROFILE_PROMPT_VERSION = "creator-profile-v1"
_SYSTEM_PROMPT = (
    (_PROJECT_ROOT / "prompts" / f"{CREATOR_PROFILE_PROMPT_VERSION}.md")
    .read_text(encoding="utf-8").strip()
)
```

One file per version, named after the version string, so a stored `prompt_version` always resolves to
the exact text that produced the portrait. Bumping the constant without adding the file fails loudly
at import. Never inline the prompt in application code.

The prompt must require concise, neutral Romanian for the dossier, keep creator-stated preferences
distinct from video-derived observations, and forbid sensitive-trait inference, audience-demographic
claims, and commercial-performance predictions.

### Client lifecycle

Lazy `@lru_cache` singleton in the router, matching `ai-service/app/routers/video_analyzer.py`:

```python
@lru_cache
def _get_client() -> Anthropic:
    # Resolving ANTHROPIC_API_KEY at import time makes the app fail to boot without a key.
    return Anthropic()
```

`ANTHROPIC_API_KEY` is already passed to the container (`docker-compose.yml:20`). Never log or echo it.

Add `response_model=CreatorPortrait` to the route — it currently has none, so nothing validates the
response shape.

### Guards

Check `stop_reason` before reading `parsed_output`:

- `refusal` — output may not match the schema; return a typed error rather than a half-built portrait.
- `max_tokens` — output may be truncated. `max_tokens` caps thinking *plus* response text.

Structured outputs are incompatible with citations — do not enable both.

For caching, put the stable system prompt and ontology before the `cache_control` breakpoint and the
volatile creator payload after it. The minimum cacheable prefix on Claude Sonnet 5 is 1024 tokens;
verify with `usage.cache_read_input_tokens` — a persistent zero means something volatile leaked into
the prefix.

## 3. Close the input gap

`PortraitRequest` has no analyses field, and `BackendClient` has no method to read stored
`ClipAnalyses` back — `post_clip_analysis` only writes. So the generator cannot currently reach its
own primary input. Add:

```python
analyses: list[VideoAnalysisResult] = Field(default_factory=list)
```

This is a deliberate schema change recorded in ADR-011, not an invented field —
`.claude/rules/ai-service.md` forbids the latter.

For the real backend round trip, the .NET `PortraitRequestDto` and `PortraitRequestAssembler` need
the matching field. That is follow-up work; until it lands, exercise the endpoint with analyses
supplied directly in the request body.

## Troubleshooting: traps in the real data

- **Cover images are frequently absent.** In the live database, both of Gabriela Musat's clips have
  `CoverImageUrl = NULL`. Always filter out null URLs, record it in `limitations`, and never emit a
  block with an empty `url`. TikTok CDN URLs also expire — if Anthropic's server-side fetch returns
  403, download the image and send it as a base64 source instead.
- **`StyleVector` scale mismatch with .NET.** C# `StyleVector` is `int`; the 0–1 float contract needs
  `int` → `double` before persistence lands. Harmless today only because the response is never
  deserialized into that type.
- **Two topic vocabularies.** The analyzer's `topic` (12 members) and the backend's `CreatorCategory`
  (10 members) are deliberately separate with no documented mapping
  (`docs/backend-integration.md:250`). Do not silently coerce one into the other.
- **The .NET backend does not currently build**, so test ai-service directly rather than end to end:
  `ViraDbContext.cs:22` declares `DbSet<BusinessQuestionnaire>` but no such class exists; `:43` uses
  `m.Cents` while `Money` is `record struct Money(long Bani)`; `:46` calls `OwnsOne` on
  `Campaign.Brief`, which is a `string`.
