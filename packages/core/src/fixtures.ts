/**
 * Demo fixtures.
 *
 * These types mirror the shapes the .NET gateway will return, so that swapping
 * `mocks/` for generated OpenAPI types is a mechanical change rather than a
 * rewrite. Every monetary field is an integer in minor units and is named
 * `*Minor` to make that impossible to miss (CLAUDE.md #1).
 *
 * Feed clips: `posterUrl` / `videoUrl` stay empty until the client delivers the
 * ~30 example clips (week 1). The gradient placeholder keeps the layout honest
 * in the meantime — same geometry, no external dependency.
 */

export interface Creator {
  handle: string;
  displayName: string;
  followerCount: number;
  avatarUrl?: string;
  verified: boolean;
}

/**
 * A campaign as it appears in the discovery feed — one per screen, scrolled
 * like TikTok. There is no video here: the creator is browsing briefs, not
 * watching content, so the card leads with the offer.
 */
export interface FeedCampaign {
  id: string;
  brandName: string;
  brandInitials: string;
  /** The campaign's hook, quoted — what the brand wants said. */
  hook: string;
  hookSubtitle: string;
  description: string;
  ratePerMilleMinor: number;
  estimatedMinMinor: number;
  estimatedMaxMinor: number;
  budgetRemainingMinor: number;
  slotsLeft: number;
  /** 0–100. */
  matchPercent: number;
  /**
   * Why this campaign is being shown to this creator.
   *
   * Required alongside `matchPercent`, not optional: a bare percentage is an
   * assertion the creator cannot check, and the same rule that forbids a claim
   * without evidence in the portrait (CLAUDE.md #7) applies to a number the
   * feed uses to rank what someone sees. Every reason cites something observable
   * in their own posting history.
   */
  matchReasons: MatchReason[];
  accent: string;
  /** Fills the card behind the text while there is no brand imagery. */
  mood: CampaignMood;
  /** Two stops. Web composes a CSS gradient; RN feeds them to expo-linear-gradient. */
  gradientStops: [string, string];
}

/**
 * The atmosphere behind a campaign card in the feed.
 *
 * DEMO SCAFFOLDING. With no brand photography available, each campaign gets a
 * backdrop generated from its own palette and a few motifs standing in for the
 * trade — a kebab place should not feel like a barber shop even when neither
 * has supplied an image. When real assets arrive this is replaced by them; the
 * component reads a backdrop from the campaign either way.
 */
export interface CampaignMood {
  /** Three tones, light to dark, that set the wash. The accent stays separate. */
  palette: [string, string, string];
  /** Material Symbols glyphs used as oversized, very faint background shapes. */
  motifs: [string, string, string];
}

export type MatchStrength = "strong" | "worth-trying";

export interface MatchReason {
  text: string;
}

export interface CampaignAccessRule {
  minFollowerThreshold: number;
  productPlacement: boolean;
}

export interface Campaign {
  id: string;
  brandName: string;
  title: string;
  /** Structured brief; the demo shows the requirement chips. */
  requirements: string[];
  ratePerMilleMinor: number;
  estimatedEarningsMinMinor: number;
  estimatedEarningsMaxMinor: number;
  deadline: string;
  slotsLeft: number;
  match: MatchStrength;
  matchReasons: MatchReason[];
  accessRule: CampaignAccessRule;
  /** Set when the signed-in creator does not meet `accessRule`. */
  locked: boolean;
  accent: string;
}

/**
 * The AI creator portrait — mirrors the ai-service `CreatorPortrait` output
 * field for field (ADR-011, amended by ADR-012 → ADR-016 in `docs/decisions.md`).
 *
 * This replaces a shape that was invented here before the pipeline existed:
 * `archetype`, `tagline`, `claims[]` and `growthTip`. None of the four are in
 * the contract and none will ever be returned. Worse, two of the old claims —
 * a percentile ranking within a niche, and a retention figure attributed to
 * where a clip was filmed — are exactly what `.claude/rules/creator-profile.md`
 * forbids the generator from producing: no comparative ranking, and no turning
 * engagement counts into causal quality claims.
 *
 * Evidence is per style dimension, not per claim. A dimension the model could
 * not ground carries an empty clip list and a low confidence, and the gap goes
 * into `limitations` — an unmeasured dimension stays distinct from a genuinely
 * low score (CLAUDE.md rule 3).
 */
export const STYLE_DIMENSIONS = [
  "warmth",
  "energy",
  "authority",
  "refinement",
  "convention",
  "humor",
  "demonstration",
  "intimacy",
] as const;

export type StyleDimensionKey = (typeof STYLE_DIMENSIONS)[number];

