# Vira — Build Plan (Demo, 4 weeks)

**Scope:** Demo-as-foundation. Build the 4-week demo so every stack choice extends
directly into the full 13-week / €80k program (day 60 = money flows, day 90 = pilot).
No throwaway code.

**Demo must show (from demo.docx):**
- Browsable web app, desktop-first (like TikTok desktop), also works on phone
- TikTok-style vertical video **feed** (~30 example ad clips), scroll + sound
- **Live TikTok login** (OAuth) → creator's real clips + real view counts
- **AI Creator Portrait** — generated from clips, every claim backed by a clip
- **Campaigns feed** — brief + explained match; product-placement locked below follower threshold
- **AI Assistant** — style-aware ("how would I make a clip for this campaign?")
- **Business side** — separate account; create campaign (brief/budget/access rules);
  dashboard with a real test clip whose views climb **live**; full campaign with
  budgets/payouts on **simulated** data marked "demo"

**Real vs. simulated boundary (frozen):**
- REAL/LIVE: TikTok connection, clips + view counts, AI portrait, live test-clip views,
  campaign creation & access rules
- SIMULATED (marked "demo"): card payments & money movement, calculated budgets/payouts,
  antifraud validation

---

## Decisions log

### D0 — Scope & philosophy ✅
Demo as foundation. Optimize for the demo scenario, but no throwaway architecture.

### D1 — Architecture shape ✅
Separate services, but with a **central .NET backend as the brain + API gateway**.
Not fully-independent peer services — a hub-and-spoke around .NET.

**Shape:**
- `frontend/` — pure UI (SPA), no business logic
- `backend/` (.NET) — business logic + API gateway/orchestrator; the only thing the
  frontend talks to; fronts the satellite services
- Satellite services behind the gateway: `tiktok-service`, `ai-service`, AI-pipelines
- **Monorepo** containing frontend, backend, services, shared contracts
- **Data:** one Postgres, **schema-per-service** (tiktok.*, ai.*, campaigns.* …);
  extract to per-service DBs later
- **Transport:** HTTP/REST for request-response; message queue only where the doc
  demands async (AI pipeline, view-count polling)

**Runtime per piece (locked):**
- `ai-service` + AI-pipelines → **Python (FastAPI)** — native home for Anthropic SDK,
  multimodal, ffmpeg/OpenCV frames, Whisper transcription
- **TikTok → a module inside the .NET backend** (OAuth, Display API, 24h token refresh,
  view polling via a background hosted service). Not a separate deployable. Extract later if needed.

**Result: 3 deployables.**
```
monorepo/
  frontend/            UI only (SPA)
  backend/             .NET — business logic + API gateway
                         └ TikTok module (OAuth, Display API, polling)
  ai-service/          Python/FastAPI — IAiModelClient, Portrait, Assistant, pipelines(stub)
  packages/contracts/  shared types/DTOs
  (Postgres: schema-per-service)

frontend → backend(.NET gateway) → ai-service (HTTP; queue for async pipeline)
                                 └ TikTok API (direct, from TikTok module)
```

### D2 — Frontend stack ✅
*Scope narrowed by D13: this describes the **web** app (public landing + brand dashboard).
The creator app is React Native + Expo — see D13.*

Pure UI SPA. **React + Vite + TypeScript.**
- Routing: React Router · Server state: TanStack Query (also powers live-view polling)
- Client state: Zustand · Forms: React Hook Form + Zod · Charts: Recharts
- **UI/styling: shadcn/ui + Tailwind** (own the component code; distinctive, non-templated)
- Video feed: HTML5 `<video>` + IntersectionObserver + CSS scroll-snap for our ~30
  example clips; TikTok creator clips via TikTok `embed_link`
- API types generated from the .NET OpenAPI spec (stay in sync with gateway)

