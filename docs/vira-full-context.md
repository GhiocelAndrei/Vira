# Vira — engineering rules

Marketplace connecting brands with TikTok creators. **Brands pay per verified view.**
Creators post natively on TikTok; Vira reads metrics via the official Display API, validates
them, and pays out. Product scope: `BUILD_PLAN.md`. Demo scope is **frozen** — see §Demo below.

---

## Non-negotiables

These are product-level invariants, not style preferences. Breaking one is a defect even if
the code compiles and tests pass.

1. **Money is integer minor units, always.** `Money(long)` in C#, integer cents in TS/Python.
   No `decimal`, no `double`, no `float`, no floating-point arithmetic anywhere in the money
   path — including intermediate calculations and the frontend. Format for display at the very
   edge, never earlier.
2. **`ViewSnapshot` is append-only.** Never `UPDATE` a snapshot row. A correction is a new row.
   The snapshot series is the evidence file for every payout dispute.
3. **Measurement gaps are recorded, never interpolated.** "We could not measure" and "it did
   not grow" are different facts and must be distinguishable in the data. A failed poll writes
   a row saying it failed.
4. **Every payout traces to one ledger line, written once.** No amount is ever derived from an
   aggregate recomputed at read time.
5. **Idempotency on anything that moves money or calls an external API.** Retries must be safe.
6. **The payment ledger survives independently of TikTok data.** TikTok's terms require deleting
   their data if API access ends; our ledger stores the values as of the decision, not references.
7. **No claim without evidence.** `PortraitClaim` must carry its supporting clip + timestamp.
   The type system enforces this — do not add a nullable-evidence escape hatch.
8. **Weights and thresholds are versioned configuration, not code.** They must be tunable
   without a deploy, and every AI output records the model + prompt + ontology version that
   produced it.
9. **Tests on money calculations are not negotiable**, regardless of schedule pressure.

## TikTok integration — hard limits

- **Login Kit + Display API only.** No Content Posting API, no audit dependency. Creators post
  natively; we detect and verify the post afterwards.
- Scopes: `user.info.basic`, `user.info.profile`, `user.info.stats` (follower gating),
  `video.list`. Request nothing we don't demonstrate — extra scopes delay app review.
- **No webhooks exist.** Polling only, via a persistent `BackgroundService`.
- `/v2/video/query/` validates ownership → **batch by creator token, max 20 videos per call.**
- Access tokens expire in 24h; refresh tokens rotate — always persist the newly returned one.
  Silent expiry is an incident (campaign appears frozen), not a minor bug: refresh proactively,
  track `last_successful_call_at`, alert.
- **No scraping, no third-party aggregators.** Official API only.
- The API does **not** return video files. Anything requiring clip content must come from what
  the creator uploads to us.

---

## Repo map

```
apps/web/            React + Vite + TS + Tailwind — THE app: landing + creator + brand
apps/mobile/         Expo + React Native + NativeWind — parked; native port, derived later
packages/core/       money, i18n, roles, tokens, fixtures — plain TS, renderer-agnostic
backend/src/
  Vira.Api/          Controllers = API gateway; Program.cs; auth; Swagger
  Vira.Application/  Interfaces, Services (AI + TikTok HttpClients), Mapping, Validation
  Vira.DataAccess/   EF Core DbContext, migrations
  Vira.Abstractions/ Entities, DTOs, Settings, Constants, Common — shared leaf, references nothing
ai-service/          Python + FastAPI (Anthropic SDK) — portrait, assistant, analysis pipelines
packages/contracts/  Shared types, generated from the .NET OpenAPI spec
```

**Dependency direction is strict:** `Api → Application → DataAccess → Abstractions`.
`Abstractions` references nothing. External-service clients live in `Application/Services` as
pooled `HttpClient`s — do not add an Infrastructure project.

Both frontends talk **only** to the .NET backend. Neither calls `ai-service` or TikTok directly.

**`apps/web` is the product** (D13). It carries all three audiences behind one router: the
public landing, the creator app (scroll feed, campaigns, portrait, earnings, assistant) and the
brand dashboard. Build features here. **`apps/mobile` is parked** — a working Expo head start
for the native app, which will be derived from these screens later. Do not add features there,
and do not treat the web screens as a preview of it: they are the source.

`apps/web` is **not** desktop-only. Both a creator and a brand manager must be able to do
everything from a phone browser. Build every screen mobile-capable: real mobile navigation
(bottom tab bar below `md`, not a shrunken desktop nav), and data tables that **reflow into card
lists** rather than scrolling sideways. A table you have to drag horizontally is not parity.
Campaign funding stays in the browser, which keeps Apple's IAP rule out of the conversation.