/** Eight plain floats in [0,1] — kept plain because it feeds cosine similarity
 *  and a vector index; the explanation lives in `StyleEvidence` (ADR-013). */
export type StyleVector = Record<StyleDimensionKey, number>;

export interface DimensionEvidence {
  confidence: number;
  /** Romanian, capped at 20 words by the generator. */
  rationale: string;
  /** Real `tikTokVideoId` values, never array positions (ADR-014). May be empty. */
  evidenceClipIds: string[];
}

export type StyleEvidence = Record<StyleDimensionKey, DimensionEvidence>;

/**
 * A brand seen on screen. Computed from the analyses, never model-generated
 * (ADR-016) — and evidence, not a verdict: `disclosed` must be rendered beside
 * the name or the list reads as a sponsorship roster.
 */
export interface ObservedProduct {
  name: string;
  clipIds: string[];
  confidence: number;
  disclosed: boolean;
  declaredByCreator: boolean;
}

export interface PortraitProvenance {
  aiModel: string;
  promptVersion: string;
  ontologyVersion: string;
  /** ISO timestamp. */
  generatedAt: string;
}

export interface CreatorPortrait {
  /** Reader-facing "Despre creator" copy, capped at 80 words (ADR-012/ADR-015). */
  narrativeDossier: string;
  styleVector: StyleVector;
  styleEvidence: StyleEvidence;
  observedProducts: ObservedProduct[];
  provenance: PortraitProvenance;
  confidence: number;
  /**
   * What the model could not ground. **Strictly internal** — ADR-015 moved the
   * caveats here precisely because they are not rendered next to the dossier,
   * and a surface that shows them to a brand presents the gaps without the
   * context that used to accompany them. Do not put this on screen.
   */
  limitations: string[];
  extensions: Record<string, unknown>;
}

export type PayoutStatus =
  | "paid"
  | "scheduledDay7"
  | "scheduledDay14"
  | "reserved"
  | "underReview";

export interface PayoutRow {
  id: string;
  campaignName: string;
  brandName: string;
  validatedViews: number;
  amountMinor: number;
  status: PayoutStatus;
}

export interface EarningsSummary {
  thisMonthMinor: number;
  pendingValidationMinor: number;
  reserveMinor: number;
  reserveReleaseDate: string;
  availableMinor: number;
  trendPercent: number;
  /** 30 daily cumulative points, minor units. */
  timeline: number[];
  rows: PayoutRow[];
}

export type CampaignObjectiveId = "awareness" | "visits" | "offer" | "launch" | "community";

/**
 * What the brand wants to happen.
 *
 * The landing page promises "you don't write briefs — you answer one question";
 * this is that question. Picking one sets the rate creators are paid and seeds
 * the requirement chips, so a business that has never advertised can get to a
 * usable campaign without knowing the vocabulary.
 */
export interface CampaignObjective {
  id: CampaignObjectiveId;
  icon: string;
  /** Paid per 1.000 validated views on this objective. */
  ratePerMilleMinor: number;
  /** Requirement chips pre-filled when the objective is picked; the brand can remove them. */
  suggestedRequirements: string[];
}

export interface ClipDurationPreset {
  id: string;
  label: string;
}

/**
 * Automatic checks run on an uploaded clip before a human looks at it.
 *
 * `warn` exists on purpose: a check that cannot be decided mechanically must say
 * so rather than guessing. "We could not verify" and "it failed" are different
 * facts, the same distinction rule #3 draws for measurement gaps.
 */
export type SubmissionCheckStatus = "pass" | "warn" | "fail";

export interface SubmissionCheck {
  id: string;
  label: string;
  status: SubmissionCheckStatus;
  detail: string;
}

/**
 * A clip a creator uploaded to Vira for approval, before it is posted natively
 * on TikTok. The platform never publishes it — approval is the brand telling the
 * creator "post this one" (BUILD_PLAN: creators post natively, we measure after).
 */
export interface ClipSubmission {
  id: string;
  campaignId: string;
  campaignName: string;
  creatorHandle: string;
  creatorName: string;
  creatorFollowers: number;
  submittedAt: string;
  durationSeconds: number;
  caption: string;
  /** Two stops, like the feed cards — no clip file until the client delivers the examples. */
  gradientStops: [string, string];
  checks: SubmissionCheck[];
}

/** Why a brand rejected a clip. Free-text alone is not enough to be actionable. */
export type RejectionReasonId =
  | "missing-requirement"
  | "misleading-claim"
  | "legal"
  | "off-brand";

export type SubmissionDecision = "approved" | "rejected";

