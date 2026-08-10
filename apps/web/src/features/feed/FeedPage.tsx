import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/cn";
import { t } from "@vira/core";
import { formatMoney, formatViews } from "@vira/core";
import { feedCampaigns, type FeedCampaign } from "@vira/core";
import { useFeedPreferences } from "../../lib/feedPreferences";

/**
 * Creator home — a vertical, one-per-screen feed of *campaigns*.
 *
 * The format is TikTok's; the content cannot be. There is no video here and
 * there will not be: what a creator is browsing is offers, not content. So the
 * card takes its life from data that moves rather than from media —
 *
 *   - the money the creator would personally make, counting up on arrival
 *   - the campaign's budget draining while they look at it
 *
 * That ordering is deliberate. A creator scrolling asks one question — what do
 * I get, and is it still available — and an earlier design answered it in 12px
 * grey text under a brand monogram they had never heard of. Here the earnings
 * are the largest thing on the screen and the brand is an eyebrow.
 *
 * The rail carries only actions that change what happens next: get help making
 * the clip, or tell the matcher it got this wrong. Sharing a brief was there
 * before and had no use case behind it — there is nothing to share until
 * referrals exist, and by then the button will mean something different.
 *
 * Everything is one accent per card, taken from the brand: the earnings figure,
 * the budget bar and the button. A campaign in the feed is a business showing
 * up in a creator's space, and the accent is how one shaorma place stops
 * looking like the next — the moodboard behind the card carries the same colour
 * at single-digit opacity, so the card and the room around it agree.
 *
 * The match percentage is the exception, and stays violet: a match is a creator
 * measured against a campaign, so it belongs to neither side alone.
 */
type FeedTab = "all" | "forYou";

const feedTabs: { id: FeedTab; label: string }[] = [
  { id: "all", label: t.feed.tabAll },
  { id: "forYou", label: t.feed.tabForYou },
];

