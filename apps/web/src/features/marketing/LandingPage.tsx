import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Chip } from "../../components/ui";
import { Logo, LogoMark } from "../../components/Logo";
import { SurfaceBackdrop } from "../../components/SurfaceBackdrop";
import { Marquee } from "../../components/Marquee";
import { HeroWordfall } from "../../components/HeroWordfall";
import { PortraitPreview } from "../../components/PortraitPreview";
import { WaitlistForm } from "../../components/WaitlistForm";
import { cn } from "../../lib/cn";
import { useScrollReveal } from "../../lib/useScrollReveal";
import { useScrollChrome } from "../../lib/useScrollChrome";
import { portrait, STYLE_DIMENSIONS, t } from "@vira/core";
import { formatViews } from "@vira/core";
import {
  ambassadors,
  CREATOR_MIN_FOLLOWERS,
  feedCampaigns,
  landingExampleCampaign,
} from "@vira/core";
import { LEGAL_CONTACT_EMAIL } from "../legal/LegalShell";

/**
 * Public landing page — the only screen a guest sees.
 *
 * No sidebar, no app chrome: this is marketing, and the app shell only appears
 * once a role exists. Both audiences are addressed here because the marketplace
 * has two sides, but the primary call to action is the creator one — creators
 * are the scarce side at launch.
 */
export default function LandingPage() {
  // Runs once for the whole page; the hero animates on load without it.
  useScrollReveal();
  const { progress, scrolled } = useScrollChrome();

  return (
    <div className="relative">
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

      {/* Fixed rather than in the flow: the hero runs to the top edge underneath
          it, which is what lets the poster be a poster. */}
      <SiteHeader scrolled={scrolled} />

      {/* Content rides above the texture — the backdrop sits at z-0. */}
      <div className="relative z-10">
        {/* The claim, the product it refers to, who is already here, and the
            three zeros that qualify all of it.
         *
         * The names used to sit under the zeros. They read better directly after
         * the portrait — the panel says what the product does for a creator, and
         * the strip immediately answers "which creators", before the page moves
         * on to the barriers it removed. Each band gets its own air rather than
         * stacking flush: they are three separate statements, not one block. */}
        <Hero />
        <HeroShowcase />

        <div className="mt-20 md:mt-28">
          <Marquee items={ambassadors} label={t.landing.ambassadorsLabel} className="rv py-7" />
        </div>

        <div className="mt-20 md:mt-28">
          <ProofStrip />
        </div>

        {/* What the product is, before how it runs. */}
        <Section id="ce-facem">
          <WhatWeDo />
        </Section>

        {/* One transaction, told once. This was three sections. */}
        <Section id="cum-functioneaza">
          <HowItWorks />
        </Section>

        {/* Where the money actually goes. */}
        <Section id="model">
          <MoneyFlow />
        </Section>

        {/* The ask, at the end, where somebody who read the whole page lands. */}
        <Section id="lista" className="pb-8 md:pb-16">
          <JoinList />
        </Section>


        <SiteFooter />
      </div>
    </div>
  );
}

/**
 * A band of the page.
 *
 * It used to be a screen: `min-height: 100dvh`, mandatory snap, one wheel notch
 * per band, and a cue in the corner telling the reader there was more. All of
 * that existed to make a fixed height readable. A section now takes the height
 * its content needs plus air, and the scrollbar says how much is left — which is
 * the job the cue was doing badly.
 *
 * `rv-group` is the handle the reveal observer watches: arriving at the section
 * releases every `.rv` inside it, in the order the `dl-*` classes describe.
 *
 * The padding is `py-20`, not the `py-28` it started at. Two sections used to
 * put 224px of identical black between one heading and the next, against ~56px
 * between a heading and its own content — a four-to-one ratio, which reads as
 * the page coming apart rather than as a chapter break. It also made the bottom
 * of the page twice as loose as the top, where the bands above sit 112px apart.
 * 160px keeps sections the largest gap on the page without doubling everything
 * else.
 */
