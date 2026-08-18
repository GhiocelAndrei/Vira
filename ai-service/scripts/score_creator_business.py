"""Real Match.Score — L1 veto + L2 weighted score — for creator <-> business pairs, with no
Campaign involved (ADR-017 in docs/decisions.md, .claude/skills/creator-brand-matching/SKILL.md).

This is a deliberately partial slice of ADR-017's L2, not the full formula. Two of its remaining
signals live entirely on Campaign fields this script still doesn't read: `reach` needs
Campaign.BudgetBand, `format` needs Campaign.Brief/ProductPlacement, and the `logistics` gate needs
a specific campaign's shipping/travel requirements to check a creator's acceptance against.
`semantic` (0.35), `category` (0.20), and `style` (0.15, ADR-018) are computable creator<->business
alone, so the score here is those three, renormalized over just themselves per ADR-017's coverage
mechanism — `values` (0.10) is also skipped because ADR-017 leaves its 0..1 scoring rule undecided
("eventual, un semnal separat", never scored yet). `coverage` is reported against the FULL
weight table (not just what's computed here), so it reads low and nobody mistakes this for the
real Match.Score once Campaign exists.

`style` (ADR-018, demo scope only) is a masked cosine between the creator's CreatorPortraits.StyleVector
and the TargetStyleVector of that business's single most-recent Campaign row — a simplification of
the real one-to-many Business->Campaign relationship, valid only while every business in this
dataset has exactly one campaign. TargetStyleVector itself is an AI text-only estimate (see
estimate_business_style.py), not the clip-evidenced ground truth a creator's style_vector is;
ADR-018 documents why this is acceptable for a demo and not a general practice.

L1 veto here is the same three safe vetoes from ADR-017 that also don't need a campaign:
ExcludedCategories ∩ Verticals, ExcludedBrands name match against the business, and
CompetitorBrands ∩ declared PriorSponsorships. The category-term-in-ExcludedBrands case (e.g.
"Fast-food") is a literal, case-folded substring check against ProductsToPromote, exactly as
specified — not semantic, so it will not reproduce every nuance of the worked example in the
skill's test cases (e.g. Spartan's gyros/souvlaki isn't literally "fast-food"), only literal term
matches.

Only creators with a portrait *and* a populated Embedding are scorable (13 today); all businesses
with a questionnaire have one (49 today).

Usage:
    export DATABASE_URI=postgresql://user:pass@host:port/db
    python scripts/score_creator_business.py                          # every creator, top N businesses
    python scripts/score_creator_business.py "Creator Name"           # one creator, every business ranked
    python scripts/score_creator_business.py --json                   # same, as JSON (feed payload shape)
    python scripts/score_creator_business.py "Creator Name" --json    # one creator, JSON
"""

import hashlib
import json
import os
import sys

import numpy as np
import psycopg2
import psycopg2.extras

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.routers.portrait import STYLE_DIMENSIONS, _normalize_brand  # noqa: E402

# Mirrors backend/src/Vira.Abstractions/Common/CreatorCategory.cs ordinals — same list used by
# test_creator_profile.py and BRIO's Verticals=[6] example from this session.
CREATOR_CATEGORY = [
    "Food", "Sport", "Tech", "Beauty", "Travel",
    "Comedy", "Education", "Lifestyle", "Gaming", "Music",
]

# ClipAnalyses.topic (TopicLabel, app/models.py:140-142) -> CreatorCategory. Four labels have no
# direct name match (SKILL.md step 6); the rest either share a name or rename 1:1 (Fitness->Sport,
# the only implicit rename — CreatorCategory has no "Fitness" and TopicLabel has no "Sport").
# "Music" and "Education" have no TopicLabel path at all: they can only be reached through
# declared PreferredCategories, never through observed topic.
TOPIC_TO_CATEGORY = {
    "Beauty": "Beauty", "Food": "Food", "Tech": "Tech", "Comedy": "Comedy",
    "Lifestyle": "Lifestyle", "Travel": "Travel", "Gaming": "Gaming",
    "Fitness": "Sport", "Fashion": "Lifestyle", "Home": "Lifestyle",
    "Finance": "Tech", "Parenting": "Education",
}