export interface DecidedSubmission {
  id: string;
  campaignName: string;
  creatorHandle: string;
  decision: SubmissionDecision;
  reasonId?: RejectionReasonId;
  note?: string;
}

// ---------------------------------------------------------------------------

export const currentCreator: Creator = {
  handle: "@alex_dumitrescu",
  displayName: "Alex Dumitrescu",
  followerCount: 34_500,
  verified: true,
};

/**
 * Deliberately local and small: a kebab place, a barber, a neighbourhood gym.
 * These are the businesses that have never run a campaign — the ones the whole
 * product exists for — so the budgets and payouts here stay honest about that
 * scale rather than borrowing the numbers of a national brand.
 *
 * The estimate range on each card is what THIS creator would earn, derived from
 * the campaign rate against a plausible 15.000–60.000 views for an account of
 * `currentCreator`'s size: `views / 1.000 × ratePerMilleMinor`, exact in minor
 * units. Check any row and the arithmetic holds — the feed leads with these
 * numbers, so they cannot be decorative.
 */
export const feedCampaigns: FeedCampaign[] = [
  {
    id: "cmp-shaorma",
    brandName: "Shaorma la Vlad",
    brandInitials: "SV",
    hook: "Zi-le de ce te întorci",
    hookSubtitle: "fără scenariu, doar ce mănânci tu",
    description: "Local de cartier. Prima noastră campanie, vreodată.",
    ratePerMilleMinor: 250,
    estimatedMinMinor: 3_750,
    estimatedMaxMinor: 15_000,
    budgetRemainingMinor: 120_000,
    slotsLeft: 9,
    matchPercent: 88,
    matchReasons: [
      { text: "Vorbești cu camera, nu spre ea — exact tonul cerut aici" },
      { text: "Clipurile tale filmate în bucătărie au retenție peste media ta" },
    ],
    accent: "#FFCC7C",
    mood: {
      palette: ["#FFCC7C", "#E8734A", "#7A3B1E"],
      motifs: ["lunch_dining", "local_fire_department", "restaurant"],
    },
    gradientStops: ["#3b2a17", "#221407"],
  },
  {
    id: "cmp-fit",
    brandName: "FitZone Studio",
    brandInitials: "FZ",
    hook: "Prima lună gratis",
    hookSubtitle: "cum arată un antrenament la noi",
    description: "Sală de cartier. Demonstrație reală, fără promisiuni false.",
    ratePerMilleMinor: 300,
    estimatedMinMinor: 4_500,
    estimatedMaxMinor: 18_000,
    budgetRemainingMinor: 190_000,
    slotsLeft: 8,
    matchPercent: 87,
    matchReasons: [
      { text: "Ai deja 4 clipuri organice pe rutina de dimineață" },
      { text: "Campania cere demonstrație, iar tu scorezi bine pe asta" },
    ],
    accent: "#7CFFB2",
    mood: {
      palette: ["#7CFFB2", "#3FBF87", "#12513A"],
      motifs: ["fitness_center", "exercise", "bolt"],
    },
    gradientStops: ["#123a2c", "#0d1f1a"],
  },
  {
    id: "cmp-frizerie",
    brandName: "Frizeria Nord",
    brandInitials: "FN",
    hook: "Tunsoarea care mi-a schimbat săptămâna",
    hookSubtitle: "înainte și după, atât",
    description: "Doi frizeri, un scaun liber. Vrem să ne știe cartierul.",
    ratePerMilleMinor: 220,
    estimatedMinMinor: 3_300,
    estimatedMaxMinor: 13_200,
    budgetRemainingMinor: 90_000,
    slotsLeft: 6,
    matchPercent: 81,
    matchReasons: [
      { text: "Formatul înainte–după e apropiat de ce postezi deja" },
      { text: "Clipurile tale lângă fereastră au retenție cu 40% peste media ta" },
    ],
    accent: "#cabeff",
    mood: {
      palette: ["#cabeff", "#947dff", "#3A2A6B"],
      motifs: ["content_cut", "chair", "brush"],
    },
    gradientStops: ["#2a1f3b", "#1a1030"],
  },
  {
    id: "cmp-cofetarie",
    brandName: "Cofetăria Miere",
    brandInitials: "CM",
    hook: "Prăjitura pe care o cerea bunica",
    hookSubtitle: "spune-ne ce-ți amintește",
    description: "Rețete de familie, făcute dimineața. Fără conservanți, fără agenție.",
    ratePerMilleMinor: 260,
    estimatedMinMinor: 3_900,
    estimatedMaxMinor: 15_600,
    budgetRemainingMinor: 155_000,
    slotsLeft: 11,
    matchPercent: 84,
    matchReasons: [
      { text: "Ești în primii 5% pe intimitate în nișa ta" },
      { text: "Poveștile de familie sunt exact arhetipul tău, Povestitorul Cald" },
    ],
    accent: "#FFCC7C",
    mood: {
      palette: ["#FFD9A0", "#E9A6B8", "#6B3B4A"],
      motifs: ["cake", "bakery_dining", "coffee"],
    },
    gradientStops: ["#3b2a1f", "#1d1408"],
  },
  {
    id: "cmp-verde",
    brandName: "Verde Market",
    brandInitials: "VM",
    hook: "Cina în 15 minute",
    hookSubtitle: "doar din coșul de sezon",
    description: "Aprozar de cartier. Gătit real, în bucătăria ta.",
    ratePerMilleMinor: 200,
    estimatedMinMinor: 3_000,
    estimatedMaxMinor: 12_000,
    budgetRemainingMinor: 80_000,
    slotsLeft: 20,
    matchPercent: 72,
    matchReasons: [
      { text: "Format scurt, apropiat de ce postezi deja" },
      { text: "Gătitul apare deja în clipurile tale, fără să fie reclamă" },
    ],
    accent: "#7CFFB2",
    mood: {
      palette: ["#A8E063", "#56AB2F", "#2A4A1E"],
      motifs: ["eco", "shopping_basket", "local_florist"],
    },
    gradientStops: ["#1f3b28", "#0f2416"],
  },
];

