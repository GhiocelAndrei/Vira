# Video Analyzer Rules

Apply these rules to every task concerning the Video Analyzer.

## Scope

The PoC input is exactly three creator-owned TikTok videos, their raw TikTok data, and a creator quiz. The output is `VideoAnalytics[]`, followed by a `CreatorProfile`.

Out of scope: brand profiles, creator-brand matching, campaign recommendations, payment, fraud detection, TikTok publishing, and production ingestion infrastructure.

## Source of truth and provenance

1. Raw TikTok data and creator quiz answers are immutable source inputs.
2. A video observation must cite its source video ID and evidence (timestamp/range where applicable).
3. An inference must be labeled as an inference, include confidence, and never be presented as a raw fact.
4. Missing or insufficient evidence must produce `unknown` / `insufficient_evidence`, not a guess.
5. Do not infer sensitive traits or protected characteristics.

## Contract discipline

- Follow the schemas and enums in `docs/video-analyzer.md`.
- Add fields only through an explicit decision in `docs/decisions.md` and a version increment.
- Prefer nullable/unknown fields over plausible-looking defaults.
- Keep per-video analytics independent; aggregation happens only in the profile generator.

## Quality and safety

- Use Romanian-facing labels and examples unless a task states otherwise.
- Analyze the content and communication style, not the creator's worth or identity.
- Avoid definitive claims about commercial results, audience demographics, or performance causality when those data are absent.
- Keep prompt instructions under `prompts/` (one file per version, e.g. `prompts/video-analyzer-v3.md`); do not duplicate long prompts in source code or root instructions.
