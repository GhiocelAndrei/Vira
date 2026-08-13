# Creator Profile Generator — PoC Specification

**Status:** approved initial contract  
**Contract version:** `v0.1`

## Responsibility

The Creator Profile Generator aggregates raw TikTok metadata, creator quiz answers, and three completed `VideoAnalytics` records into one explainable `CreatorProfile`.

It is an aggregation component, not a video-analysis component. It never receives or inspects video assets, and it does not invoke Gemini or any other video-understanding service. Brand profiles and creator-brand matching are out of scope.

## Inputs

### CreatorProfileRequest

| Field | Type | Rules |
|---|---|---|
| `contract_version` | string | Must be `v0.1`. |
| `creator_id` | string | Must match all source records. |
| `raw_tiktok_data` | object | Original metadata keyed by `video_id`; unmodified. |
| `creator_quiz` | object | Original creator answers; unmodified. |
| `video_analytics` | array of `VideoAnalytics` | Three records from the Video Analyzer `v0.1`, one per video. |

The `VideoAnalytics` schema is defined in `docs/video-analyzer.md`. The generator may read only its structured output, not the source video.

## Public output contract

The outer envelope is the stable public interface. Future confidence, enrichment, and adaptive-profiling capabilities must preserve it.

```json
{
  "contract_version": "v0.1",
  "creator_id": "<id>",
  "profile": {
    "summary": "Rezumat neutru, bazat pe dovezi",
    "observed_patterns": [],
    "creator_stated_preferences": {},
    "metadata_facts": {}
  },
  "provenance": [],
  "confidence": {
    "overall": "low | medium | high",
    "basis": "Explicație concisă în română"
  },
  "limitations": [],
  "extensions": {}
}
```

### `profile.observed_patterns`

Each pattern is an aggregated, video-derived statement.

```json
{
  "pattern_id": "cp_<id>",
  "dimension": "communication_style | content_pillar | production_style | format | call_to_action",
  "label": "Etichetă concisă în română",
  "description": "Descriere neutră, limitată la dovezi",
  "support": "single | repeated | mixed | insufficient_evidence",
  "confidence": "low | medium | high",
  "provenance_refs": ["prov_<id>"]
}
```

`single` is allowed but must not be described as a stable trait. `mixed` represents meaningful inconsistency; it is not an error to be resolved away.

### `profile.creator_stated_preferences`

This contains only quiz-derived statements, keyed by the original quiz question/key. Preserve the submitted value and attach its `provenance_ref`. Do not convert these into observed patterns or verified facts.

### `profile.metadata_facts`

Contains only non-interpretive values directly available in raw TikTok data (for example, supplied handles, captions, or aggregate counts when provided). Each fact attaches its `provenance_ref`. No derived performance score is part of `v0.1`.

### `provenance`

```json
{
  "provenance_id": "prov_<id>",
  "source_type": "video_analytics | raw_tiktok_data | creator_quiz",
  "source_ref": "analytics_id, metadata path, or quiz key",
  "video_id": "<id or null>",
  "note": "Rolul sursei în română"
}
```

## Aggregation policy

1. Preserve factual metadata and creator declarations as separate categories.
2. Group compatible video-derived inferences by dimension and label.
3. Mark a pattern `repeated` only when it has support from at least two distinct videos.
4. Mark conflicting supported signals as `mixed`; do not select a winner without a factual basis.
5. Make overall confidence depend on evidence coverage, consistency, and input completeness—not engagement magnitude.
6. Record unavailable, failed, or insufficient inputs in `limitations`.

## Evolution without public-interface change

- Add optional experimental/enriched content under `extensions` using namespaced keys, e.g. `"extensions": {"adaptive_profile": {...}}`.
- Keep existing top-level fields and their meanings stable through additive changes.
- A breaking change requires a new `contract_version`, migration strategy, and ADR in `docs/decisions.md`.
- Internal model/prompt versions may be logged operationally but are not public contract fields.

## Acceptance criteria

- One profile is produced only from the specified request inputs.
- Every generated pattern has one or more provenance references and calibrated confidence.
- Quiz values remain creator-stated; raw metadata remains factual.
- No video re-analysis, external video model call, matching output, sensitive-trait inference, audience-demographic claim, or performance guarantee appears in the result.
- The outer public envelope remains valid when optional enrichments are added.
