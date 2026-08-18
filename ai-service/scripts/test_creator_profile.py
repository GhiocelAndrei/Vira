"""Local smoke test for the Creator Profile Generator — calls the /portrait route logic directly,
no server needed. Builds the PortraitRequest from the real DB (Creators, CreatorClips,
CreatorQuestionnaires, ClipAnalyses) for a given creator id, instead of a hardcoded fixture, then
saves the generated CreatorPortrait back into the (currently unused) CreatorPortraits table.

Usage:
    export ANTHROPIC_API_KEY=...
    export DATABASE_URI=postgresql://user:pass@host:port/db
    python scripts/test_creator_profile.py <creator_id>
"""

import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models import CreatorPortrait, DimensionEvidence, PortraitRequest  # noqa: E402
from app.routers.portrait import generate_portrait  # noqa: E402

# Mirrors the int-backed CreatorCategory/TravelWillingness enums in
# backend/src/Vira.Abstractions/Common/*.cs — keep in sync (same order) if those ever change.
CREATOR_CATEGORY = [
    "Food", "Sport", "Tech", "Beauty", "Travel",
    "Comedy", "Education", "Lifestyle", "Gaming", "Music",
]
TRAVEL_WILLINGNESS = ["None", "SameCounty", "Nationwide", "OutOfCountry"]


def _fetch_creator(cur, creator_id: str) -> dict:
    cur.execute(
        """
        SELECT "Id", "DisplayName", "FollowerCount", "Niche", "City", "County"
        FROM "Creators" WHERE "Id" = %s
        """,
        (creator_id,),
    )
    row = cur.fetchone()
    if row is None:
        raise SystemExit(f"No creator with id {creator_id}")
    return row