export const campaigns: Campaign[] = [
  {
    id: "cmp-2",
    brandName: "Lumina Tech",
    title: "Summer Essentials",
    requirements: ["#LuminaTech", "@luminatech", "15–60 sec"],
    ratePerMilleMinor: 200,
    estimatedEarningsMinMinor: 80_000,
    estimatedEarningsMaxMinor: 150_000,
    deadline: "30 oct. 2026",
    slotsLeft: 12,
    match: "strong",
    matchReasons: [
      { text: "Ai deja 4 clipuri organice pe rutina de dimineață" },
      { text: "Publicul tău se suprapune cu nișa Tech & Gadgets" },
    ],
    accessRule: { minFollowerThreshold: 0, productPlacement: false },
    locked: false,
    accent: "#947dff",
  },
  {
    id: "cmp-3",
    brandName: "Aura Home",
    title: "Tech Review Series",
    requirements: ["#AuraHome", "produsul vizibil", "30–90 sec"],
    ratePerMilleMinor: 350,
    estimatedEarningsMinMinor: 120_000,
    estimatedEarningsMaxMinor: 280_000,
    deadline: "12 nov. 2026",
    slotsLeft: 5,
    match: "strong",
    matchReasons: [{ text: "Engagement ridicat pe clipurile de tip review" }],
    accessRule: { minFollowerThreshold: 0, productPlacement: false },
    locked: false,
    accent: "#7CFFB2",
  },
  {
    id: "cmp-6",
    brandName: "Elite Fragrance",
    title: "Private Collection",
    requirements: ["produsul vizibil", "#EliteFragrance", "60 sec+"],
    ratePerMilleMinor: 1_200,
    estimatedEarningsMinMinor: 300_000,
    estimatedEarningsMaxMinor: 750_000,
    deadline: "05 dec. 2026",
    slotsLeft: 3,
    match: "worth-trying",
    matchReasons: [{ text: "Stilul tău vizual se apropie de brief" }],
    accessRule: { minFollowerThreshold: 35_000, productPlacement: true },
    locked: true,
    accent: "#FFCC7C",
  },
  {
    id: "cmp-4",
    brandName: "Verde Market",
    title: "Coș de sezon",
    requirements: ["#VerdeMarket", "@verdemarket", "20–60 sec"],
    ratePerMilleMinor: 200,
    estimatedEarningsMinMinor: 45_000,
    estimatedEarningsMaxMinor: 110_000,
    deadline: "18 nov. 2026",
    slotsLeft: 20,
    match: "worth-trying",
    matchReasons: [{ text: "Format scurt, apropiat de ce postezi deja" }],
    accessRule: { minFollowerThreshold: 0, productPlacement: false },
    locked: false,
    accent: "#7CFFB2",
  },
];

/** The three clips this portrait is grounded in. Real-shaped TikTok video ids,
 *  because `evidenceClipIds` cites them and the UI joins on them. */
const portraitClipIds = ["7382915604473829120", "7391044820113928705", "7402887193045662209"];

/**
 * A portrait in the exact shape `POST /portrait` returns, so every screen built
 * against it is built against the real contract.
 *
 * Written to the generator's own rules rather than to what reads best: the
 * dossier is third-person present-tense prose with no name, category, follower
 * count, score, or mention of the analysis (ADR-015); `humor` is deliberately
 * ungrounded — 0.5 with low confidence and no clips — because that is the case
 * the UI most easily gets wrong, and it must not look like a real mid score.
 */