export default function FeedPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const dismissed = useFeedPreferences((state) => state.dismissed);
  const dismiss = useFeedPreferences((state) => state.dismiss);
  const restore = useFeedPreferences((state) => state.restore);
  const restoreAll = useFeedPreferences((state) => state.restoreAll);

  const [tab, setTab] = useState<FeedTab>("forYou");
  const [undoFor, setUndoFor] = useState<FeedCampaign | null>(null);

  const available = feedCampaigns.filter((campaign) => !dismissed.includes(campaign.id));

  /**
   * The two tabs are a real difference, not decoration: "Pentru tine" leads with
   * the closest fit, "Campanii" is everything in the order it was opened. A
   * control that changed nothing would be worse than no control.
   */
  const campaigns =
    tab === "forYou"
      ? [...available].sort((a, b) => b.matchPercent - a.matchPercent)
      : available;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveIndex(Number((entry.target as HTMLElement).dataset.index));
          }
        }
      },
      { root: container, threshold: 0.6 },
    );

    container.querySelectorAll("[data-index]").forEach((slide) => observer.observe(slide));
    return () => observer.disconnect();
    // Re-observed when the list changes shape, otherwise the observer keeps
    // watching slides that no longer exist and the active index sticks.
  }, [campaigns.length, tab]);

  /** The undo offer expires on its own; a toast that never leaves is clutter. */
  useEffect(() => {
    if (!undoFor) return;
    const id = window.setTimeout(() => setUndoFor(null), 6000);
    return () => window.clearTimeout(id);
  }, [undoFor]);

  function onDismiss(campaign: FeedCampaign) {
    dismiss(campaign.id);
    setUndoFor(campaign);
    setActiveIndex(0);
  }

  function onUndo() {
    if (!undoFor) return;
    restore(undoFor.id);
    setUndoFor(null);
  }

  const active = campaigns[Math.min(activeIndex, campaigns.length - 1)] ?? feedCampaigns[0];

  return (
    <div className="relative">
      <MoodBackdrop campaigns={campaigns} activeId={active.id} />

      {/* A segmented pill rather than two bare words: the feed sits on a
          moodboard now, and plain text on a coloured wash has nowhere to stand. */}
      <div className="pointer-events-none absolute inset-x-0 top-5 z-20 flex justify-center">
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/10 bg-background/60 p-1 backdrop-blur-xl">
          {feedTabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => {
                setTab(entry.id);
                setActiveIndex(0);
              }}
              aria-pressed={tab === entry.id}
              className={cn(
                "rounded-full px-4 py-1.5 font-display text-[13px] font-semibold transition-colors",
                tab === entry.id
                  ? "bg-white/10 text-on-surface"
                  : "text-on-surface-variant/60 hover:text-on-surface",
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {campaigns.length === 0 ? (
        <EmptyFeed onRestore={restoreAll} />
      ) : (
        <div
          ref={containerRef}
          className="relative z-10 h-dvh snap-y snap-mandatory overflow-y-auto scroll-smooth"
        >
          {campaigns.map((campaign, index) => (
            <CampaignSlide
              key={campaign.id}
              campaign={campaign}
              index={index}
              isLast={index === campaigns.length - 1}
              isActive={index === activeIndex}
              onDismiss={() => onDismiss(campaign)}
            />
          ))}
        </div>
      )}

      {undoFor && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-4 md:bottom-6">
          <div className="pointer-events-auto flex max-w-md items-center gap-4 rounded-lg border border-white/10 bg-surface-container-high px-4 py-3 shadow-creator-glow">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-on-surface">
                {t.feed.dismissed(undoFor.brandName)}
              </p>
              <p className="text-[11px] text-on-surface-variant/70">{t.feed.dismissedNote}</p>
            </div>
            <button
              type="button"
              onClick={onUndo}
              className="shrink-0 font-body text-[13px] font-bold text-creator transition-opacity hover:opacity-80"
            >
              {t.feed.undo}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Fixed scatter for the backdrop motifs.
 *
 * Hand-placed rather than random: the same campaign must look identical every
 * time it comes back into view, and the gaps are sized so nothing important
 * sits directly behind the card. Percentages, so it scales with the viewport.
 */
const motifPlacement = [
  { top: "6%", left: "5%", size: 150, rotate: -12, opacity: 0.07 },
  { top: "24%", left: "80%", size: 180, rotate: 9, opacity: 0.06 },
  { top: "56%", left: "3%", size: 200, rotate: 5, opacity: 0.055 },
  { top: "68%", left: "84%", size: 132, rotate: -7, opacity: 0.07 },
  { top: "42%", left: "90%", size: 104, rotate: 15, opacity: 0.05 },
  { top: "82%", left: "14%", size: 118, rotate: -9, opacity: 0.05 },
  { top: "3%", left: "62%", size: 92, rotate: 11, opacity: 0.045 },
  { top: "86%", left: "68%", size: 146, rotate: -14, opacity: 0.05 },
];

/** Where the three palette washes sit. Kept off-centre so it never looks like a vignette. */
const washPlacement = [
  { top: "-10%", left: "-8%", size: 58, opacity: 0.3 },
  { top: "38%", left: "68%", size: 52, opacity: 0.26 },
  { top: "72%", left: "12%", size: 46, opacity: 0.2 },
];

/**
 * The two places the same moodboard is drawn.
 *
 * One definition, two scales: the card is roughly a third the width of the
 * viewport, so its motifs and blur have to shrink or they read as smears, and
 * its opacity has to rise or they vanish under the scrim. Keeping both here
 * means the card and the space around it cannot drift into different moods.
 */
const moodVariants = {
  // The backdrop was pitched so far back that two thirds of a desktop viewport
  // read as empty rather than as this campaign's room. Lifted until the space
  // around the card belongs to the brand — still well under the card, which has
  // to stay the brightest thing on screen.
  backdrop: { unit: "vw", motifScale: 1, intensity: 2.1, blur: 100, scrim: "bg-background/45" },
  card: { unit: "%", motifScale: 0.42, intensity: 1.9, blur: 52, scrim: "bg-background/60" },
} as const;

type MoodVariant = keyof typeof moodVariants;

/** One campaign's atmosphere: palette as soft washes, trade as oversized faint glyphs. */
function CampaignMoodLayer({
  campaign,
  variant,
}: {
  campaign: FeedCampaign;
  variant: MoodVariant;
}) {
  const spec = moodVariants[variant];

  return (
    <>
      {campaign.mood.palette.map((tone, index) => {
        const place = washPlacement[index];
        return (
          <div
            key={tone}
            className="absolute rounded-full"
            style={{
              top: place.top,
              left: place.left,
              width: `${place.size}${spec.unit}`,
              height: `${place.size}${spec.unit}`,
              background: tone,
              opacity: place.opacity,
              filter: `blur(${spec.blur}px)`,
            }}
          />
        );
      })}

      {motifPlacement.map((place, index) => (
        <Icon
          key={`${campaign.id}-${variant}-${index}`}
          name={campaign.mood.motifs[index % campaign.mood.motifs.length]}
          size={Math.round(place.size * spec.motifScale)}
          className="absolute"
          style={{
            top: place.top,
            left: place.left,
            color: campaign.mood.palette[index % campaign.mood.palette.length],
            opacity: place.opacity * spec.intensity,
            transform: `rotate(${place.rotate}deg)`,
          }}
        />
      ))}

      {/* Pulls the whole thing back so the text stays the brightest thing on it —
          a moodboard that competes with the numbers is just noise. */}
      <div className={cn("absolute inset-0", spec.scrim)} />
    </>
  );
}

/**
 * The moodboard behind the card.
 *
 * DEMO SCAFFOLDING, and worth being plain about why it exists: a 9:16 card on a
 * desktop viewport leaves two thirds of the screen empty, and there is no brand
 * photography to put there. So each campaign brings its own atmosphere instead —
 * its palette as soft washes, its trade as oversized faint glyphs — and the
 * whole backdrop crossfades as you scroll, which gives the feed a sense of place
 * per business rather than one flat dark page for all of them.
 *
 * Every campaign's layer is rendered and only the active one is opaque: that is
 * what makes the transition a crossfade rather than a repaint, and with five
 * campaigns the cost is trivial.
 *
 * TODO(assets): replace with real brand imagery when a business supplies it —
 * `campaign.mood` is the seam, and nothing else in the feed depends on it.
 */
function MoodBackdrop({ campaigns, activeId }: { campaigns: FeedCampaign[]; activeId: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          aria-hidden="true"
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            campaign.id === activeId ? "opacity-100" : "opacity-0",
          )}
        >
          <CampaignMoodLayer campaign={campaign} variant="backdrop" />
        </div>
      ))}
    </div>
  );
}

