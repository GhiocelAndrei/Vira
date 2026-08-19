/**
 * "Lumina Dark" design tokens — the single source of truth for both apps.
 *
 * `apps/web` feeds these into its Tailwind config; `apps/mobile` feeds the same
 * object into NativeWind. Keeping them here means a colour changes once, not
 * twice — and the two surfaces cannot drift apart silently.
 *
 * ── Two audiences on black ──────────────────────────────────────────────────
 *
 * Violet and blue, and nothing else. An earlier revision put the creator side
 * on magenta (#E6AFFF/#D780FF at 281°) to sit symmetrically opposite business
 * across a violet middle. It read fine as a 16px icon and badly as a full-width
 * button: at 100% saturation a large magenta fill goes sweet, and the primary
 * action on the landing page is the biggest fill in the product. Dropped.
 *
 *   business — campaign creation, budget, approvals, the brand dashboard
 *   creator  — portrait, feed, earnings, the creator's own profile, and every
 *              primary action a creator takes
 *   primary  — where both are in the room: the match score (a creator measured
 *              against a campaign), the payout (the brand's money becoming the
 *              creator's), statistics, and every AI output
 *
 * `creator` and `primary` are deliberately the same violet. The creator's side
 * and the shared ground are not in visual competition anywhere in the product,
 * so a distinct third hue bought nothing and cost the palette its calm. Both
 * names are kept because they mean different things: if the two ever need to
 * separate, only the token changes, not the hundred call sites.
 *
 * Tie-breaker when a surface belongs to one side but is acted on by the other:
 * colour by whose ACTION it is, not whose object. Applying to a campaign is a
 * creator action, so the button is `creator` even on a card describing a brand.
 */

export const colors = {
  /**
   * Pure black, not the near-black this used to be (#0E0F13).
   *
   * The whole surface ladder above it is unchanged, so every panel keeps the
   * step it had — they now separate from the page by more, not less. The one
   * casualty is `surface-container-lowest`: it used to sit *below* the page and
   * read as a well (inset fields, the recessed stat panels). Nothing sits below
   * black, so it is now the first step up, and those surfaces read as raised
   * rather than sunk. That is the price of the black, and it is paid once here
   * rather than at two hundred call sites.
   */
  background: "#000000",

  /**
   * The ladder came down with the page.
   *
   * These used to run #181b24 → #32343e: a cool, distinctly blue set that read
   * as slate against the old near-black. Against pure black the same values are
   * simply grey — the page is black and everything standing on it is not, which
   * is what "the background looks grey" actually means when the background is
   * measurably #000.
   *
   * So: roughly a third of the luminance removed, and most of the blue with it.
   * A couple of points of cool remain on purpose — the palette is violet on
   * black and a perfectly neutral grey under a violet accent reads as a
   * different system — but they are now a tint rather than a hue.
   */
  surface: "#0e0e11",
  "surface-dim": "#0e0e11",
  "surface-bright": "#303138",
  "surface-container-lowest": "#0a0a0c",
  "surface-container-low": "#141417",
  "surface-container": "#191a1e",
  "surface-container-high": "#222329",
  "surface-container-highest": "#2b2c33",
  "surface-variant": "#2b2c33",
  "on-background": "#e0e2ee",
  "on-surface": "#e0e2ee",
  "on-surface-variant": "#c9c4d8",
  "inverse-surface": "#e0e2ee",
  "inverse-on-surface": "#2d3039",
  outline: "#938ea1",
  "outline-variant": "#484555",

  /** Shared ground — AI, statistics, match, cash-out. 11.2:1 on background, AAA. */
  primary: "#cabeff",
  /**
   * Near-black, not the deep violet it was (#31009a).
   *
   * Violet type on a violet fill is a tint against its own tint: legible at
   * 7.7:1, but the two never separate, and a filled button ends up reading as
   * one soft violet lozenge rather than as a control with a label. Near-black
   * lifts it to 11.6:1 and makes the pairing the same one the mark uses — light
   * tile, dark glyph — so the primary button and the logo now rhyme.
   */
  "on-primary": "#0a0a0c",
  "primary-container": "#947dff",
  "on-primary-container": "#2a0088",
  "inverse-primary": "#603ce2",
  "primary-fixed": "#e6deff",
  "primary-fixed-dim": "#cabeff",

  /** The business side — 221°. 11.4:1 on background, AAA. */
  business: "#AFC8FF",
  "on-business": "#06153A",
  "business-container": "#80A8FF",
  "on-business-container": "#06153A",

  /** The creator side — the same violet as `primary`. 11.2:1 on background, AAA. */
  creator: "#CABEFF",
  "on-creator": "#0a0a0c",
  "creator-container": "#947DFF",
  "on-creator-container": "#0a0a0c",

  secondary: "#c7c6cb",
  "on-secondary": "#2f3035",
  "secondary-container": "#46464b",
  "on-secondary-container": "#b5b4ba",

  tertiary: "#c6c5d0",
  "on-tertiary": "#2f3038",

  error: "#ffb4ab",
  "on-error": "#690005",
  "error-container": "#93000a",
  "on-error-container": "#ffdad6",

  /** Functional accents: mint for positive financial trends, amber for review states. */
  mint: "#7CFFB2",
  amber: "#FFCC7C",
} as const;

