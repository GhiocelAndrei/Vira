"""Exploratory: estimates a business/campaign-side style_vector from Description + Campaign.Brief
via Claude, and compares it against real creator style_vectors (CreatorPortraits.StyleVector).

NOT the matching engine. score_creator_business.py's real Match.Score (ADR-017: semantic 0.35 +
category 0.20, renormalized) never reads anything this script produces — this file is not
imported by it, and nothing here is imported into it. `.claude/skills/creator-brand-matching/
SKILL.md` step 3 explicitly rejected generating a business-side style vector via AI from
Description alone ("exact ghicitul pe care regulile proiectului îl interzic" — a two-sentence
description has nothing to cite, unlike three real clips). This script exists anyway, for a demo,
on the condition that it never claims the grounding it doesn't have:

  - confidence is hard-capped at BUSINESS_STYLE_ESTIMATE_CONFIDENCE_CAP (0.5) in
    app/models.py's EstimatedDimensionEvidence validator — not just a prompt instruction — because
    text evidence is structurally weaker than an analyzed video clip, not just weaker on a bad run.
  - there is no evidence_clip_ids — there is no clip. Evidence is a verbatim, server-checked quote
    from the actual description/briefMessage text sent to the model (_sanitize_estimate below,
    mirroring app/routers/portrait.py's _sanitize_style_evidence).
  - nothing here is persisted: no DB write, no migration, no FastAPI route mounts
    ClaudeBusinessStyleEstimateClient. The estimate is computed, printed/JSON-dumped, and dropped.
  - every result — text or JSON — carries the DISCLAIMER string, so it can't be read out of
    context as equivalent to a creator's clip-evidenced style_vector.

Usage:
    export DATABASE_URI=postgresql://user:pass@host:port/db
    export ANTHROPIC_API_KEY=...
    python scripts/estimate_business_style.py                                # every business (Description only)
    python scripts/estimate_business_style.py "Company Name"                 # one business
    python scripts/estimate_business_style.py --campaign "Campaign Title"    # Description + Brief.Message
    python scripts/estimate_business_style.py --json                        # JSON, disclaimer included
    python scripts/estimate_business_style.py --limit 5                     # cap real Claude calls
"""

import json
import os
import sys
from datetime import datetime, timezone

import numpy as np
import psycopg2
import psycopg2.extras

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.ai_client import (  # noqa: E402
    BUSINESS_STYLE_ESTIMATE_MODEL_ID,
    BUSINESS_STYLE_ESTIMATE_ONTOLOGY_VERSION,
    BUSINESS_STYLE_ESTIMATE_PROMPT_VERSION,
    ClaudeBusinessStyleEstimateClient,
)
from app.models import BusinessStyleEstimate, EstimatedStyleEvidence, PortraitUsage, Provenance, StyleVector  # noqa: E402
from app.routers.portrait import STYLE_DIMENSIONS  # noqa: E402

DISCLAIMER = (
    "Estimare exploratorie generată din text de marketing (Description/Brief.Message), fără "
    "nicio dovadă video. Nu este echivalentă cu style_vector-ul unui creator, generat din clipuri "
    "reale, și nu este persistată nicăieri."
)

BUSINESSES_QUERY = """
SELECT b."Id" AS business_id, b."CompanyName" AS company_name, bq."Description" AS description
FROM "Businesses" b
JOIN "BusinessQuestionnaires" bq ON bq."BusinessId" = b."Id"
WHERE bq."Description" IS NOT NULL AND bq."Description" != ''
ORDER BY b."CompanyName";
"""

CAMPAIGNS_QUERY = """
SELECT c."Id" AS campaign_id, c."Title" AS campaign_title, c."BusinessId" AS business_id,
       b."CompanyName" AS company_name, bq."Description" AS description,
       c."Brief" ->> 'Message' AS brief_message
FROM "Campaigns" c
JOIN "Businesses" b ON b."Id" = c."BusinessId"
JOIN "BusinessQuestionnaires" bq ON bq."BusinessId" = b."Id"
WHERE bq."Description" IS NOT NULL AND bq."Description" != ''
ORDER BY b."CompanyName", c."Title";
"""

CREATOR_STYLE_VECTORS_QUERY = """
SELECT DISTINCT ON (c."Id")
    c."Id" AS creator_id, c."DisplayName" AS display_name, p."StyleVector" AS style_vector
FROM "CreatorPortraits" p
JOIN "Creators" c ON c."Id" = p."CreatorId"
WHERE p."StyleVector" IS NOT NULL
ORDER BY c."Id", p."CreatedAt" DESC;
"""