### D3 — Backend stack (.NET brain/gateway) ✅
- Runtime **.NET 8 (LTS)** · ASP.NET Core · **Controllers (MVC)** · OpenAPI/Swagger
- **Layered architecture (team convention): `Api → Application → DataAccess → Abstractions`**
  ```
  backend/src/
    Vira.Api/            Controllers = the API gateway; Program.cs; auth; Swagger
    Vira.Application/    Interfaces, Services (AI + TikTok HttpClients), Mapping (AutoMapper),
                           Validations (FluentValidation), ApplicationExtensions.AddApplication(conn)
    Vira.DataAccess/     EF Core DbContext, Migrations, DataAccessExtensions.AddDataAccess(conn)
    Vira.Abstractions/   Models (entities), DTOs, Settings, Constants, Common — the shared leaf
  ```
  Abstractions is referenced by all; external-service clients (AI, TikTok) live in
  Application/Services (pooled HttpClient), so there is no separate Infrastructure project.
  Note: scaffolded on **.NET 10** (installed LTS) rather than net8.0.
- Data access: **EF Core** (migrations, schema-per-service) **+ Dapper later** for money-ledger hot paths
- Validation: FluentValidation · Background: Hosted `BackgroundService` (+ Hangfire if needed)
- Money: integer-only in **bani** (`long`), never floats (dev-doc non-negotiable)

### D4 — Data model ✅
Postgres, schema-per-service. Core entities:
- `identity`: Account (type Creator|Business), Session
- `creators`: Creator, TikTokConnection (access/refresh token, expires_at), CreatorClip
  (cached from video.list), CreatorPortrait, **PortraitClaim (statement + evidence→clip+timestamp)**
- `campaigns`: Business, Campaign (structured brief, budget_bani), CampaignAccessRule
  (min_follower_threshold, product_placement), CampaignStyleVector, Match (score, factors, explanation)
- `media`: FeedClip (~30 example ads), TestClip, **ViewSnapshot (append-only, gaps marked not interpolated)**
- `ai`: AssistantConversation/Message, AnalysisResult (stub seam for day-60)
- `billing`: SimulatedPayout, CampaignBudgetLine — all `is_demo=true`

**Modeling:**
- AI outputs (style vector, factors[], evidence[]) stored as **versioned JSONB** + model/prompt/
  ontology version columns; matches score contract `{value?, confidence, factors[], evidence[]}`.
  `PortraitClaim` stays a real table to enforce "no claim without evidence."
- TikTok clips: **fetch live on login (keeps 'live' promise) + cache** in Postgres for portrait/matching.

### D5 — Auth & accounts ✅
Two front doors converging on **one backend HttpOnly session cookie** (the gateway's single
source of truth). JS never holds a token.
- **Business → Firebase Auth** (email/password; Firebase handles hashing/reset/lockout).
  SPA gets Firebase ID token → `POST /auth/firebase` → backend **verifies via Firebase Admin
  SDK (FirebaseAdmin NuGet)** → issues HttpOnly cookie. No ASP.NET Core Identity needed.
- **Creator → TikTok OAuth only** (Login Kit). Backend exchanges the code (TikTok module) →
  issues HttpOnly cookie. TikTok tokens stored server-side in `creators.TikTokConnection`.
- Both map to `identity.Account` (type Creator|Business) + `Session`; frontend routes by type.
- Dependency note: Firebase Auth adds one Google cloud dependency (fine for demo+pilot).

### D6 — TikTok integration ✅ (.NET TikTok module)
- **Login Kit + Display API only** (no Content Posting API).
- Scopes: `user.info.basic`, `user.info.profile`, **`user.info.stats`** (follower_count for the
  campaign gate), `video.list`.
- Endpoints: `/v2/oauth/token/`, `/v2/user/info/`, `/v2/video/list/` (clip feed),
  `/v2/video/query/` (poll test clip).
- Tokens: 24h access / ~365d refresh; **background HostedService refreshes before expiry + alerts**;
  stored encrypted at rest (ASP.NET Data Protection).
- **Live views: no webhooks → queue worker polls `video.query` every ~10-15s**, writes
  **append-only `ViewSnapshot` (raw, gaps marked, not interpolated)**; **UI tweens** the number
  between real snapshots so it feels continuously live.
- Env: **Sandbox + client TikTok accounts as test users** (Display-only → no audit). Active User
  Cap increase filed before pilot.