export const portrait: CreatorPortrait = {
  narrativeDossier:
    "Filmează gătit de zi cu zi și rutine de seară, acasă, cu lumină naturală și fără montaj vizibil. " +
    "Vorbește direct în cameră, la persoana întâi, pe un ton calm care lasă pauzele în clip. " +
    "Arată pașii pe îndelete, cu mâinile în cadru, mai degrabă decât rezultatul final. " +
    "Preferă colaborări cu produse pe care le folosește deja și declară că refuză campaniile cu alcool.",

  styleVector: {
    warmth: 0.82,
    energy: 0.44,
    authority: 0.38,
    refinement: 0.61,
    convention: 0.29,
    humor: 0.5,
    demonstration: 0.73,
    intimacy: 0.86,
  },

  styleEvidence: {
    warmth: {
      confidence: 0.88,
      rationale: "Ton cald și constant, se adresează privitorului ca unui cunoscut, fără voce de prezentare.",
      evidenceClipIds: [portraitClipIds[0], portraitClipIds[1]],
    },
    energy: {
      confidence: 0.71,
      rationale: "Ritm domol, tăieturi rare, pauze lăsate în clip.",
      evidenceClipIds: [portraitClipIds[1]],
    },
    authority: {
      confidence: 0.64,
      rationale: "Explică din obișnuință, nu din poziție de expert; nu invocă surse.",
      evidenceClipIds: [portraitClipIds[0], portraitClipIds[2]],
    },
    refinement: {
      confidence: 0.69,
      rationale: "Cadru curat și lumină naturală, dar fără corecție de culoare sau grafică.",
      evidenceClipIds: [portraitClipIds[2]],
    },
    convention: {
      confidence: 0.58,
      rationale: "Nu folosește formate de trend; deschide cu acțiunea, nu cu un cârlig.",
      evidenceClipIds: [portraitClipIds[0]],
    },
    // The honest gap. 0.5 here is "we could not tell", not "middling" — the two
    // are different facts (CLAUDE.md rule 3) and the screen has to show that.
    humor: {
      confidence: 0.12,
      rationale: "Niciun clip nu conține umor marcat; scorul e neutru din lipsă de semnal.",
      evidenceClipIds: [],
    },
    demonstration: {
      confidence: 0.83,
      rationale: "Arată procesul pas cu pas, cu mâinile în cadru, în toate clipurile.",
      evidenceClipIds: portraitClipIds,
    },
    intimacy: {
      confidence: 0.9,
      rationale: "Filmează în spații personale, aproape de cameră, la persoana întâi.",
      evidenceClipIds: [portraitClipIds[1], portraitClipIds[2]],
    },
  },

  // Mixed on purpose: one brand observed but never declared, one both observed
  // and declared, and only one of them disclosed in the clip itself.
  observedProducts: [
    {
      name: "Dr. Oetker Finesse",
      clipIds: [portraitClipIds[0]],
      confidence: 0.93,
      disclosed: false,
      declaredByCreator: false,
    },
    {
      name: "MyProtein",
      clipIds: [portraitClipIds[1], portraitClipIds[2]],
      confidence: 0.88,
      disclosed: true,
      declaredByCreator: true,
    },
  ],

  provenance: {
    aiModel: "claude-opus-5",
    promptVersion: "creator-profile-v4",
    ontologyVersion: "creator-profile-ontology-v4",
    generatedAt: "2026-08-18T09:12:44.000Z",
  },

  confidence: 0.62,

  // Internal. Never rendered — see the type.
  limitations: [
    "Doar trei clipuri analizate; scorurile nu stabilesc trăsături permanente.",
    "Dimensiunea „umor” nu a putut fi ancorată în niciun clip.",
  ],

  extensions: {},
};

