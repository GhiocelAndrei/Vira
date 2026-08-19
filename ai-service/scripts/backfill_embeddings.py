"""One-time (then rerunnable) backfill: computes and stores embeddings for every
CreatorPortrait and BusinessQuestionnaire row that doesn't have one yet.

Reuses the exact text composition validated in match_creator_businesses.py (see that file's
CreatorBusinessMatcher.observational_text/business_text docstrings for the evidence) rather than
reimplementing it — creator text is topic+subtopics from ClipAnalyses ("topics-only"), never
NarrativeDossier; business text is Description+ProductsToPromote ("full"), never Values. Calls
GeminiEmbeddingClient in-process (app/ai_client.py), the same client the running /embeddings
route uses, so a backfilled row and a row embedded later through the HTTP endpoint are always
produced by identical code.

Requires the pgvector columns from .claude/skills/creator-brand-matching/SKILL.md step 5
("ALTER TABLE ... ADD COLUMN Embedding vector(1536)", + EmbeddingModel/EmbeddingGeneratedAt on
both CreatorPortraits and BusinessQuestionnaires) to already exist.

Usage:
    export DATABASE_URI=postgresql://user:pass@host:port/db
    export GOOGLE_API_KEY=...
    python scripts/backfill_embeddings.py             # only rows with no Embedding yet
    python scripts/backfill_embeddings.py --force      # recompute every row
    python scripts/backfill_embeddings.py --dry-run    # print what would happen, write nothing
"""

import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
import psycopg2.extras

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.ai_client import EMBEDDING_MODEL_ID, GeminiEmbeddingClient  # noqa: E402
from match_creator_businesses import CreatorBusinessMatcher  # noqa: E402

CREATOR_PORTRAITS_QUERY = """
SELECT DISTINCT ON (c."Id")
    p."Id" AS portrait_id, c."Id" AS creator_id, c."DisplayName" AS display_name,
    p."Embedding" IS NOT NULL AS has_embedding
FROM "CreatorPortraits" p
JOIN "Creators" c ON c."Id" = p."CreatorId"
ORDER BY c."Id", p."CreatedAt" DESC;
"""

CREATOR_ANALYSES_QUERY = """
SELECT ca."AnalysisJson" AS analysis
FROM "ClipAnalyses" ca
JOIN "CreatorClips" cl ON cl."Id" = ca."ClipId"
WHERE cl."CreatorId" = %s;
"""

BUSINESSES_QUERY = """
SELECT b."Id" AS business_id, b."CompanyName" AS company_name,
       q."Description" AS description, q."ProductsToPromote" AS products_to_promote,
       q."Embedding" IS NOT NULL AS has_embedding
FROM "Businesses" b
JOIN "BusinessQuestionnaires" q ON q."BusinessId" = b."Id"
ORDER BY b."CompanyName";
"""

UPDATE_PORTRAIT_EMBEDDING = """
UPDATE "CreatorPortraits"
SET "Embedding" = %s::vector, "EmbeddingModel" = %s, "EmbeddingGeneratedAt" = %s
WHERE "Id" = %s;
"""

UPDATE_BUSINESS_EMBEDDING = """
UPDATE "BusinessQuestionnaires"
SET "Embedding" = %s::vector, "EmbeddingModel" = %s, "EmbeddingGeneratedAt" = %s
WHERE "BusinessId" = %s;
"""


def _vector_literal(vector: list[float]) -> str:
    # psycopg2 has no built-in pgvector adapter (not in requirements.txt — CLAUDE.md rule against
    # unrequested dependencies); pgvector's text input format is exactly this bracketed CSV, cast
    # with ::vector on the SQL side.
    return "[" + ",".join(repr(v) for v in vector) + "]"


def backfill_creators(conn, client: GeminiEmbeddingClient, *, force: bool, dry_run: bool) -> None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(CREATOR_PORTRAITS_QUERY)
        portraits = [dict(row) for row in cur.fetchall()]

    for row in portraits:
        if row["has_embedding"] and not force:
            print(f"  skip  {row['display_name']} — deja are embedding")
            continue

        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(CREATOR_ANALYSES_QUERY, (row["creator_id"],))
            analyses = [r["analysis"] for r in cur.fetchall()]

        if not analyses:
            print(f"  skip  {row['display_name']} — nicio ClipAnalyses, nimic de embedat")
            continue

        text = CreatorBusinessMatcher.observational_text(analyses, mode="topics-only")
        if not text:
            print(f"  skip  {row['display_name']} — text topics-only gol")
            continue

        print(f"  embed {row['display_name']}: {text}")
        if dry_run:
            continue

        vector = client.embed(text)
        with conn.cursor() as cur:
            cur.execute(
                UPDATE_PORTRAIT_EMBEDDING,
                (_vector_literal(vector), EMBEDDING_MODEL_ID, datetime.now(timezone.utc), row["portrait_id"]),
            )
        conn.commit()


def backfill_businesses(conn, client: GeminiEmbeddingClient, *, force: bool, dry_run: bool) -> None:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(BUSINESSES_QUERY)
        businesses = [dict(row) for row in cur.fetchall()]

    for row in businesses:
        if row["has_embedding"] and not force:
            print(f"  skip  {row['company_name']} — deja are embedding")
            continue

        text = CreatorBusinessMatcher.business_text(row, mode="full")
        if not text:
            print(f"  skip  {row['company_name']} — text business gol")
            continue

        print(f"  embed {row['company_name']}: {text}")
        if dry_run:
            continue

        vector = client.embed(text)
        with conn.cursor() as cur:
            cur.execute(
                UPDATE_BUSINESS_EMBEDDING,
                (_vector_literal(vector), EMBEDDING_MODEL_ID, datetime.now(timezone.utc), row["business_id"]),
            )
        conn.commit()


def main() -> None:
    force = "--force" in sys.argv
    dry_run = "--dry-run" in sys.argv

    client = GeminiEmbeddingClient()
    dsn = os.environ["DATABASE_URI"]
    with psycopg2.connect(dsn) as conn:
        print("creatori (CreatorPortraits, text: topics-only din ClipAnalyses)")
        backfill_creators(conn, client, force=force, dry_run=dry_run)

        print("\nbusinessuri (BusinessQuestionnaires, text: full = Description + ProductsToPromote)")
        backfill_businesses(conn, client, force=force, dry_run=dry_run)

    if dry_run:
        print("\n--dry-run: nimic scris in baza.")


if __name__ == "__main__":
    main()
