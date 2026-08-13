# Architecture Decisions

This file records decisions that affect Vira's AI Service contracts or architecture. New decisions use the next sequential identifier.

## ADR-001 — Keep the PoC limited to creator profiling

**Status:** accepted  
**Date:** 2026-08-05

**Decision:** Build only the path from three TikTok videos, raw TikTok data, and creator quiz to `VideoAnalytics[]` and `CreatorProfile`.

**Rationale:** This isolates the core evidence and profiling problem before adding brands or matching.

**Consequences:** No BrandProfile, campaign, or matching schema is introduced during the PoC. **Superseded in part by ADR-010:** `BrandProfile` is now in scope.

## ADR-002 — Analyze per video before aggregating

**Status:** accepted  
**Date:** 2026-08-05

**Decision:** The Video Analyzer emits one independent `VideoAnalytics` record per video. A separate Creator Profile Generator performs aggregation.

**Rationale:** Per-video records preserve traceability, enable debugging, and prevent a single model call from hiding conflicting evidence.

**Consequences:** The profile generator must reason conservatively across only three samples.

## ADR-003 — Separate source facts, observations, and inferences

**Status:** accepted  
**Date:** 2026-08-05

**Decision:** Raw TikTok fields and quiz answers remain source data. Analyzer observations cite evidence; model inferences include confidence and rationale.

**Rationale:** The profile must be explainable and resilient to missing data or model uncertainty.

**Consequences:** Schemas carry provenance and limitations rather than filling missing values with defaults.

## ADR-004 — Version contracts and prompts from the start

**Status:** accepted  
**Date:** 2026-08-05

**Decision:** The initial contracts and model prompt use version `v0.1`.

**Rationale:** Prompt or schema changes can otherwise silently change product behavior and invalidate evaluations.

**Consequences:** Breaking changes require a new version and a documented ADR.

## ADR-005 — Keep Creator Profile aggregation separate from video understanding

**Status:** accepted  
**Date:** 2026-08-05

**Decision:** The Creator Profile Generator consumes structured `VideoAnalytics[]`, raw TikTok metadata, and creator quiz answers; it does not access video assets or invoke a multimodal/video-analysis model.

**Rationale:** This keeps evidence extraction independently testable, avoids duplicate inference, and makes profile behavior traceable.

**Consequences:** Video understanding remains solely in Video Analyzer; profile aggregation can evolve independently.

## ADR-006 — Stabilize the CreatorProfile envelope and reserve extensions

**Status:** accepted  
**Date:** 2026-08-05

**Decision:** `CreatorProfile v0.1` exposes a stable envelope with profile, provenance, confidence, limitations, and extensions. Additive enrichment uses `extensions` until a versioned breaking change is approved.

**Rationale:** Downstream consumers can remain compatible while profile intelligence evolves.

**Consequences:** New top-level semantics require an ADR, contract version, and migration plan.

## ADR-007 — Add content_format, disclosure, and creator_presence to VideoAnalysis

**Status:** accepted
**Date:** 2026-08-08

**Decision:** Extend the Video Analyzer ontology (`video-analyzer-ontology-v4`, prompt `video-analyzer-v4`) with three scored fields: `content_format` (structural format — Talking-head, Voiceover+B-roll, Skit/Acting, Tutorial/How-to, Unboxing/Review, Vlog, Text-only), `disclosure` (Paid partnership disclosed, Affiliate/gifted product disclosed, No disclosure detected, No brand or product present), and `creator_presence` (On-camera, Voice-only, Not present). Each follows the existing `{value, confidence, evidence[]}` shape and closed-vocabulary/`unknown` convention.

**Rationale:** These are evidence-backed, per-video observations the model can support directly from the clip, and they matter to a brand-marketplace use case: format and on-camera presence describe how a creator produces content, and disclosure is a compliance-relevant signal that was previously unrepresented. `disclosure` keeps "no brand/product present" distinct from "no disclosure detected" — collapsing them would hide the difference between organic content and an undisclosed sponsorship, which is the actual risk signal.