export const earnings: EarningsSummary = {
  thisMonthMinor: 428_050,
  pendingValidationMinor: 84_020,
  reserveMinor: 53_500,
  reserveReleaseDate: "12 sept.",
  // The three buckets have to sum to `thisMonthMinor` exactly. They were 1.400
  // bani short, which was invisible while they sat in separate cards and is
  // not now that the screen draws them as one bar.
  availableMinor: 290_530,
  trendPercent: 12.4,
  timeline: [
    12_000, 24_500, 31_200, 44_800, 52_000, 61_300, 78_900, 92_400, 101_000, 118_600,
    131_200, 142_800, 158_400, 171_000, 186_700, 199_300, 214_800, 228_400, 241_000,
    258_600, 271_200, 288_800, 301_400, 318_000, 332_600, 349_200, 366_800, 388_400,
    408_000, 428_050,
  ],
  rows: [
    {
      id: "p-1",
      campaignName: "Morning Coffee Kit",
      brandName: "Kaffa Roasters",
      validatedViews: 173_400,
      amountMinor: 34_700,
      status: "paid",
    },
    {
      id: "p-2",
      campaignName: "Summer Essentials",
      brandName: "Lumina Tech",
      validatedViews: 256_000,
      amountMinor: 51_200,
      status: "scheduledDay7",
    },
    {
      id: "p-3",
      campaignName: "Tech Review Series",
      brandName: "Aura Home",
      validatedViews: 256_000,
      amountMinor: 89_600,
      status: "scheduledDay14",
    },
    {
      id: "p-4",
      campaignName: "Coș de sezon",
      brandName: "Verde Market",
      validatedViews: 112_000,
      amountMinor: 22_400,
      status: "reserved",
    },
    {
      id: "p-5",
      campaignName: "Rutina de 20 min",
      brandName: "Nord Fitness",
      validatedViews: 139_500,
      amountMinor: 41_850,
      status: "underReview",
    },
  ],
};


/**
 * Budget rails for campaign creation.
 *
 * The €1.500 floor is quoted publicly on the landing page, so it lives next to
 * the data rather than buried in a form component — the page and the wizard read
 * the same constant and cannot drift apart. Minor units, like every other amount.
 */
export const CAMPAIGN_MIN_BUDGET_MINOR = 150_000;
export const CAMPAIGN_MAX_BUDGET_MINOR = 2_000_000;
export const CAMPAIGN_BUDGET_STEP_MINOR = 10_000;
export const CAMPAIGN_BUDGET_PRESETS_MINOR = [150_000, 300_000, 500_000, 1_000_000];

/**
 * Joining as a creator does not depend on audience size.
 *
 * A TikTok account and an idea is the whole entry requirement — no follower
 * threshold, no verification gate. The product's central claim is that a good
 * clip beats a big following, and a minimum would contradict it on the way in.
 * Kept as a named constant so the promise is greppable rather than implied by
 * the absence of a check.
 */
/**
 * The floor for joining at all, in followers.
 *
 * Two levels, deliberately. This is the platform's: low enough that twenty
 * decent clips clear it, high enough to be a minimum of seriousness. Above it,
 * a brand can set its own on a campaign via `accessRule.minFollowerThreshold`
 * — a product-placement campaign that ships stock to the creator has a reason
 * to want more, and that reason belongs to the campaign, not to the door.
 *
 * Stated on the landing page rather than discovered at sign-up. A requirement
 * someone hits as a wall is worse than the same requirement read in advance,
 * and at this size saying it out loud reads as a filter rather than a barrier.
 */
export const CREATOR_MIN_FOLLOWERS = 1_000;

/** Platform average, used only to estimate how many creators a campaign needs. */
export const AVERAGE_VIEWS_PER_CREATOR = 45_000;

/**
 * Below this follower count a creator is "small" for reporting purposes.
 *
 * TODO(config): this is a threshold, so by CLAUDE.md #8 it belongs in versioned
 * configuration rather than a constant — it must be tunable without a deploy
 * once the gateway serves it. It affects reporting only; nothing gates on it.
 */
export const SMALL_CREATOR_FOLLOWER_CEILING = 10_000;

/**
 * The worked example on the landing page.
 *
 * Every figure is minor units and the arithmetic closes: 720.000 views at €2,50
 * per 1.000 is exactly €1.800 spent, leaving €1.200 of the €3.000 budget to
 * return. It used to be six hardcoded strings in the JSX, which meant the page
 * could quietly start lying the day someone edited one of them.
 *
 * Deliberately NOT set to `CAMPAIGN_MIN_BUDGET_MINOR`: the landing page does not
 * quote a minimum budget, and an example that happened to sit exactly on the
 * floor would read as one.
 */
export const landingExampleCampaign = {
  brandName: "Shaorma la Vlad",
  brandInitials: "SV",
  creatorCount: 12,
  budgetMinor: 300_000,
  spentMinor: 180_000,
  refundedMinor: 120_000,
  views: 720_000,
  ratePerMilleMinor: 250,
};

