import { useState } from "react";
import { Icon } from "../../components/Icon";
import { Button, Card, Chip, PageHeader } from "../../components/ui";
import { cn } from "../../lib/cn";
import { useSubmissions } from "../../lib/submissions";
import { t, tokens } from "@vira/core";
import { formatCompactNumber } from "@vira/core";
import type {
  ClipSubmission,
  RejectionReasonId,
  SubmissionCheckStatus,
} from "@vira/core";

const checkTone: Record<SubmissionCheckStatus, { color: string; icon: string }> = {
  pass: { color: "text-mint", icon: "check_circle" },
  warn: { color: "text-amber", icon: "warning" },
  fail: { color: "text-error", icon: "cancel" },
};

const reasonIds: RejectionReasonId[] = [
  "missing-requirement",
  "misleading-claim",
  "legal",
  "off-brand",
];

/**
 * Content approval.
 *
 * The brand reviews a clip the creator uploaded to Vira and either clears it to
 * be posted natively on TikTok or sends it back. Vira never publishes anything —
 * approval is permission, not distribution.
 *
 * The automatic checks are advisory and say so. A `warn` means the check could
 * not decide, which is deliberately not the same as a failure; collapsing the
 * two would push a human into rejecting something no one actually verified.
 *
 * Rejecting requires a category AND a concrete note, enforced here and in the
 * store's signature: the creator has to know what to change, and "no" without a
 * reason is how a marketplace loses the side that does the work.
 */
