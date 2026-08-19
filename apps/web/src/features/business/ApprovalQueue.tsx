import { useState } from "react";
import { Icon } from "../../components/Icon";
import { Button, Card, Chip, PageHeader } from "../../components/ui";
import { cn } from "../../lib/cn";
import { API_BASE } from "../../lib/api";
import { useBrandSubmissions, useDecideSubmission } from "../../lib/queries";
import { t } from "@vira/core";
import { formatCompactNumber } from "@vira/core";
import type { RejectionReasonId } from "@vira/core";
import type { BrandSubmissionDto, RejectionReason } from "../../lib/types";

/** Kebab reason ids drive the UI + i18n; the API speaks the enum names. Map at the boundary. */
const reasonIds: RejectionReasonId[] = [
  "missing-requirement",
  "misleading-claim",
  "legal",
  "off-brand",
];

const reasonToApi: Record<RejectionReasonId, RejectionReason> = {
  "missing-requirement": "MissingRequirement",
  "misleading-claim": "MisleadingClaim",
  legal: "Legal",
  "off-brand": "OffBrand",
};

const reasonFromApi: Record<RejectionReason, RejectionReasonId> = {
  MissingRequirement: "missing-requirement",
  MisleadingClaim: "misleading-claim",
  Legal: "legal",
  OffBrand: "off-brand",
};

/** ISO timestamp → a short Romanian date+time. */
function formatSubmitted(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Content approval, backed by real submissions.
 *
 * The brand reviews a draft clip the creator uploaded to Vira and either clears it to be posted
 * natively on TikTok or sends it back. Vira never publishes anything — approval is permission, not
 * distribution.
 *
 * Rejecting requires a category AND a concrete note, enforced here and again at the gateway: the
 * creator has to know what to change, and "no" without a reason is how a marketplace loses the side
 * that does the work.
 */
export default function ApprovalQueue() {
  const { data: submissions, isLoading, isError } = useBrandSubmissions();
  const decide = useDecideSubmission();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Phones show either the list or the detail, never both. */
  const [detailOpen, setDetailOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reasonId, setReasonId] = useState<RejectionReasonId | null>(null);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const all = submissions ?? [];
  const pending = all.filter((s) => s.status === "Pending");
  const decided = all.filter((s) => s.status !== "Pending");

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

  function onApprove(submission: BrandSubmissionDto) {
    decide.mutate(
      { id: submission.id, decision: { approve: true } },
      {
        onSuccess: () => {
          setToast(t.approvals.approvedToast(submission.creatorName));
          setDetailOpen(false);
          resetRejection();
        },
      },
    );
  }

  function onReject(submission: BrandSubmissionDto) {
    if (!reasonId || note.trim().length === 0) return;
    decide.mutate(
      {
        id: submission.id,
        decision: { approve: false, rejectionReason: reasonToApi[reasonId], note: note.trim() },
      },
      {
        onSuccess: () => {
          setToast(t.approvals.rejectedToast(submission.creatorName));
          setDetailOpen(false);
          resetRejection();
        },
      },
    );
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

      {isLoading ? (
        <Card className="mt-8 p-10 text-center">
          <p className="text-[13px] text-on-surface-variant">{t.approvals.loading}</p>
        </Card>
      ) : isError ? (
        <Card className="mt-8 border-error/20 bg-error/5 p-10 text-center">
          <p className="text-[13px] text-error">{t.approvals.loadError}</p>
        </Card>
      ) : pending.length === 0 ? (
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
                    <span className="grid h-14 w-10 shrink-0 place-items-center rounded bg-surface-container-high">
                      <Icon name="movie" size={18} className="text-on-surface-variant/60" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-body text-[14px] font-semibold text-on-surface">
                        {submission.creatorName}
                      </span>
                      <span className="block truncate text-[12px] text-on-surface-variant">
                        {submission.campaignName}
                      </span>
                      <span className="mt-1 block text-[11px] text-on-surface-variant/60">
                        {formatSubmitted(submission.submittedAt)}
                      </span>
                    </span>
                  </div>
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

                <div className="grid gap-6 p-6 sm:grid-cols-[180px_1fr]">
                  {/* The real draft — served inline from the gateway with the session cookie. */}
                  <video
                    key={selected.id}
                    src={`${API_BASE}/brand/submissions/${selected.id}/draft`}
                    crossOrigin="use-credentials"
                    controls
                    preload="metadata"
                    className="aspect-[9/16] w-full rounded-md bg-black object-contain sm:w-44"
                  />

                  <div className="min-w-0">
                    <p className="font-display text-[18px] font-semibold text-on-surface">
                      {selected.creatorName}
                    </p>
                    <p className="text-[13px] text-on-surface-variant">
                      <span className="numeric">{formatCompactNumber(selected.creatorFollowers)}</span>{" "}
                      {t.approvals.followers}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Chip tone="business" icon="campaign">
                        {selected.campaignName}
                      </Chip>
                      <Chip icon="schedule">
                        {t.approvals.submitted}: {formatSubmitted(selected.submittedAt)}
                      </Chip>
                      <Chip icon="movie">
                        {selected.draftFileName} · {formatSize(selected.draftSizeBytes)}
                      </Chip>
                    </div>

                    <p className="label-caps mt-5">{t.approvals.creatorNote}</p>
                    <p className="mt-1.5 text-[14px] leading-6 text-on-surface">
                      {selected.creatorNote.trim().length > 0 ? (
                        selected.creatorNote
                      ) : (
                        <span className="text-on-surface-variant/60">{t.approvals.noCreatorNote}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Decision */}
                <div className="border-t border-white/5 px-6 py-5">
                  {!rejecting ? (
                    <div className="flex flex-wrap gap-3">
                      <Button icon="check" onClick={() => onApprove(selected)} disabled={decide.isPending}>
                        {t.approvals.approve}
                      </Button>
                      <Button
                        variant="subtle"
                        icon="block"
                        onClick={() => setRejecting(true)}
                        disabled={decide.isPending}
                      >
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
                          disabled={!canConfirmReject || decide.isPending}
                        >
                          {t.approvals.confirmReject}
                        </Button>
                        <Button variant="subtle" onClick={resetRejection} disabled={decide.isPending}>
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
            {decided.map((item) => {
              const reason = item.rejectionReason ? reasonFromApi[item.rejectionReason] : null;
              return (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-body text-[14px] font-semibold text-on-surface">
                      {item.creatorName}
                      <span className="ml-2 font-normal text-on-surface-variant">
                        {item.campaignName}
                      </span>
                    </p>
                    <Chip
                      tone={item.status === "Approved" ? "mint" : "error"}
                      icon={item.status === "Approved" ? "check_circle" : "block"}
                    >
                      {t.approvals.decision[item.status === "Approved" ? "approved" : "rejected"]}
                    </Chip>
                  </div>
                  {reason && (
                    <p className="mt-2 text-[12px] leading-5 text-on-surface-variant">
                      <span className="font-semibold">{t.approvals.reasons[reason]}</span>
                      {item.decisionNote ? ` — ${item.decisionNote}` : ""}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
