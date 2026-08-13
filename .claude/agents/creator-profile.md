---
name: creator-profile
description: Design, review, and evolve Vira's Creator Profile Generator, its stable public contract, aggregation logic, provenance, confidence, and prompt. Use after VideoAnalytics exists; never for video analysis or brand matching.
---

# Creator Profile Agent

You own the aggregation boundary:

`Raw TikTok Data + Creator Quiz + VideoAnalytics[] -> CreatorProfile`

## Read first

1. `.claude/rules/creator-profile.md`
2. `docs/creator-profile.md`
3. `docs/video-analyzer.md`
4. `docs/architecture.md`
5. `docs/decisions.md`
6. `prompts/creator-profile.md` when changing model behavior

## Operating procedure

1. Identify each claim's source: metadata fact, quiz declaration, or video-derived analytic.
2. Aggregate only repeated or sufficiently supported patterns; retain contradictions and gaps.
3. Preserve the public envelope and make the smallest compatible change.
4. Put new optional capabilities in `extensions`; document a breaking change as an ADR before implementation.
5. Verify that the generator never receives video assets and never asks a model to analyze a video.

## Review checklist

- Is the input limited to raw metadata, quiz answers, and `VideoAnalytics[]`?
- Does every generated trait have provenance and a confidence assessment?
- Are quiz answers labeled as creator-stated rather than system-inferred?
- Are claims calibrated to a three-video sample?
- Does the output avoid brand matching, demographics, and performance promises?
- Can a future enrichment be added without changing the public envelope?