function Section({
  id,
  children,
  className,
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rv-group relative py-14 md:py-20", className)}>
      {/* The anchor is a marker inside the padding, not the section box.
       *
       * With the id on the `<section>` the browser aligns its *border* edge, so
       * the section's own `py-28` stayed above the heading and added to the
       * scroll margin — about two hundred pixels of nothing between the bar and
       * the title you asked for. Sitting after the padding, this lands the
       * content itself under the header, and the offset only has to clear the
       * header rather than guess at the section's spacing. */}
      {id && <span id={id} aria-hidden="true" className="block h-0 scroll-mt-24" />}
      {children}
    </section>
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

/**
 * One measure for the whole page.
 *
 * The bands used to declare their own: the header and every section below sat in
 * `max-w-container` (1440px) while the hero and its showcase sat in `5xl`
 * (1024px). On a wide screen that is a two-hundred-pixel step on each side, so
 * the headline started in one place, the section headings in another, and the
 * page had no left edge to speak of.
 *
 * Declared here rather than typed into six className strings, for the same
 * reason the section list is: two of them will drift, and nobody will be able to
 * say which one was right.
 */
const CONTAINER = "mx-auto w-full max-w-6xl px-6 md:px-10";

/**
 * The bar's contents and the page's sections are one list, declared once.
 *
 * The ids live here rather than being typed into both the nav and the sections,
 * because a table of contents whose entries can drift from the thing they point
 * at is worse than no table of contents.
 */
const sectionLinks = [
  { href: "#ce-facem", label: t.landing.whatWeDo.eyebrow },
  { href: "#cum-functioneaza", label: t.landing.sections.how },
  { href: "#model", label: t.landing.sections.money },
];

function SiteHeader({ scrolled }: { scrolled: boolean }) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
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
          CONTAINER,
          // Padding, so this is a layout transition — but it fires once per scroll
          // threshold crossing, not per frame, and the bar has to actually change
          // height. A transform would fake the height and leave the hit area wrong.
          "relative flex items-center justify-between transition-[padding] duration-300 ease-out",
          scrolled ? "py-3" : "py-5",
        )}
      >
        <Link to="/" className="rise hd-1">
          <Logo size={34} />
        </Link>

        {/* The three sections, by name.
         *
         * Every entry points at a section that exists — the page has exactly
         * three after the merge, so the bar is the table of contents rather than
         * a menu with somewhere-to-put-things in it. Hidden below `md`: on a
         * phone the page is short enough to thumb through, and a hamburger for
         * three anchors is furniture. */}
        {/* Two elements, not one, and the reason is a collision.
         *
         * `.rise` animates `transform` with `forwards`, so its final keyframe —
         * `translateY(0)` — replaces the whole property once the entrance ends,
         * including the `-translate-x-1/2` that was doing the centring. The bar
         * settled with its left edge on the centre line instead of its middle.
         * The outer element owns the position, the inner one owns the entrance,
         * and neither touches the other's transform. */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 md:block">
          <nav className="rise hd-1 flex items-center gap-8">
            {sectionLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-body text-[15px] text-on-surface-variant transition-colors hover:text-on-surface"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        {/* The right-hand side is deliberately empty.
         *
         * It held a sign-in link and a second "Intră pe listă" button. Neither
         * belongs yet: nobody has an account to sign into while the first wave is
         * still being assembled, and the hero already carries the only call to
         * action the page has — repeating it in the bar splits the same click
         * across two controls and tells the reader there are two things to do.
         *
         * The spacer keeps the anchors optically centred: they are positioned
         * against this row, and a row with one child would centre them against
         * the logo alone. */}
        <span aria-hidden="true" className="w-[34px]" />
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
    <section className="relative flex min-h-[92svh] items-center overflow-hidden">
      {/* The violet bloom that used to hang over the top of this section is
          gone. It was washing the whole hero up off black, and on a page whose
          headline is the only thing that should be bright, a glow behind it is
          contrast spent on nothing. The words below are the texture now. */}
      <HeroWordfall />
      {/* Top padding clears the fixed header, which no longer holds space.
       *
       * The column is `5xl`, not the page's `max-w-container`. A headline is
       * only as large as the column it fills: at 1440px the same type sat in the
       * middle of a wide field with air on both sides and read small, whatever
       * its point size. Narrowing the measure is most of what makes the
       * reference look bigger than this did. */}
      <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 pb-14 pt-28 text-center md:pb-16 md:pt-32">
        {/* The qualifier, moved above the headline.
         *
         * It used to sit under the buttons as small print, which is where a
         * reader looks last — but "no subscription, no annual contract, no
         * agency" is the objection that decides whether they read the headline
         * at all. As a badge it is read first and costs a line of nothing. */}
        <p className="rise hd-1 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 font-body text-[12px] text-on-surface-variant backdrop-blur-sm">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          {t.landing.heroNote}
        </p>

        {/* Set to break on the pivot rather than on the container: the sentence
            turns at "doar dacă", and that turn is the product.
       *
       * One ramp across both lines: white at the top of the first, violet at the
       * bottom of the second. The colour is not applied to a word — it arrives
       * as the sentence descends, so the accent is the *end* of the thought
       * rather than a highlighted phrase inside it.
       *
       * It is painted per line rather than on the `h1`, with the first line's
       * end stop equal to the second line's start stop, so the two read as one
       * continuous ramp. `background-clip: text` on the h1 would sample the
       * gradient at a fixed position while the masked lines are still sliding up
       * through their entrance, and each line would show the wrong slice of it
       * for the length of the animation.
       *
       * The italic that used to mark the second line is gone with it. It was a
       * change of voice for a phrase; there is no highlighted phrase now. */}
        {/* Three lines, and the size follows the longest of them (29 chars).
            A character runs about 0.47em against this column, measured off the
            rendered page rather than a font table, which puts the ceiling at
            76px — the mission is 58 characters and no break makes it a poster.
            Below `lg` the column is the viewport, not `5xl`, so each step is
            set against its own measure. */}
        <h1 className="mx-auto mt-8 font-display text-[24px] font-medium leading-[1.06] tracking-[-0.04em] sm:text-[42px] md:text-[54px] lg:text-[76px]">
          <span className="line-mask">
            <span className="hd-2 bg-gradient-to-b from-white to-[#ede9ff] bg-clip-text text-transparent">
              {t.landing.heroTitleLead}
            </span>
          </span>
          <span className="line-mask">
            <span className="hd-3 bg-gradient-to-b from-[#ede9ff] to-[#dbd4ff] bg-clip-text text-transparent">
              {t.landing.heroTitleAccent}
            </span>
          </span>
          <span className="line-mask">
            <span className="hd-4 bg-gradient-to-b from-[#dbd4ff] to-primary bg-clip-text text-transparent">
              {t.landing.heroTitleClose}
            </span>
          </span>
        </h1>

        <p className="rise hd-5 mx-auto mt-6 max-w-2xl text-[17px] leading-relaxed text-on-surface-variant md:text-[20px]">
          {t.landing.heroSubtitle}
        </p>

        {/* One door, because right now there is one.
         *
         * This was two — a filled creator button beside an outlined business
         * one — on the reasoning that a visitor arrives knowing which side they
         * are on and the page should let them say so. That holds when both sides
         * are open. The first wave is invited creators, so a second door offering
         * something not yet unlocked is a promise the page cannot keep, and a
         * single call to action is the strongest thing a hero can carry anyway.
         *
         * The money icon went with it. The button used to say what you would be
         * paid; it now says how you get in. */}
        {/* Two controls, one decision.
         *
         * The filled one commits — it asks for an address. The outlined one only
         * moves you down the page, and it exists because the alternative to
         * joining should be looking rather than leaving. It is an anchor, not a
         * route: nothing about it takes you off the landing.
         *
         * Both doors used to be routes to two different audiences, and that was
         * removed when the first wave narrowed to invited creators. This is not
         * that coming back — there is still one way in. */}
        <div className="rise hd-6 mt-10 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <a
            href="#lista"
            className={cn(
              "group inline-flex w-full items-center justify-center gap-2.5 rounded px-6 py-3.5 sm:w-auto sm:px-8",
              "bg-primary font-body text-[15px] font-semibold text-on-primary",
              // The glow used to throw violet a long way past the button. One
              // filled control does not need a halo to be found on a page this
              // dark, and the light it spilled was the loudest violet here.
              "shadow-[0_6px_24px_-12px_rgba(202,190,255,0.6)] transition-[background-color,transform] duration-150 ease-out hover:bg-primary/90 active:scale-[0.98]",
            )}
          >
            {t.landing.requestAccess}
            <Icon
              name="arrow_forward"
              size={17}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </a>
          <a
            href="#cum-functioneaza"
            className={cn(
              "inline-flex w-full items-center justify-center gap-2.5 rounded border px-6 py-3.5 sm:w-auto sm:px-8",
              "border-white/10 bg-transparent font-body text-[15px] font-medium text-on-surface",
              "transition-colors hover:border-white/25 hover:bg-white/[0.05]",
            )}
          >
            {t.landing.heroCtaExplore}
          </a>
        </div>
      </div>
    </section>
  );
}

