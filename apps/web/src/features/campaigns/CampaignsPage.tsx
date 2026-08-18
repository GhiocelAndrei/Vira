import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Button, Card, Chip, PageHeader } from "../../components/ui";
import { cn } from "../../lib/cn";
import { t } from "@vira/core";
import { formatMoney } from "@vira/core";
import { useApplication } from "../../lib/applications";
import { useCreatorCampaigns, useCreatorProfile } from "../../lib/queries";
import { estimateEarnings, presentationFor, rateForObjective } from "../../lib/feed";
import type { CreatorCategory, FeedCampaignDto } from "../../lib/types";

/**
 * Campaign marketplace — the real Active campaigns. Match strength is *information*, never a gate;
 * the only hard gate is the follower threshold on product-placement campaigns (`locked`), where the
 * creator has to buy the product themselves.
 *
 * The three toolbar controls filter/sort the list client-side over the loaded set:
 *  - Nișă   → filter by the campaign's vertical (category)
 *  - Plată  → sort by the per-1k payout rate
 *  - Termen → sort by the campaign deadline
 */
interface MarketCard {
  id: string;
  brandName: string;
  title: string;
  category: CreatorCategory | null;
  deadlineDays: number | null;
  requirements: string[];
  accent: string;
  ratePerMilleMinor: number;
  estMinMinor: number;
  estMaxMinor: number;
  strongMatch: boolean;
  matchReasons: string[];
  locked: boolean;
  minFollowerThreshold: number;
}