/**
 * One family, two roles.
 *
 * `display` and `body` were Geist and Inter — two grotesques close enough that
 * the switch between a heading and the paragraph under it read as an
 * inconsistency rather than as a contrast. Two typefaces have to disagree
 * clearly or not at all, and these were doing neither.
 *
 * Geist wins because it was built for both ends: it holds up at 104px in the
 * hero, where Inter goes neutral, and it carries the tabular figures and the
 * true italic the pages depend on. The names stay separate so a real display
 * face can arrive later without touching a single call site.
 *
 * The brandbook asks for one family and names Karla. The principle is settled
 * here; which family is still open, alongside the palette.
 */
export const fontFamily = {
  display: ["Geist", "system-ui", "sans-serif"],
  body: ["Geist", "system-ui", "sans-serif"],
  /**
   * Machine values only — clip timestamps, ids. Money and view counts used to
   * live here for the tabular figures, but the display face has those too, and
   * a slashed zero on a currency amount costs more than the alignment was
   * worth. See `.numeric` / `.mono` in the web app's stylesheet.
   */
  data: ["JetBrains Mono", "ui-monospace", "monospace"],
};

/** Tailwind expects a `[size, config]` tuple — the annotation keeps TS from widening it to an array. */
type FontSizeToken = [string, { lineHeight: string; letterSpacing?: string; fontWeight?: string }];

export const fontSize: Record<string, FontSizeToken> = {
  "display-xl": ["64px", { lineHeight: "72px", letterSpacing: "-0.04em", fontWeight: "700" }],
  "headline-lg": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "600" }],
  "headline-md": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "500" }],
  "body-lg": ["18px", { lineHeight: "28px" }],
  "body-md": ["16px", { lineHeight: "24px" }],
  "data-tabular": ["20px", { lineHeight: "24px", letterSpacing: "-0.02em", fontWeight: "500" }],
  "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.08em", fontWeight: "600" }],
};

export const borderRadius = {
  sm: "0.25rem",
  DEFAULT: "0.5rem",
  md: "0.75rem",
  lg: "1rem",
  xl: "1.5rem",
} as const;

/** Raw numbers for React Native, which cannot read rem strings. */
export const radius = { sm: 4, md: 8, lg: 12, xl: 16, xxl: 24, pill: 9999 } as const;

/** 8px grid — DESIGN.md requires every spacing value to be a multiple. */
export const spacing = { unit: 8, sidebar: 280, gutter: 24, section: 64, containerMax: 1440 } as const;

/**
 * Compose a CSS gradient from the two stops a fixture carries.
 * Web-only helper — React Native feeds the same stops to expo-linear-gradient.
 */
export function gradientCss([from, to]: readonly [string, string]): string {
  return `linear-gradient(170deg, ${from} 0%, ${to} 48%, ${colors["surface-container-lowest"]} 100%)`;
}
