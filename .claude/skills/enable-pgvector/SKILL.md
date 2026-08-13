---
name: enable-pgvector
description: Enable and configure the pgvector (vector) extension on Vira's Azure Database for PostgreSQL Flexible Server, for storing CreatorPortrait/BrandProfile embeddings used in hybrid semantic matching. Use when setting up vector storage/indexing for the matching system, or troubleshooting a missing "vector" extension.
---

# Enable pgvector on Azure PostgreSQL

One-time setup checklist for storing `CreatorPortrait` / `BrandProfile` embeddings and
querying them by cosine similarity. This is the semantic-fit half of the hybrid matching
system; hard constraints stay in the separate rule-based score contract — do not put those
in vector search.

Verified against Microsoft's docs: `how-to-use-pgvector` and `how-to-optimize-performance-pgvector`
(learn.microsoft.com/en-us/azure/postgresql/extensions/).

## Two independent phases

Steps 1–2 (allowlist + `CREATE EXTENSION`) need nothing but the database — do them as soon
as the server exists. Steps 3–4 (column + index) need a real table to attach to. As of this
writing, `CreatorPortrait` / `BrandProfile` tables don't exist yet (current tables are
`Creators`, `Businesses`, `CreatorQuestionnaires`, `BusinessQuestionnaires`, `ClipAnalyses`,
`CreatorClips`) — that's fine, don't block extension setup on schema design. `BrandProfile`
is confirmed in scope for this PoC per ADR-010 (`docs/decisions.md`), as the brand-side
counterpart to `CreatorPortrait`. Enable the extension now; add the column/index once the
target table (new or existing) is decided.

## 1. Allowlist the extension on the server

The extension's real name is **`vector`** — "pgvector" is only the community/project name.
It must be allowlisted before it can be created in any database.

Azure Portal: Server parameters → `azure.extensions` → add `vector`.

Azure CLI:

```bash
az postgres flexible-server parameter set \
  --resource-group <rg> \
  --server-name <name> \
  --name azure.extensions \
  --value vector
```

If other extensions are already allowlisted, include them all in `--value` as a
comma-separated list — this call replaces the whole list, it doesn't append.

Verify:

```sql
SHOW azure.extensions;
```

## 2. Enable it in the target database

Run once per database that needs it (not per server):

```sql
CREATE EXTENSION vector;
```

## 3. Add a vector column

Get the exact embedding dimension from whoever wires up embedding generation before adding
the column — don't guess it. Example below assumes a 1536-dim OpenAI-style model; adjust to
match reality.

```sql
ALTER TABLE creator_portraits ADD COLUMN embedding vector(1536);
ALTER TABLE brand_profiles    ADD COLUMN embedding vector(1536);
```

The dimension is required, not optional: a bare `vector` column (no dimension) cannot be
indexed. Max 2000 dimensions per indexed column.

## 4. Index with HNSW, cosine distance

At this scale (tens to low hundreds of creators/brands), use **HNSW, not IVFFlat**:
HNSW has a better speed-recall tradeoff, needs no training step, and can be built on an
empty table. IVFFlat needs data loaded first and requires tuning `lists` — not worth it here.

Use cosine distance (`vector_cosine_ops`) since matching is about semantic similarity
between a creator and a brand, not raw vector distance:

```sql
CREATE INDEX ON creator_portraits USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX ON brand_profiles USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

`m` and `ef_construction` are tunable, but the defaults above are fine to start — only
revisit them if recall/latency profiling says otherwise.

Prefer loading data before creating the index when you have a choice (e.g. a backfill):
build is faster and index layout is better than indexing an empty table and inserting after.

## 5. Query pattern

Cosine distance uses the `<=>` operator. Lower value = more similar.

```sql
SELECT id, embedding <=> '[0.01, -0.02, ...]' AS distance
FROM brand_profiles
ORDER BY embedding <=> '[0.01, -0.02, ...]'
LIMIT 5;
```

Combine with the rule-based score contract in the application layer — don't try to encode
hard constraints as vector distance.

## Troubleshooting: self-hosted Postgres

If the target isn't Azure Database for PostgreSQL (managed) — e.g. a local or self-hosted
Postgres instance — step 1 (allowlisting) doesn't apply. Instead the `vector` extension
binary must be installed on the Postgres instance itself first, via package manager or by
building from source (github.com/pgvector/pgvector). Once installed, `CREATE EXTENSION vector;`
works the same as step 2 above.
