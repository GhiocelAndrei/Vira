import { useRef, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { LogoMark } from "../../components/Logo";
import { LogoLetters } from "../../components/LogoLetters";
import { SurfaceBackdrop } from "../../components/SurfaceBackdrop";
import { Marquee } from "../../components/Marquee";
import { HeroWordfall } from "../../components/HeroWordfall";
import { PortraitPreview } from "../../components/PortraitPreview";
import {
  BrandAnalyticsPreview,
  BrandViewPreview,
  CreatorViewPreview,
} from "../../components/ProductPreview";
import { cn } from "../../lib/cn";
import { useScrollReveal } from "../../lib/useScrollReveal";
import { useScrollChrome } from "../../lib/useScrollChrome";
import { usePageScroll } from "../../lib/usePageScroll";
import { t, tokens } from "@vira/core";
import { formatViews } from "@vira/core";
import {
  ambassadors,
  CREATOR_MIN_FOLLOWERS,
  feedCampaigns,
  landingExampleCampaign,
} from "@vira/core";

/**
 * Public landing page — the only screen a guest sees.
 *
 * No sidebar, no app chrome: this is marketing, and the app shell only appears
 * once a role exists. Both audiences are addressed here because the marketplace
 * has two sides, but the primary call to action is the creator one — creators
 * are the scarce side at launch.
 */
export default function LandingPage() {
  // Runs once for the whole page; the first screen animates on load without it.
  const scroller = useRef<HTMLDivElement>(null);
  useScrollReveal(scroller);
  usePageScroll(scroller);
  const { progress, scrolled } = useScrollChrome(scroller);

  return (
    <div className="relative h-dvh overflow-hidden">
      <SurfaceBackdrop />

      {/* Chrome that belongs to the document, not to the poster. Both are held
          back until the reader has actually started reading: a progress bar
          over the first screen is answering a question nobody has asked. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 transition-opacity duration-500",
          scrolled ? "opacity-100" : "opacity-0",
        )}
      >
        <div
          className="progress-bar h-full bg-primary"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      {/* Content rides above the texture — the backdrop sits at z-0. */}
      <div ref={scroller} className="snap-pages relative z-10">
        {/* ── Screen 1 ── the claim, and the three zeros that qualify it. */}
        <Screen>
          <SiteHeader scrolled={scrolled} />
          <Hero />
          <ProofStrip />
        </Screen>

        {/* ── Screen 2 ── who it is for, and the faces behind it. */}
        <Screen>
          <div className="flex flex-1 flex-col justify-center">
            <ForWho />
          </div>
          <Marquee className="rv dl-8" items={ambassadors} label={t.landing.ambassadorsLabel} />
        </Screen>

        {/* ── Screen 3 ── the creator's journey, with the screen it happens on. */}
        <Screen className="justify-center">
          <CreatorFlow />
        </Screen>

        {/* ── Screen 4 ── the same, from the paying side. */}
        <Screen className="justify-center">
          <BrandFlow />
        </Screen>

        {/* ── Screen 5 ── where the money actually goes. */}
        <Screen className="justify-center">
          <MoneyFlow />
        </Screen>

        {/* ── Screen 6 ── who is already advertising, and the way out. */}
        <Screen last>
          <div className="flex flex-1 flex-col justify-center">
            <OpenCampaigns />
          </div>
          <SiteFooter />
        </Screen>
      </div>
    </div>
  );
}

/**
 * A screen, and the marker that there is another one under it.
 *
 * The cue repeats on every screen but the last. On a page that moves a screen
 * at a time the reader has no scrollbar to read depth from, so each stop has to
 * say for itself whether it is the end — otherwise the only way to find out is
 * to try.
 */
function Screen({
  children,
  last = false,
  className,
}: {
  children: ReactNode;
  last?: boolean;
  className?: string;
}) {
  return (
    <section className={cn("snap-page relative flex flex-col", className)}>
      {children}
      {!last && <ScrollCue />}
    </section>
  );
}

/**
 * Bottom-right marker that the page continues.
 *
 * A falling line rather than a bouncing arrow: the arrow mimes the gesture at
 * the reader, which is both patronising and, on a page this tall, unnecessary.
 */
function ScrollCue() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute bottom-6 right-6 hidden items-center gap-3 md:flex md:right-12"
    >
      <span className="label-caps text-[9px] text-on-surface-variant/50">
        {t.landing.scrollCue}
      </span>
      <span className="relative h-14 w-px overflow-hidden bg-white/10">
        <span className="scroll-cue-line absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-transparent to-primary" />
      </span>
    </div>
  );
}