- ⚠ Demo-execution risk: TikTok view stats update with latency; test clip posted demo-morning so
  views accrue over hours (not seconds) — set audience expectation accordingly.

### D7 — Video handling ✅
- **We host only the ~30 example feed clips.** Creator clips + test clip render via TikTok
  `embed_link`/cover images — never stored by us.
- Storage: **Firebase Storage (GCS) + CDN**; frontend plays direct via public/signed URLs
  (not proxied through .NET). Consolidates on Firebase (already auth). **Originals stay
  accessible to the Python AI pipeline later** (frame extraction, fingerprinting).
- Prep: one-time `ffmpeg` web-optimize (H.264, faststart, capped resolution). Playback via
  HTML5 `<video>` + IntersectionObserver + scroll-snap (no HLS needed at this volume).
- Google footprint now: Firebase Auth + Firebase Storage → informs hosting (D12).

### D8 — AI layer (ai-service, Python/FastAPI) ✅
**IAiModelClient** black-box contract (Python Protocol/ABC); primary impl = Anthropic SDK.
Every lane swappable later (Gemini / Fable 5 / local).

**Full task router (4 lanes):**
| Lane | Model | Demo status |
|---|---|---|
| Vision (cover images now; frames later) | `claude-opus-5` (multimodal, high-res) | **active** — ~20 cover thumbnails |
| Creative/brand reasoning (portrait synthesis, brainstorm) | `claude-opus-5`, adaptive thinking, effort high | **active** |
| Compliance / normalization (light, cheap) | `claude-haiku-4-5` | active (light use in demo) |
| Audio transcription | local **Whisper** (faster-whisper) | **stubbed** — day-60 pipeline |

**API mechanisms → dev-doc mandates:**
- **Structured Outputs** via `client.messages.parse()` + **Pydantic** models enforce the score
  contract `{value?, confidence, factors[], evidence[]}`; `PortraitClaim.evidence` is a required
  field → "no claim without evidence" enforced by schema.
- **Prompt caching** on stable system prompt + ontology + rubrics; volatile creator clips after
  the cache breakpoint (the §19.2 cost lever).
- **Adaptive thinking** (`effort: high`) for portrait/brainstorm; none for Haiku compliance.
- Every output stamps model/prompt/ontology version into JSONB (D4) → reproducible.
- Demo portrait built from **clip metadata + real view stats + cover-image vision**; full
  frame/transcription analysis is the stubbed day-60 seam.
- Eval: **small eval set** for the demo (not the full 100-creator gold set — §19.6).

**AI Assistant:** plain **Messages API multi-turn** — system prompt + cached portrait + campaign
brief as context, streamed responses, history in `ai.AssistantConversation`. No Managed Agents.

### D10 — Matching engine (.NET) ✅
Ranked list, **matching is information not a gate**; honors **absolute veto** (mocked
category / praised competitor → 0%, from portrait ontology tags) and the **follower-threshold
lock** on product-placement campaigns.
- **Score = deterministic .NET math**: cosine similarity of the two 8-dim style vectors (from
  Postgres JSONB) + factor breakdown. Follower gate = pure rule.
- **Explanation = AI-generated, grounded**: .NET computes score+factors → ai-service (Opus) writes
  a short NL "why it fits" grounded in factors + style tags (no claim without evidence). Cacheable.
- **Factors for demo:** REAL = creative compat (vector similarity), audience compat (niche/geo),
  budget fit (cap/slots), veto rule. **Seeded + labeled "building"** = history on similar
  campaigns, reliability, conformance probability (shown as accruing, not fabricated).

### D11 — Simulated money layer (.NET Domain) ✅
Build the **full Bloc 1 calculation/ledger logic now** (all simulated), not just a minimal calc.
- **In (real logic, simulated data):** integer **bani** (`long`, never floats); payout =
  views × cost-per-view; budget draw-down/remaining; **80%/20% staged payout** (80% on-progress,
  20% released at 30 days); **30-day reserve** modeling; **per-creator caps at non-round values**
  (anti-fraud); **append-only audit ledger** independent of TikTok; **human approval on payout batch**.
