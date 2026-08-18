from datetime import datetime
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from pydantic.alias_generators import to_camel


class StyleVector(BaseModel):
    """8 scored style dimensions, 0.0-1.0 each (ADR-011).

    Deliberately eight plain floats and nothing else: this is the vector that feeds cosine
    similarity, pgvector indexing, and comparison against ``Campaign.TargetStyleVector``. Why a
    dimension scored what it did lives in ``StyleEvidence`` alongside it, never nested in here
    (ADR-013).
    """
    warmth: float = Field(default=0.0, ge=0, le=1)
    energy: float = Field(default=0.0, ge=0, le=1)
    authority: float = Field(default=0.0, ge=0, le=1)
    refinement: float = Field(default=0.0, ge=0, le=1)
    convention: float = Field(default=0.0, ge=0, le=1)
    humor: float = Field(default=0.0, ge=0, le=1)
    demonstration: float = Field(default=0.0, ge=0, le=1)
    intimacy: float = Field(default=0.0, ge=0, le=1)


# ── Portrait request contract ──────────────────────────────────────────────────────────────
# Mirrors PortraitRequestDto on the .NET side. The backend serializes camelCase + string enums;
# these models accept both the alias (camelCase) and the field name via populate_by_name.
# Enum *values* must match the C# member names exactly (e.g. "Ugc", "PaidPost").


class CreatorCategory(str, Enum):
    food = "Food"
    sport = "Sport"
    tech = "Tech"
    beauty = "Beauty"
    travel = "Travel"
    comedy = "Comedy"
    education = "Education"
    lifestyle = "Lifestyle"
    gaming = "Gaming"
    music = "Music"


class TravelWillingness(str, Enum):
    none = "None"
    same_county = "SameCounty"
    nationwide = "Nationwide"
    out_of_country = "OutOfCountry"