**Consequences:** `VideoAnalysis` is a breaking shape change, so the ontology and prompt versions both bump to v4 (`ai-service/app/ai_client.py`, `prompts/video-analyzer-v4.md`). Since `VideoAnalytics`/`ClipAnalysis` payloads are stored and interpreted against their stamped `ontologyVersion`, older stored analyses remain valid under `-v3` and are not backfilled.

## ADR-008 — Add visual_description and audio_description to VideoAnalysis

**Status:** accepted
**Date:** 2026-08-08

**Decision:** Extend the Video Analyzer ontology (`video-analyzer-ontology-v5`, prompt `video-analyzer-v5`) with two free-text scored fields: `visual_description` (visible elements only — framing, creator presence, editing, lighting, on-screen text) and `audio_description` (audible elements only — language, voice delivery, narration/dialogue, music, sound effects). Each follows the existing `{value, confidence, evidence[]}` shape, but `value` is free text capped at 15 words instead of a closed vocabulary member, enforced by a Pydantic validator.

**Rationale:** The existing closed-vocabulary fields (`visual_style`, `tone`, `content_format`, etc.) each collapse a clip into one label; a short factual free-text description captures concrete, evidence-checkable detail a single label loses, without duplicating or reinterpreting those labels. Splitting visual and audio keeps each field's evidence independently traceable to what was seen versus heard, and the word cap keeps the field a description rather than an open door to inference or narrative.

**Consequences:** `VideoAnalysis` is a breaking shape change, so the ontology and prompt versions both bump to v5 (`ai-service/app/ai_client.py`, `prompts/video-analyzer-v5.md`). `visual_description`/`audio_description` values must not repeat a closed-vocabulary label (e.g. restating `visualStyle: Clean`) or infer personality, emotion, or intent — that remains the job of `tone`/`sentiment`. Since `VideoAnalytics`/`ClipAnalysis` payloads are stored and interpreted against their stamped `ontologyVersion`, older stored analyses remain valid under `-v4` and are not backfilled. The backend's `ClipAnalysisDto.Analysis` is a pass-through `JsonElement`, so no backend DTO change is required.

## ADR-009 — Expand hook and cta vocabularies

**Status:** accepted
**Date:** 2026-08-08

**Decision:** Extend the Video Analyzer ontology (`video-analyzer-ontology-v6`, prompt `video-analyzer-v6`) with additional closed-vocabulary members on two existing fields. `hook` gains `Problem/pain point`, `Curiosity/teaser`, and `Demonstration/result` alongside the existing `Question`, `Bold statement`, `Pattern interrupt`, `Before/after`, `Text-on-screen`, `None`. `cta` gains `Use promo code`, `Visit website`, `DM/Contact`, and `Enter giveaway` alongside the existing `Follow`, `Buy now`, `Link in bio`, `Comment`, `Save`, `Share`, `None`. The `cta` prompt guidance is also tightened: a CTA must be explicit (spoken or shown), a product mention/watermark/logo/generic sign-off does not count, and when several CTAs appear the model picks the single most commercially relevant one rather than representing all of them.

**Rationale:** The prior six-member hook vocabulary and seven-member CTA vocabulary missed common, evidence-observable openings (e.g. a clip that opens on a problem statement or a teased reveal) and common brand-relevant CTAs (promo codes, website visits, DMs, giveaways) that the model was previously forced to either mislabel against a near-miss member or drop to "unknown". Both fields stay closed-vocabulary and evidence-gated — the model still may not invent a member outside this list — because Vira's contract discipline (`.claude/rules/video-analyzer.md`) requires nullable/`unknown` over plausible-looking defaults, not an open-ended value set. A closed set is also what keeps the field usable for downstream brand matching, which needs a stable, small enum to filter/aggregate on rather than free-form model output.

**Consequences:** `VideoAnalysis.hook.value` and `VideoAnalysis.cta.value` are a breaking shape change (`HookLabel`/`CtaLabel` in `ai-service/app/models.py`), so the ontology and prompt versions both bump to v6 (`ai-service/app/ai_client.py`, `prompts/video-analyzer-v6.md`). Since `VideoAnalytics`/`ClipAnalysis` payloads are stored and interpreted against their stamped `ontologyVersion`, older stored analyses remain valid under `-v5` and are not backfilled.