- **Out (day-60):** Stripe/card rails, real money movement, functional antifraud validation,
  e-Factura/DAC7/tax. All money rows `is_demo=true` + UI "demo" badge.
- ⚠ Timeline flag: this is beyond demo.docx's minimal scope (which defers tranches/reserves/caps
  to day-60). Chosen for foundation strength; adds build weight in the 4 weeks. Risk bounded —
  pure calculation/ledger, no payment rails.

### D12 — Infra & deployment ✅
**Split hosting across 3 clouds:**
- **Frontend (React SPA) → Vercel** (CDN, instant deploys, preview envs).
- **Backend (.NET) + ai-service (Python) → Azure Container Apps.**
- **Postgres → Azure Database for PostgreSQL (Flexible Server).**
- **Firebase Auth + Storage → Google** (stays, per D5/D7).
- **Secrets → Azure Key Vault** (Anthropic key, TikTok secret, Firebase admin, DB creds).
- **CI/CD → GitHub Actions** (monorepo, path-filtered per service).
- Local dev: **Docker Compose + Firebase emulators**.

**⚠ Cross-origin auth callout (interacts with D5):** Vercel frontend and Azure backend are
different origins. To keep the **HttpOnly cookie session** first-party and simple (SameSite=Lax),
put both under **one registrable domain** — e.g. `app.vira.com` (Vercel) + `api.vira.com`
(Azure), cookie `Domain=.vira.com`. If we ship on default `*.vercel.app` + `*.azurecontainerapps.io`
domains instead, cookies must be **SameSite=None; Secure** with credentialed CORS pinned to the exact
frontend origin. **Recommend the custom-domain path** to preserve the D5 security model.

### D13 — Web first, one app; native derived from it later ✅

**Current decision (supersedes two earlier drafts of D13: a Capacitor wrap, then a
split into two parallel frontends).**

**The web app is the product.** `apps/web` carries the whole thing — public landing,
the creator app (scroll feed, campaigns, portrait, earnings, assistant) and the brand
dashboard — behind one router and one role store. Nothing is split off, and no audience
has to leave for a second URL.

**The phone app comes later and is derived from these screens.** They are the source of
truth for layout, copy and behaviour, not a preview of something else. `apps/mobile`
(Expo + React Native + NativeWind) already exists as a working head start with the five
creator screens ported and Expo Router wired — it is **parked**, not on the critical
path. Revisit the native route once the web app is settled; the porting decision (React
Native vs. wrapping the built SPA) stays open until then, and `packages/core` keeps the
shared logic renderer-agnostic either way so neither choice is foreclosed.

Everything below describes that parked Expo app.

---

*Historical note: an earlier draft proposed wrapping the Vite SPA in Capacitor, and a
later one proposed two parallel frontends. Both are superseded by the above.*

**What forces the decision:** the contract commits to the iPhone app being **submitted to the App
Store by day 90**. D2's React + Vite SPA has no path to the App Store.

**The insight that shapes it: only the creator surface ever becomes a *store* app.** The native
app is ~5 creator screens: feed, campaigns, portrait, earnings, assistant.

**Brands are not desktop-only — they are store-app-only.** A brand manager must be able to do
everything from a phone: create a campaign, fund it, approve content, read results. That is
delivered by making `apps/web` **fully responsive**, not by shipping a second native app. The
distinction matters because of money: budgets are funded in a browser, so Apple's IAP rule
(guideline 3.1.1) never enters the conversation. Precedent would probably protect a brand app
anyway — Meta Ads Manager, Google Ads and TikTok Ads Manager all charge outside IAP because
advertising is a real-world service — but "probably" is not worth a rejection cycle when
responsive web gives full parity for free.

**Consequence for the web app:** `apps/web` is no longer "desktop". It is desktop-first for the
dense analytics views and mobile-capable everywhere, with real mobile navigation (bottom tab
bar) rather than a shrunken desktop nav. Data tables reflow into card lists below `md` — a
horizontally-scrolling table is not parity.

*If a brand app in the App Store is ever wanted, it goes in `apps/mobile` behind role-based
routing, and campaign funding must open in an external browser — reopen this decision then.*

