import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { AreaChart } from "./ui";
import { cn } from "../lib/cn";
import { t, formatMoney, formatViews } from "@vira/core";
import { earnings, landingShowcase as show } from "@vira/core";

/**
 * The product, on the landing page.
 *
 * Three views of one campaign: the creator choosing it, the business approving
 * the clip, the business watching the result. All three read from a single
 * fixture — before that they each grabbed whatever was nearest, so a Lumina Tech
 * offer sat beside a coffee-kit submission beside a shaorma dashboard, and three
 * businesses narrating one transaction quietly told the reader these were props.
 *
 * Painted in the landing's violet and blue rather than each campaign's accent.
 * In the app the accent is the point — it keeps one business from looking like
 * the next. Here there is one campaign and nothing to be distinguished from, so
 * a stray hue would read as an escapee rather than as brand identity.
 */

/** Shared shell: fills its grid cell so the three cards end level. */
function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("surface-lit flex flex-col overflow-hidden rounded-2xl p-5", className)}>
      {children}
    </div>
  );
}

/** 1 — the creator, deciding, in the campaign marketplace. */
export function CreatorViewPreview({ className }: { className?: string }) {
  return (
    <Panel className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-creator/20 bg-creator/10">
            <span className="font-display text-[12px] font-bold text-creator">
              {show.brandInitials.charAt(0)}
            </span>
          </span>
          <div className="min-w-0">
            <p className="label-caps text-[8px]">{show.brandName}</p>
            <p className="truncate font-display text-[16px] font-bold leading-snug text-on-surface">
              {show.campaignTitle}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-[10px] font-semibold text-mint">
          {t.campaigns.strongMatch}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {show.requirements.map((requirement) => (
          <span
            key={requirement}
            className="rounded border border-white/[0.07] bg-white/[0.03] px-2 py-1 text-[10px] text-on-surface-variant"
          >
            {requirement}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
        <div>
          <p className="label-caps text-[8px]">{t.campaigns.payoutRate}</p>
          <p className="numeric mt-1 text-[15px] font-bold text-creator">
            {formatMoney(show.ratePerMilleMinor)}
            <span className="ml-1 text-[10px] font-normal text-on-surface-variant/50">/ 1.000</span>
          </p>
        </div>
        <div>
          <p className="label-caps text-[8px]">{t.campaigns.estimatedEarnings}</p>
          <p className="numeric mt-1 text-[15px] font-bold text-on-surface">
            {formatMoney(show.estimatedEarningsMinMinor, { compactZeroCents: true })} –{" "}
            {formatMoney(show.estimatedEarningsMaxMinor, { compactZeroCents: true })}
          </p>
        </div>
      </div>

      {/* A match never travels alone: every reason cites something observable in
          the creator's own posting history (CLAUDE.md #7). */}
      <p className="label-caps mt-4 text-[8px]">{t.campaigns.whyItMatches}</p>
      <ul className="mt-2.5 flex flex-col gap-2">
        {show.matchReasons.map((reason) => (
          <li key={reason} className="flex items-start gap-2">
            <Icon name="check_circle" size={14} className="mt-px shrink-0 text-mint" />
            <span className="text-[12px] leading-snug text-on-surface-variant">{reason}</span>
          </li>
        ))}
      </ul>

      <div className="mt-auto flex items-end justify-between gap-3 pt-5">
        <div className="flex gap-6">
          <div>
            <p className="label-caps text-[8px]">{t.campaigns.deadline}</p>
            <p className="numeric mt-1 text-[12px] text-on-surface">{show.deadline}</p>
          </div>
          <div>
            <p className="label-caps text-[8px]">{t.campaigns.availability}</p>
            <p className="numeric mt-1 text-[12px] text-on-surface">{show.slotsLeft}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-primary px-4 py-2.5 font-body text-[12px] font-bold text-on-primary">
          {t.campaigns.apply}
        </span>
      </div>
    </Panel>
  );
}

/** 2 — the business, deciding whether a stranger may post with its name on it. */
export function BrandViewPreview({ className }: { className?: string }) {
  const checks = [
    { label: "Hashtag-uri obligatorii", detail: "#LuminaTech găsit" },
    { label: "Cont menționat", detail: "@luminatech găsit" },
    { label: "Durata clipului", detail: `${show.durationSeconds} sec, în intervalul 15–60` },
    { label: "Produsul vizibil", detail: "Detectat în 4 cadre" },
    { label: "Conținut restricționat", detail: "Nimic detectat" },
  ];

  return (
    <Panel className={className}>
      <div className="flex items-start gap-3">
        <span
          className="h-14 w-11 shrink-0 rounded-lg"
          style={{
            background: `linear-gradient(160deg, ${show.clipGradient[0]}, ${show.clipGradient[1]})`,
          }}
        />
        <div className="min-w-0">
          <p className="font-display text-[14px] font-bold text-on-surface">{show.creatorName}</p>
          <p className="numeric text-[11px] text-on-surface-variant/70">
            {show.creatorHandle} · {formatViews(show.creatorFollowers)} {t.approvals.followers}
          </p>
          <p className="mt-1.5 truncate text-[11px] text-on-surface-variant/60">
            {show.campaignTitle} · {show.submittedAt}
          </p>
        </div>
      </div>

      <p className="label-caps mt-4 text-[8px]">{t.approvals.checksTitle}</p>
      <div className="mt-2.5 flex flex-col gap-2">
        {checks.map((check) => (
          <div key={check.label} className="flex items-center gap-2.5">
            <Icon name="check_circle" size={14} className="shrink-0 text-mint" />
            <span className="min-w-0 flex-1 truncate text-[12px] text-on-surface">
              {check.label}
            </span>
            <span className="shrink-0 text-[11px] text-on-surface-variant/50">
              {t.approvals.checkStatus.pass}
            </span>
          </div>
        ))}
      </div>

      {/* The posture of the whole product, in one line. */}
      <p className="mt-4 border-t border-white/[0.07] pt-3 text-[11px] leading-relaxed text-on-surface-variant/60">
        {t.approvals.checksNote}
      </p>

      <div className="mt-auto flex gap-2 pt-4">
        <div className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 font-body text-[12px] font-bold text-on-primary">
          <Icon name="check" size={14} />
          {t.approvals.approve}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 px-3.5 py-2.5 font-body text-[12px] font-semibold text-on-surface-variant">
          <Icon name="block" size={14} />
          {t.approvals.reject}
        </div>
      </div>
    </Panel>
  );
}

/** 3 — the same campaign while it runs. */
export function BrandAnalyticsPreview({ className }: { className?: string }) {
  const budgetPercent = Math.round((show.spentMinor / show.budgetMinor) * 100);

  return (
    <Panel className={className}>
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-business/20 bg-business/10">
          <span className="font-display text-[12px] font-bold text-business">
            {show.brandInitials}
          </span>
        </span>
        <div className="min-w-0">
          <p className="label-caps text-[8px]">{show.brandName}</p>
          <p className="truncate font-display text-[14px] font-bold text-on-surface">
            {show.campaignTitle}
          </p>
        </div>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-on-surface-variant/70">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mint opacity-70" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-mint" />
          </span>
          {t.feed.budgetLive}
        </span>
      </div>

      <p className="label-caps mt-5 text-[8px]">{t.brand.totalViews}</p>
      <p className="numeric mt-1 text-[30px] font-bold leading-none text-on-surface">
        {formatViews(show.views)}
      </p>

      <div className="mt-4">
        <AreaChart points={earnings.timeline} className="h-16" />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
        <div>
          <p className="label-caps text-[8px]">{t.brand.budgetUsed}</p>
          <p className="numeric mt-1 text-[13px] font-semibold text-on-surface">
            {formatMoney(show.spentMinor, { compactZeroCents: true })}
            <span className="text-on-surface-variant/50">
              {" "}
              / {formatMoney(show.budgetMinor, { compactZeroCents: true })}
            </span>
          </p>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
            <div
              className="h-full rounded-full bg-business"
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
        </div>
        <div>
          <p className="label-caps text-[8px]">{t.brand.effectiveCpm}</p>
          <p className="numeric mt-1 text-[13px] font-semibold text-business">
            {formatMoney(show.ratePerMilleMinor)}
          </p>
        </div>
      </div>
    </Panel>
  );
}