# ADR-017's L2 weight table, as amended by ADR-018: "style" added at 0.15, "geo" reduced 0.10->0
# (geo already scores 0 for every pair today — no location column — so this is bookkeeping, not a
# behavior change). "semantic", "category", and "style" are the only ones ever computed by this
# script; the rest exist here so `coverage` is honest about how much of the real formula backs a
# score.
ADR017_WEIGHTS = {
    "semantic": 0.35, "category": 0.20, "style": 0.15, "reach": 0.15,
    "format": 0.10, "values": 0.10, "geo": 0.00,
}

CREATORS_QUERY = """
SELECT DISTINCT ON (c."Id")
    c."Id" AS creator_id, c."DisplayName" AS display_name, p."Embedding" AS embedding,
    p."StyleVector" AS style_vector, p."StyleEvidence" AS style_evidence,
    q."PreferredCategories" AS preferred_categories, q."ExcludedCategories" AS excluded_categories,
    q."ExcludedBrands" AS excluded_brands, q."PriorSponsorships" AS prior_sponsorships,
    q."Values" AS values, p."ExtensionsJson" -> 'observedProducts' AS observed_products
FROM "CreatorPortraits" p
JOIN "Creators" c ON c."Id" = p."CreatorId"
LEFT JOIN "CreatorQuestionnaires" q ON q."CreatorId" = c."Id"
WHERE p."Embedding" IS NOT NULL
ORDER BY c."Id", p."CreatedAt" DESC;
"""

# Romanian adjectives (masculine singular, agreeing with "stilul") for STYLE_DIMENSIONS, used only
# in the L3 "why" line (SKILL.md/ADR-017 keep generated explanations in Romanian, matching the
# rest of the creator-facing surface) — "Stilul tău energic", not "Stilul tău la energie".
STYLE_DIMENSION_LABELS_RO = {
    "warmth": "cald", "energy": "energic", "authority": "autoritar",
    "refinement": "rafinat", "convention": "convențional", "humor": "jucăuș",
    "demonstration": "demonstrativ", "intimacy": "intim",
}

# Below this, a creator's own style_evidence confidence (ADR-013/014, capped low by design for a
# text-only estimate — irrelevant here since this is the creator's clip-evidenced side, not the
# business's) is too thin to hang a "why" sentence on; ADR-011 rule: record uncertainty, don't
# guess. Chosen well above BUSINESS_STYLE_ESTIMATE_CONFIDENCE_CAP (0.5, app/models.py) so no
# business-side text-only estimate could ever be mistaken for a creator-side citation meeting it.
STYLE_WHY_MIN_CREATOR_CONFIDENCE = 0.55

# Same underlying fact (observed/declared category overlap), several fixed phrasings — picked
# deterministically per pair (see _pick_variant) so a printed report doesn't read as the same
# sentence copy-pasted down the page, while staying a template (no model call, nothing invented).
CATEGORY_OBSERVED_TEMPLATES = [
    "Conținutul tău observat se încadrează la categoria {cats}, care se potrivește cu acest brand.",
    "Faci recurent conținut din categoria {cats}, exact zona în care activează acest brand.",
    "Ai deja conținut din categoria {cats}, aliniat cu ce promovează acest brand.",
    "Categoria {cats} apare constant în clipurile tale analizate, iar brandul activează exact acolo.",
]
CATEGORY_DECLARED_TEMPLATES = [
    "Categoria ta preferată ({cats}) se potrivește cu categoria acestui brand.",
    "Ai bifat categoria {cats} ca preferință, iar brandul activează în aceeași zonă.",
    "Categoria {cats} e pe lista ta de preferințe și se potrivește cu acest brand.",
]


def _pick_variant(seed: str, templates: list[str]) -> str:
    """Deterministic, not random: same (creator, business) pair always gets the same phrasing on
    every run, but different pairs land on different variants. md5 instead of Python's built-in
    hash() because str hashing is salted per-process (PYTHONHASHSEED) and wouldn't reproduce."""
    digest = hashlib.md5(seed.encode("utf-8")).hexdigest()
    return templates[int(digest, 16) % len(templates)]

