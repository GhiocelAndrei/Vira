import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/cn";
import { t } from "@vira/core";
import { formatMoney, formatViews } from "@vira/core";
import { useCreatorCampaigns, useCreatorProfile } from "../../lib/queries";
import { estimateEarnings, presentationFor, rateForObjective } from "../../lib/feed";
import type { FeedCampaignDto } from "../../lib/types";
import { useFeedPreferences } from "../../lib/feedPreferences";

/**
 * Creator home — a vertical, one-per-screen feed of the real Active campaigns brands have opened.
 *
 * The card takes its life from data that moves: the money the creator would personally make
 * (estimated from the objective's rate × their own average views) and the campaign's budget. Brand
 * imagery doesn't exist yet, so each card's atmosphere is themed off its objective; the match % and
 * "why it matches" come from the (currently stub) matcher — 100% for everything, no reasons — and
 * light up for real once the matching engine lands.
 *
 * Colour: one accent per card, from the objective — the earnings figure, budget bar and button.
 * The match % and the "why" panel stay violet, because a match / AI output belongs to neither side.
 */

/** Card view-model derived from a real campaign + objective theming + an earnings estimate. */
interface FeedCard {
  id: string;
  brandName: string;
  description: string;
  hook: string;
  hookSubtitle: string;
  matchPercent: number;
  matchReasons: string[];
  ratePerMilleMinor: number;
  estimatedMinMinor: number;
  estimatedMaxMinor: number;
  budgetMinor: number;
  /** The creator's real average, straight from their profile aggregates. */
  avgViews: number;
  accent: string;
  mood: { palette: string[]; motifs: string[] };
}

function toCard(d: FeedCampaignDto, avgViews: number): FeedCard {
  const rate = rateForObjective(d.objective);
  const earnings = estimateEarnings(rate, avgViews);
  const look = presentationFor(d.objective);
  const tags = [d.mention, ...d.hashtags].filter((x): x is string => Boolean(x));
  return {
    id: d.id,
    brandName: d.brandName,
    description: d.title,
    hook: d.message || d.title,
    hookSubtitle: tags.join("  "),
    matchPercent: Math.round(d.matchPercent),
    matchReasons: d.matchReasons,
    ratePerMilleMinor: rate,
    estimatedMinMinor: earnings.minMinor,
    estimatedMaxMinor: earnings.maxMinor,
    budgetMinor: d.budgetMinor,
    avgViews,
    accent: look.accent,
    mood: { palette: look.palette, motifs: look.motifs },
  };
}

type FeedTab = "all" | "forYou";

const feedTabs: { id: FeedTab; label: string }[] = [
  { id: "all", label: t.feed.tabAll },
  { id: "forYou", label: t.feed.tabForYou },
];