def _normalize(s: str) -> str:
    return " ".join(s.split()).casefold()


def _sanitize_estimate(
    description: str, brief_message: str | None, evidence: EstimatedStyleEvidence
) -> list[str]:
    """Drops any quoted_phrase that isn't an actual substring of the text sent to the model, or
    whose source_field wasn't actually supplied this call — mirrors _sanitize_style_evidence
    (app/routers/portrait.py:110), adapted for text: a quote is verifiable the same way a
    tikTokVideoId is, by checking it against what was actually sent."""
    sources = {"description": description}
    if brief_message:
        sources["brief_message"] = brief_message

    dropped = False
    for dim in STYLE_DIMENSIONS:
        ev = getattr(evidence, dim)
        if ev.quoted_phrase is None:
            continue
        source_text = sources.get(ev.source_field or "")
        if source_text is None or _normalize(ev.quoted_phrase) not in _normalize(source_text):
            ev.quoted_phrase = None
            ev.source_field = None
            dropped = True

    if dropped:
        return ["unele citate din styleEvidence nu apăreau exact în textul trimis modelului și au fost eliminate"]
    return []


def fetch_businesses(conn) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(BUSINESSES_QUERY)
        return [dict(row) for row in cur.fetchall()]


def fetch_campaigns(conn) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(CAMPAIGNS_QUERY)
        return [dict(row) for row in cur.fetchall()]


def fetch_creator_style_vectors(conn) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(CREATOR_STYLE_VECTORS_QUERY)
        creators = [dict(row) for row in cur.fetchall()]
    for c in creators:
        # CreatorPortraits.StyleVector is stored PascalCase (EF Core's OwnsOne(...).ToJson()
        # serializes C# property names verbatim — confirmed against
        # scripts/test_creator_profile.py's style_vector_json).
        c["style_vector_np"] = np.array(
            [c["style_vector"][d.capitalize()] for d in STYLE_DIMENSIONS], dtype=np.float64
        )
    return creators


def _estimate_vector_to_np(sv: StyleVector) -> np.ndarray:
    return np.array([getattr(sv, d) for d in STYLE_DIMENSIONS], dtype=np.float64)


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def per_dimension_delta(business_vec: np.ndarray, creator_vec: np.ndarray) -> dict[str, float]:
    return {
        dim: round(abs(float(business_vec[i]) - float(creator_vec[i])), 3)
        for i, dim in enumerate(STYLE_DIMENSIONS)
    }


def _estimate_with_retry(
    client: ClaudeBusinessStyleEstimateClient, description: str, brief_message: str | None,
) -> tuple[BusinessStyleEstimate, PortraitUsage]:
    """One retry on any failure (mainly: Claude occasionally emits invalid JSON — a trailing
    comma has been observed in practice — which messages.parse surfaces as a ValidationError, not
    something worth failing a 50-call batch over). A second consecutive failure re-raises, since
    at that point it's more likely a real problem than a one-off sampling glitch."""
    try:
        return client.estimate(description, brief_message)
    except Exception:
        return client.estimate(description, brief_message)


def _provenance() -> Provenance:
    return Provenance(
        ai_model=BUSINESS_STYLE_ESTIMATE_MODEL_ID,
        prompt_version=BUSINESS_STYLE_ESTIMATE_PROMPT_VERSION,
        ontology_version=BUSINESS_STYLE_ESTIMATE_ONTOLOGY_VERSION,
        generated_at=datetime.now(timezone.utc),
    )


def print_report(
    label: str, estimate: BusinessStyleEstimate, usage: PortraitUsage,
    creators: list[dict], business_vec: np.ndarray,
) -> None:
    avg_conf = sum(getattr(estimate.style_evidence, d).confidence for d in STYLE_DIMENSIONS) / len(STYLE_DIMENSIONS)

    print(f"\n{label}")
    print(f"  {DISCLAIMER}")
    print(f"  avgConfidence={avg_conf:.2f}  cost=${usage.cost_usd:.4f}")
    for dim in STYLE_DIMENSIONS:
        ev = getattr(estimate.style_evidence, dim)
        val = getattr(estimate.style_vector, dim)
        quote = f'  · "{ev.quoted_phrase}" ({ev.source_field})' if ev.quoted_phrase else ""
        print(f"    {dim:<14} {val:.2f}  conf={ev.confidence:.2f}  {ev.rationale}{quote}")

    if estimate.limitations:
        print("  limitations:")
        for lim in estimate.limitations:
            print(f"    - {lim}")

    ranked = sorted(creators, key=lambda c: -cosine(business_vec, c["style_vector_np"]))
    print("  comparat cu creatorii (cosine similarity pe style_vector):")
    for c in ranked:
        sim = cosine(business_vec, c["style_vector_np"])
        deltas = per_dimension_delta(business_vec, c["style_vector_np"])
        biggest = max(deltas, key=deltas.get)
        print(f"    {sim:+.3f}  {c['display_name']:<22}cea mai mare diferență: {biggest} ({deltas[biggest]:.2f})")