CREATOR_TOPICS_QUERY = """
SELECT DISTINCT ca."AnalysisJson" -> 'topic' ->> 'value' AS topic
FROM "ClipAnalyses" ca
JOIN "CreatorClips" cl ON cl."Id" = ca."ClipId"
WHERE cl."CreatorId" = %s;
"""

# ADR-018: "the business's campaign" is its single most-recent Campaign row — every business in
# today's dataset has exactly one, so this LATERAL join is a 1:1 lookup in practice, not a real
# many-campaign resolution.
BUSINESSES_QUERY = """
SELECT b."Id" AS business_id, b."CompanyName" AS company_name, bq."Embedding" AS embedding,
       bq."Verticals" AS verticals, bq."CompetitorBrands" AS competitor_brands,
       bq."ProductsToPromote" AS products_to_promote, bq."Values" AS values,
       camp."TargetStyleVector" AS target_style_vector
FROM "Businesses" b
JOIN "BusinessQuestionnaires" bq ON bq."BusinessId" = b."Id"
LEFT JOIN LATERAL (
    SELECT c."TargetStyleVector"
    FROM "Campaigns" c
    WHERE c."BusinessId" = b."Id"
    ORDER BY c."CreatedAt" DESC
    LIMIT 1
) camp ON true
WHERE bq."Embedding" IS NOT NULL
ORDER BY b."CompanyName";
"""


def _parse_vector(raw: str) -> np.ndarray:
    # psycopg2 has no pgvector adapter registered (see backfill_embeddings.py); the column comes
    # back as pgvector's bracketed-CSV text form.
    return np.array([float(x) for x in raw.strip("[]").split(",")], dtype=np.float64)


def _parse_style_vector(raw: dict | None) -> dict[str, float] | None:
    # EF Core's OwnsOne(...).ToJson() serializes C# property names verbatim (PascalCase),
    # confirmed against scripts/test_creator_profile.py's style_vector_json.
    if raw is None:
        return None
    return {d: float(raw[d.capitalize()]) for d in STYLE_DIMENSIONS}


def _parse_style_evidence(raw: dict | None) -> dict[str, dict] | None:
    """Same PascalCase-per-dimension shape as StyleVector, each value a
    {Rationale, Confidence, EvidenceClipIds} object (ADR-013/014)."""
    if raw is None:
        return None
    return {
        d: {
            "rationale": raw[d.capitalize()]["Rationale"],
            "confidence": float(raw[d.capitalize()]["Confidence"]),
            "evidence_clip_ids": raw[d.capitalize()]["EvidenceClipIds"],
        }
        for d in STYLE_DIMENSIONS
    }


def fetch_creators(conn) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(CREATORS_QUERY)
        creators = [dict(row) for row in cur.fetchall()]

    for c in creators:
        c["embedding"] = _parse_vector(c["embedding"])
        c["style_vector"] = _parse_style_vector(c["style_vector"])
        c["style_evidence"] = _parse_style_evidence(c["style_evidence"])
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(CREATOR_TOPICS_QUERY, (c["creator_id"],))
            c["observed_topics"] = {r["topic"] for r in cur.fetchall() if r["topic"]}
    return creators


def fetch_businesses(conn) -> list[dict]:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(BUSINESSES_QUERY)
        businesses = [dict(row) for row in cur.fetchall()]
    for b in businesses:
        b["embedding"] = _parse_vector(b["embedding"])
        b["target_style_vector"] = _parse_style_vector(b["target_style_vector"])
    return businesses


def veto(creator: dict, business: dict) -> str | None:
    excluded_cats = set(creator["excluded_categories"] or [])
    verticals = set(business["verticals"] or [])
    overlap = excluded_cats & verticals
    if overlap:
        names = ", ".join(CREATOR_CATEGORY[i] for i in overlap)
        return f"categorie exclusă: {names}"

    biz_name_norm = _normalize_brand(business["company_name"])
    for term in creator["excluded_brands"] or []:
        if _normalize_brand(term) == biz_name_norm:
            return f"brand exclus: {term}"

    competitor_brands = {_normalize_brand(b) for b in (business["competitor_brands"] or [])}
    prior_sponsorships = {
        _normalize_brand(p["brandName"]) for p in (creator["prior_sponsorships"] or [])
    }
    overlap = competitor_brands & prior_sponsorships
    if overlap:
        return f"sponsorizare anterioară la un concurent declarat: {', '.join(overlap)}"

    return None