def _fetch_clips(cur, creator_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT "Id", "TikTokVideoId", "Title", "CoverImageUrl", "EmbedLink",
               "ViewCount", "LikeCount", "CommentCount", "ShareCount", "TikTokCreateTime"
        FROM "CreatorClips" WHERE "CreatorId" = %s ORDER BY "TikTokCreateTime"
        """,
        (creator_id,),
    )
    return cur.fetchall()


def _fetch_questionnaire(cur, creator_id: str) -> dict | None:
    cur.execute('SELECT * FROM "CreatorQuestionnaires" WHERE "CreatorId" = %s', (creator_id,))
    return cur.fetchone()


def _fetch_analyses(cur, clip_ids: list[str]) -> list[dict]:
    if not clip_ids:
        return []
    cur.execute(
        """
        SELECT cc."TikTokVideoId", ca."AnalysisJson", ca."AiModel", ca."PromptVersion",
               ca."OntologyVersion", ca."AnalyzedAt"
        FROM "ClipAnalyses" ca JOIN "CreatorClips" cc ON cc."Id" = ca."ClipId"
        WHERE ca."ClipId" = ANY(%s::uuid[])
        """,
        (clip_ids,),
    )
    return cur.fetchall()


def _aggregates(clips: list[dict]) -> dict:
    # Mirrors backend/src/Vira.Application/Services/ClipAggregates.cs — computed on the fly,
    # never stored, so it can only ever be a pure function of the clips.
    if not clips:
        return {"avgViews": 0, "avgLikes": 0, "avgComments": 0, "avgShares": 0, "engagementRate": 0.0}
    total_views = sum(c["ViewCount"] for c in clips)
    total_likes = sum(c["LikeCount"] for c in clips)
    total_comments = sum(c["CommentCount"] for c in clips)
    total_shares = sum(c["ShareCount"] for c in clips)
    return {
        "avgViews": total_views // len(clips),
        "avgLikes": total_likes // len(clips),
        "avgComments": total_comments // len(clips),
        "avgShares": total_shares // len(clips),
        "engagementRate": 0.0 if total_views == 0 else (total_likes + total_comments + total_shares) / total_views,
    }


def _questionnaire_payload(q: dict | None) -> dict:
    if q is None:
        return {}
    return {
        "preferredCategories": [CREATOR_CATEGORY[i] for i in q["PreferredCategories"]],
        "excludedCategories": [CREATOR_CATEGORY[i] for i in q["ExcludedCategories"]],
        "acceptsShippedProducts": q["AcceptsShippedProducts"],
        "canPurchaseProducts": q["CanPurchaseProducts"],
        "travelWillingness": TRAVEL_WILLINGNESS[q["TravelWillingness"]],
        "goals": q["Goals"],
        "values": q["Values"],
        "preferredFormats": q["PreferredFormats"],
        "contentLanguages": q["ContentLanguages"],
        "excludedBrands": q["ExcludedBrands"],
        "allowsAlcohol": q["AllowsAlcohol"],
        "allowsGambling": q["AllowsGambling"],
        "allowsPolitical": q["AllowsPolitical"],
        "collabCapacityPerMonth": q["CollabCapacityPerMonth"],
        "selfDescribedAudience": q["SelfDescribedAudience"],
        "priorSponsorships": [
            {"brandName": p["BrandName"], "category": CREATOR_CATEGORY[p["Category"]]}
            for p in (q["PriorSponsorships"] or [])
        ],
    }


def build_portrait_request(creator_id: str, database_uri: str) -> PortraitRequest:
    with psycopg2.connect(database_uri) as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            creator = _fetch_creator(cur, creator_id)
            clips = _fetch_clips(cur, creator_id)
            questionnaire = _fetch_questionnaire(cur, creator_id)
            analyses = _fetch_analyses(cur, [str(c["Id"]) for c in clips])

    payload = {
        "creatorId": str(creator["Id"]),
        "displayName": creator["DisplayName"],
        "followerCount": creator["FollowerCount"],
        "category": creator["Niche"],
        "city": creator["City"],
        "county": creator["County"],
        "clips": [
            {
                "tikTokVideoId": c["TikTokVideoId"],
                "title": c["Title"],
                "coverImageUrl": c["CoverImageUrl"],
                "embedLink": c["EmbedLink"],
                "viewCount": c["ViewCount"],
                "likeCount": c["LikeCount"],
                "commentCount": c["CommentCount"],
                "shareCount": c["ShareCount"],
                "tikTokCreateTime": c["TikTokCreateTime"],
            }
            for c in clips
        ],
        "aggregates": _aggregates(clips),
        "questionnaire": _questionnaire_payload(questionnaire),
        "analyses": [
            {
                "tikTokVideoId": a["TikTokVideoId"],
                "analysis": a["AnalysisJson"],
                "aiModel": a["AiModel"],
                "promptVersion": a["PromptVersion"],
                "ontologyVersion": a["OntologyVersion"],
                "analyzedAt": a["AnalyzedAt"],
            }
            for a in analyses
        ],
    }
    return PortraitRequest.model_validate(payload)


def save_portrait_request(cur, req: PortraitRequest) -> str:
    """Insert into PortraitRequests (schema exists via migration AddCreatorPortrait, but nothing
    in the backend writes to it yet — see the doc comment on
    backend/src/Vira.Abstractions/Models/Creators/PortraitRequest.cs: RequestJson is the exact
    payload sent to the ai-service, kept verbatim so a generated portrait stays reproducible and
    auditable (CLAUDE.md rule 8) even after the creator's clips/questionnaire/metrics drift.
    by_alias=True mirrors what the backend's PortraitRequestDto would serialize — camelCase, same
    shape build_portrait_request() already validated the payload against.
    """
    request_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO "PortraitRequests" ("Id", "CreatorId", "RequestJson", "CreatedAt")
        VALUES (%s, %s, %s, %s)
        """,
        (request_id, str(req.creator_id), req.model_dump_json(by_alias=True), datetime.now(timezone.utc)),
    )
    return request_id


def _dimension_json(d: DimensionEvidence) -> dict:
    # PascalCase to match backend/src/Vira.DataAccess/ViraDbContext.cs's OwnsOne(...).ToJson()
    # mapping, which serializes C# property names verbatim (no camelCase naming policy) — see
    # the identical PascalCase convention already observed in CreatorQuestionnaires.PriorSponsorships.
    return {"Confidence": d.confidence, "Rationale": d.rationale, "EvidenceClipIds": d.evidence_clip_ids}


def save_portrait(cur, creator_id: str, request_id: str, portrait: CreatorPortrait) -> str:
    """Insert into CreatorPortraits (schema exists via migration AddCreatorPortrait, but nothing
    in the backend writes to it yet). ObservedProducts has no column there — that field postdates
    the migration (ADR-016) — so it rides along inside ExtensionsJson, which is documented on the
    C# side as exactly this: "forward-compatible extra fields... stored verbatim as JSONB so a
    newer output shape is never silently dropped."
    """
    portrait_id = str(uuid.uuid4())
    sv = portrait.style_vector
    se = portrait.style_evidence
    style_vector_json = {
        "Warmth": sv.warmth, "Energy": sv.energy, "Authority": sv.authority,
        "Refinement": sv.refinement, "Convention": sv.convention, "Humor": sv.humor,
        "Demonstration": sv.demonstration, "Intimacy": sv.intimacy,
    }
    style_evidence_json = {
        "Warmth": _dimension_json(se.warmth), "Energy": _dimension_json(se.energy),
        "Authority": _dimension_json(se.authority), "Refinement": _dimension_json(se.refinement),
        "Convention": _dimension_json(se.convention), "Humor": _dimension_json(se.humor),
        "Demonstration": _dimension_json(se.demonstration), "Intimacy": _dimension_json(se.intimacy),
    }
    extensions_json = {
        **portrait.extensions,
        "observedProducts": [p.model_dump(mode="json", by_alias=True) for p in portrait.observed_products],
    }

    cur.execute(
        """
        INSERT INTO "CreatorPortraits"
            ("Id", "CreatorId", "RequestId", "NarrativeDossier", "Limitations", "Confidence",
             "AiModel", "PromptVersion", "OntologyVersion", "GeneratedAt", "ExtensionsJson",
             "CreatedAt", "StyleEvidence", "StyleVector")
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            portrait_id, creator_id, request_id,
            portrait.narrative_dossier, portrait.limitations, portrait.confidence,
            portrait.provenance.ai_model, portrait.provenance.prompt_version,
            portrait.provenance.ontology_version, portrait.provenance.generated_at,
            json.dumps(extensions_json), datetime.now(timezone.utc),
            json.dumps(style_evidence_json), json.dumps(style_vector_json),
        ),
    )
    return portrait_id


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/test_creator_profile.py <creator_id>")
        raise SystemExit(1)
    creator_id = sys.argv[1]
    database_uri = os.environ["DATABASE_URI"]

    req = build_portrait_request(creator_id, database_uri)
    result = generate_portrait(req)
    print(result.model_dump_json(by_alias=True, indent=2))

    with psycopg2.connect(database_uri) as conn:
        with conn.cursor() as cur:
            request_id = save_portrait_request(cur, req)
            portrait_id = save_portrait(cur, creator_id, request_id, result)
        conn.commit()
    print(f"\nSaved PortraitRequest {request_id} and CreatorPortrait {portrait_id} for creator {creator_id}.")


if __name__ == "__main__":
    main()