def result_json(
    label: str, subject: dict, is_campaign: bool, estimate: BusinessStyleEstimate,
    usage: PortraitUsage, creators: list[dict], business_vec: np.ndarray,
) -> dict:
    avg_conf = sum(getattr(estimate.style_evidence, d).confidence for d in STYLE_DIMENSIONS) / len(STYLE_DIMENSIONS)
    return {
        "disclaimer": DISCLAIMER,
        "label": label,
        "businessId": str(subject["business_id"]),
        "companyName": subject["company_name"],
        "campaignId": str(subject["campaign_id"]) if is_campaign else None,
        "campaignTitle": subject["campaign_title"] if is_campaign else None,
        "sourceFields": ["description", "brief_message"] if is_campaign else ["description"],
        "styleVector": estimate.style_vector.model_dump(mode="json", by_alias=True),
        "styleEvidence": estimate.style_evidence.model_dump(mode="json", by_alias=True),
        "avgConfidence": round(avg_conf, 3),
        "limitations": estimate.limitations,
        "provenance": _provenance().model_dump(mode="json", by_alias=True),
        "usage": usage.model_dump(mode="json", by_alias=True),
        "comparedToCreators": [
            {
                "creatorId": str(c["creator_id"]),
                "displayName": c["display_name"],
                "cosineSimilarity": round(cosine(business_vec, c["style_vector_np"]), 4),
                "perDimensionDelta": per_dimension_delta(business_vec, c["style_vector_np"]),
            }
            for c in sorted(creators, key=lambda c: -cosine(business_vec, c["style_vector_np"]))
        ],
    }


def main() -> None:
    args = sys.argv[1:]

    as_json = "--json" in args
    args = [a for a in args if a != "--json"]

    is_campaign = "--campaign" in args
    args = [a for a in args if a != "--campaign"]

    limit = None
    if "--limit" in args:
        idx = args.index("--limit")
        limit = int(args[idx + 1])
        args = args[:idx] + args[idx + 2:]

    dsn = os.environ["DATABASE_URI"]
    with psycopg2.connect(dsn) as conn:
        creators = fetch_creator_style_vectors(conn)
        subjects = fetch_campaigns(conn) if is_campaign else fetch_businesses(conn)

    if not creators:
        raise SystemExit("niciun creator cu StyleVector — genereaza portrete intai")

    key = "campaign_title" if is_campaign else "company_name"
    if args:
        name = args[0]
        matches = [s for s in subjects if s[key] == name]
        if not matches:
            raise SystemExit(f"{name!r} nu a fost găsit. Disponibili: {', '.join(s[key] for s in subjects)}")
        subjects = matches

    if limit is not None:
        subjects = subjects[:limit]

    print(f"urmează {len(subjects)} apeluri reale către Claude ({BUSINESS_STYLE_ESTIMATE_MODEL_ID})", file=sys.stderr)

    client = ClaudeBusinessStyleEstimateClient()
    results = []
    failed = []
    for subject in subjects:
        description = subject["description"]
        brief_message = subject.get("brief_message")
        label = subject["company_name"] + (f" — {subject['campaign_title']}" if is_campaign else "")

        try:
            estimate, usage = _estimate_with_retry(client, description, brief_message)
        except Exception as e:
            # A single malformed response (e.g. Claude occasionally emitting invalid JSON) must
            # not lose the other N-1 already-paid-for calls in a batch run — log and continue.
            print(f"  eșuat, sărit: {label} — {e}", file=sys.stderr)
            failed.append(label)
            continue

        extra_limitations = _sanitize_estimate(description, brief_message, estimate.style_evidence)
        estimate.limitations = [*estimate.limitations, *extra_limitations]

        business_vec = _estimate_vector_to_np(estimate.style_vector)

        if as_json:
            results.append(result_json(label, subject, is_campaign, estimate, usage, creators, business_vec))
        else:
            print_report(label, estimate, usage, creators, business_vec)

    if failed:
        print(f"\n{len(failed)}/{len(subjects)} eșuate după reîncercare: {', '.join(failed)}", file=sys.stderr)

    if as_json:
        print(json.dumps(results[0] if len(results) == 1 else results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
