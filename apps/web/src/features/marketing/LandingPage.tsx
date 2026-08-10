import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Logo, LogoMark } from "../../components/Logo";
import { SurfaceBackdrop } from "../../components/SurfaceBackdrop";
import { cn } from "../../lib/cn";
import { t, tokens } from "@vira/core";
import { formatViews } from "@vira/core";
import { CREATOR_MIN_FOLLOWERS, feedCampaigns, landingExampleCampaign } from "@vira/core";
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
  return (
    <div className="relative min-h-full">
      <SurfaceBackdrop />
      {/* Content rides above the texture — the backdrop sits at z-0. */}
      <div className="relative z-10">
        <SiteHeader />
        <Hero />
        <ProofStrip />
        <ForWho />
        <MoneyFlow />
        <OpenCampaigns />
        <HowItWorks />
        <ForBrands />
        <SiteFooter />
      </div>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-container items-center gap-6 px-6 py-4 md:px-12">
        <Link to="/">
          <Logo size={38} />
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
              "rounded bg-primary px-4 py-2 font-body text-[13px] font-bold text-on-primary",
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

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute left-1/2 top-[-18rem] h-[36rem] w-[36rem] -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ background: "radial-gradient(circle,#cabeff,transparent 70%)" }}
      />
      <div className="relative mx-auto max-w-container px-6 pb-20 pt-24 text-center md:px-12">
        <h1 className="mx-auto max-w-4xl font-display text-[44px] font-bold leading-[1.08] tracking-tight text-on-surface md:text-[64px] md:leading-[1.05]">
          {t.landing.heroTitle}
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-body-lg text-on-surface-variant">
          {t.landing.heroSubtitle}
        </p>

        {/* Two audiences, two different doors — a creator signs in with TikTok
            and never makes an account here; a business registers one. */}
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {/* The creator door is filled, the business door is outlined: on a page
              where a visitor picks a side, the weight difference does more work
              than the hue does. It carries the same violet as "Loghează-te" in
              the header — one filled violet button on the page means one thing,
              and a second, darker violet would have read as a different control
              rather than as the same invitation. */}
          <Link
            to="/intra/creator"
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded px-6 py-3.5 sm:w-auto",
              "bg-primary font-body text-[15px] font-bold text-on-primary",
              "shadow-primary-glow transition-transform hover:bg-primary/90 active:scale-[0.98]",
            )}
          >
            <Icon name="payments" size={20} />
            {t.landing.heroCtaCreator}
          </Link>
          <Link
            to="/intra/afacere"
            className={cn(
              "inline-flex w-full items-center justify-center gap-2 rounded border px-6 py-3.5 sm:w-auto",
              "border-business/50 font-body text-[15px] font-semibold text-business",
              "transition-colors hover:bg-business/10",
            )}
          >
            <Icon name="storefront" size={20} />
            {t.landing.heroCtaBrand}
          </Link>
        </div>

        <p className="mt-5 text-[13px] text-on-surface-variant/60">{t.landing.heroNote}</p>
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
  const items = [
    { value: String(CREATOR_MIN_FOLLOWERS), label: t.landing.proof.noFollowers },
    { value: "0", label: t.landing.proof.creatorFee },
    { value: "0", label: t.landing.proof.noContract },
  ];

  return (
    <section className="relative overflow-hidden border-y border-white/5 bg-surface-container-lowest/50">
      {/* One soft violet bloom behind the row. The zeros are the only bright
          thing in this band, and a flat panel made them look like a footnote. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-[110px]"
        style={{ background: "radial-gradient(circle, #cabeff 0%, transparent 70%)" }}
      />

      <div className="relative mx-auto grid max-w-container gap-10 px-6 py-16 sm:grid-cols-3 sm:gap-8 md:px-12 md:py-20">
        {items.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "text-center",
              // Hairlines between the three, never around them: it reads as one
              // sentence in three parts, not as three separate stats.
              index > 0 && "sm:border-l sm:border-white/[0.06]",
            )}
          >
            <p
              className={cn(
                "numeric bg-gradient-to-b from-white via-white to-primary bg-clip-text",
                "text-[86px] font-bold leading-[0.85] text-transparent md:text-[104px]",
              )}
            >
              {item.value}
            </p>
            <p className="label-caps mx-auto mt-4 max-w-[24ch] leading-relaxed">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/** The two audiences, side by side and named plainly. */
function ForWho() {
  return (
    <section className="mx-auto max-w-container px-6 py-section md:px-12">
      <div className="max-w-2xl">
        <h2 className="font-display text-headline-lg text-on-surface">{t.landing.forWhoTitle}</h2>
        <p className="mt-3 text-body-md text-on-surface-variant">{t.landing.forWhoSubtitle}</p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {/* Index 0 is the business card, 1 the creator card — each sends the
            reader to its own door rather than to a shared chooser. */}
        {t.landing.audiences.map((audience, index) => (
          <div
            key={audience.eyebrow}
            className="flex flex-col rounded-lg border border-white/5 bg-surface-container-low p-7 transition-colors hover:border-white/[0.12]"
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
              <p className={cn("label-caps", index === 0 ? "text-business" : "text-creator")}>
                {audience.eyebrow}
              </p>
            </div>

            <h3 className="mt-6 font-display text-[24px] font-semibold leading-snug text-on-surface">
              {audience.title}
            </h3>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {audience.points.map((point) => (
                <li key={point} className="flex items-start gap-3 text-[14px] leading-relaxed text-on-surface-variant">
                  <Icon name="check_circle" size={17} className="mt-0.5 shrink-0 text-mint" />
                  {point}
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
              {t.landing.startHere}
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
    <section className="border-y border-white/5 bg-surface-container-lowest/50">
      <div className="mx-auto max-w-container px-6 py-section md:px-12">
        <div className="max-w-2xl">
          <h2 className="font-display text-headline-lg text-on-surface">{t.landing.moneyTitle}</h2>
          <p className="mt-3 text-body-md text-on-surface-variant">{t.landing.moneySubtitle}</p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {columns.map((column) => (
            <div
              key={column.label}
              className={cn(
                "rounded-lg border p-7",
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

function HowItWorks() {
  return (
    <section className="mx-auto max-w-container px-6 py-section md:px-12">
      <div className="max-w-2xl">
        <h2 className="font-display text-headline-lg text-on-surface">{t.landing.howTitle}</h2>
        <p className="mt-3 text-body-md text-on-surface-variant">{t.landing.howSubtitle}</p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {t.landing.steps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-lg border border-white/5 bg-surface-container-low p-6 transition-colors hover:border-white/[0.12]"
          >
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md border border-primary/20 bg-primary/10">
                <Icon name={step.icon} size={20} className="text-primary" />
              </div>
              <span className="numeric text-[13px] text-on-surface-variant/50">
                0{index + 1}
              </span>
            </div>
            <h3 className="mt-5 font-display text-[19px] font-semibold text-on-surface">
              {step.title}
            </h3>
            <p className="mt-2 text-[14px] leading-relaxed text-on-surface-variant">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function OpenCampaigns() {
  return (
    <section className="border-t border-white/5 bg-surface-container-lowest/40">
      <div className="mx-auto max-w-container px-6 py-section md:px-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-headline-lg text-on-surface">
              {t.landing.campaignsTitle}
            </h2>
            <p className="mt-3 text-body-md text-on-surface-variant">
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
          {feedCampaigns.slice(0, 4).map((campaign) => (
            <Link
              key={campaign.id}
              to="/intra/creator"
              className={cn(
                "group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-lg",
                "border border-white/10 p-5 transition-transform hover:-translate-y-1",
              )}
              style={{ background: tokens.gradientCss(campaign.gradientStops) }}
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
          ))}
        </div>
      </div>
    </section>
  );
}

function ForBrands() {
  return (
    <section className="mx-auto max-w-container px-6 py-section md:px-12">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-headline-lg leading-tight text-on-surface">
            {t.landing.brandsTitle}
          </h2>
          <p className="mt-4 max-w-xl text-body-md text-on-surface-variant">
            {t.landing.brandsText}
          </p>

          <ul className="mt-7 flex flex-col gap-3">
            {t.landing.brandsPoints.map((point) => (
              <li key={point} className="flex items-start gap-3 text-[14px] text-on-surface">
                <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-mint" />
                {point}
              </li>
            ))}
          </ul>

          <Link
            to="/intra/afacere"
            className={cn(
              "mt-8 inline-flex items-center gap-2 rounded border border-primary/50 px-5 py-3",
              "font-body text-[14px] font-semibold text-primary transition-colors hover:bg-primary/10",
            )}
          >
            {t.landing.heroCtaBrand}
            <Icon name="arrow_forward" size={18} />
          </Link>
        </div>

        {/* A real campaign at neighbourhood scale. Every figure comes from the
            fixture so the arithmetic stays true: the spend, the views and the
            refund are one consistent set, not six independently editable
            strings that can drift into contradicting each other. */}
        <ExampleCampaignCard />
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
function ExampleCampaignCard() {
  const { brandName, brandInitials, creatorCount, budgetMinor, spentMinor, views } =
    landingExampleCampaign;
  const budgetPercent = Math.round((spentMinor / budgetMinor) * 100);

  return (
    <div className="rounded-lg border border-white/5 bg-surface-container-low p-6">
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