function EmptyFeed({ onRestore }: { onRestore: () => void }) {
  return (
    <div className="relative z-10 flex h-dvh flex-col items-center justify-center px-6 text-center">
      <Icon name="done_all" size={36} className="text-on-surface-variant/40" />
      <p className="mt-4 font-display text-headline-md text-on-surface">{t.feed.emptyTitle}</p>
      <p className="mt-2 max-w-sm text-body-md text-on-surface-variant">{t.feed.emptyText}</p>
      <button
        type="button"
        onClick={onRestore}
        className="mt-6 rounded border border-creator/50 px-4 py-2.5 font-body text-[13px] font-semibold text-creator transition-colors hover:bg-creator/10"
      >
        {t.feed.resetDismissed}
      </button>
    </div>
  );
}

function CampaignSlide({
  campaign,
  index,
  isActive,
  isLast,
  onDismiss,
}: {
  campaign: FeedCampaign;
  index: number;
  isActive: boolean;
  isLast: boolean;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const earnedLow = useCountUp(campaign.estimatedMinMinor);
  const earnedHigh = useCountUp(campaign.estimatedMaxMinor);
  const budgetRemaining = useDrainingBudget(campaign.budgetRemainingMinor, isActive);

  const budgetPercent = Math.round((budgetRemaining / campaign.budgetRemainingMinor) * 100);

  /**
   * The view range the estimate came from, recovered from the estimate itself.
   *
   * `estimated = views / 1.000 × rate`, so `views = estimated × 1.000 / rate`.
   * Deriving it back rather than storing it separately means the two can never
   * disagree: change a rate or an estimate in the fixtures and the views shown
   * follow, because they are the same fact read from the other end. Integer
   * throughout — these are counts, and the money they came from never leaves
   * minor units (CLAUDE.md #1).
   */
  const viewsLow = Math.round((campaign.estimatedMinMinor * 1000) / campaign.ratePerMilleMinor);
  const viewsHigh = Math.round((campaign.estimatedMaxMinor * 1000) / campaign.ratePerMilleMinor);

  const railActions = [
    {
      key: "save",
      icon: "bookmark",
      label: saved ? t.feed.saved : t.feed.save,
      filled: saved,
      highlight: saved,
      onClick: () => setSaved((value) => !value),
    },
    {
      key: "assistant",
      icon: "auto_awesome",
      label: t.feed.howToFilm,
      filled: false,
      highlight: false,
      // The assistant already knows the creator's style; handing it the campaign
      // is what turns "nice offer" into something they can actually shoot.
      onClick: () => navigate("/asistent", { state: { campaignId: campaign.id } }),
    },
    {
      key: "dismiss",
      icon: "not_interested",
      label: t.feed.notInterested,
      filled: false,
      highlight: false,
      onClick: onDismiss,
    },
  ];

  return (
    <section
      data-index={index}
      // pb below `md` clears the tab bar the layout floats over this screen —
      // without it the apply button sits underneath it, which is the one control
      // on the card that must never be covered.
      className="flex h-full snap-start snap-always items-center justify-center px-4 pb-24 pt-16 md:pb-6"
    >
      {/* Phones give the card the whole screen and float the rail over it, the
          way TikTok does. Only from `md` up is there room to stand the rail
          beside a 9:16 card — below that the pair measured 464px of content in
          343px of space and both edges were being clipped. */}
      <div className="relative flex h-full w-full max-h-[calc(100dvh-172px)] items-center justify-center md:max-h-[calc(100dvh-96px)] md:w-auto md:gap-4">
        <div
          className={cn(
            "relative flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl",
            "md:aspect-[9/16] md:w-auto",
            // A hairline inset highlight over a deep drop shadow: the card has
            // to read as lifted off the moodboard behind it, and a flat 1px
            // border on a dark wash does not do that on its own.
            "border border-white/10 bg-surface-container-lowest ring-1 ring-inset ring-white/[0.04]",
            "shadow-[0_32px_90px_-24px_rgba(0,0,0,0.95),0_0_80px_-30px_rgba(202,190,255,0.25)]",
          )}
        >
          {/* Same moodboard as the space around the card, drawn at card scale.
              It fills the band between the hook and the earnings, which is where
              a video would have gone and where the card previously read empty. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <CampaignMoodLayer campaign={campaign} variant="card" />

            {/* The brand's colour, bled in from the top corner. The moodboard
                alone sat too far back to give the card a light source, so the
                middle band read as flat black however busy it was. */}
            <div
              className="absolute -right-1/4 -top-1/4 h-2/3 w-full rounded-full opacity-[0.22] blur-[64px]"
              style={{ background: campaign.accent }}
            />

            {/* Everything transactional sits in the bottom third, so that third
                gets a floor to stand on. Without it the earnings figure was
                competing with whatever motif happened to land behind it. */}
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-background via-background/85 to-transparent" />
          </div>

          {/* No `justify-between`: spreading the three blocks evenly across a
              9:16 card left two dead bands the eye had to cross. The header sits
              at the top, everything transactional is pushed to the foot as one
              group, and the single open area between them is where the moodboard
              shows — the same place a video would have occupied. */}
          <div
            className={cn(
              "relative flex flex-1 flex-col p-6",
              isActive && "animate-fade-up",
            )}
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-bold text-white">
                    {campaign.brandName}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-white/50">
                    {campaign.description}
                  </p>
                </div>

                {/* The percentage is the tap target for its own justification —
                    that is where the question occurs to the reader. */}
                {/* Takes the campaign's accent. The card is already one brand's
                    territory, and a violet number floating inside it read as a
                    piece of another system rather than as this campaign's fit. */}
                <button
                  type="button"
                  onClick={() => setShowWhy(true)}
                  aria-label={t.feed.whyMatch}
                  className="flex shrink-0 flex-col items-center transition-opacity hover:opacity-80"
                >
                  <span
                    className="numeric text-[15px] font-bold"
                    style={{ color: campaign.accent }}
                  >
                    {campaign.matchPercent}%
                  </span>
                  <span className="label-caps flex items-center gap-0.5 text-[8px] text-white/40">
                    {t.feed.match}
                    <Icon name="expand_more" size={11} />
                  </span>
                </button>
              </div>

              <p className="mt-6 font-display text-[21px] font-bold leading-snug text-white">
                „{campaign.hook}”
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-white/50">
                {campaign.hookSubtitle}
              </p>
            </div>

            {/* The working behind the estimate, in the band where a video will
                never go — the card browses offers, not content, so what belongs
                in its open space is the reason the biggest number on it is
                believable. Both inputs are already on the card implicitly; this
                only stops them being implicit. */}
            <div className="mt-8">
              <p className="label-caps text-[9px] text-white/35">{t.feed.howEstimated}</p>

              <div className="mt-3 space-y-px overflow-hidden rounded-lg border border-white/[0.07]">
                <div className="flex items-baseline justify-between gap-3 bg-white/[0.03] px-3.5 py-3">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white/70">
                      {t.feed.yourAverage}
                    </p>
                    <p className="text-[10px] text-white/35">{t.feed.yourAverageNote}</p>
                  </div>
                  <p className="numeric shrink-0 text-[13px] font-semibold text-white/85">
                    {formatViews(viewsLow)} – {formatViews(viewsHigh)}
                  </p>
                </div>

                <div className="flex items-baseline justify-between gap-3 bg-white/[0.03] px-3.5 py-3">
                  <p className="text-[12px] font-semibold text-white/70">
                    {t.feed.campaignRate}
                  </p>
                  <p className="numeric shrink-0 text-[13px] font-semibold text-white/85">
                    {formatMoney(campaign.ratePerMilleMinor)}{" "}
                    <span className="font-normal text-white/40">{t.feed.perMilleShort}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6">
              <p className="label-caps text-[9px] text-white/45">{t.feed.youWouldEarn}</p>
              <p
                className="numeric mt-2 text-[44px] font-bold leading-[0.9]"
                style={{ color: campaign.accent }}
              >
                {formatMoney(earnedLow, { compactZeroCents: true })}
                <span className="mx-1.5 text-white/30">–</span>
                {formatMoney(earnedHigh, { compactZeroCents: true })}
              </p>
              <p className="mt-2 text-[12px] text-white/50">
                {t.feed.atYourAudience} ·{" "}
                <span className="numeric text-white/70">
                  {formatMoney(campaign.ratePerMilleMinor)}
                </span>{" "}
                {t.feed.perMille}
              </p>
            </div>

            <div className="mt-6">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[12px] text-white/50">
                  {t.feed.budgetLeft}{" "}
                  <span className="numeric text-white/85">
                    {formatMoney(budgetRemaining, { compactZeroCents: true })}
                  </span>
                </p>
                <p className="numeric text-[12px] text-white/60">
                  {t.feed.slotsLeft(campaign.slotsLeft)}
                </p>
              </div>

              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${budgetPercent}%`, backgroundColor: campaign.accent }}
                />
              </div>

              {isActive && (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-white/35">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-70" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
                  </span>
                  {t.feed.budgetLive}
                </p>
              )}

              <Link
                to="/campanii"
                className={cn(
                  "group mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3.5",
                  "font-body text-[14px] font-bold text-background transition-all",
                  "hover:brightness-[1.08] active:scale-[0.98]",
                )}
                // The glow is mixed from the same accent rather than a fixed
                // violet, so the button lights the card in the brand's colour
                // instead of dragging a second hue in under it.
                style={{
                  backgroundColor: campaign.accent,
                  boxShadow: `0 8px 30px -10px ${campaign.accent}`,
                }}
              >
                {t.feed.apply}
                <Icon
                  name="arrow_forward"
                  size={18}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </div>
          </div>

          {/* Why this campaign is here. Slides over the card rather than
              navigating away — the answer is context, not a destination.
       *
       * Opaque, not a scrim. At 92% with a 4px blur the card's own earnings
       * figure and apply button showed straight through the panel and collided
       * with its text, which read as a rendering fault rather than as a layer.
       * A sheet that covers has to actually cover.
       *
       * Laid out from the top with the percentage as its header: the panel is
       * the answer to a number the reader just pressed, so the number should be
       * the first thing on it. Bottom-anchoring it left the top half empty and
       * crushed everything into the corner the card was already busiest in. */}
          {showWhy && (
            <div className="absolute inset-0 z-20 flex animate-fade-up flex-col bg-surface-container-lowest p-6">
              <div className="flex items-baseline gap-2.5">
                <span
                  className="numeric text-[34px] font-bold leading-none"
                  style={{ color: campaign.accent }}
                >
                  {campaign.matchPercent}%
                </span>
                <span className="label-caps text-[10px]">{t.feed.match}</span>
              </div>

              <p className="label-caps mt-6 text-[10px]" style={{ color: campaign.accent }}>
                {t.feed.whyMatchTitle}
              </p>

              <ul className="mt-4 flex flex-col gap-3">
                {campaign.matchReasons.map((reason) => (
                  <li key={reason.text} className="flex items-start gap-2.5">
                    <Icon
                      name="check_circle"
                      size={17}
                      className="mt-0.5 shrink-0"
                      style={{ color: campaign.accent }}
                    />
                    <span className="text-[14px] leading-relaxed text-on-surface">
                      {reason.text}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 border-t border-white/10 pt-4 text-[12px] leading-5 text-on-surface-variant/70">
                {t.feed.whyMatchNote}
              </p>

              {/* Pushed to the foot so the close control sits where the thumb
                  already is, and the reasons keep their reading order. */}
              <button
                type="button"
                onClick={() => setShowWhy(false)}
                className="mt-auto w-full rounded-lg border border-white/15 py-3 font-body text-[13px] font-semibold text-on-surface transition-colors hover:bg-white/5"
              >
                {t.feed.close}
              </button>
            </div>
          )}
        </div>

        <div
          className={cn(
            "z-10 flex w-16 shrink-0 flex-col items-center gap-5",
            "absolute bottom-44 right-1 md:static md:bottom-auto md:right-auto md:gap-6 md:self-end md:pb-10",
          )}
        >
          {railActions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={action.onClick}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                action.highlight
                  ? "text-creator"
                  : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              <Icon name={action.icon} size={26} filled={action.filled} />
              <span className="label-caps text-center text-[9px] leading-tight">
                {action.label}
              </span>
            </button>
          ))}

          {!isLast && (
            <div
              className={cn(
                "mt-1 hidden flex-col items-center transition-opacity md:flex",
                isActive ? "animate-float opacity-30" : "opacity-0",
              )}
            >
              <Icon name="expand_more" size={22} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Counts an amount up once, when the card mounts.
 *
 * Tied to mount rather than to becoming the active slide, deliberately: every
 * card is in the DOM from the start, so they all settle on their real figure
 * immediately and only the first one is actually watched arriving. Re-running
 * it on activation would mean the number you just scrolled to snaps back to
 * zero and climbs again — and, worse, a half-scrolled card showing €0 for the
 * one figure the creator is reading the screen for.
 *
 * Stays in integer minor units the whole way: the eased fraction multiplies the
 * target and is rounded back to an integer every frame, so no fractional amount
 * ever exists (CLAUDE.md #1). Formatting happens at render, as always.
 */
function useCountUp(target: number): number {
  // The animation is a flourish; the number is the point. Where frames will not
  // arrive — a background tab pauses rAF entirely — or the reader asked for less
  // motion, start at the real figure instead of animating from zero to it.
  const [value, setValue] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden ? target : 0,
  );

  useEffect(() => {
    if (value === target) return;

    let frame = 0;
    const start = performance.now();
    const duration = 650;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // Runs once per card: `target` is fixture data and does not change, and
    // re-running on `value` would restart the animation on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

/**
 * The campaign budget being consumed while the creator looks at it.
 *
 * SIMULATED. On the real feed this is a subscription to the campaign's spend,
 * which moves when other creators' views are validated. It is deliberately slow
 * — tens of bani at a time — because the honest version of this number does not
 * lurch, and a counter that visibly races would be a claim we cannot support.
 *
 * TODO(api): replace with the campaign budget stream once payouts are wired;
 * the component already treats the value as arriving from outside.
 */
function useDrainingBudget(initial: number, active: boolean): number {
  const [remaining, setRemaining] = useState(initial);

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setRemaining((current) => Math.max(0, current - (Math.floor(Math.random() * 40) + 10)));
    }, 2600);
    return () => window.clearInterval(id);
  }, [active]);

  return remaining;
}