export const campaignObjectives: CampaignObjective[] = [
  {
    id: "awareness",
    icon: "campaign",
    ratePerMilleMinor: 200,
    suggestedRequirements: ["numele afacerii spus în clip"],
  },
  {
    id: "visits",
    icon: "storefront",
    ratePerMilleMinor: 250,
    suggestedRequirements: ["locația vizibilă", "orașul menționat"],
  },
  {
    id: "offer",
    icon: "local_offer",
    ratePerMilleMinor: 260,
    suggestedRequirements: ["oferta spusă clar", "perioada ofertei"],
  },
  {
    id: "launch",
    icon: "rocket_launch",
    ratePerMilleMinor: 300,
    suggestedRequirements: ["produsul vizibil"],
  },
  {
    id: "community",
    icon: "group_add",
    ratePerMilleMinor: 220,
    suggestedRequirements: ["contul menționat"],
  },
];

export const clipDurationPresets: ClipDurationPreset[] = [
  { id: "15-30", label: "15–30 sec" },
  { id: "20-60", label: "20–60 sec" },
  { id: "30-90", label: "30–90 sec" },
];

/**
 * The approval queue. Deliberately mixed: one clean clip, one that needs a human
 * judgement the checks cannot make, one that plainly breaks a requirement — so
 * the screen has to show all three states rather than a happy path.
 */
export const clipSubmissions: ClipSubmission[] = [
  {
    id: "sub-1",
    campaignId: "cmp-1",
    campaignName: "Premium Coffee Kit Launch",
    creatorHandle: "@mihai_reviews",
    creatorName: "Mihai Popescu",
    creatorFollowers: 41_200,
    submittedAt: "azi, 09:14",
    durationSeconds: 38,
    caption: "Am încercat kitul o săptămână. Partea cu râșnița m-a surprins.",
    gradientStops: ["#2a1f3b", "#1a1030"],
    checks: [
      { id: "c1", label: "Hashtag-uri obligatorii", status: "pass", detail: "#KaffaRoasters găsit" },
      { id: "c2", label: "Cont menționat", status: "pass", detail: "@kaffaroasters găsit" },
      { id: "c3", label: "Durata clipului", status: "pass", detail: "38 sec, în intervalul 20–60" },
      { id: "c4", label: "Produsul vizibil", status: "pass", detail: "Detectat în 4 cadre" },
      { id: "c5", label: "Conținut restricționat", status: "pass", detail: "Nimic detectat" },
    ],
  },
  {
    id: "sub-2",
    campaignId: "cmp-2",
    campaignName: "Summer Essentials",
    creatorHandle: "@ioana.face",
    creatorName: "Ioana Constantin",
    creatorFollowers: 28_900,
    submittedAt: "azi, 08:02",
    durationSeconds: 52,
    caption: "Cel mai bun gadget pe care l-am testat anul ăsta. Vă rezolvă toate problemele.",
    gradientStops: ["#123a2c", "#0d1f1a"],
    checks: [
      { id: "c1", label: "Hashtag-uri obligatorii", status: "pass", detail: "#LuminaTech găsit" },
      { id: "c2", label: "Cont menționat", status: "pass", detail: "@luminatech găsit" },
      { id: "c3", label: "Durata clipului", status: "pass", detail: "52 sec, în intervalul 20–60" },
      {
        id: "c4",
        label: "Afirmații despre produs",
        status: "warn",
        detail: "„vă rezolvă toate problemele” — afirmație absolută, cere verificare umană",
      },
      { id: "c5", label: "Conținut restricționat", status: "pass", detail: "Nimic detectat" },
    ],
  },
  {
    id: "sub-3",
    campaignId: "cmp-1",
    campaignName: "Premium Coffee Kit Launch",
    creatorHandle: "@raluca.move",
    creatorName: "Raluca Ene",
    creatorFollowers: 12_400,
    submittedAt: "ieri, 19:41",
    durationSeconds: 14,
    caption: "Cafeaua de dimineață ☕",
    gradientStops: ["#3b2a17", "#221407"],
    checks: [
      {
        id: "c1",
        label: "Hashtag-uri obligatorii",
        status: "fail",
        detail: "#KaffaRoasters lipsește",
      },
      { id: "c2", label: "Cont menționat", status: "fail", detail: "@kaffaroasters lipsește" },
      {
        id: "c3",
        label: "Durata clipului",
        status: "fail",
        detail: "14 sec, sub minimul de 20 sec",
      },
      { id: "c4", label: "Produsul vizibil", status: "warn", detail: "Nedetectat automat" },
      { id: "c5", label: "Conținut restricționat", status: "pass", detail: "Nimic detectat" },
    ],
  },
];

export const assistantThread = [
  {
    role: "user" as const,
    text: "Cum aș face un clip pentru campania Morning Coffee Kit?",
  },
  {
    role: "assistant" as const,
    text: "Clipurile tale de dimineață bat media ta cu 40%. Începe în bucătăria ta, cu ce te enervează la cafeaua proastă — arată kitul abia după ce ai livrat poanta.",
    evidence: "3 mai",
  },
];

