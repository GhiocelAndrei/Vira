from datetime import datetime, timezone
from functools import lru_cache

from fastapi import APIRouter

from app.ai_client import (
    CREATOR_PROFILE_MODEL_ID,
    CREATOR_PROFILE_ONTOLOGY_VERSION,
    CREATOR_PROFILE_PROMPT_VERSION,
    ClaudePortraitClient,
)
from app.models import (
    CreatorPortrait,
    ObservedProduct,
    PortraitRequest,
    Provenance,
    StyleEvidence,
)

router = APIRouter(prefix="/portrait", tags=["portrait"])

# The PoC's fixed input package (docs/architecture.md): exactly three videos per creator.
EXPECTED_CLIP_COUNT = 3
# Named constant, not an inline literal — CLAUDE.md rule 8 requires weights/thresholds to be
# tunable configuration, not buried in code.
NO_COVER_IMAGES_DEDUCTION = 0.15
STYLE_DIMENSIONS = (
    "warmth", "energy", "authority", "refinement", "convention", "humor", "demonstration", "intimacy",
)
# The two DisclosureLabel values that are an actual declaration. Everything else — including
# "No disclosure detected" — leaves ObservedProduct.disclosed False (ADR-016).
DISCLOSED_LABELS = frozenset({"Paid partnership disclosed", "Affiliate/gifted product disclosed"})


@lru_cache
def _get_client() -> ClaudePortraitClient:
    # Lazy singleton: constructing Anthropic() resolves ANTHROPIC_API_KEY, which must not happen
    # at import time or the app fails to start without a key configured (see video_analyzer.py).
    return ClaudePortraitClient()


def _build_confidence(req: PortraitRequest, cover_image_count: int) -> tuple[float, list[str]]:
    """Deterministic and reproducible — same inputs always produce the same number. Never derived
    from view/like/follower counts (.claude/rules/creator-profile.md): evidence coverage only."""
    limitations: list[str] = []

    coverage = len(req.analyses) / EXPECTED_CLIP_COUNT
    if len(req.analyses) < EXPECTED_CLIP_COUNT:
        limitations.append(
            f"doar {len(req.analyses)} din {EXPECTED_CLIP_COUNT} clipuri au o analiză video disponibilă"
        )

    confidence = coverage
    if req.clips and cover_image_count == 0:
        confidence -= NO_COVER_IMAGES_DEDUCTION
        limitations.append(
            "niciun clip nu are o imagine de copertă disponibilă pentru analiza vizuală"
        )

    return max(0.0, min(1.0, confidence)), limitations


def _normalize_brand(name: str) -> str:
    """Dedupe key for brand names: case-folded, inner whitespace collapsed.

    Deliberately naive (ADR-016) — it merges "MyProtein"/"myprotein" but not "MyProtein"/"My
    Protein". Anything smarter is a matching-grade entity-resolution problem, and guessing that two
    spellings are one brand is the kind of fabricated consensus rule 5 forbids.
    """
    return " ".join(name.split()).casefold()


def _aggregate_products(req: PortraitRequest) -> list[ObservedProduct]:
    """Roll ProductMention across the analyses into one row per brand (ADR-016).

    Deterministic, like _build_confidence: the products are already in the request, so this is a
    fold over them, not a judgment. Ordering is by clip count then name so the same request always
    serializes identically.
    """
    declared = {_normalize_brand(s.brand_name) for s in req.questionnaire.prior_sponsorships}

    by_brand: dict[str, ObservedProduct] = {}
    for analysis in req.analyses:
        # One disclosure per clip, so it applies to every product found in that clip.
        clip_disclosed = analysis.analysis.disclosure.value in DISCLOSED_LABELS
        for mention in analysis.analysis.products:
            key = _normalize_brand(mention.value)
            if not key:
                continue
            existing = by_brand.get(key)
            if existing is None:
                by_brand[key] = ObservedProduct(
                    name=mention.value,
                    clip_ids=[analysis.tik_tok_video_id],
                    confidence=mention.confidence,
                    disclosed=clip_disclosed,
                    declared_by_creator=key in declared,
                )
                continue
            if analysis.tik_tok_video_id not in existing.clip_ids:
                existing.clip_ids.append(analysis.tik_tok_video_id)
            # Best appearance wins: the claim is "this brand was observed", and one clear sighting
            # establishes it — a second, blurrier one does not make it less true.
            existing.confidence = max(existing.confidence, mention.confidence)
            existing.disclosed = existing.disclosed or clip_disclosed

    return sorted(by_brand.values(), key=lambda p: (-len(p.clip_ids), _normalize_brand(p.name)))


def _sanitize_style_evidence(req: PortraitRequest, style_evidence: StyleEvidence) -> list[str]:
    """Drop any evidence_clip_ids citation that isn't a real clip the model was actually shown
    (ADR-014). A positional reference like "analyses[0]" always parsed as valid whether or not it
    supported the score; a tikTokVideoId does not have that problem — it can be checked, so it is."""
    valid_ids = {a.tik_tok_video_id for a in req.analyses} | {
        c.tik_tok_video_id for c in req.clips if c.cover_image_url
    }

    dropped_any = False
    for dimension in STYLE_DIMENSIONS:
        evidence = getattr(style_evidence, dimension)
        kept = [cid for cid in evidence.evidence_clip_ids if cid in valid_ids]
        if len(kept) != len(evidence.evidence_clip_ids):
            dropped_any = True
        evidence.evidence_clip_ids = kept

    if dropped_any:
        return ["unele referințe de dovezi pentru style_evidence citau clipuri fără dovezi trimise modelului și au fost eliminate"]
    return []


@router.post("", response_model=CreatorPortrait)
def generate_portrait(req: PortraitRequest) -> CreatorPortrait:
    client = _get_client()
    generated, usage = client.generate_portrait(req)

    cover_image_count = sum(1 for clip in req.clips if clip.cover_image_url)
    confidence, deterministic_limitations = _build_confidence(req, cover_image_count)
    citation_limitations = _sanitize_style_evidence(req, generated.style_evidence)

    return CreatorPortrait(
        narrative_dossier=generated.narrative_dossier,
        style_vector=generated.style_vector,
        # Model-generated, and left as generated: per-dimension confidence is judgment about
        # grounding, while CreatorPortrait.confidence below stays deterministic arithmetic over
        # evidence coverage (ADR-011). Folding one into the other would make it irreproducible.
        style_evidence=generated.style_evidence,
        # Not model-generated (ADR-016): the brands are already in req.analyses, so re-asking the
        # model for them would only add a way to invent one.
        observed_products=_aggregate_products(req),
        provenance=Provenance(
            ai_model=CREATOR_PROFILE_MODEL_ID,
            prompt_version=CREATOR_PROFILE_PROMPT_VERSION,
            ontology_version=CREATOR_PROFILE_ONTOLOGY_VERSION,
            generated_at=datetime.now(timezone.utc),
        ),
        confidence=confidence,
        limitations=[*deterministic_limitations, *citation_limitations, *generated.limitations],
        # Estimated billing for local testing (not a stable contract field, ADR-006/011).
        extensions={"usage": usage.model_dump(mode="json", by_alias=True)},
    )