/** Whole days from now until the deadline (0 = last day, null = open-ended). */
function daysUntil(deadline?: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

function toCard(d: FeedCampaignDto, avgViews: number): MarketCard {
  const rate = rateForObjective(d.objective);
  const earnings = estimateEarnings(rate, avgViews);
  const requirements = [...d.requirements, ...d.hashtags, d.mention ?? "", d.durationPreset].filter(
    (x): x is string => Boolean(x),
  );
  return {
    id: d.id,
    brandName: d.brandName,
    title: d.title,
    category: d.category ?? null,
    deadlineDays: daysUntil(d.deadline),
    requirements,
    accent: presentationFor(d.objective).accent,
    ratePerMilleMinor: rate,
    estMinMinor: earnings.minMinor,
    estMaxMinor: earnings.maxMinor,
    strongMatch: d.matchPercent >= 80,
    matchReasons: d.matchReasons,
    locked: d.locked,
    minFollowerThreshold: d.minFollowerThreshold,
  };
}

type SortMode = "match" | "payoutDesc" | "payoutAsc" | "deadlineSoon" | "deadlineFar";

/** Deadline comparator; open-ended (null) campaigns always sort to the end. */
function byDeadline(a: MarketCard, b: MarketCard, asc: boolean): number {
  if (a.deadlineDays === null && b.deadlineDays === null) return 0;
  if (a.deadlineDays === null) return 1;
  if (b.deadlineDays === null) return -1;
  return asc ? a.deadlineDays - b.deadlineDays : b.deadlineDays - a.deadlineDays;
}

export default function CampaignsPage() {
  const { data: dtos } = useCreatorCampaigns();
  const { data: profile } = useCreatorProfile();
  const avgViews = profile?.aggregates.avgViews ?? 0;
  const followerCount = profile?.followerCount ?? 0;

  const [category, setCategory] = useState<CreatorCategory | null>(null);
  const [sort, setSort] = useState<SortMode>("match");

  const cards = (dtos ?? []).map((d) => toCard(d, avgViews));
  const loading = dtos === undefined;

  // Categories actually present in the loaded set — no dead filter options.
  const presentCategories = [
    ...new Set(cards.map((c) => c.category).filter((c): c is CreatorCategory => c !== null)),
  ];

  let visible = category ? cards.filter((c) => c.category === category) : cards;
  visible = [...visible];
  switch (sort) {
    case "payoutDesc":
      visible.sort((a, b) => b.ratePerMilleMinor - a.ratePerMilleMinor);
      break;
    case "payoutAsc":
      visible.sort((a, b) => a.ratePerMilleMinor - b.ratePerMilleMinor);
      break;
    case "deadlineSoon":
      visible.sort((a, b) => byDeadline(a, b, true));
      break;
    case "deadlineFar":
      visible.sort((a, b) => byDeadline(a, b, false));
      break;
    default:
      break; // "match" — keep the server order (match desc, then newest)
  }

  const filtersActive = category !== null || sort !== "match";

  const nicheOptions: FilterOption<CreatorCategory | null>[] = [
    { value: null, label: t.campaigns.nicheAll },
    ...presentCategories.map((c) => ({ value: c, label: t.brandOnboarding.categories[c] })),
  ];
  const payoutOptions: FilterOption<SortMode>[] = [
    { value: "match", label: t.campaigns.filterAll },
    { value: "payoutDesc", label: t.campaigns.sortPayoutDesc },
    { value: "payoutAsc", label: t.campaigns.sortPayoutAsc },
  ];
  const deadlineOptions: FilterOption<SortMode>[] = [
    { value: "match", label: t.campaigns.filterAll },
    { value: "deadlineSoon", label: t.campaigns.sortDeadlineSoon },
    { value: "deadlineFar", label: t.campaigns.sortDeadlineFar },
  ];

  const payoutActive = sort === "payoutDesc" || sort === "payoutAsc";
  const deadlineActive = sort === "deadlineSoon" || sort === "deadlineFar";

  return (
    <div className="mx-auto max-w-container px-6 py-10 md:px-12">
      <PageHeader title={t.campaigns.title} subtitle={t.campaigns.subtitle} />

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <FilterMenu
          label={t.campaigns.filters.niche}
          activeLabel={category ? t.brandOnboarding.categories[category] : null}
          options={nicheOptions}
          selected={category}
          onSelect={setCategory}
        />
        <FilterMenu
          label={t.campaigns.filters.payout}
          activeLabel={payoutActive ? payoutOptions.find((o) => o.value === sort)?.label ?? null : null}
          options={payoutOptions}
          selected={payoutActive ? sort : "match"}
          onSelect={setSort}
        />
        <FilterMenu
          label={t.campaigns.filters.deadline}
          activeLabel={
            deadlineActive ? deadlineOptions.find((o) => o.value === sort)?.label ?? null : null
          }
          options={deadlineOptions}
          selected={deadlineActive ? sort : "match"}
          onSelect={setSort}
        />

        {filtersActive && (
          <button
            type="button"
            onClick={() => {
              setCategory(null);
              setSort("match");
            }}
            className="inline-flex items-center gap-1 text-[13px] text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name="close" size={14} />
            {t.campaigns.clearFilters}
          </button>
        )}

        <span className="ml-auto text-[13px] text-on-surface-variant">
          {t.campaigns.available(visible.length)}
        </span>
      </div>

      {loading ? (
        <p className="mt-10 text-center text-[14px] text-on-surface-variant">{t.feed.loading}</p>
      ) : visible.length === 0 ? (
        <p className="mt-10 text-center text-[14px] text-on-surface-variant">
          {filtersActive ? t.campaigns.noResults : t.feed.emptyText}
        </p>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {visible.map((campaign) => (
            <CampaignCard key={campaign.id} campaign={campaign} followerCount={followerCount} />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

interface FilterOption<T> {
  value: T;
  label: string;
}

function FilterMenu<T>({
  label,
  activeLabel,
  options,
  selected,
  onSelect,
}: {
  label: string;
  activeLabel: string | null;
  options: FilterOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = activeLabel !== null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded border px-3 py-2 font-body text-[13px] transition-colors",
          active
            ? "border-primary/40 bg-primary/10 text-primary"
            : "border-white/5 bg-white/5 text-on-surface-variant hover:border-white/15 hover:text-on-surface",
        )}
      >
        {activeLabel ?? label}
        <Icon name="expand_more" size={16} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          {/* click-away catcher */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 z-20 mt-2 min-w-[220px] rounded-md border border-white/10 bg-surface-container p-1 shadow-lg">
            {options.map((option) => {
              const isSelected = option.value === selected;
              return (
                <button
                  key={String(option.value)}
                  type="button"
                  onClick={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left font-body text-[13px] transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
                  )}
                >
                  {option.label}
                  {isSelected && <Icon name="check" size={16} />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function CampaignCard({ campaign, followerCount }: { campaign: MarketCard; followerCount: number }) {
  const navigate = useNavigate();
  const [reasonsOpen, setReasonsOpen] = useState(false);
  const application = useApplication(campaign.id);
  const locked = campaign.locked;

  return (
    <Card className={cn("flex flex-col p-6", locked && "opacity-70")}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
            style={{ backgroundColor: `${campaign.accent}1a`, border: `1px solid ${campaign.accent}33` }}
          >
            <span className="font-display text-[15px] font-bold" style={{ color: campaign.accent }}>
              {campaign.brandName.charAt(0)}
            </span>
          </div>
          <div>
            <p className="label-caps text-[10px]">{campaign.brandName}</p>
            <h3 className="font-display text-[20px] font-semibold text-on-surface">{campaign.title}</h3>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {locked ? (
            <Chip tone="neutral" icon="lock">
              Blocată
            </Chip>
          ) : (
            <Chip tone={campaign.strongMatch ? "mint" : "creator"} icon="check_circle">
              {campaign.strongMatch ? t.campaigns.strongMatch : t.campaigns.worthTrying}
            </Chip>
          )}
          {application && (
            <Chip
              tone={application.status === "draftSubmitted" ? "amber" : "mint"}
              icon={application.status === "draftSubmitted" ? "pending" : "task_alt"}
            >
              {application.status === "draftSubmitted"
                ? t.apply.cardDraftSent
                : t.apply.cardApplied}
            </Chip>
          )}
        </div>
      </div>

      {/* Nișă + Termen meta — the two dimensions the toolbar filters/sorts by. */}
      {(campaign.category || campaign.deadlineDays !== null) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-on-surface-variant">
          {campaign.category && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-semibold">
              <Icon name="sell" size={13} />
              {t.brandOnboarding.categories[campaign.category]}
            </span>
          )}
          {campaign.deadlineDays !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                campaign.deadlineDays <= 7 ? "text-amber" : "text-on-surface-variant/70",
              )}
            >
              <Icon name="schedule" size={13} />
              {t.campaigns.deadlineLeft(campaign.deadlineDays)}
            </span>
          )}
        </div>
      )}

      {campaign.requirements.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {campaign.requirements.map((requirement) => (
            <span
              key={requirement}
              className="rounded-full border border-white/5 bg-white/5 px-2.5 py-1 font-body text-[11px] text-on-surface-variant"
            >
              {requirement}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 gap-4 rounded-md border border-white/5 bg-surface-container-lowest/60 p-4">
        <div>
          <p className="label-caps text-[10px]">{t.campaigns.payoutRate}</p>
          <p className="numeric mt-1 text-[18px] font-semibold text-creator">
            {formatMoney(campaign.ratePerMilleMinor)}
            <span className="ml-1 font-body text-[11px] font-normal text-on-surface-variant">
              / 1.000
            </span>
          </p>
        </div>
        <div>
          <p className="label-caps text-[10px]">{t.campaigns.estimatedEarnings}</p>
          <p className="numeric mt-1 text-[18px] font-semibold text-on-surface">
            {formatMoney(campaign.estMinMinor, { compactZeroCents: true })} –{" "}
            {formatMoney(campaign.estMaxMinor, { compactZeroCents: true })}
          </p>
        </div>
      </div>

      {locked ? (
        <div className="mt-5 rounded-md border border-amber/20 bg-amber/5 p-4">
          <p className="flex items-center gap-2 font-body text-[13px] font-semibold text-amber">
            <Icon name="lock" size={16} />
            {t.campaigns.lockedFollowers(campaign.minFollowerThreshold.toLocaleString("ro-RO"))}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-on-surface-variant">
            {t.campaigns.productPlacementNote}
          </p>
          <p className="mt-2 text-[11px] text-on-surface-variant/60">
            Ai {followerCount.toLocaleString("ro-RO")} urmăritori.
          </p>
        </div>
      ) : (
        campaign.matchReasons.length > 0 && (
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setReasonsOpen((open) => !open)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="label-caps text-[10px]">{t.campaigns.whyItMatches}</span>
              <Icon
                name="keyboard_arrow_down"
                size={18}
                className={cn(
                  "text-on-surface-variant transition-transform",
                  reasonsOpen && "rotate-180",
                )}
              />
            </button>
            {reasonsOpen && (
              <ul className="mt-3 flex animate-fade-up flex-col gap-2">
                {campaign.matchReasons.map((reason) => (
                  <li key={reason} className="flex items-start gap-2 text-[13px] text-on-surface-variant">
                    <Icon name="check_circle" size={16} className="mt-0.5 shrink-0 text-mint" />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      )}

      <div className="mt-6 flex items-center justify-end border-t border-white/5 pt-5">
        <Button
          variant={locked ? "subtle" : application ? "subtle" : "creator"}
          disabled={locked}
          onClick={() => navigate(`/campanii/${campaign.id}`)}
        >
          {application ? t.apply.viewApplication : t.campaigns.apply}
        </Button>
      </div>
    </Card>
  );
}