**Decision: React Native + Expo for the creator app; the Vite app stays for landing + brand.**

```
apps/
  mobile/    Expo (React Native) — creator app: iOS, Android, and web via React Native Web
  web/       Vite + React — public landing + brand dashboard. Responsive: full parity on a
             phone browser. Not a store app (keeps campaign funding outside Apple IAP).
packages/
  core/      money, i18n, domain types, fixtures — plain TS, imported by BOTH apps
  contracts/ types generated from the .NET OpenAPI spec
```

| Concern | Choice | Note |
|---|---|---|
| Navigation | **Expo Router** | File-based; the route tree already exists conceptually in `App.tsx` |
| Styling | **NativeWind v4** | Tailwind syntax in RN — the Lumina Dark tokens port nearly mechanically, and the team already writes Tailwind |
| Gradients | `expo-linear-gradient` | Replaces CSS `linear-gradient` on campaign cards |
| Glass / blur | `expo-blur` | Native blur is *better* than `backdrop-filter`; degrades on RN Web (see risk) |
| Feed paging | `FlatList` + `pagingEnabled` | Replaces CSS `scroll-snap`; native momentum instead of emulated |
| Push | `expo-notifications` + APNs | The capability that justifies the app existing |
| Clip upload | `expo-image-picker` | Camera roll access; also the strongest answer to guideline 4.2 |
| Video (later) | `expo-video` | Not needed while the feed shows campaign cards, not clips |
| Builds / OTA | **EAS Build + EAS Update** | Ships JS fixes without a review cycle — valuable during the pilot |

**What carries over from the existing Vite frontend, unchanged:** `lib/money.ts`, `lib/i18n.ts`,
`mocks/data.ts` and the design tokens — all plain TypeScript, moving to `packages/core`. The
landing page and brand dashboard stay exactly as they are. **What gets rewritten:** the five
creator screens, in RN primitives.

**Risks, stated plainly:**
- **Rewrite cost is real** — five screens, plus the monorepo restructure. This is the price paid
  for a genuinely native creator app rather than a wrapped website.
- **React Native Web is the weak edge.** The creator app renders to web through RN Web so it can
  be demoed in a desktop browser, but blur/glass and some layout fidelity degrade there. If the
  day-30 demo wants the creator app at full fidelity, **show it on a device or simulator** —
  which is more convincing than a browser tab anyway. Decide this before demo rehearsal, not on
  the day.
- **Guideline 4.2 stops being a threat.** A real RN app with push and camera access is not a
  thin wrapper. This was the main risk under the Capacitor route and it disappears here.
- **Apple Developer Program enrollment still starts in week 1.** Organization enrollment needs a
  D-U-N-S number and Apple's own verification — calendar we do not control, unchanged by this
  decision.
- Android comes from the same Expo codebase and is published after the pilot.

### D14 — Internationalization from day 1 ✅

UI copy lives in a translation layer (`react-i18next` or equivalent), never hardcoded in
components. The demo is presented in **Romanian** to a Romanian client, for Romanian creators —
but the codebase, identifiers, and comments stay English (see `CLAUDE.md`). Retrofitting i18n
after the feed and campaign screens exist costs days; doing it from the first component costs
nothing.

---

## Open decisions

Tracked here so they are resolved deliberately rather than by whoever writes the code first.

| # | Decision | Status |
|---|---|---|
| 1 | **Storage currency.** Product docs quote EUR; `Money` documents itself as RON *bani*. Romanian invoicing (e-Factura) and PFA payouts are RON; brand budgets are quoted in EUR. | **Open — blocks payout code.** Pick one storage currency, record it here, and align `Money`'s doc comment with it. |
| 2 | **Post capture: pasted link vs. automatic detection.** Both use the same `video.list` access; the difference is UX friction versus detection latency. | Open — decide during build; not blocking. |
| 3 | **Clip source for the AI portrait.** The API returns metadata and cover images, never video files. Working assumption: the creator uploads 3–5 clips at onboarding, and the portrait is enriched from campaign data over time. | Assumption in force — validate in the first two weeks. |