Anything a future native app would also need is plain TypeScript in `packages/core` — money,
i18n, roles, tokens, fixtures. Keep it renderer-agnostic: no DOM, no React Native imports. That
is what makes the eventual port a port rather than a rewrite.

## Commands

```bash
docker compose up --build                                    # postgres + backend + ai-service
dotnet run --project backend/src/Vira.Api                    # :8080, Swagger at /swagger
uvicorn app.main:app --reload --port 8000 --app-dir ai-service # :8000, docs at /docs
npm run web                                                  # :5173  the app — start here
npm run typecheck                                            # every workspace
npm run mobile:web                                           # :8081  parked Expo app (browser)
npm run mobile                                               # parked Expo app: i = iOS, a = Android
dotnet test                                                  # run before any money-path commit
```

Install from the **repo root** — it is an npm workspace. Never `npm install` inside an app:
that nests `react-native` or `tailwindcss` under `apps/*`, and NativeWind's type augmentation
(`declare module "react-native"`) then targets a copy your code does not import, so every
`className` silently loses its typing. Both apps are pinned to **React 19** and **Tailwind 3**
for the same reason — a version split forces npm to nest.

Mobile builds go through EAS (`eas build --platform ios`); JS-only fixes ship via
`eas update` without an App Store review cycle.

Migrations: `dotnet ef migrations add <Name> --project backend/src/Vira.DataAccess --startup-project backend/src/Vira.Api`

## Conventions

- **Code, identifiers, comments, commits: English.** Product docs are Romanian; code is not.
- **UI copy: Romanian, via i18n from day one.** Never hardcode user-facing strings — retrofitting
  is expensive and the demo is presented in Romanian.
- Frontend API types are **generated** from the backend OpenAPI spec. Do not hand-write DTOs;
  a C# DTO change must surface as a TypeScript compile error.
- Currency is **EUR** in all product documents; `Money` currently documents itself as RON *bani*.
  See Open decisions below — do not silently pick one.

## ai-service (Python, Anthropic SDK)

- **Model IDs**: `claude-opus-5` for vision + creative/portrait reasoning; `claude-haiku-4-5`
  for cheap normalization/compliance passes. (`claude-opus-4-8` in earlier notes is superseded.)
- **Adaptive thinking**: `thinking={"type": "adaptive"}` with `output_config={"effort": "high"}`.
  `budget_tokens` is removed and returns 400. Thinking is on by default on Opus 5 — `max_tokens`
  caps thinking *plus* response text, so size it with headroom.
- **Structured outputs**: `client.messages.parse(..., output_format=PydanticModel)` →
  `response.parsed_output`. Pydantic models enforce the score contract
  `{value?, confidence, factors[], evidence[]}` at the schema level — that is how rule 7 above
  is mechanically guaranteed rather than merely intended.
- **Prompt caching**: put the stable system prompt + ontology + rubrics before the
  `cache_control` breakpoint, volatile creator data after it. Minimum cacheable prefix on
  Opus 5 is 512 tokens. Verify with `usage.cache_read_input_tokens` — a persistent zero means
  something volatile leaked into the prefix.
- **One structured call, not four.** The critic jury returns all verdicts from a single request;
  four separate calls quadruple cost for no quality gain.
- Stamp model + prompt + ontology version into the stored JSONB on every output. AI outputs are
  never regenerable — losing them loses the data asset.
- Never log or echo `ANTHROPIC_API_KEY`. It is server-side only and must never reach the browser.

## Money-path workflow

For anything touching payouts, ledger, tranches, holdback, or budget drawdown:
**write the tests first** (use the worked example from the product doc as a fixture), have them
reviewed, then implement until they pass. Verify the assertions by hand — a generated test that
encodes a wrong expectation is worse than no test.

---

## Open decisions — do not resolve silently

- **Currency.** Product docs quote EUR; `Money` documents RON *bani*. Romanian invoicing
  (e-Factura) and PFA payouts are RON, brand budgets are quoted in EUR. Pick one storage
  currency explicitly and record the decision in `BUILD_PLAN.md` before writing payout code.
- **Post detection vs. pasted link.** Both ride the same `video.list` access; the choice is UX.
- **Clip source for the AI portrait.** Working assumption: creator uploads 3–5 clips at
  onboarding. Validate in the first two weeks.