/**
 * Copy that needs a number the app also enforces.
 *
 * A few strings quote the follower floor. They take it as an argument rather
 * than hardcoding it, so the sentence on this page and the rule the app applies
 * cannot drift — the reason `CREATOR_MIN_FOLLOWERS` is a shared constant in the
 * first place. This resolves either shape at the point of rendering.
 */
function copy(value: string | ((minFollowers: string) => string)): string {
  return typeof value === "function"
    ? value(CREATOR_MIN_FOLLOWERS.toLocaleString("ro-RO"))
    : value;
}

function SiteHeader({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-300",
        // Transparent over the first screen so the poster runs to the top edge;
        // it earns its border, its background and its blur only once there is
        // something underneath it to separate from.
        //
        // The blur has to be conditional too. Left on permanently it softens the
        // grid behind the header while the rest of the field stays sharp, and
        // that difference alone draws a bar across the top of a page that is
        // meant to read as one continuous surface.
        scrolled
          ? "border-b border-white/5 bg-background/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-container items-center gap-6 px-6 transition-all duration-300 md:px-12",
          scrolled ? "py-3" : "py-5",
        )}
      >
        <Link to="/" className="rise hd-1">
          <LogoLetters size={34} />
        </Link>

        {/* The header serves people who already have a way in. Everyone new is
            routed by the two hero calls to action, which lead to different
            places: creators to TikTok, businesses to a registration form. */}
        <nav className="ml-auto flex items-center gap-3">
          <span className="hidden font-body text-[13px] text-on-surface-variant sm:block">
            {t.landing.hasAccount}
          </span>
          <Link
            to="/intra"
            className={cn(
              "rounded-full bg-primary px-5 py-2.5 font-body text-[13px] font-bold text-on-primary",
              "shadow-primary-glow transition-transform hover:bg-primary/90 active:scale-[0.98]",
            )}
          >
            {t.landing.signIn}
          </Link>
        </nav>
      </div>
    </header>
  );
}

/**
 * Numbered section marker: index, label, then a rule running to the edge.
 *
 * The rule is the part that matters. A caps label alone floats; a line leaving
 * it and travelling out of the section anchors the heading to the page and
 * gives the eye somewhere to land when it arrives from the block above.
 */
function SectionEyebrow({
  index,
  label,
  className,
}: {
  index: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-4", className)}>
      <span className="numeric text-[13px] font-bold text-primary">
        {String(index).padStart(2, "0")}
      </span>
      <span className="label-caps text-[10px] text-primary">{label}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative flex flex-1 items-center overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
        style={{
          background: "radial-gradient(circle,#cabeff,transparent 70%)",
        }}
      />

      {/* Under the bloom, over the grid: the businesses, drifting. */}
      <HeroWordfall />
      <div className="relative mx-auto flex w-full max-w-container flex-col items-center justify-center px-6 pb-10 pt-8 text-center md:px-12 md:pb-12 md:pt-10">
        {/* Set to break on the pivot rather than on the container: the sentence
            turns at "doar dacă", and that turn is the product. Leading is under
            1 so the two lines read as one block of weight.
       *
       * Each line is its own mask so the two rise in sequence. The accent line
       * drops to `font-light` — a light italic between heavy romans reads as a
       * deliberate change of voice, where a bold italic just reads as more
       * shouting. */}
        <h1 className="mx-auto mt-8 max-w-5xl font-display text-[31px] font-extrabold leading-[1.05] tracking-[-0.025em] text-on-surface sm:text-[54px] md:text-[68px]">
          <span className="line-mask">
            <span className="hd-2">{t.landing.heroTitleLead}</span>
          </span>
          <span className="line-mask">
            <span className="hd-3 font-light italic text-primary">{t.landing.heroTitleAccent}</span>
          </span>
        </h1>

        <p className="rise hd-4 mx-auto mt-6 max-w-2xl text-body-lg leading-relaxed text-on-surface-variant">
          {t.landing.heroSubtitle}
        </p>

        {/* Two audiences, two different doors — a creator signs in with TikTok
            and never makes an account here; a business registers one. */}
        <div className="rise hd-9 mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          {/* The creator door is filled, the business door is outlined: on a page
              where a visitor picks a side, the weight difference does more work
              than the hue does. It carries the same violet as "Loghează-te" in
              the header — one filled violet button on the page means one thing,
              and a second, darker violet would have read as a different control
              rather than as the same invitation. */}
          <Link
            to="/intra/creator"
            className={cn(
              "group inline-flex w-full items-center justify-center gap-2.5 rounded-full px-5 py-4 sm:w-auto sm:gap-3 sm:px-9 sm:py-5",
              "bg-primary font-body text-[15px] font-bold text-on-primary sm:text-[16px]",
              "shadow-[0_10px_40px_-10px_rgba(202,190,255,0.5)] transition-all hover:bg-primary/90 hover:shadow-[0_14px_48px_-10px_rgba(202,190,255,0.65)] active:scale-[0.98]",
            )}
          >
            <Icon name="payments" size={19} />
            {t.landing.heroCtaCreator}
            <Icon
              name="arrow_forward"
              size={18}
              className="hidden transition-transform group-hover:translate-x-0.5 sm:inline"
            />
          </Link>
          <Link
            to="/intra/afacere"
            className={cn(
              "inline-flex w-full items-center justify-center gap-2.5 rounded-full border px-5 py-4 sm:w-auto sm:gap-3 sm:px-9 sm:py-5",
              "border-white/15 bg-white/[0.06] font-body text-[15px] font-bold text-on-surface backdrop-blur-xl sm:text-[16px]",
              "transition-colors hover:border-white/30 hover:bg-white/[0.11]",
            )}
          >
            <Icon name="storefront" size={20} />
            {t.landing.heroCtaBrand}
          </Link>
        </div>

        <p className="rise hd-10 mt-5 text-[13px] text-on-surface-variant/60">
          {t.landing.heroNote}
        </p>
      </div>
    </section>
  );
}