/**
 * The product itself, cropped, immediately under the claim.
 *
 * The crop is the point. A full screenshot invites the reader to stop and study
 * it; a panel that runs off the bottom of its own frame says there is a real
 * thing here and lets them keep going. Nothing in it is drawn — these are the
 * same two previews the flow sections use further down, reading from the one
 * showcase fixture, so the page cannot show a product the app does not have.
 *
 * No address bar. The obvious thing to put in the chrome is a domain, and we do
 * not own one yet — a mocked-up URL is a claim, and this page does not get to
 * make claims it cannot keep.
 */
function HeroShowcase() {
  return (
    <div className={cn(CONTAINER, "rise hd-7 relative -mt-4")}>
      <div className="glass relative overflow-hidden rounded-2xl border border-white/10">
        <div className="flex h-11 items-center gap-2 border-b border-white/[0.07] bg-white/[0.02] px-4">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          </span>
          <span className="label-caps mx-auto text-[9px] text-on-surface-variant/50">
            {t.landing.showcaseLabel}
          </span>
        </div>

        {/* The portrait — the one artefact worth showing.
         *
         * One panel, not two. It opened with the portrait beside a campaign
         * card, which is two screenshots doing one job — and the portrait is
         * the only one that shows something the product *makes* rather than
         * something it displays. */}
        <div className="p-5 sm:p-7">
          <PortraitPreview />
        </div>

        {/* Fades the panel into the page instead of ending it on a hard edge. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-background" />
      </div>
    </div>
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
    // Reveal-driven now, not load-driven. The zeros used to sit on the first
    // screen and play off the hero's clock; on a page that scrolls they arrive
    // well below the fold, and an entrance that finished while nobody was
    // looking is an entrance that never happened.
    // No rule above it any more. The border was doing the separating when this
    // sat flush under the hero; now there is space on both sides, and a hairline
    // floating in the middle of that air reads as a leftover.
    <section className="rv-group relative overflow-hidden">
      {/* One soft violet bloom behind the row. The zeros are the only bright
          thing in this band, and a flat panel made them look like a footnote. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-[110px]"
        style={{
          background: "radial-gradient(circle, #cabeff 0%, transparent 70%)",
        }}
      />

      <div className={cn(CONTAINER, "relative grid gap-6 py-8 sm:grid-cols-3 md:py-10")}>
        {items.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "rv text-center",
              index === 0 && "dl-1",
              index === 1 && "dl-2",
              index === 2 && "dl-3",
              // Hairlines between the three, never around them: it reads as one
              // sentence in three parts, not as three separate stats.
              index > 0 && "sm:border-l sm:border-white/[0.06]",
            )}
          >
            {/* `medium`, not `bold`, and tracked in — the same voice change the
                headline just took. The zeros are still the largest thing on the
                screen; they no longer shout it. */}
            <p
              className={cn(
                "numeric bg-gradient-to-b from-white via-white to-primary bg-clip-text",
                "text-[64px] font-medium leading-[0.9] tracking-[-0.04em] text-transparent md:text-[80px]",
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

/**
 * What the product does, as four cards of unequal weight.
 *
 * The page used to go from the claim straight into a six-beat sequence, which
 * answers "in what order" for a reader who has not yet been told "of what".
 * This says what the thing is: it reads clips, it matches on what it read, the
 * brand approves before anything is posted, and the money follows views that
 * were actually measured.
 *
 * Bento rather than four equal tiles. Equal tiles rank everything the same, and
 * these are not the same: the portrait is the machine the rest of the product
 * hangs off, and the payout is the sentence a business came to read. Those two
 * get the width; matching and approval are one line each and do not need it.
 *
 * The portrait card carries the real radar rather than a picture of a screen —
 * it is the product's own output, drawn by the component `/profil` uses.
 */
function WhatWeDo() {
  /** The two best-grounded axes carry the example. Sorted rather than hardcoded
   *  so a fixture change cannot leave an unmeasured dimension standing here as
   *  the proof that scores are evidence-backed. */
  const evidenceRows = [...STYLE_DIMENSIONS]
    .filter((key) => portrait.styleEvidence[key].evidenceClipIds.length > 0)
    .sort((a, b) => portrait.styleEvidence[b].confidence - portrait.styleEvidence[a].confidence)
    .slice(0, 2)
    .map((key) => ({ key }));

  return (
    <div className={CONTAINER}>
      <div className="max-w-2xl">
        <SectionEyebrow className="rv" index={1} label={t.landing.whatWeDo.eyebrow} />
        <h2 className="rv dl-1 mt-4 font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em] text-on-surface sm:text-[38px] md:text-[46px]">
          {t.landing.whatWeDo.title}
        </h2>
        <p className="rv dl-2 mt-3 max-w-xl text-body-md text-on-surface-variant">
          {t.landing.whatWeDo.subtitle}
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:mt-14 md:grid-cols-3">
        {/* Wide: the portrait, with the thing itself in it. */}
        <article className="rv dl-6 surface-lit relative overflow-hidden rounded-2xl p-7 md:col-span-2">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="max-w-sm">
              <h3 className="flex items-center gap-2.5 font-display text-[18px] font-semibold text-on-surface">
                <Icon name="face" size={20} className="shrink-0 text-on-surface-variant/70" />
                {t.landing.whatWeDo.portraitTitle}
              </h3>
              <p className="mt-2.5 text-[14px] leading-relaxed text-on-surface-variant">
                {t.landing.whatWeDo.portraitText}
              </p>
            </div>
            {/* Not the radar again — the hero panel already carries the shape,
                and the same drawing twice on one page reads as a page with one
                picture. This is the other half of what a portrait is: every
                score cites the clips it was read from, so a reader can check it
                rather than take it. */}
            <div className="flex w-full flex-col gap-3 sm:w-[260px]">
              {evidenceRows.map((row) => (
                <div
                  key={row.key}
                  className="rounded-lg border border-white/5 bg-surface-container-lowest/60 p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-semibold text-on-surface">
                      {t.portrait.dimensions[row.key]}
                    </span>
                    <span className="numeric text-[12px] text-creator">
                      {Math.round(portrait.styleVector[row.key] * 100)}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-on-surface-variant/80">
                    {portrait.styleEvidence[row.key].rationale}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-[10px] text-on-surface-variant/50">
                    <Icon name="play_circle" size={12} />
                    {t.portrait.groundedIn(
                      portrait.styleEvidence[row.key].evidenceClipIds.length,
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="rv dl-7 surface-lit flex flex-col justify-between rounded-2xl p-7">
          <div>
            <h3 className="flex items-center gap-2.5 font-display text-[18px] font-semibold text-on-surface">
              <Icon name="style" size={20} className="shrink-0 text-on-surface-variant/70" />
              {t.landing.whatWeDo.matchTitle}
            </h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-on-surface-variant">
              {t.landing.whatWeDo.matchText}
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <Chip tone="mint" icon="check_circle">
              {t.campaigns.strongMatch}
            </Chip>
            <Chip tone="creator" icon="sell">
              {t.landing.sections.creatorFlow}
            </Chip>
          </div>
        </article>

        <article className="rv dl-8 surface-lit flex flex-col justify-between rounded-2xl p-7">
          <div>
            <h3 className="flex items-center gap-2.5 font-display text-[18px] font-semibold text-on-surface">
              <Icon name="fact_check" size={20} className="shrink-0 text-on-surface-variant/70" />
              {t.landing.whatWeDo.approvalTitle}
            </h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-on-surface-variant">
              {t.landing.whatWeDo.approvalText}
            </p>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-lg border border-white/5 bg-surface-container-lowest/60 px-3 py-2.5">
            <Icon name="schedule_send" size={16} className="text-amber" />
            <span className="text-[12px] text-on-surface-variant">{t.landing.whatWeDo.approvalStatus}</span>
          </div>
        </article>

        {/* Wide: the sentence a business came to read. */}
        <article className="rv dl-9 surface-lit rounded-2xl p-7 md:col-span-2">
          <h3 className="flex items-center gap-2.5 font-display text-[18px] font-semibold text-on-surface">
            <Icon name="visibility" size={20} className="shrink-0 text-on-surface-variant/70" />
            {t.landing.whatWeDo.payoutTitle}
            </h3>
          <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-on-surface-variant">
            {t.landing.whatWeDo.payoutText}
          </p>
        </article>
      </div>
    </div>
  );
}

interface Beat {
  side: "creator" | "business";
  step: { icon: string; title: string; text: string | ((minFollowers: string) => string) };
}

/** Band two of the delay scale. The last two share a slot — by then the list runs
 *  past the fold, and nobody is watching the difference. */
const beatDelays = ["dl-6", "dl-7", "dl-8", "dl-9", "dl-10", "dl-10"];

/**
 * One transaction, told once.
 *
 * This was three sections: who the product is for, then the creator's three
 * steps, then the business's three — the last two built from the same component
 * with different props and running back to back. They rhymed deliberately, which
 * is exactly why the page read as a template stamped twice rather than as an
 * argument that moves.
 *
 * There is one deal here, so there is one sequence. The beats run down a single
 * spine in the order the deal actually happens, and a chip beside each says
 * whose move it is — the two sides are named per step instead of being given a
 * section each. Nothing was rewritten: every beat carries the copy it already
 * had, and the heading is the one that was already written for a section
 * describing both ends of one campaign at once.
 *
 * No screenshots. The bento above already shows the one artefact worth showing;
 * here the sequence is the argument, and a product shot beside each step turns a
 * sequence into a gallery.
 */
function HowItWorks() {
  const beats: Beat[] = [
    { side: "business", step: t.landing.brandSteps[0] },
    { side: "creator", step: t.landing.steps[0] },
    // No portrait vignette here any more: the hero panel now opens with it, and
    // the same screen twice on one page reads as a page with one screenshot.
    { side: "creator", step: t.landing.steps[1] },
    { side: "creator", step: t.landing.steps[2] },
    { side: "business", step: t.landing.brandSteps[1] },
    { side: "business", step: t.landing.brandSteps[2] },
  ];

  return (
    <div className={CONTAINER}>
      <div className="max-w-2xl">
        <SectionEyebrow className="rv" index={2} label={t.landing.sections.how} />
        <h2 className="rv dl-1 mt-4 font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em] text-on-surface sm:text-[38px] md:text-[46px]">
          {t.landing.productTitle}
        </h2>
        <p className="rv dl-2 mt-3 max-w-xl text-body-md text-on-surface-variant">
          {t.landing.productSubtitle}
        </p>
      </div>

      {/* One spine, six beats, tight rows.
       *
       * It briefly alternated across a centre rule, which is the right shape
       * when every other beat faces a picture. The screenshots came out — this
       * section is the sequence, and a product shot beside each step turns a
       * sequence into a gallery — and an alternating layout with nothing in the
       * facing half is four rows of empty column pretending to be rhythm.
       *
       * So: one rule, the numbers on it, and the side named per beat. Short
       * enough to read in one pass, which is the whole job of this band. */}
      <ol className="relative mt-10 flex flex-col gap-7 border-l border-white/10 pl-8 md:mt-14 md:gap-8 md:pl-10">
        {beats.map((beat, index) => {
          const creator = beat.side === "creator";
          return (
            <li key={beat.step.title} className={cn("rv relative", beatDelays[index])}>
              {/* Sits on the rule and paints over it — the page background is
                  the hole punched through the line. */}
              <span
                className={cn(
                  "absolute -left-8 top-0 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border bg-background md:-left-10",
                  creator ? "border-creator/40" : "border-business/40",
                )}
              >
                <span
                  className={cn(
                    "numeric text-[11px] font-semibold",
                    creator ? "text-creator" : "text-business",
                  )}
                >
                  {index + 1}
                </span>
              </span>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span
                  className={cn(
                    "label-caps text-[9px]",
                    creator ? "text-creator" : "text-business",
                  )}
                >
                  {creator ? t.landing.flowSideCreator : t.landing.flowSideBrand}
                </span>
                <p className="font-display text-[17px] font-semibold text-on-surface md:text-[19px]">
                  {beat.step.title}
                </p>
              </div>
              <p className="mt-1.5 max-w-2xl text-[14px] leading-relaxed text-on-surface-variant">
                {copy(beat.step.text)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Where the budget actually goes.
 *
 * The sharpest difference between next10 and the model it replaces is not a
 * feature — it is the destination of the money. The page states that side by
 * side rather than hoping the reader infers it from a list of benefits.
 *
 * Note what each column claims: the left one carries a figure about how
 * agencies price their work, which is the client's own positioning. The right
 * one stays structural — it says the brand buys views rather than someone's
 * fee, and never quotes a take rate, because no such rate is documented
 * anywhere in this repo and a number invented for a landing page is a number
 * the client will be asked to defend.
 */
function MoneyFlow() {
  // Two sides, both lit. It used to be ours against a dimmed cascade of the
  // agency model, crossed out point by point — which is a fight, and the mission
  // in the hero is a builder's. The competitor is still in every line by
  // implication ("înainte să vadă", "fără negociere"), which is where it belongs
  // on your own page.
  const sides = [
    {
      label: t.landing.modelCreatorLabel,
      icon: "person",
      tone: "creator" as const,
      points: t.landing.modelCreatorPoints,
    },
    {
      label: t.landing.modelBrandLabel,
      icon: "storefront",
      tone: "business" as const,
      points: t.landing.modelBrandPoints,
    },
  ];

  return (
    <div className={CONTAINER}>
      <div className="max-w-2xl">
        <SectionEyebrow className="rv" index={3} label={t.landing.sections.money} />
        <h2 className="rv dl-1 mt-5 font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em] text-on-surface sm:text-[38px] md:text-[46px]">
          {t.landing.modelTitle}
        </h2>
        <p className="rv dl-2 mt-3 text-body-md text-on-surface-variant">
          {t.landing.modelSubtitle}
        </p>
      </div>

      <div className="mt-10 grid gap-4 md:mt-14 lg:grid-cols-2">
        {sides.map((side, index) => (
          <article
            key={side.label}
            className={cn("rv surface-lit rounded-2xl p-7", index === 0 ? "dl-6" : "dl-7")}
          >
            <p
              className={cn(
                "label-caps flex items-center gap-2",
                side.tone === "creator" ? "text-creator" : "text-business",
              )}
            >
              <Icon name={side.icon} size={16} />
              {side.label}
            </p>

            <ul className="mt-6 flex flex-col gap-3.5">
              {side.points.map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <Icon
                    name="check_circle"
                    size={17}
                    className={cn(
                      "mt-0.5 shrink-0",
                      side.tone === "creator" ? "text-creator" : "text-business",
                    )}
                  />
                  <span className="text-[14px] leading-relaxed text-on-surface">{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
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

/**
 * The closing ask.
 *
 * A landing page that argues for four screens and then hands you a footer has
 * spent its case and collected nothing. This is the same form `/lista` renders —
 * one component, so the two cannot drift — in a panel at the end of the
 * argument.
 *
 * The hero button scrolls here rather than navigating away: the page is the
 * pitch, and sending someone to a bare form mid-pitch loses whatever of it they
 * had not read yet. `/lista` still exists for a direct link or a QR code.
 */
function JoinList() {
  return (
    <div className={cn(CONTAINER, "flex flex-col items-center text-center")}>
      <h2 className="rv font-display text-[30px] font-medium leading-[1.05] tracking-[-0.035em] text-on-surface sm:text-[38px] md:text-[46px]">
        {t.waitlist.title}
      </h2>
      <p className="rv dl-1 mt-3 max-w-lg text-body-md text-on-surface-variant">
        {t.waitlist.subtitle}
      </p>

      <div className="rv dl-2 glass mt-10 w-full max-w-md rounded-2xl p-6 sm:p-8">
        <WaitlistForm />
      </div>
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-white/5">
      <div className={cn(CONTAINER, "flex flex-wrap items-center justify-between gap-4 py-8")}>
        <div className="flex items-center gap-3">
          <LogoMark size={32} />
          <span className="text-[13px] text-on-surface-variant">{t.landing.footerNote}</span>
        </div>
        <div className="flex gap-6 text-[13px] text-on-surface-variant/70">
          <Link to="/terms" className="transition-colors hover:text-on-surface">
            {t.landing.footerLinks.terms}
          </Link>
          <Link to="/privacy" className="transition-colors hover:text-on-surface">
            {t.landing.footerLinks.privacy}
          </Link>
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="transition-colors hover:text-on-surface"
          >
            {t.landing.footerLinks.contact}
          </a>
        </div>
      </div>
    </footer>
  );
}