export default function FeedPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: dtos } = useCreatorCampaigns();
  const { data: profile } = useCreatorProfile();
  const avgViews = profile?.aggregates.avgViews ?? 0;

  const dismissed = useFeedPreferences((state) => state.dismissed);
  const dismiss = useFeedPreferences((state) => state.dismiss);
  const restore = useFeedPreferences((state) => state.restore);
  const restoreAll = useFeedPreferences((state) => state.restoreAll);

  const [tab, setTab] = useState<FeedTab>("forYou");
  const [undoFor, setUndoFor] = useState<FeedCard | null>(null);

  const cards = (dtos ?? []).map((d) => toCard(d, avgViews));
  const available = cards.filter((campaign) => !dismissed.includes(campaign.id));

  // "Pentru tine" leads with the closest fit; "Campanii" is everything in order. With the stub
  // matcher every score is 100, so the sort is a no-op until the real matcher lands.
  const campaigns =
    tab === "forYou" ? [...available].sort((a, b) => b.matchPercent - a.matchPercent) : available;

  const loading = dtos === undefined;

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
  }, [campaigns.length, tab]);

  useEffect(() => {
    if (!undoFor) return;
    const id = window.setTimeout(() => setUndoFor(null), 6000);
    return () => window.clearTimeout(id);
  }, [undoFor]);

  function onDismiss(campaign: FeedCard) {
    dismiss(campaign.id);
    setUndoFor(campaign);
    setActiveIndex(0);
  }

  function onUndo() {
    if (!undoFor) return;
    restore(undoFor.id);
    setUndoFor(null);
  }

  const active = campaigns[Math.min(activeIndex, campaigns.length - 1)];

  return (
    <div className="relative">
      {active && <MoodBackdrop campaigns={campaigns} activeId={active.id} />}

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
                "pressable rounded-full px-4 py-1.5 font-display text-[13px] font-semibold transition-colors",
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

      {loading ? (
        <div className="relative z-10 flex h-dvh items-center justify-center text-[14px] text-on-surface-variant">
          {t.feed.loading}
        </div>
      ) : campaigns.length === 0 ? (
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
          <div className="pointer-events-auto flex max-w-md animate-fade-up items-center gap-4 rounded-lg border border-white/10 bg-surface-container-high px-4 py-3 shadow-creator-glow">
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

/** Fixed scatter for the backdrop motifs (hand-placed so a campaign looks identical each time). */
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

const washPlacement = [
  { top: "-10%", left: "-8%", size: 58, opacity: 0.3 },
  { top: "38%", left: "68%", size: 52, opacity: 0.26 },
  { top: "72%", left: "12%", size: 46, opacity: 0.2 },
];

const moodVariants = {
  backdrop: { unit: "vw", motifScale: 1, intensity: 1, blur: 110, scrim: "bg-background/55" },
  card: { unit: "%", motifScale: 0.42, intensity: 1.9, blur: 52, scrim: "bg-background/60" },
} as const;

type MoodVariant = keyof typeof moodVariants;

/** One campaign's atmosphere: palette as soft washes, objective motifs as oversized faint glyphs. */
function CampaignMoodLayer({ campaign, variant }: { campaign: FeedCard; variant: MoodVariant }) {
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

      <div className={cn("absolute inset-0", spec.scrim)} />
    </>
  );
}

/**
 * The moodboard behind the card. DEMO SCAFFOLDING: a 9:16 card leaves the desktop viewport mostly
 * empty and there's no brand photography yet, so each campaign brings its objective-themed
 * atmosphere and the backdrop crossfades as you scroll. Replace with real brand imagery later.
 */
function MoodBackdrop({ campaigns, activeId }: { campaigns: FeedCard[]; activeId: string }) {
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
        className="pressable mt-6 rounded border border-creator/50 px-4 py-2.5 font-body text-[13px] font-semibold text-creator transition-colors hover:bg-creator/10"
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
  campaign: FeedCard;
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

          <div className={cn("relative flex flex-1 flex-col p-6", isActive && "animate-fade-up")}>
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-bold text-white">{campaign.brandName}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-white/50">{campaign.description}</p>
                </div>

                {/* The percentage is the tap target for its own justification —
                    that is where the question occurs to the reader. */}
                {/* Violet, not the campaign accent: a match is a creator measured
                    against a campaign, so it belongs to neither side alone. */}
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
              {campaign.hookSubtitle && (
                <p className="mt-1.5 text-[13px] leading-snug text-white/50">{campaign.hookSubtitle}</p>
              )}
            </div>

            {/* The working behind the estimate, in the band where a video will
                never go — the card browses offers, not content, so what belongs
                in its open space is the reason the biggest number on it is
                believable. Both inputs are measured, not assumed: the average
                comes from the creator's profile and the rate from the
                campaign's objective. */}
            {campaign.avgViews > 0 && (
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
                      {formatViews(campaign.avgViews)}
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
            )}

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
                <span className="numeric text-white/70">{formatMoney(campaign.ratePerMilleMinor)}</span>{" "}
                {t.feed.perMille}
              </p>
            </div>

            <div className="mt-6">
              <p className="text-[12px] text-white/50">
                {t.feed.budgetLeft}{" "}
                <span className="numeric text-white/85">
                  {formatMoney(campaign.budgetMinor, { compactZeroCents: true })}
                </span>
              </p>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full w-full rounded-full"
                  style={{ backgroundColor: campaign.accent }}
                />
              </div>

              <Link
                to={`/campanii/${campaign.id}`}
                className={cn(
                  "group mt-4 flex w-full items-center justify-center gap-2 rounded-lg py-3.5",
                  "font-body text-[14px] font-bold text-background",
                  "transition-[filter,transform] duration-150 ease-out",
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
       *    navigating away — the answer is context, not a destination.
       *
       * Opaque, not a scrim. At 92% with a 4px blur the card's own earnings
       * figure and apply button showed straight through the panel and collided
       * with its text, which read as a rendering fault rather than as a layer.
       * A sheet that covers has to actually cover.
       *
       * Laid out from the top with the percentage as its header: the panel is
       * the answer to a number the reader just pressed, so the number should be
       * the first thing on it. */}
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

              {campaign.matchReasons.length > 0 ? (
                <>
                  <ul className="mt-4 flex flex-col gap-3">
                    {campaign.matchReasons.map((reason) => (
                      <li key={reason} className="flex items-start gap-2.5">
                        <Icon
                          name="check_circle"
                          size={17}
                          className="mt-0.5 shrink-0"
                          style={{ color: campaign.accent }}
                        />
                        <span className="text-[14px] leading-relaxed text-on-surface">{reason}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 border-t border-white/10 pt-4 text-[12px] leading-5 text-on-surface-variant/70">
                    {t.feed.whyMatchNote}
                  </p>
                </>
              ) : (
                <p className="mt-4 text-[14px] leading-relaxed text-on-surface-variant">
                  {t.feed.whyMatchPending}
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowWhy(false)}
                className="pressable mt-auto w-full rounded-lg border border-white/15 py-3 font-body text-[13px] font-semibold text-on-surface transition-colors hover:bg-white/5"
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
              <span className="label-caps text-center text-[9px] leading-tight">{action.label}</span>
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
 * Counts an amount up once, on mount. Integer minor units throughout (CLAUDE.md #1); formatting at
 * render. Starts at the target under reduced-motion or a hidden tab.
 */
function useCountUp(target: number): number {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}