## ADR-010 — Bring BrandProfile into PoC scope

**Status:** accepted
**Date:** 2026-08-11

**Decision:** Amend ADR-001: `BrandProfile` is in scope for this PoC alongside `CreatorPortrait`, to support a hybrid creator-brand matching mechanism — vector similarity (semantic fit, via pgvector embeddings) combined with a separate rule-based score contract (hard constraints). A persisted `Match`/ranking schema and campaign execution remain out of scope; matching is evaluated as an on-demand similarity query, not a stored ranking result.

**Rationale:** The PoC needs a defined brand-side counterpart to `CreatorPortrait` to demonstrate the hybrid matching approach end to end. Scoping in the data model without scoping in the full matching/ranking/campaign workflow keeps the change additive rather than reopening ADR-001's broader boundary.

**Consequences:** ADR-001's "no BrandProfile ... schema" consequence no longer holds; `CLAUDE.md` and `docs/architecture.md` are updated to match. A `BrandProfile` contract (mirroring `docs/creator-profile.md`) and its persistence schema are follow-up work and not yet specified. Component-level scope statements are unaffected: the Video Analyzer and Creator Profile Generator still do not perform brand profiling or matching themselves (`.claude/rules/video-analyzer.md`, `.claude/rules/creator-profile.md`, `docs/creator-profile.md`) — that responsibility belongs to a separate matching component consuming both `CreatorPortrait` and `BrandProfile`.

## ADR-011 — Resolve the portrait output contract in favour of CreatorPortrait

**Status:** accepted
**Date:** 2026-08-12

**Decision:** `CreatorPortrait` is the portrait output contract, superseding the `CreatorProfile v0.1` envelope in `docs/creator-profile.md` for the implemented lane. Its fields are `narrative_dossier` (free text), `style_vector` (the eight existing dimensions — `warmth`, `energy`, `authority`, `refinement`, `convention`, `humor`, `demonstration`, `intimacy` — each a float in `[0.0, 1.0]`), `provenance` (`ai_model`, `prompt_version`, `ontology_version`, `generated_at`), `confidence` (float in `[0.0, 1.0]`), `limitations` (list of text), and `extensions` (open object, reserved for additive enrichment). Three supporting changes follow: `StyleVector` moves from `int` 0–100 to bounded `float` 0–1; `PortraitRequest` gains `analyses: list[VideoAnalysisResult]`; and only `narrative_dossier`, `style_vector`, and model-observed `limitations` are model-generated — `provenance`, `confidence`, and deterministic `limitations` are computed in application code.

**Rationale:** `docs/backend-integration.md` records two competing designs for the same output — the doc's `CreatorProfile v0.1` envelope and the code's `CreatorPortrait`/`PortraitClaim` — and states that resolving them requires an ADR before `/portrait` is built out. `CreatorPortrait` wins because both the Python `TODO` and the .NET side (`CreatorPortrait.cs`, `PortraitDto`) already name it, so choosing it avoids introducing a third vocabulary. `provenance` becomes a public field rather than operational-only metadata because CLAUDE.md non-negotiable 8 requires every AI output to record the model, prompt, and ontology version that produced it, and the existing `ClipAnalysis` rows already stamp exactly those three. Keeping the eight existing dimension names preserves comparability with `Campaign.TargetStyleVector`; moving to 0–1 floats matches the resolution the scores actually carry, since the current `int` field enforces no range at all.

**Consequences:** `docs/creator-profile.md` becomes historical for the envelope shape; its aggregation policy and safety constraints still apply. `confidence` changes from `{overall, basis}` to a single float, so evidence-coverage reasoning moves into `limitations` and the documented confidence formula. `.claude/rules/creator-profile.md` is amended where it contradicts this decision. The .NET `StyleVector` must move `int` → `double` before portrait persistence lands; this is currently latent because `AiServiceClient` reads the response as an untyped `JsonElement` and discards it. `PortraitDto` and `PortraitRequestDto` remain follow-up work. Several style dimensions have no single source field in `video-analyzer-ontology-v6`, so they are model inferences over the analyses as a whole and must not be presented as measured facts.