def category_term_flag(creator: dict, business: dict) -> str | None:
    """Literal, not semantic — see module docstring."""
    biz_name_norm = _normalize_brand(business["company_name"])
    products_norm = _normalize_brand(business["products_to_promote"] or "")
    for term in creator["excluded_brands"] or []:
        term_norm = _normalize_brand(term)
        if not term_norm or term_norm == biz_name_norm:
            continue
        if term_norm in products_norm:
            return f"termen exclus '{term}' apare în ProductsToPromote — penalizare, nu veto"
    return None


def style_signal(creator: dict, business: dict) -> dict | None:
    """ADR-018: masked cosine between the creator's style_vector and the business's campaign
    TargetStyleVector — only dimensions the business set explicitly (> 0) contribute, per
    SKILL.md's masked-cosine definition. Absent (None) when either vector is missing, or when
    every dimension of the target is 0 (e.g. the Brand Demo fixture) — same "drop out, don't
    score 0" treatment ADR-017 gives every other missing signal. Returns the contributing `dims`
    alongside `score` so the L3 "why" builder can pick a dimension to cite without recomputing
    the mask."""
    creator_vec = creator["style_vector"]
    target_vec = business["target_style_vector"]
    if creator_vec is None or target_vec is None:
        return None

    dims = [d for d in STYLE_DIMENSIONS if target_vec[d] > 0]
    if not dims:
        return None

    t = np.array([target_vec[d] for d in dims], dtype=np.float64)
    c = np.array([creator_vec[d] for d in dims], dtype=np.float64)
    score = float(np.dot(t, c) / (np.linalg.norm(t) * np.linalg.norm(c)))
    return {"score": score, "dims": dims}


def style_why(creator: dict, business: dict, dims: list[str]) -> str | None:
    """L3 line for `style`, built only from factors score_pair already computed (ADR-017's L3
    rule) and grounded in a citation already present in the portrait: the creator's own
    style_evidence rationale (ADR-013/014) for whichever contributing dimension the business
    targets highest *and* the creator scores highest on. Nothing about the business's side of the
    match is asserted as evidence — TargetStyleVector is a text-only estimate (ADR-018), so this
    only ever claims something about the creator, never the business.

    Silent (None) unless a genuinely strong, well-evidenced match exists: the joint value must
    clear a threshold and the creator's own confidence in that dimension must clear
    STYLE_WHY_MIN_CREATOR_CONFIDENCE — rule 6 (missing evidence stays unknown, not guessed)."""
    creator_vec = creator["style_vector"]
    evidence = creator["style_evidence"]
    target_vec = business["target_style_vector"]
    if creator_vec is None or evidence is None or target_vec is None or not dims:
        return None

    best_dim = max(dims, key=lambda d: creator_vec[d] * target_vec[d])
    joint = creator_vec[best_dim] * target_vec[best_dim]
    dim_evidence = evidence[best_dim]
    if joint < 0.5 or dim_evidence["confidence"] < STYLE_WHY_MIN_CREATOR_CONFIDENCE:
        return None

    label = STYLE_DIMENSION_LABELS_RO[best_dim]
    return f"Stilul tău {label} se potrivește cu tonul căutat de campanie: {dim_evidence['rationale']}"


