# Creator Profile Rules

Apply these rules to every Creator Profile Generator task.

## Scope and boundary

The generator receives creator metadata and aggregates, creator quiz answers, and the per-clip analyses (`VideoAnalysisResult[]`). It returns one stable `CreatorPortrait` envelope.

It does **not** inspect video assets, perform video understanding, call Gemini or another multimodal model, create `VideoAnalytics`, or perform creator-brand matching. Those responsibilities belong to other components.

## Source hierarchy and provenance

1. `raw_tiktok_data` is immutable factual source data.
2. Quiz answers are immutable **creator-stated** preferences, not verified facts.
3. `VideoAnalytics` is the only source for video-derived observations and inferences.
4. Every statement in the dossier must be supported by the supplied analyses, questionnaire, or metadata — do not assert anything the inputs do not carry. `CreatorPortrait` still has no `claims[]` field, so for `narrative_dossier` this rule is upheld by the prompt, not by the type system. It *is* schema-enforced for the style dimensions: ADR-013/ADR-014's `style_evidence` requires a rationale and `evidence_clip_ids` for all eight, and a citation must be a real `tikTokVideoId` the model was actually shown (application code drops and flags any citation that isn't) — a style score may never be grounded in quiz answers or engagement counts, since those have no clip ID to cite.
5. Conflicts remain visible. Do not silently choose one source or fabricate consensus.
6. Missing evidence remains `unknown`; three samples do not establish a permanent trait.

## Public-contract discipline

- Follow the `CreatorPortrait` contract in ADR-011, as amended by ADR-012, ADR-013, and ADR-014 (`docs/decisions.md`). `docs/creator-profile.md` is historical for the envelope shape; its aggregation policy and safety constraints still apply.
- Keep the outer `CreatorPortrait` envelope backward-compatible: `narrative_dossier`, `style_vector`, `style_evidence`, `observed_products`, `provenance`, `confidence`, `limitations`, `extensions`.
- `observed_products` is computed from `analyses[*].analysis.products` in application code, never model-generated (ADR-016). A row states that a brand was on screen — not that the creator has a relationship with it; keep `disclosed` next to the name wherever it is rendered.
- `style_vector` stays eight plain floats (ADR-013) — it feeds cosine similarity and pgvector indexing. Explanation for a score belongs in `style_evidence`, never nested into the vector.
- `narrative_dossier` is capped at 80 words (ADR-012). It summarises; it does not re-narrate clips whose detail already lives in `analyses` and `style_evidence`. Per ADR-015 it is the app's reader-facing "Despre creator" copy: profile prose, no analytical preamble, no field names or scores, and no conflicts or gaps — those go to `limitations`, which stays internal.
- Add future enrichment only inside `extensions` unless a documented, versioned contract change is approved in `docs/decisions.md`.
- Stamp `provenance` (`ai_model`, `prompt_version`, `ontology_version`, `generated_at`) on every portrait — it is a public field per ADR-011, and CLAUDE.md rule 8 requires every AI output to record the versions that produced it. Fill it in application code, never from model output.

## Quality and safety

- Use concise, neutral Romanian for generated labels and summaries.
- Distinguish observed patterns, creator-stated preferences, and metadata facts.
- Do not infer sensitive/protected traits, precise audience demographics, purchasing intent, or commercial performance.
- Do not turn raw engagement counts into causal quality or audience-fit claims.
- Keep model instructions in `prompts/<CREATOR_PROFILE_PROMPT_VERSION>.md` (currently `prompts/creator-profile-v4.md`), one file per version, not in application code.