## ADR-012 — Cap narrative_dossier length and fix its content priorities

**Status:** accepted
**Date:** 2026-08-12

**Decision:** `narrative_dossier` is capped at 80 words, enforced by a Pydantic validator reusing the word-boundary truncation helper introduced in ADR-008, with the cap held as a named constant. The prompt fixes what the dossier must spend those words on, in priority order: content pillars observed across the clips, production format and delivery style, tone, creator-stated preferences that materially change how the creator can be worked with, and the single most material conflict or gap. Prompt and ontology versions bump to `creator-profile-v2` / `creator-profile-ontology-v2`.

**Rationale:** `narrative_dossier` was unbounded free text, which creates two problems. First, ADR-010's hybrid matching embeds the dossier for vector similarity, and an embedding averages over everything in the text — hedging boilerplate and restated per-clip detail dilute the signal that makes a creator distinguishable from another creator in the same category. Second, an unbounded dossier drifts into re-narrating individual clips, duplicating content that already exists structurally in `analyses` and, after ADR-013, in `style_evidence`; prose is the worst of the three places to keep it, because it is the only one a consumer cannot query. A word cap forces selection, and a fixed priority order keeps that selection from silently dropping content pillars in favour of caveats. Truncating rather than raising `ValidationError` follows ADR-008's precedent: failing an entire portrait over a free-text field that ran long is a worse outcome than a shortened dossier, and here the call is one-per-creator and correspondingly expensive to retry.

**Superseded in part by ADR-015:** the 80-word cap and the leading priorities stand, but the final priority item — the single most material conflict or gap — is removed from the dossier and lives in `limitations` only, because the dossier became a reader-facing profile section.

**Consequences:** This tightens a constraint rather than changing a shape — a consumer reading `narrativeDossier` as a string is unaffected — but the prompt and ontology versions still bump, because a stored dossier is only interpretable against the generation rules that produced it. Portraits stamped `creator-profile-ontology-v1` remain valid and are not backfilled. Truncation is word-boundary but may still cut mid-sentence; the prompt states the cap explicitly so the model targets it and truncation stays a rare fallback rather than the normal path. Detail displaced from the dossier is not lost: it remains in the per-clip `analyses` and, per ADR-013, in `style_evidence`.

## ADR-013 — Add style_evidence to CreatorPortrait for match explainability

**Status:** accepted
**Date:** 2026-08-12

**Decision:** `CreatorPortrait` and `PortraitGeneration` gain `style_evidence`, a sibling of `style_vector` carrying one `DimensionEvidence` per style dimension: `confidence` (float in `[0.0, 1.0]`), `rationale` (Romanian free text, capped at 20 words), and `sources` (list of `{source, reference}`, where `source` is one of `video_analysis` or `cover_image`). All eight dimensions are present as typed fields, so completeness is schema-enforced rather than prompt-enforced. `style_vector` itself is unchanged: eight plain floats. Prompt and ontology versions bump to `creator-profile-v2` / `creator-profile-ontology-v2`.

**Rationale:** ADR-010 commits to a hybrid match score that a brand will see as a percentage and will expect explained. That explanation has two halves, and they belong to different components. Which dimension contributed how much is arithmetic over the creator vector and the campaign target vector — computable at match time, and the matching component's job. Why the creator scores 0.85 on `warmth` is not recoverable at match time at all: the matcher sees two vectors and never sees the clips, the analyses, or the cover images. Only the generator holds that evidence, and only while it is generating. Without recording it there, the best explanation the product can ever produce is "her warmth score is high", which restates the number rather than justifying it. Nesting the evidence inside `StyleVector` — making each axis a `{value, confidence, evidence}` object, as the Video Analyzer does — was rejected: cosine similarity, pgvector indexing, and comparability with `Campaign.TargetStyleVector` all require eight plain floats, and turning each axis into an object forces every numeric consumer through `.value` while taking the field out of the shape a vector index accepts. A sibling field keeps the math path clean and the justification adjacent. Per-dimension `confidence` additionally repairs a real weakness in prompt v1, which instructs the model to use `0.5` where no signal exists: that is indistinguishable from a genuine mid-scale observation, whereas `0.5` with confidence `0.1` and an explicit "no grounding" rationale is honest and lets a matcher down-weight the axis. Restricting `source` to `video_analysis` and `cover_image` moves a rule that was previously prompt-only (`.claude/rules/creator-profile.md`: style scores derive from clip evidence, never from stated preferences or reach) into the type system.