/**
 * The ambassador strip on the landing page.
 *
 * NOT SIGNED. Every name here is someone the team expects to work with, not
 * someone who has agreed to appear on the site — and one of the products has
 * not launched at all. Naming a real company as an ambassador before it has
 * said yes is a claim without its evidence, which is the one thing the
 * brandbook is least willing to forgive ("superlative fără dovadă = minciună
 * de marketing"), and it uses a third party's name commercially without their
 * permission.
 *
 * So: this must not reach production until each name has given written consent.
 * When one of them does, move it out of here and into whatever the real source
 * of truth becomes. When one of them declines, delete the row — that is the
 * whole edit.
 */
export interface Ambassador {
  /** The person as they would want to be named. */
  name: string;
  /** What they make. Kept short — the strip is scanned, not read. */
  detail: string;
  /**
   * True for invented rows that exist only to give the strip enough width to
   * scroll. Flagged rather than merely commented so nobody has to remember
   * which two of these are real people when it comes time to ship: filter on
   * this and the placeholders disappear.
   */
  placeholder?: boolean;
}

export const ambassadors: Ambassador[] = [
  // Real people, and the reason this whole list is branch-only.
  { name: "Andrei Zbir", detail: "Mobil Fox" },
  { name: "Theo Zeciu", detail: "Apă îmbuteliată · în lansare" },

  // Invented. Deliberately not real Romanian creators — putting an actual
  // public figure's name under "Ambasadori Vira" would be the same false claim
  // as the two above, minus the excuse that someone has actually spoken to them.
  //
  // The businesses are the ones already used elsewhere in these fixtures, so the
  // strip and the campaign cards describe one world rather than two. Enough of
  // them that the strip reads as a roster instead of as a short list padded out.
  { name: "Ana Mureșan", detail: "Cofetăria Mimoza", placeholder: true },
  { name: "Radu Pavel", detail: "Nord Fitness", placeholder: true },
  { name: "Ioana Vlad", detail: "Verde Market", placeholder: true },
  { name: "Cristi Dobre", detail: "Kaffa Roasters", placeholder: true },
  { name: "Delia Stan", detail: "Aura Home", placeholder: true },
  { name: "Mihai Cornea", detail: "FitZone Studio", placeholder: true },
  { name: "Bianca Iliescu", detail: "Lumina Tech", placeholder: true },
  { name: "Vlad Tomescu", detail: "Shaorma la Vlad", placeholder: true },
  { name: "Raluca Neagu", detail: "Elite Fragrance", placeholder: true },
  { name: "Șerban Matei", detail: "Frizeria Nord", placeholder: true },
  { name: "Alexandra Pop", detail: "Ceai de Munte", placeholder: true },
  { name: "Darius Anton", detail: "Velo Vitan", placeholder: true },
];

/**
 * One campaign, told from three sides — for the landing page's product screen.
 *
 * A single object rather than three unrelated fixtures. The previews used to
 * read from whatever was nearest: a marketplace card for Lumina Tech, a
 * submission for a coffee kit, analytics for a shaorma place. Three businesses
 * narrating one transaction, which quietly told the reader these were mockups.
 *
 * The arithmetic closes, and is checked here rather than trusted: spend is
 * exactly `views / 1.000 × rate`, in integer minor units, so the three cards
 * cannot contradict each other on screen (CLAUDE.md #1).
 */
export const landingShowcase = {
  brandName: "Lumina Tech",
  brandInitials: "LT",
  campaignTitle: "Summer Essentials",
  requirements: ["#LuminaTech", "@luminatech", "15–60 sec"],

  /** Creator side. */
  ratePerMilleMinor: 200,
  estimatedEarningsMinMinor: 80_000,
  estimatedEarningsMaxMinor: 150_000,
  deadline: "30 oct. 2026",
  slotsLeft: 12,
  matchReasons: [
    "Ai deja 4 clipuri organice pe rutina de dimineață",
    "Publicul tău se suprapune cu nișa Tech & Gadgets",
  ],

  /** Approval side — the clip waiting on a yes. */
  creatorName: "Mihai Popescu",
  creatorHandle: "@mihai_reviews",
  creatorFollowers: 41_200,
  submittedAt: "azi, 09:14",
  durationSeconds: 38,
  clipGradient: ["#2a1f3b", "#1a1030"] as [string, string],

  /** Live side. `spentMinor` is derived, never typed by hand. */
  views: 720_000,
  budgetMinor: 300_000,
  get spentMinor(): number {
    return (this.views / 1000) * this.ratePerMilleMinor;
  },
} as const;
