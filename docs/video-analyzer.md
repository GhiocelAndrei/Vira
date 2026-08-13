# Video Analyzer — PoC Specification

**Status:** approved initial contract  
**Contract version:** `v0.1`

## Objective

Convert three TikTok videos plus their raw TikTok metadata into explainable, per-video `VideoAnalytics` records. Those records are the only analytical input to the Creator Profile Generator, alongside the creator quiz.

## Inputs

### AnalysisRequest

| Field | Type | Rules |
|---|---|---|
| `contract_version` | string | Must be `v0.1`. |
| `creator_id` | string | Stable internal identifier. |
| `videos` | array of 3 `VideoInput` | Exactly three, unique `video_id` values. |
| `creator_quiz` | object | Creator-supplied answers; retained unchanged. |

### VideoInput

| Field | Type | Rules |
|---|---|---|
| `video_id` | string | Stable TikTok/internal ID. |
| `video` | asset reference | Video or secure reference supplied to analyzer. |
| `raw_tiktok_data` | object | Original metadata payload, unmodified. |

Raw TikTok data may include caption, hashtags, music, publish time, duration, views, likes, comments, shares, and URL. Field availability is not guaranteed.

## Per-video output

### VideoAnalytics

```json
{
  "contract_version": "v0.1",
  "analytics_id": "va_<id>",
  "video_id": "<source-video-id>",
  "status": "complete | insufficient_evidence | failed",
  "observations": [],
  "inferences": [],
  "summary": "Short factual analysis summary",
  "limitations": []
}
```

### Observation

An observation is directly supportable by the video or raw metadata.

```json
{
  "category": "format | hook | delivery | visual_style | topic | structure | call_to_action | metadata",
  "label": "controlled vocabulary or concise Romanian label",
  "value": "string | number | boolean | unknown",
  "evidence": [{"source": "video | raw_tiktok_data", "reference": "timestamp, range, or field path"}]
}
```

### Inference

An inference is a bounded interpretation built from observations.

```json
{
  "dimension": "communication_style | content_pillar | production_style | audience_fit_hint",
  "label": "concise Romanian label",
  "confidence": "low | medium | high",
  "evidence_observation_indexes": [0],
  "rationale": "Brief explanation grounded in observations"
}
```

`audience_fit_hint` means only the apparent content appeal. It must not claim audience demographics or commercial performance.

## Expected analysis dimensions

Analyze only where evidence exists:

- format and opening hook;
- topic/content pillar visible in the clip;
- spoken/written delivery and tone;
- visual and editing style;
- narrative structure and call-to-action;
- caption/hashtag/audio metadata when supplied.

## CreatorProfile handoff

The Creator Profile Generator is specified in `docs/creator-profile.md`. It receives `VideoAnalytics[]`, raw TikTok metadata, and quiz answers as separate sources. The stable `CreatorProfile` public envelope is defined there; this component does not own or extend that contract.

## Acceptance criteria

- Exactly one `VideoAnalytics` record for each submitted video.
- Each observation has evidence from its own video or metadata.
- Each inference has confidence and observation references.
- Unknown/missing inputs are stated in `limitations`.
- No sensitive-trait inference, invented statistic, audience demographic claim, or cross-video conclusion in per-video analytics.
