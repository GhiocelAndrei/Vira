import { AreaChart, Button, Card, CardHeader, Chip, PageHeader } from "../../components/ui";
import { cn } from "../../lib/cn";
import { t } from "@vira/core";
import { formatMoney, formatViews } from "@vira/core";
import { earnings, type PayoutStatus } from "@vira/core";

const statusTone: Record<PayoutStatus, "mint" | "primary" | "neutral" | "amber"> = {
  paid: "mint",
  scheduledDay7: "primary",
  scheduledDay14: "primary",
  reserved: "neutral",
  underReview: "amber",
};

/**
 * The month's total, split into the three states money can be in. Order is the
 * journey a euro takes: measured but not yet settled, held back, then yours.
 */
const buckets = [
  {
    key: "pending",
    label: t.earnings.pendingValidation,
    amountMinor: earnings.pendingValidationMinor,
    note: t.earnings.pendingNote,
    bar: "bg-amber/70",
    emphasis: false,
  },
  {
    key: "reserve",
    label: t.earnings.reserve,
    amountMinor: earnings.reserveMinor,
    note: t.earnings.reserveNote(earnings.reserveReleaseDate),
    bar: "bg-white/20",
    emphasis: false,
  },
  {
    key: "available",
    label: t.earnings.available,
    amountMinor: earnings.availableMinor,
    note: t.earnings.availableNote,
    bar: "bg-primary",
    emphasis: true,
  },
] as const;

/**
 * A bucket's share of the month, in basis points.
 *
 * Integer the whole way: the division happens once, against 10.000 rather than
 * 100, and the only float in the chain is the CSS length built from the result.
 * No money value is ever derived from it (CLAUDE.md #1) — it is a bar width.
 */
function basisPoints(amountMinor: number): number {
  const total = earnings.thisMonthMinor;
  return total > 0 ? Math.round((amountMinor * 10_000) / total) : 0;
}

/**
 * Earnings. The hero number is the month's total; everything else exists to
 * explain why the payable figure differs from it — the 72h settling window and
 * the 20% reserve are stated on screen rather than discovered in a dispute.
 */
export default function EarningsPage() {
  return (
    <div className="mx-auto max-w-container px-6 py-10 md:px-12">
      <PageHeader
        title={t.earnings.title}
        action={
          <Button icon="account_balance" variant="primary">
            {t.earnings.withdraw}
          </Button>
        }
      />

      {/* One number, then the same number taken apart.
       *
       * This used to be a hero card followed by three equal cards, and the
       * three were the problem: they read as peers of the total rather than as
       * parts of it, so nothing on the screen said that they add up to it —
       * which is the entire question a creator has here. As a bar they cannot
       * help but say it, and a 1.400-bani gap in the fixtures that nobody had
       * noticed became obvious the moment they were drawn end to end. */}
      <Card className="mt-8 p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="label-caps">{t.earnings.thisMonth}</p>
            <p className="numeric mt-2 text-[56px] font-bold leading-[0.9] text-primary md:text-[80px]">
              {formatMoney(earnings.thisMonthMinor)}
            </p>
          </div>
          <Chip tone="mint" icon="trending_up">
            +{earnings.trendPercent.toLocaleString("ro-RO")}% {t.common.vsLastMonth}
          </Chip>
        </div>

        <p className="label-caps mt-10">{t.earnings.breakdown}</p>

        <div className="mt-3 flex h-2.5 w-full gap-1 overflow-hidden rounded-full">
          {buckets.map((bucket) => (
            <div
              key={bucket.key}
              className={cn("h-full rounded-full", bucket.bar)}
              style={{ width: `${basisPoints(bucket.amountMinor) / 100}%` }}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {buckets.map((bucket) => (
            <div key={bucket.key} className="flex gap-3">
              <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", bucket.bar)} />
              <div className="min-w-0">
                <p className="label-caps">{bucket.label}</p>
                <p
                  className={cn(
                    "numeric mt-1 text-[26px] font-semibold leading-none",
                    bucket.emphasis ? "text-primary" : "text-on-surface",
                  )}
                >
                  {formatMoney(bucket.amountMinor)}
                </p>
                <p className="mt-2 text-[12px] leading-relaxed text-on-surface-variant/70">
                  {bucket.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Timeline */}
      <Card className="mt-6">
        <CardHeader title={t.earnings.timeline} />
        <div className="px-6 pb-6 pt-4">
          <AreaChart points={earnings.timeline} />
        </div>
      </Card>

      {/* Payout rows */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader title={t.earnings.recentCampaigns} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="border-b border-white/5">
                <th className="label-caps px-6 py-3 text-left font-semibold">
                  {t.earnings.table.campaign}
                </th>
                <th className="label-caps px-6 py-3 text-right font-semibold">
                  {t.earnings.table.views}
                </th>
                <th className="label-caps px-6 py-3 text-right font-semibold">
                  {t.earnings.table.amount}
                </th>
                <th className="label-caps px-6 py-3 text-right font-semibold">
                  {t.earnings.table.status}
                </th>
              </tr>
            </thead>
            <tbody>
              {earnings.rows.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.03] last:border-0">
                  <td className="px-6 py-4">
                    <p className="font-body text-[14px] font-semibold text-on-surface">
                      {row.campaignName}
                    </p>
                    <p className="text-[12px] text-on-surface-variant">{row.brandName}</p>
                  </td>
                  <td className="numeric px-6 py-4 text-right text-[14px] text-on-surface-variant">
                    {formatViews(row.validatedViews)}
                  </td>
                  <td className="numeric px-6 py-4 text-right text-[15px] font-semibold text-on-surface">
                    {formatMoney(row.amountMinor)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Chip tone={statusTone[row.status]}>{t.earnings.status[row.status]}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