def category_signal(creator: dict, business: dict) -> dict | None:
    """Returns score plus *which* categories matched, not just the number — the "why" builder
    below needs the actual category names, not only whether they overlapped."""
    verticals = set(business["verticals"] or [])
    if not verticals:
        return None

    declared = set(creator["preferred_categories"] or [])
    declared_overlap = declared & verticals

    observed_cats = {
        TOPIC_TO_CATEGORY[t] for t in creator["observed_topics"] if t in TOPIC_TO_CATEGORY
    }
    observed_indices = {CREATOR_CATEGORY.index(c) for c in observed_cats}
    observed_overlap = observed_indices & verticals

    if not declared and not observed_indices:
        return None

    observed_match = bool(observed_overlap)
    declared_match = bool(declared_overlap)
    # Observed:declared 2:1 (SKILL.md step 3: "un raport 2:1 e un punct de plecare rezonabil").
    score = (2 * observed_match + declared_match) / 3
    return {
        "score": score,
        "observed_match": observed_match,
        "observed_categories": sorted(CREATOR_CATEGORY[i] for i in observed_overlap),
        "declared_match": declared_match,
        "declared_categories": sorted(CREATOR_CATEGORY[i] for i in declared_overlap),
    }


def values_overlap(creator: dict, business: dict) -> list[str]:
    """Lexical only, never scored — SKILL.md keeps Values off the semantic/domain axis on
    purpose (it's "register", not "domain"; see ADR-017's deferred limitation). Safe as
    explanation text precisely because it isn't a judgment: it's a set intersection of two
    creator/business-declared word lists, displayed with the creator's own casing."""
    creator_values = {v.casefold(): v for v in (creator["values"] or [])}
    business_values = {v.casefold() for v in (business["values"] or [])}
    return [orig for key, orig in creator_values.items() if key in business_values]


def observed_product_match(creator: dict, business: dict) -> dict | None:
    """Did this creator already feature *this exact* business's brand in a clip? The strongest
    possible "why" — concrete, evidence-backed (real clipIds), not a similarity guess. Only an
    exact normalized name match; ADR-016's observed_products carries no category field to fuzzy-
    match against, and guessing "gaming laptop ~ PC Garage" would be exactly the kind of
    unmarked inference the project's rules forbid."""
    biz_name_norm = _normalize_brand(business["company_name"])
    for product in creator["observed_products"] or []:
        if _normalize_brand(product["name"]) == biz_name_norm:
            return product
    return None


def build_why(
    category: dict | None, flag: str | None,
    shared_values: list[str], product_match: dict | None, style_line: str | None,
    pair_seed: str,
) -> list[str]:
    """L3, Option A from the ADR-017 discussion: a deterministic Romanian template built only
    from already-computed Factors — no model call, so nothing here can be an invented claim.
    Mirrors the discipline already used for veto/flag reasons: plain-language strings that
    restate a fact that was already checked, never a new one. `pair_seed` only varies *phrasing*
    among fixed templates (_pick_variant) — never which facts get reported."""
    lines: list[str] = []

    if product_match:
        # disclosed=True/False follows ADR-016 exactly: only a declared partnership earns
        # "parteneriat"; everything else — including a clear on-screen appearance — stays the
        # neutral "ai integrat", never implying a commercial relationship that wasn't declared.
        if product_match["disclosed"]:
            lines.append(f"Ai avut deja un parteneriat cu {product_match['name']}.")
        else:
            lines.append(f"Ai integrat deja {product_match['name']} în conținutul tău.")

    if category:
        if category["observed_match"]:
            cats = ", ".join(category["observed_categories"])
            template = _pick_variant(pair_seed + ":observed", CATEGORY_OBSERVED_TEMPLATES)
            lines.append(template.format(cats=cats))
        elif category["declared_match"]:
            cats = ", ".join(category["declared_categories"])
            template = _pick_variant(pair_seed + ":declared", CATEGORY_DECLARED_TEMPLATES)
            lines.append(template.format(cats=cats))

    if style_line:
        lines.append(style_line)

    if shared_values:
        lines.append(f"Amândoi puneți preț pe {', '.join(shared_values)}.")

    if flag:
        lines.append(f"Atenție: {flag}")

    return lines