class Clip(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    tik_tok_video_id: str = Field(alias="tikTokVideoId")
    title: str | None = None
    cover_image_url: str | None = Field(default=None, alias="coverImageUrl")
    embed_link: str | None = Field(default=None, alias="embedLink")
    view_count: int = Field(alias="viewCount")
    like_count: int = Field(alias="likeCount")
    comment_count: int = Field(alias="commentCount")
    share_count: int = Field(alias="shareCount")
    tik_tok_create_time: datetime = Field(alias="tikTokCreateTime")


class Aggregates(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    avg_views: int = Field(alias="avgViews")
    avg_likes: int = Field(alias="avgLikes")
    avg_comments: int = Field(alias="avgComments")
    avg_shares: int = Field(alias="avgShares")
    engagement_rate: float = Field(alias="engagementRate")  # ratio 0..1 — not money


class PriorSponsorship(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    brand_name: str = Field(alias="brandName")
    category: CreatorCategory


class Questionnaire(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    preferred_categories: list[CreatorCategory] = Field(default_factory=list, alias="preferredCategories")
    excluded_categories: list[CreatorCategory] = Field(default_factory=list, alias="excludedCategories")
    accepts_shipped_products: bool = Field(default=False, alias="acceptsShippedProducts")
    can_purchase_products: bool = Field(default=False, alias="canPurchaseProducts")
    travel_willingness: TravelWillingness = Field(default=TravelWillingness.none, alias="travelWillingness")
    goals: list[str] = Field(default_factory=list)
    values: list[str] = Field(default_factory=list)
    preferred_formats: list[str] = Field(default_factory=list, alias="preferredFormats")
    content_languages: list[str] = Field(default_factory=list, alias="contentLanguages")
    excluded_brands: list[str] = Field(default_factory=list, alias="excludedBrands")
    allows_alcohol: bool = Field(default=False, alias="allowsAlcohol")
    allows_gambling: bool = Field(default=False, alias="allowsGambling")
    allows_political: bool = Field(default=False, alias="allowsPolitical")
    collab_capacity_per_month: int = Field(default=0, alias="collabCapacityPerMonth")
    self_described_audience: str = Field(default="", alias="selfDescribedAudience")
    prior_sponsorships: list[PriorSponsorship] = Field(default_factory=list, alias="priorSponsorships")


class PortraitRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    creator_id: str = Field(alias="creatorId")  # Guid serializes as a string
    display_name: str = Field(alias="displayName")
    follower_count: int = Field(alias="followerCount")
    category: CreatorCategory
    city: str | None = None
    county: str | None = None
    clips: list[Clip] = Field(default_factory=list)
    aggregates: Aggregates
    questionnaire: Questionnaire
    # ADR-011: the generator's primary evidence source. Forward-referenced because
    # VideoAnalysisResult is defined later in this module (Video Analyzer contract below);
    # resolved via PortraitRequest.model_rebuild() once that class exists.
    analyses: list["VideoAnalysisResult"] = Field(default_factory=list)


class CreatorSummary(BaseModel):
    """Lightweight row from GET /creators — mirrors the backend CreatorSummaryDto."""
    model_config = ConfigDict(populate_by_name=True)
    id: str
    display_name: str = Field(alias="displayName")
    category: CreatorCategory
    follower_count: int = Field(alias="followerCount")
    city: str | None = None
    clip_count: int = Field(alias="clipCount")


# ── Video Analyzer contract ────────────────────────────────────────────────────────────────
# Note: the video-analysis payload is posted to the backend as a raw JSON dict (pass-through) — the
# backend stores it verbatim as JSONB and types only the version stamps (ClipAnalysisDto). The
# authored shape is therefore this module plus prompts/video-analyzer.md; nothing downstream
# validates it, so the ontology below is enforced here or nowhere.
# See BackendClient.post_clip_analysis.
#
# The Literal unions *are* the ontology: changing a member is an ontology_version bump, because a
# stored analysis is only interpretable against the version stamped on it. "unknown" is a member of
# every vocabulary — insufficient evidence is recorded, never guessed.

TopicLabel = Literal[
    "Beauty", "Fashion", "Food", "Fitness", "Tech", "Comedy",
    "Lifestyle", "Travel", "Gaming", "Finance", "Parenting", "Home", "unknown",
]
ToneLabel = Literal[
    "Educational", "Entertaining", "Inspirational", "Comedic", "Promotional",
    "Raw/Authentic", "unknown",
]
VisualStyleLabel = Literal["Clean", "Cinematic", "Raw/UGC", "Trendy", "Minimal", "unknown"]
HookLabel = Literal[
    "Question", "Bold statement", "Pattern interrupt", "Before/after",
    "Text-on-screen", "Problem/pain point", "Curiosity/teaser", "Demonstration/result",
    "None", "unknown",
]
CtaLabel = Literal[
    "Follow", "Buy now", "Link in bio", "Comment", "Save", "Share",
    "Use promo code", "Visit website", "DM/Contact", "Enter giveaway", "None", "unknown",
]
SentimentLabel = Literal["Positive", "Neutral", "Negative", "unknown"]
BrandSafetyLabel = Literal["Safe", "Caution", "Unsafe", "unknown"]
ContentFormatLabel = Literal[
    "Talking-head", "Voiceover+B-roll", "Skit/Acting", "Tutorial/How-to",
    "Unboxing/Review", "Vlog", "Text-only", "unknown",
]
DisclosureLabel = Literal[
    "Paid partnership disclosed", "Affiliate/gifted product disclosed",
    "No disclosure detected", "No brand or product present", "unknown",
]
CreatorPresenceLabel = Literal["On-camera", "Voice-only", "Not present", "unknown"]


class Evidence(BaseModel):
    """Where a scored value came from. Rule 7: no claim without evidence."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    source: Literal["video", "raw_tiktok_data"]
    reference: str   # timestamp or range inside the clip, e.g. "0:05-0:09"


# One scored type per field rather than a shared generic: the whole point is that each field
# carries its *own* closed vocabulary, which a single reusable wrapper cannot express.


class ScoredTopic(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: TopicLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class ScoredTone(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: ToneLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class ScoredVisualStyle(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: VisualStyleLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


def _truncate_to_max_words(value: str, limit: int = 15) -> str:
    """Gemini's structured output honors the prompt's word cap as a hint, not a hard schema
    constraint (JSON schema has no word-count keyword), so it sometimes overshoots. Truncating
    here keeps the contract's 15-word cap actually true of the data instead of a 500 on the
    (common) case where the model runs long — a raised ValidationError would fail the whole
    per-video analysis over a single free-text field."""
    words = value.split()
    return value if len(words) <= limit else " ".join(words[:limit])


class ScoredVisualDescription(BaseModel):
    """Free-text description of visible elements only: framing, creator presence, editing,
    lighting, and on-screen text. Distinct from visual_style, which scores a closed vocabulary —
    this field describes what is seen without classifying it."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: str
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]

    @field_validator("value")
    @classmethod
    def _check_max_words(cls, v: str) -> str:
        return _truncate_to_max_words(v)


class ScoredAudioDescription(BaseModel):
    """Free-text description of audible elements only: language, voice delivery,
    narration/dialogue, music, and sound effects. Never infers personality, emotion, or intent."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: str
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]

    @field_validator("value")
    @classmethod
    def _check_max_words(cls, v: str) -> str:
        return _truncate_to_max_words(v)


class ScoredHook(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: HookLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class ScoredCta(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: CtaLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class ScoredSentiment(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: SentimentLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class ScoredBrandSafety(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: BrandSafetyLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class ScoredContentFormat(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: ContentFormatLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class ScoredDisclosure(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: DisclosureLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class ScoredCreatorPresence(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: CreatorPresenceLabel
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class ProductMention(BaseModel):
    """A brand/product named or shown in the clip. Open vocabulary, but still evidence-backed —
    naming a brand is exactly the kind of claim rule 7 exists for."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    value: str
    confidence: float = Field(ge=0, le=1)
    evidence: list[Evidence]


class VideoAnalysis(BaseModel):
    """Structured output contract for the Video Analyzer agent (D8 vision lane).

    Every scored field is ``{value, confidence, evidence[]}`` so a label can be traced back to the
    moment in the clip that produced it. ``subtopics`` stays a plain list: free-form tags have no
    closed vocabulary and no single timestamp to point at.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    topic: ScoredTopic
    subtopics: list[str]
    tone: ScoredTone
    visual_style: ScoredVisualStyle
    visual_description: ScoredVisualDescription
    audio_description: ScoredAudioDescription
    content_format: ScoredContentFormat
    creator_presence: ScoredCreatorPresence
    hook: ScoredHook
    products: list[ProductMention]
    disclosure: ScoredDisclosure
    cta: ScoredCta
    sentiment: ScoredSentiment
    brand_safety: ScoredBrandSafety


class VideoAnalysisResult(BaseModel):
    """Wraps VideoAnalysis with the model/prompt/ontology provenance rule 8 requires.

    Mirrors the backend's ``ClipAnalysisDto`` field for field — this is the exact body
    ``BackendClient.post_clip_analysis`` sends. The names differ deliberately: here there is only
    an uploaded video (``POST /video-analyzer`` accepts files with no clip in the DB at all), and
    it becomes a *clip* analysis at ingest, once the backend resolves it to a ``CreatorClip``.
    Beware the backend's ``ClipAnalysis``, which is a third shape again: the persisted row, adding
    ``ClipId`` and storing the body as an ``AnalysisJson`` string.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    # Required so a style-evidence citation grounded in this analysis has a real clip ID to point
    # at (ADR-014) — the .NET assembler does not populate this yet; see ADR-014's consequences.
    tik_tok_video_id: str
    analysis: VideoAnalysis
    ai_model: str
    prompt_version: str
    ontology_version: str
    analyzed_at: datetime


PortraitRequest.model_rebuild()


# ── Creator Portrait contract (ADR-011) ────────────────────────────────────────────────────
# Two models, deliberately: PortraitGeneration is the only one passed to output_format= — the
# model decides narrative_dossier, style_vector, and any limitations it can itself observe.
# provenance and confidence are never model-generated (asking a model for its own version
# string invites it to invent one; confidence is arithmetic, not judgment) — both are computed
# in app/routers/portrait.py and assembled into CreatorPortrait, the public envelope.
#
# No claims[]/PortraitClaim yet: for narrative_dossier, per-statement evidence links are not
# enforced by this schema, only by the prompt. See .claude/rules/creator-profile.md rule 4. The
# style dimensions are the exception — StyleEvidence below makes their grounding schema-enforced.

# Word caps, as named constants rather than inline literals (CLAUDE.md rule 8).
DOSSIER_MAX_WORDS = 80          # ADR-012
STYLE_RATIONALE_MAX_WORDS = 20  # ADR-013


class DimensionEvidence(BaseModel):
    """Why one StyleVector dimension scored what it did (ADR-013/ADR-014).

    The matching component can compute *how much* a dimension moved a match score from the two
    vectors alone, but never *why* the creator sits where they do on that axis — it sees no clips
    and no analyses. That half of the explanation exists only here, at generation time.

    ``confidence`` is per-dimension and model-generated, distinct from ``CreatorPortrait.confidence``
    (deterministic evidence coverage, computed in application code). It exists so a dimension the
    analyses could not ground reads as 0.5 with low confidence, rather than being indistinguishable
    from a genuine mid-scale observation.

    ``evidence_clip_ids`` cites real ``tikTokVideoId`` values, not array positions (ADR-014) — a
    real ID is independently verifiable (app/routers/portrait.py checks each one against what was
    actually sent to the model) and survives being handed to a consumer outside this request, unlike
    a positional reference such as ``"analyses[0].tone"``. Citing a clip ID already guarantees the
    score is clip-grounded rather than derived from the questionnaire or engagement counts, so there
    is no separate source-type field to enforce that distinction.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    confidence: float = Field(ge=0, le=1)
    rationale: str
    evidence_clip_ids: list[str] = Field(default_factory=list)

    @field_validator("rationale")
    @classmethod
    def _check_max_words(cls, v: str) -> str:
        return _truncate_to_max_words(v, STYLE_RATIONALE_MAX_WORDS)


class StyleEvidence(BaseModel):
    """One DimensionEvidence per StyleVector axis, same eight names.

    Typed fields rather than a dict so all eight are required by the schema: a silently missing
    axis would read downstream as "no explanation available", which is the exact failure this
    field exists to prevent.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    warmth: DimensionEvidence
    energy: DimensionEvidence
    authority: DimensionEvidence
    refinement: DimensionEvidence
    convention: DimensionEvidence
    humor: DimensionEvidence
    demonstration: DimensionEvidence
    intimacy: DimensionEvidence


class PortraitGeneration(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    narrative_dossier: str
    style_vector: StyleVector
    style_evidence: StyleEvidence
    limitations: list[str] = Field(default_factory=list)

    @field_validator("narrative_dossier")
    @classmethod
    def _check_max_words(cls, v: str) -> str:
        # Truncate rather than raise, for ADR-008's reason: failing a whole portrait over a
        # free-text field that ran long is the worse outcome, and this call is one per creator.
        return _truncate_to_max_words(v, DOSSIER_MAX_WORDS)


class Provenance(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    ai_model: str
    prompt_version: str
    ontology_version: str
    generated_at: datetime


class PortraitUsage(BaseModel):
    """Token/cost accounting for the Claude call that produced a portrait.

    Local testing/billing-estimate data, not a stable contract field — lives under
    CreatorPortrait.extensions rather than the top-level envelope (ADR-006/011: extensions is
    where additive, non-breaking enrichment goes without a contract change).
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    input_tokens: int
    output_tokens: int
    cost_usd: float



# ── Business Style Estimate (exploratory, ai-service/scripts/estimate_business_style.py only) ──
# NOT part of the public contract: no router mounts these models, nothing persists them, and
# score_creator_business.py's real Match.Score (ADR-017: semantic + category) never reads them.
# SKILL.md step 3 rejected generating Campaign.TargetStyleVector from Description via AI outright
# ("exact ghicitul pe care regulile proiectului îl interzic") because a two-sentence marketing
# description has no evidence to cite, unlike three real video clips. This exists anyway, for a
# demo, on the condition that it never claims the grounding it doesn't have: no evidence_clip_ids
# (there is no clip), a hard confidence ceiling below what clip evidence can earn, and evidence
# that cites a verbatim, checkable phrase from the actual input text instead of an invented claim.

BUSINESS_STYLE_RATIONALE_MAX_WORDS = 20  # same cap as STYLE_RATIONALE_MAX_WORDS, for consistency
BUSINESS_STYLE_QUOTE_MAX_WORDS = 12      # a citation, not a second rationale — kept short on purpose
# Text evidence cannot earn the same confidence video evidence can, regardless of how the model
# itself rates it — this isn't the model being careless, it's a structural fact about a
# two-sentence description vs. three analyzed clips. Enforced here (not left to the prompt alone,
# unlike v4's purely-prompt-based confidence guidance) because a demo is exactly the setting where
# an unenforced instruction is most likely to get quietly ignored under one bad generation.
BUSINESS_STYLE_ESTIMATE_CONFIDENCE_CAP = 0.5

BusinessStyleSourceField = Literal["description", "brief_message"]


class EstimatedDimensionEvidence(BaseModel):
    """Why one business-side style dimension was estimated at what it was — the text-only,
    non-video counterpart to DimensionEvidence (ADR-013/014). Deliberately not named
    DimensionEvidence and deliberately shaped differently: there is no clip to cite, so there is
    no evidence_clip_ids here, and confidence is capped in code because marketing/brief text is
    categorically weaker evidence than an analyzed clip, not just weaker on a given run.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    confidence: float = Field(ge=0, le=1)
    rationale: str
    # Which field this dimension's read is actually attributed to — description or the
    # campaign's free-text brief message. Never both at once: a claim traces to one sentence,
    # not a blend, so it stays checkable against a single source string.
    source_field: BusinessStyleSourceField | None = None
    # A short verbatim quote copied from that source field — checked server-side (mirrors
    # _sanitize_style_evidence's real-tikTokVideoId check) against the actual text sent to the
    # model. None is correct and expected when the dimension has no textual grounding at all.
    quoted_phrase: str | None = None

    @field_validator("confidence")
    @classmethod
    def _cap_confidence(cls, v: float) -> float:
        return min(v, BUSINESS_STYLE_ESTIMATE_CONFIDENCE_CAP)

    @field_validator("rationale")
    @classmethod
    def _check_max_words(cls, v: str) -> str:
        return _truncate_to_max_words(v, BUSINESS_STYLE_RATIONALE_MAX_WORDS)

    @field_validator("quoted_phrase")
    @classmethod
    def _check_quote_max_words(cls, v: str | None) -> str | None:
        return _truncate_to_max_words(v, BUSINESS_STYLE_QUOTE_MAX_WORDS) if v else v


class EstimatedStyleEvidence(BaseModel):
    """One EstimatedDimensionEvidence per StyleVector axis, same eight names as StyleEvidence."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    warmth: EstimatedDimensionEvidence
    energy: EstimatedDimensionEvidence
    authority: EstimatedDimensionEvidence
    refinement: EstimatedDimensionEvidence
    convention: EstimatedDimensionEvidence
    humor: EstimatedDimensionEvidence
    demonstration: EstimatedDimensionEvidence
    intimacy: EstimatedDimensionEvidence


class BusinessStyleEstimate(BaseModel):
    """Output of the Claude call — the only model passed to output_format=. No narrative field:
    unlike PortraitGeneration, nothing here is meant to be reader-facing product copy."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    style_vector: StyleVector
    style_evidence: EstimatedStyleEvidence
    limitations: list[str] = Field(default_factory=list)


class ObservedProduct(BaseModel):
    """A brand/product the Video Analyzer saw in this creator's clips, aggregated across them
    (ADR-016).

    Computed deterministically in app/routers/portrait.py from ``ProductMention`` — never
    model-generated. The names are already in the request; asking the model to re-emit them would
    add a way to invent a brand and no way to catch it.

    ``observed`` is the whole claim. A product appearing on screen is not a sponsorship: two of the
    three clips carrying products in the reference fixture are ``"No disclosure detected"``. Hence
    ``disclosed``, which stays False unless a clip actually declared one, and the field name, which
    says observed rather than sponsored.

    ``declared_by_creator`` marks a match against ``Questionnaire.prior_sponsorships``. It puts the
    creator-stated and the observed record side by side without reconciling them — rule 5 requires
    conflicts to stay visible, and a product observed but never declared is exactly that.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    name: str
    clip_ids: list[str]
    confidence: float = Field(ge=0, le=1)
    disclosed: bool
    declared_by_creator: bool


class CreatorPortrait(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    narrative_dossier: str
    style_vector: StyleVector
    style_evidence: StyleEvidence
    observed_products: list[ObservedProduct] = Field(default_factory=list)
    provenance: Provenance
    confidence: float = Field(ge=0, le=1)
    limitations: list[str] = Field(default_factory=list)
    extensions: dict = Field(default_factory=dict)


class EmbeddingRequest(BaseModel):
    """Input for POST /embeddings (creator-brand matching, ADR-010).

    Deliberately just text in, vector out — composing that text (topics-only from ClipAnalyses
    for a creator, Description+ProductsToPromote for a business; see
    .claude/skills/creator-brand-matching/SKILL.md step 5) is the caller's job, not this
    endpoint's. Keeping the router stateless and DB-agnostic matches portrait.py and
    video_analyzer.py, neither of which touches Postgres either.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    text: str


class EmbeddingResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    embedding: list[float]
    model: str
    dimensions: int
    generated_at: datetime