export default function ApprovalQueue() {
  const pending = useSubmissions((state) => state.pending);
  const decided = useSubmissions((state) => state.decided);
  const approve = useSubmissions((state) => state.approve);
  const reject = useSubmissions((state) => state.reject);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Phones show either the list or the detail, never both. */
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reasonId, setReasonId] = useState<RejectionReasonId | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const selected = pending.find((item) => item.id === selectedId) ?? pending[0] ?? null;

  function open(id: string) {
    setSelectedId(id);
    setDetailOpen(true);
    resetRejection();
  }

  function resetRejection() {
    setRejecting(false);
    setReasonId(null);
    setNote("");
  }

  function onApprove(submission: ClipSubmission) {
    approve(submission.id);
    setToast(t.approvals.approvedToast(submission.creatorHandle));
    setDetailOpen(false);
    resetRejection();
  }

  function onReject(submission: ClipSubmission) {
    if (!reasonId || note.trim().length === 0) return;
    reject(submission.id, reasonId, note.trim());
    setToast(t.approvals.rejectedToast(submission.creatorHandle));
    setDetailOpen(false);
    resetRejection();
  }

  const canConfirmReject = reasonId !== null && note.trim().length > 0;

  return (
    <div className="mx-auto max-w-container px-6 py-10 md:px-12">
      <PageHeader
        title={t.approvals.title}
        subtitle={t.approvals.subtitle}
        action={
          pending.length > 0 ? (
            <Chip tone="amber" icon="pending">
              {t.approvals.pendingCount(pending.length)}
            </Chip>
          ) : undefined
        }
      />

      {toast && (
        <Card className="mt-6 animate-fade-up border-mint/20 bg-mint/5 p-4">
          <p className="flex items-center gap-2 text-[14px] text-mint">
            <Icon name="check_circle" size={18} filled />
            {toast}
          </p>
        </Card>
      )}

      {pending.length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <Icon name="inbox" size={32} className="text-on-surface-variant/40" />
          <p className="mt-3 font-display text-[16px] font-semibold text-on-surface">
            {t.approvals.emptyTitle}
          </p>
          <p className="mt-1 text-[13px] text-on-surface-variant">{t.approvals.emptyText}</p>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* List */}
          <div className={cn("flex flex-col gap-3", detailOpen && "hidden lg:flex")}>
            {pending.map((submission) => {
              const failures = submission.checks.filter((c) => c.status === "fail").length;
              const warnings = submission.checks.filter((c) => c.status === "warn").length;
              const active = selected?.id === submission.id;
              return (
                <button
                  key={submission.id}
                  type="button"
                  onClick={() => open(submission.id)}
                  className={cn(
                    "pressable rounded-lg border p-4 text-left transition-colors",
                    active
                      ? "border-business/50 bg-business/10 lg:border-business/50"
                      : "border-white/5 bg-surface-container-low hover:border-white/15",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="h-14 w-10 shrink-0 rounded"
                      style={{ background: tokens.gradientCss(submission.gradientStops) }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-body text-[14px] font-semibold text-on-surface">
                        {submission.creatorName}
                      </span>
                      <span className="block truncate text-[12px] text-on-surface-variant">
                        {submission.campaignName}
                      </span>
                      <span className="mt-1 block text-[11px] text-on-surface-variant/60">
                        {submission.submittedAt} · {t.approvals.duration(submission.durationSeconds)}
                      </span>
                    </span>
                  </div>
                  {(failures > 0 || warnings > 0) && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {failures > 0 && (
                        <Chip tone="error" icon="cancel">
                          {failures}
                        </Chip>
                      )}
                      {warnings > 0 && (
                        <Chip tone="amber" icon="warning">
                          {warnings}
                        </Chip>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Detail */}
          <div className={cn(!detailOpen && "hidden lg:block")}>
            {selected ? (
              <Card className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDetailOpen(false)}
                  className="pressable flex items-center gap-1 border-b border-white/5 px-5 py-3 text-[13px] text-on-surface-variant lg:hidden"
                >
                  <Icon name="arrow_back" size={16} />
                  {t.approvals.backToList}
                </button>

                <div className="grid gap-6 p-6 sm:grid-cols-[160px_1fr]">
                  {/* Clip placeholder — no file until the client delivers the examples. */}
                  <div
                    className="relative aspect-[9/16] w-full rounded-md sm:w-40"
                    style={{ background: tokens.gradientCss(selected.gradientStops) }}
                  >
                    <span className="numeric absolute bottom-2 right-2 rounded bg-black/50 px-1.5 py-0.5 text-[11px] text-white">
                      {t.approvals.duration(selected.durationSeconds)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <p className="font-display text-[18px] font-semibold text-on-surface">
                      {selected.creatorName}
                    </p>
                    <p className="text-[13px] text-on-surface-variant">
                      {selected.creatorHandle} ·{" "}
                      <span className="numeric">
                        {formatCompactNumber(selected.creatorFollowers)}
                      </span>{" "}
                      {t.approvals.followers}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Chip tone="business" icon="campaign">
                        {selected.campaignName}
                      </Chip>
                      <Chip icon="schedule">
                        {t.approvals.submitted}: {selected.submittedAt}
                      </Chip>
                    </div>

                    <p className="label-caps mt-5">{t.approvals.caption}</p>
                    <p className="mt-1.5 text-[14px] leading-6 text-on-surface">
                      {selected.caption}
                    </p>
                  </div>
                </div>

                {/* Automatic checks */}
                <div className="border-t border-white/5 px-6 py-5">
                  <p className="label-caps">{t.approvals.checksTitle}</p>
                  <ul className="mt-3 grid gap-2.5">
                    {selected.checks.map((check) => {
                      const tone = checkTone[check.status];
                      return (
                        <li key={check.id} className="flex items-start gap-2.5">
                          <Icon
                            name={tone.icon}
                            size={18}
                            className={cn("shrink-0", tone.color)}
                            filled={check.status !== "pass"}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] font-semibold text-on-surface">
                              {check.label}
                            </span>
                            <span className="block text-[12px] leading-5 text-on-surface-variant">
                              {check.detail}
                            </span>
                          </span>
                          <span className={cn("shrink-0 text-[11px] font-semibold", tone.color)}>
                            {t.approvals.checkStatus[check.status]}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-4 border-t border-white/5 pt-3 text-[12px] leading-5 text-on-surface-variant/70">
                    {t.approvals.checksNote}
                  </p>
                </div>

                {/* Decision */}
                <div className="border-t border-white/5 px-6 py-5">
                  {!rejecting ? (
                    <div className="flex flex-wrap gap-3">
                      <Button icon="check" onClick={() => onApprove(selected)}>
                        {t.approvals.approve}
                      </Button>
                      <Button variant="subtle" icon="block" onClick={() => setRejecting(true)}>
                        {t.approvals.reject}
                      </Button>
                    </div>
                  ) : (
                    <div className="animate-fade-up">
                      <p className="font-display text-[15px] font-semibold text-on-surface">
                        {t.approvals.rejectTitle}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-on-surface-variant">
                        {t.approvals.rejectSubtitle}
                      </p>

                      <p className="label-caps mt-5 mb-2">{t.approvals.reasonLabel}</p>
                      <div className="flex flex-wrap gap-2">
                        {reasonIds.map((id) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setReasonId(id)}
                            aria-pressed={reasonId === id}
                            className={cn(
                              "pressable rounded-full border px-3 py-1.5 font-body text-[12px] font-semibold transition-colors",
                              reasonId === id
                                ? "border-business/40 bg-business/10 text-business"
                                : "border-white/10 bg-white/5 text-on-surface-variant hover:border-white/20",
                            )}
                          >
                            {t.approvals.reasons[id]}
                          </button>
                        ))}
                      </div>

                      <p className="label-caps mt-5 mb-2">{t.approvals.noteLabel}</p>
                      <textarea
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                        rows={3}
                        placeholder={t.approvals.notePlaceholder}
                        className={cn(
                          "w-full resize-y rounded border border-white/10 bg-surface-container-lowest px-4 py-3",
                          "font-body text-[14px] leading-6 text-on-surface",
                          "placeholder:text-on-surface-variant/40",
                          "outline-none transition-colors focus:border-business/60",
                        )}
                      />
                      {!canConfirmReject && (
                        <p className="mt-2 text-[12px] text-amber">{t.approvals.noteRequired}</p>
                      )}

                      <div className="mt-4 flex flex-wrap gap-3">
                        <Button
                          icon="send"
                          onClick={() => onReject(selected)}
                          disabled={!canConfirmReject}
                        >
                          {t.approvals.confirmReject}
                        </Button>
                        <Button variant="subtle" onClick={resetRejection}>
                          {t.approvals.cancelReject}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="p-10 text-center">
                <p className="text-[13px] text-on-surface-variant">{t.approvals.selectPrompt}</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* What was decided, and why. A queue that empties into nothing hides the record. */}
      {decided.length > 0 && (
        <Card className="mt-8 overflow-hidden">
          <div className="border-b border-white/5 px-6 py-4">
            <h2 className="font-display text-[15px] font-semibold text-on-surface">
              {t.approvals.decidedTitle}
            </h2>
          </div>
          <div className="divide-y divide-white/[0.03]">
            {decided.map((item) => (
              <div key={item.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-body text-[14px] font-semibold text-on-surface">
                    {item.creatorHandle}
                    <span className="ml-2 font-normal text-on-surface-variant">
                      {item.campaignName}
                    </span>
                  </p>
                  <Chip
                    tone={item.decision === "approved" ? "mint" : "error"}
                    icon={item.decision === "approved" ? "check_circle" : "block"}
                  >
                    {t.approvals.decision[item.decision]}
                  </Chip>
                </div>
                {item.reasonId && (
                  <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
                    <span className="font-semibold">{t.approvals.reasons[item.reasonId]}</span>
                    {item.note ? ` — ${item.note}` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