**Consequences:** `PortraitGeneration` is a breaking shape change, so prompt and ontology bump to v2 together with ADR-012; portraits stamped `creator-profile-ontology-v1` remain valid and are not backfilled. References are positional and their traceability is currently limited: `VideoAnalysisResult` carries no clip identifier, so an `analyses[i]` reference is positional within one request and cannot be joined back to a `CreatorClip`, and `PortraitRequest.clips` and `PortraitRequest.analyses` are separate lists with no join key, so index correspondence between them is conventional rather than guaranteed. Adding `tik_tok_video_id` to `VideoAnalysisResult` (mirroring the backend's `ClipAnalysisDto`) is the follow-up that closes this. Cover-image content blocks must be labelled with their clip index during assembly, because null `coverImageUrl` values are filtered out and the model's image ordering would otherwise not correspond to `clips[i]`. This does not move matching into the generator: it emits per-axis grounding only, and still composes no score, ranking, or brand comparison, so the ADR-005 boundary holds. The .NET `PortraitDto` gains the field when portrait persistence lands.

**Superseded in part by ADR-014:** `sources: list[StyleEvidenceRef]` (positional `analyses[i]`/`clips[i]` references) is replaced with `evidence_clip_ids: list[str]` (real `tikTokVideoId` values), closing the positional-traceability gap named above instead of leaving it as follow-up.

## ADR-014 — Cite style evidence by tikTokVideoId, not by array position

**Status:** accepted
**Date:** 2026-08-12

**Decision:** `DimensionEvidence.sources: list[StyleEvidenceRef]` is replaced with `DimensionEvidence.evidence_clip_ids: list[str]`, each a `tikTokVideoId` that must belong to a clip in the same request. `StyleEvidenceRef` and its `source: "video_analysis" | "cover_image"` distinction are removed — a real clip ID already guarantees the citation is clip-grounded (not questionnaire- or engagement-derived), which was the property that field existed to enforce, so keeping the distinction on top adds a value nothing downstream reads. `VideoAnalysisResult` gains a required `tik_tok_video_id: str` field so a video-analysis-grounded citation has a real ID to point at; without it this decision has nothing to cite. Application code validates every citation after generation: an `evidence_clip_ids` value must equal the `tikTokVideoId` of a clip that actually had evidence sent to the model for this request — analyzed (present in `req.analyses` by that ID) or visually available (`req.clips` entry with that ID and a non-null `coverImageUrl`) — not merely present in `req.clips`, since a clip can exist in the request with neither. A citation failing this check is dropped and a limitation is recorded rather than passed through. Prompt and ontology versions bump to `creator-profile-v3` / `creator-profile-ontology-v3`.

**Rationale:** ADR-013 shipped `sources` with positional references (`"analyses[0].tone"`, `"clips[1].coverImage"`) and named the resulting traceability gap in its own consequences: `analyses[i]` cannot be joined back to a `CreatorClip` because `VideoAnalysisResult` carries no clip identifier, and `clips[]`/`analyses[]` correspondence is conventional, not guaranteed. That gap is not cosmetic — the entire point of `style_evidence` is to let a brand ask "why does this creator score high on warmth" and receive something concrete, and a positional index is neither independently verifiable by application code nor meaningful once handed to a consumer outside this one request/response pair. A real `tikTokVideoId` is: it is the identifier already used everywhere else in the contract (`Clip.tik_tok_video_id`, TikTok embed links), it survives being handed to a downstream consumer, and — critically — it can be checked. Validating citations against the request's actual evidence closes the last gap ADR-013 left open (traceability), rather than leaving it as named follow-up work; it also gives the generator a concrete defence against a model citing a clip that was never actually analyzed, which a positional reference could not catch even in principle, since any in-range index parses as "valid" whether or not it supports the score.

**Consequences:** `PortraitGeneration.style_evidence[*].sources` is a breaking shape change to `evidence_clip_ids`; prompt and ontology bump to v3, and portraits stamped `creator-profile-ontology-v1`/`-v2` remain valid and are not backfilled. `VideoAnalysisResult.tik_tok_video_id` is a new required field, so every caller constructing one — test fixtures, and eventually the .NET `PortraitRequestAssembler` — must supply it; the backend does not yet populate it when assembling a portrait request, so this stays exercised through fixtures until that assembler work lands, consistent with the other .NET gaps already named in ADR-011 and ADR-013. `ai_client.py`'s cover-image blocks are now labelled with the clip's `tikTokVideoId` rather than its array index, since that is what the model must cite. The router-level validation step means a portrait can now contain a `limitations` entry describing a rejected citation, which is expected to be rare and is itself useful signal: it means the model tried to ground a score in evidence it did not actually have.

## ADR-015 — Write narrative_dossier as reader-facing "Despre creator" copy

**Status:** accepted
**Date:** 2026-08-12

**Decision:** `narrative_dossier` is written as the "Despre creator" section of the creator's public profile in the app, not as an internal analyst summary. The prompt fixes the register: Romanian prose, full sentences, present tense, third person, no headings, bullets, markdown, emoji, or direct address; it must not restate name, handle, category, city, or follower count (the surrounding UI already renders them), and must not mention Vira, the analysis, the clip sample or its size, the questionnaire as an artifact, any field name, or any score. The ADR-012 priority order keeps its first four items — content pillars, production format and delivery, tone, and creator-stated preferences that materially shape a collaboration — and drops its fifth: the most material conflict or gap is no longer narrated in the dossier and is recorded in `limitations` only. Observed and creator-stated material stay distinguishable through ordinary Romanian attribution ("declară", "spune că", "preferă") rather than through labelling. The 80-word cap, its truncation behaviour, and every safety constraint (no sensitive traits, no demographics, no purchasing intent, no reach-to-quality inference) are unchanged. Prompt version bumps to `creator-profile-v4`; the ontology version stays `creator-profile-ontology-v3`.

**Rationale:** the dossier now has a named consumer — the profile surface a brand reads before deciding whether to look further — and the v3 text is written for a different reader. Two of its instructions actively break on that surface. First, the mandated conflict-or-gap sentence: a public "about" section that ends by disclosing that the evidence is thin reads as a defect in the creator rather than as the honest caveat it is meant to be, and the information is not lost by moving it, because `limitations` already carries exactly this and is not rendered next to the dossier. Second, nothing in v3 stopped the model from opening with analytical preamble ("Pe baza clipurilor analizate…") or from repeating the name, category, and follower count that the profile card renders directly above the text — both are wasted words against an 80-word budget that ADR-012 deliberately made scarce. Fixing the register in the prompt rather than post-processing in the frontend keeps the constraint where the word budget is spent: a frontend cannot recover words the model already spent on preamble. The ontology version does not move because ADR-013's shape — eight dimensions, `DimensionEvidence`, the four generated fields — is untouched; `prompt_version` is the field that distinguishes a v3 dossier from a v4 one, and bumping the ontology for a prose change would make the two versions permanently redundant.

**Consequences:** `PortraitGeneration` is unchanged, so no consumer breaks and no code beyond the version constant moves. Prompt and ontology versions diverge for the first time at the moment this lands (`creator-profile-v4` / `creator-profile-ontology-v3`), which is the intended use of two fields rather than one; ADR-016 subsequently moves the ontology to v4 for its own, unrelated reason. Dossiers stamped `creator-profile-v3` and earlier were written in the analyst register and are not backfilled, so any UI rendering stored portraits will show mixed registers until they are regenerated. The dossier is now reader-facing product copy: it is the first portrait field where a change in prose style is a user-visible product change, and it should be reviewed as such. `limitations` becomes strictly internal — it now carries gaps that no longer appear anywhere else, so a surface that displays it to brands would present the caveats without the context the dossier used to give them.

## ADR-016 — Surface detected brands as observed_products, computed not generated

**Status:** accepted
**Date:** 2026-08-12

**Decision:** `CreatorPortrait` gains `observed_products: list[ObservedProduct]`, one row per distinct brand found in the request's `analyses[*].analysis.products`, with `name`, `clip_ids` (the `tikTokVideoId`s it appeared in), `confidence` (the maximum across its appearances), `disclosed`, and `declared_by_creator`. It is computed in `app/routers/portrait.py` from the request, never model-generated, and `PortraitGeneration` — the model's output schema — is untouched. `disclosed` is True only when a clip carrying the product declared `"Paid partnership disclosed"` or `"Affiliate/gifted product disclosed"`; every other `DisclosureLabel`, including `"No disclosure detected"`, leaves it False. `declared_by_creator` is True when the brand matches a `Questionnaire.prior_sponsorships` entry. Brand names are deduped on a case-folded, whitespace-collapsed key. The portrait composes no score, ranking, or brand comparison over this field. `narrative_dossier` still must not name brands (ADR-015). Ontology version bumps to `creator-profile-ontology-v4`; the prompt is unchanged at `creator-profile-v4`.

**Rationale:** the Video Analyzer already extracts brands with confidence, timestamps, and a clip ID, and the portrait discarded all of it — the information entered the prompt and left no trace in the output, so no consumer could reach it without re-reading the raw analyses. It belongs in the portrait because it answers questions the rest of the envelope cannot: which brands a creator has already featured is the input to brand-affinity and conflict-of-interest screening under ADR-010's matching, and neither `style_vector` nor the dossier can carry it. Computing it rather than generating it follows ADR-011's split — provenance, confidence, and deterministic limitations are application code, and only judgment is the model's. Brand extraction is not judgment: the names are in the request, so asking the model to re-emit them adds a way to invent a brand and no way to detect one. The alternative of putting it in `narrative_dossier` was rejected on evidence, not on space: the clips carrying products in the reference fixture are `"No disclosure detected"`, so naming a brand in reader-facing profile copy asserts a partnership the analysis never observed, collapsing the fact/inference boundary rule 3 exists to hold. `declared_by_creator` exists because the questionnaire's `prior_sponsorships` and the observed record are the same kind of claim from the two sources rule 5 forbids reconciling silently: in the reference fixture, MyProtein and Belbake are both declared and observed, while Digenzym Plus is observed in a clip and declared nowhere. Recording the two independently makes that divergence readable instead of resolving it in one direction.

**Consequences:** this is an additive envelope change, so `observed_products` bumps the ontology to v4 while the prompt stays at v4 — the two version fields now move independently in both directions, which is what ADR-015 established them for. Portraits stamped earlier ontologies remain valid and are not backfilled; a consumer reading the field on an old portrait sees an empty list, which is indistinguishable from a creator whose clips contained no products, so absence must not be read as evidence of absence across versions. The dedupe key is deliberately naive: it merges `"MyProtein"`/`"myprotein"` but not `"MyProtein"`/`"My Protein"`, which will over-count some brands. Fixing that properly is entity resolution, and inventing the equivalence is worse than reporting two rows, so the naive key stands until a real need appears. `confidence` takes the maximum across appearances because the claim is that the brand was observed at all, and one clear sighting establishes it. The field is evidence, not a verdict: it says a product was on screen, not that the creator has a relationship with the brand, and any surface rendering it must carry `disclosed` alongside the name or it will read as a sponsorship list. Vira's .NET `PortraitDto` gains the field when portrait persistence lands, alongside the ADR-011/013 gaps already named there.