def score_pair(creator: dict, business: dict) -> dict:
    veto_reason = veto(creator, business)
    if veto_reason:
        return {"score": 0.0, "coverage": 0.0, "veto": veto_reason, "flag": None, "why": []}

    semantic = float(np.dot(creator["embedding"], business["embedding"]))
    signals: dict[str, tuple[float, float]] = {"semantic": (ADR017_WEIGHTS["semantic"], semantic)}
    category = category_signal(creator, business)
    if category is not None:
        signals["category"] = (ADR017_WEIGHTS["category"], category["score"])

    style = style_signal(creator, business)
    style_line = None
    if style is not None:
        signals["style"] = (ADR017_WEIGHTS["style"], style["score"])
        style_line = style_why(creator, business, style["dims"])

    total_weight = sum(w for w, _ in signals.values())
    score = sum(w * s for w, s in signals.values()) / total_weight
    coverage = total_weight / sum(ADR017_WEIGHTS.values())

    flag = category_term_flag(creator, business)
    if flag:
        score = max(0.0, score - 0.15)

    shared_values = values_overlap(creator, business)
    product_match = observed_product_match(creator, business)
    pair_seed = f"{creator['creator_id']}:{business['business_id']}"
    why = build_why(category, flag, shared_values, product_match, style_line, pair_seed)

    return {"score": score, "coverage": coverage, "veto": None, "flag": flag, "why": why}


def print_creator_report(creator: dict, businesses: list[dict], top_n: int = 10) -> None:
    results = [(b, score_pair(creator, b)) for b in businesses]
    results.sort(key=lambda r: r[1]["score"], reverse=True)

    print(f"\n{creator['display_name']}  — top {top_n} (semantic+category+style, fără Campaign pt. reach/format/logistics)")
    for business, r in results[:top_n]:
        tag = f"  VETO ({r['veto']})" if r["veto"] else (f"  ⚠ {r['flag']}" if r["flag"] else "")
        print(f"  {round(r['score'] * 100):>3}%  cov={r['coverage']:.2f}  {business['company_name']:<28}{tag}")
        for line in r["why"]:
            print(f"        · {line}")

    vetoed = [r for _, r in results if r["veto"]]
    if vetoed:
        print(f"  ({len(vetoed)} businessuri vetoate, nu apar în top dacă au ieșit oricum)")


def creator_matches_json(creator: dict, businesses: list[dict]) -> dict:
    """The payload shape discussed for the creator feed card: businessId, companyName,
    matchPercent, coverage, why, vetoed — one object per business, sorted best-first. Vetoed
    businesses stay in the list (matchPercent 0, vetoReason set) rather than being dropped here;
    whether the feed endpoint filters them out is a frontend/backend call, not this script's."""
    results = [(b, score_pair(creator, b)) for b in businesses]
    results.sort(key=lambda r: r[1]["score"], reverse=True)

    return {
        "creatorId": str(creator["creator_id"]),
        "displayName": creator["display_name"],
        "matches": [
            {
                "businessId": str(business["business_id"]),
                "companyName": business["company_name"],
                "matchPercent": round(r["score"] * 100),
                "coverage": round(r["coverage"], 2),
                "vetoed": r["veto"] is not None,
                "vetoReason": r["veto"],
                "why": r["why"],
            }
            for business, r in results
        ],
    }


def main() -> None:
    dsn = os.environ["DATABASE_URI"]
    with psycopg2.connect(dsn) as conn:
        creators = fetch_creators(conn)
        businesses = fetch_businesses(conn)

    if not creators:
        raise SystemExit("niciun creator cu portret + embedding — rulează backfill_embeddings.py")

    args = sys.argv[1:]
    as_json = "--json" in args
    args = [a for a in args if a != "--json"]

    if args:
        name = args[0]
        matches = [c for c in creators if c["display_name"] == name]
        if not matches:
            raise SystemExit(f"{name!r} nu are portret+embedding. Disponibili: "
                              f"{', '.join(c['display_name'] for c in creators)}")
        if as_json:
            print(json.dumps(creator_matches_json(matches[0], businesses), ensure_ascii=False, indent=2))
        else:
            print_creator_report(matches[0], businesses, top_n=len(businesses))
    elif as_json:
        print(json.dumps([creator_matches_json(c, businesses) for c in creators], ensure_ascii=False, indent=2))
    else:
        for creator in creators:
            print_creator_report(creator, businesses)


if __name__ == "__main__":
    main()