/**
 * The barriers we removed, not vanity metrics. Anyone reading it should be able
 * to tell within a second whether they are allowed in — the question someone
 * with no audience arrives with.
 *
 * Three zeros, read as one line: nothing to reach, nothing to pay, nothing to
 * sign. The first comes from the shared constant rather than a literal, so the
 * promise on this page and the rule the app enforces cannot drift apart.
 *
 * No amount appears anywhere on this page by choice — not a budget floor, not a
 * rate. The page sells who is allowed in and how the model works; the numbers
 * belong in the app, after someone is through the door.
 */
function ProofStrip() {
  // Money, then commitment, then skill — each one a bigger objection than the
  // last, so the row builds instead of just listing.
  const items = [
    { value: "0", label: t.landing.proof.creatorFee },
    { value: "0", label: t.landing.proof.noContract },
    { value: "0", label: t.landing.proof.noMarketing },
  ];

  return (
    <section className="rise-panel hd-5 relative overflow-hidden border-t border-white/5">
      {/* One soft violet bloom behind the row. The zeros are the only bright
          thing in this band, and a flat panel made them look like a footnote. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-[110px]"
        style={{
          background: "radial-gradient(circle, #cabeff 0%, transparent 70%)",
        }}
      />

      <div className="relative mx-auto grid max-w-container gap-6 px-6 py-8 sm:grid-cols-3 md:px-12 md:py-10">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "rise text-center",
              index === 0 && "hd-6",
              index === 1 && "hd-7",
              index === 2 && "hd-8",
              // Hairlines between the three, never around them: it reads as one
              // sentence in three parts, not as three separate stats.
              index > 0 && "sm:border-l sm:border-white/[0.06]",
            )}
          >
            <p
              className={cn(
                "numeric bg-gradient-to-b from-white via-white to-primary bg-clip-text",
                "text-[64px] font-bold leading-[0.9] text-transparent md:text-[80px]",
              )}
            >
              {item.value}
            </p>
            <p className="label-caps mx-auto mt-3 max-w-[24ch] leading-relaxed">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The two audiences, side by side and named plainly. */
function ForWho() {
  return (
    // `w-full` is load-bearing: as a direct child of a flex column, the auto
    // margins here would otherwise suppress stretching, leaving the section at
    // its content width and centring *that* — so a section with narrow cards
    // sat further right than one with wide ones, and the page lost its left edge.
    <section className="mx-auto w-full max-w-container px-6 py-8 md:px-12 md:py-10">
      <div className="max-w-2xl">
        <SectionEyebrow className="rv" index={1} label={t.landing.sections.forWho} />
        <h2 className="rv dl-1 mt-4 font-display text-[30px] font-extrabold leading-[1] tracking-[-0.02em] text-on-surface sm:text-[38px] md:text-[46px]">
          {t.landing.forWhoTitle}
        </h2>
        <p className="rv dl-2 mt-3 text-body-md text-on-surface-variant">
          {t.landing.forWhoSubtitle}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* Index 0 is the business card, 1 the creator card — each sends the
            reader to its own door rather than to a shared chooser. */}
        {t.landing.audiences.map((audience, index) => (
          <div
            key={audience.audience}
            className={cn(
              "rv flex flex-col rounded-lg border border-white/5 bg-surface-container-low p-5 transition-colors hover:border-white/[0.12]",
              index === 0 ? "dl-6" : "dl-7",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-md border",
                  index === 0
                    ? "border-business/20 bg-business/10"
                    : "border-creator/20 bg-creator/10",
                )}
              >
                <Icon
                  name={audience.icon}
                  size={22}
                  className={index === 0 ? "text-business" : "text-creator"}
                />
              </div>
              <div className="min-w-0">
                <p className={cn("label-caps", index === 0 ? "text-business" : "text-creator")}>
                  {audience.audience}
                </p>
                <p className="mt-0.5 text-[12px] leading-snug text-on-surface-variant/70">
                  {audience.role}
                </p>
              </div>
            </div>

            <h3 className="mt-5 font-display text-[21px] font-semibold leading-snug text-on-surface">
              {audience.title}
            </h3>

            <ul className="mt-3.5 flex flex-1 flex-col gap-2">
              {audience.points.map((point) => (
                <li
                  key={copy(point)}
                  className="flex items-start gap-3 text-[13px] leading-relaxed text-on-surface-variant"
                >
                  <Icon name="check_circle" size={17} className="mt-0.5 shrink-0 text-mint" />
                  {copy(point)}
                </li>
              ))}
            </ul>

            <Link
              to={index === 0 ? "/intra/afacere" : "/intra/creator"}
              className={cn(
                "mt-7 inline-flex items-center gap-2 self-start rounded border px-4 py-2.5",
                "font-body text-[13px] font-semibold transition-colors",
                index === 0
                  ? "border-business/50 text-business hover:bg-business/10"
                  : "border-creator/50 text-creator hover:bg-creator/10",
              )}
            >
              {audience.cta}
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Where the budget actually goes.
 *
 * The sharpest difference between Vira and the model it replaces is not a
 * feature — it is the destination of the money. The page states that side by
 * side rather than hoping the reader infers it from a list of benefits.
 *
 * Note what each column claims: the left one carries a figure about how
 * agencies price their work, which is the client's own positioning. The right
 * one stays structural — it says the brand buys views rather than someone's
 * fee, and never quotes a Vira take rate, because no such rate is documented
 * anywhere in this repo and a number invented for a landing page is a number
 * the client will be asked to defend.
 */
/**
 * A flow: what happens, in order, with the screen it happens on.
 *
 * The two audiences each get one, back to back, and they are built from the same
 * component so they cannot drift into looking like different products. Steps run
 * down the left, the interface sits on the right — a reader can take the claim
 * from the words or the proof from the picture, and most take both without
 * noticing they did.
 */
function Flow({
  index,
  eyebrow,
  title,
  subtitle,
  steps,
  accent,
  children,
}: {
  index: number;
  eyebrow: string;
  title: string;
  subtitle: string;
  steps: readonly { icon: string; title: string; text: string | ((n: string) => string) }[];
  accent: "creator" | "business";
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-container px-6 py-8 md:px-12 md:py-10">
      <div className="max-w-2xl">
        <SectionEyebrow className="rv" index={index} label={eyebrow} />
        <h2 className="rv dl-1 mt-4 font-display text-[30px] font-extrabold leading-[1] tracking-[-0.02em] text-on-surface sm:text-[38px] md:text-[46px]">
          {title}
        </h2>
        <p className="rv dl-2 mt-3 text-body-md text-on-surface-variant">{subtitle}</p>
      </div>

      {/* Steps across, screens beneath.
       *
       * They were a column beside a column: the steps ran out after three and
       * left the left half empty, while two stacked cards ran off the bottom of
       * the right. Laid this way each row uses the full width and the section
       * reads top to bottom — what happens, then what it looks like. */}
      <div className="mt-7 flex flex-col gap-7">
        <ol className="grid gap-5 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className={cn(
                "rv flex gap-4",
                i === 0 && "dl-6",
                i === 1 && "dl-7",
                i === 2 && "dl-8",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
                  accent === "creator"
                    ? "border-creator/20 bg-creator/10"
                    : "border-business/20 bg-business/10",
                )}
              >
                <span
                  className={cn(
                    "numeric text-[13px] font-bold",
                    accent === "creator" ? "text-creator" : "text-business",
                  )}
                >
                  {i + 1}
                </span>
              </span>
              <div className="min-w-0">
                <p className="font-display text-[16px] font-semibold text-on-surface">
                  {step.title}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-on-surface-variant">
                  {copy(step.text)}
                </p>
              </div>
            </li>
          ))}
        </ol>

        {/* Hidden below `lg`: on a phone these would push the steps, which are
            the argument, clean off the screen. */}
        <div className="hidden gap-5 lg:grid lg:grid-cols-2">{children}</div>
      </div>
    </section>
  );
}

function CreatorFlow() {
  return (
    <Flow
      index={3}
      eyebrow={t.landing.sections.creatorFlow}
      title={t.landing.howTitle}
      subtitle={t.landing.howSubtitle}
      steps={t.landing.steps}
      accent="creator"
    >
      {/* The offer, then the thing that produced it. */}
      <CreatorViewPreview className="rv dl-9" />
      <PortraitPreview className="rv dl-10" />
    </Flow>
  );
}

function BrandFlow() {
  return (
    <Flow
      index={4}
      eyebrow={t.landing.sections.brandFlow}
      title={t.landing.brandsTitle}
      subtitle={t.landing.brandsText}
      steps={t.landing.brandSteps}
      accent="business"
    >
      {/* The decision, then what it turns into. */}
      <BrandViewPreview className="rv dl-9" />
      <BrandAnalyticsPreview className="rv dl-10" />
    </Flow>
  );
}

function MoneyFlow() {
  const columns = [
    {
      label: t.landing.agencyLabel,
      icon: "history",
      points: t.landing.agencyPoints,
      muted: true,
    },
    {
      label: t.landing.viraLabel,
      icon: "bolt",
      points: t.landing.viraPoints,
      muted: false,
    },
  ];

  return (
    <section>
      <div className="mx-auto max-w-container px-6 py-8 md:px-12 md:py-10">
        <div className="max-w-2xl">
          <SectionEyebrow className="rv" index={5} label={t.landing.sections.money} />
          <h2 className="rv dl-1 mt-5 font-display text-[34px] font-extrabold leading-[0.95] tracking-[-0.02em] text-on-surface sm:text-[46px] md:text-[58px]">
            {t.landing.moneyTitle}
          </h2>
          <p className="rv dl-2 mt-3 text-body-md text-on-surface-variant">
            {t.landing.moneySubtitle}
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {columns.map((column, index) => (
            <div
              key={column.label}
              className={cn(
                "rv rounded-lg border p-7",
                index === 0 ? "dl-6" : "dl-7",
                column.muted
                  ? "border-white/5 bg-surface-container-low"
                  : "border-primary/20 bg-primary/[0.06]",
              )}
            >
              <p
                className={cn(
                  "label-caps flex items-center gap-2",
                  column.muted ? "text-on-surface-variant/60" : "text-primary",
                )}
              >
                <Icon name={column.icon} size={16} filled={!column.muted} />
                {column.label}
              </p>

              <ul className="mt-6 flex flex-col gap-3.5">
                {column.points.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <Icon
                      name={column.muted ? "close" : "check_circle"}
                      size={17}
                      className={cn(
                        "mt-0.5 shrink-0",
                        column.muted ? "text-on-surface-variant/35" : "text-mint",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[14px] leading-relaxed",
                        column.muted ? "text-on-surface-variant/70" : "text-on-surface",
                      )}
                    >
                      {point}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 max-w-3xl text-[13px] leading-6 text-on-surface-variant/70">
          {t.landing.moneyNote}
        </p>
      </div>
    </section>
  );
}

function OpenCampaigns() {
  return (
    <section>
      <div className="mx-auto max-w-container px-6 py-8 md:px-12 md:py-10">
        <SectionEyebrow className="rv" index={6} label={t.landing.sections.campaigns} />
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="rv dl-1 font-display text-[34px] font-extrabold leading-[0.95] tracking-[-0.02em] text-on-surface sm:text-[46px] md:text-[58px]">
              {t.landing.campaignsTitle}
            </h2>
            <p className="rv dl-2 mt-3 text-body-md text-on-surface-variant">
              {t.landing.campaignsSubtitle}
            </p>
          </div>
          <Link
            to="/intra/creator"
            className="inline-flex items-center gap-1 text-[14px] text-primary transition-opacity hover:opacity-80"
          >
            {t.landing.seeAll}
            <Icon name="arrow_forward" size={16} />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {feedCampaigns.slice(0, 4).map((campaign, index) => (
            /* The reveal sits on a wrapper rather than on the card. The card
               owns `transform` for its hover lift, and one element cannot ease
               the same property at two speeds — a 1.1s entrance and a 200ms
               lift — without one of them being wrong.

               A row of four landing together reads as a repaint; landing in
               sequence reads as a row. */
            <div
              key={campaign.id}
              className={cn(
                "rv",
                index === 0 && "dl-6",
                index === 1 && "dl-7",
                index === 2 && "dl-8",
                index === 3 && "dl-9",
              )}
            >
              <Link
                to="/intra/creator"
                className={cn(
                  "group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-lg",
                  "border border-white/10 p-5 transition-transform hover:-translate-y-1",
                )}
                style={{
                  background: tokens.gradientCss(campaign.gradientStops),
                }}
              >
                <div
                  className="grid h-11 w-11 place-items-center rounded-full border"
                  style={{
                    backgroundColor: `${campaign.accent}22`,
                    borderColor: `${campaign.accent}55`,
                  }}
                >
                  <span
                    className="font-display text-[15px] font-bold"
                    style={{ color: campaign.accent }}
                  >
                    {campaign.brandInitials}
                  </span>
                </div>

                <div>
                  <p className="font-display text-[16px] font-bold leading-snug text-white">
                    „{campaign.hook}”
                  </p>
                  <p className="mt-1 text-[12px] text-white/55">{campaign.brandName}</p>
                  {/* The rate used to sit here. It is a real number and a good one,
                    but it belongs behind the door — this page carries no amounts. */}
                  <p
                    className="mt-3 font-body text-[12px] font-semibold"
                    style={{ color: campaign.accent }}
                  >
                    {t.landing.campaignCardPayment}
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The worked example, told without a single amount.
 *
 * What survives the no-figures rule is the shape of the deal, which is the part
 * that actually differentiates: views were measured, part of the budget was
 * consumed, the rest goes back. The percentage is a display ratio of two
 * amounts that already exist — no money is printed and none is derived.
 */
function ExampleCampaignCard({ className }: { className?: string }) {
  const { brandName, brandInitials, creatorCount, budgetMinor, spentMinor, views } =
    landingExampleCampaign;
  const budgetPercent = Math.round((spentMinor / budgetMinor) * 100);

  return (
    <div className={cn("rounded-lg border border-white/5 bg-surface-container-low p-6", className)}>
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <p className="label-caps">{t.landing.brandsCardLabel}</p>
        <span className="rounded-full border border-mint/20 bg-mint/10 px-2.5 py-1 font-body text-[11px] font-semibold text-mint">
          {t.landing.brandsCardActive}
        </span>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full border border-amber/40 bg-amber/15">
          <span className="font-display text-[14px] font-bold text-amber">{brandInitials}</span>
        </div>
        <div>
          <p className="font-display text-[15px] font-bold text-on-surface">{brandName}</p>
          <p className="text-[12px] text-on-surface-variant">
            {t.landing.brandsCardCreators(creatorCount)}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <p className="numeric text-[32px] font-bold leading-none text-on-surface">
          {formatViews(views)}
        </p>
        <p className="label-caps mt-2">{t.landing.brandsCardViews}</p>
      </div>

      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full bg-primary" style={{ width: `${budgetPercent}%` }} />
      </div>
      <p className="mt-2.5 text-[12px] text-on-surface-variant">
        {t.landing.brandsCardBudgetUsed(budgetPercent)}
      </p>

      <p className="mt-5 flex items-start gap-2 border-t border-white/5 pt-5 text-[13px] leading-5 text-mint">
        <Icon name="undo" size={17} className="mt-0.5 shrink-0" />
        {t.landing.brandsCardRefund}
      </p>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className="mx-auto flex max-w-container flex-wrap items-center justify-between gap-4 px-6 py-8 md:px-12">
        <div className="flex items-center gap-3">
          <LogoMark size={32} />
          <span className="text-[13px] text-on-surface-variant">{t.landing.footerNote}</span>
        </div>
        <div className="flex gap-6 text-[13px] text-on-surface-variant/70">
          {Object.values(t.landing.footerLinks).map((label) => (
            <a key={label} href="#" className="transition-colors hover:text-on-surface">
              {label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
