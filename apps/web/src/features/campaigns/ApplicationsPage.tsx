import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Button, Card, Chip, PageHeader } from "../../components/ui";
import { t } from "@vira/core";
import type { RejectionReasonId } from "@vira/core";
import { useCreatorApplications } from "../../lib/queries";
import type { ApplicationStatus, CampaignApplicationDto, RejectionReason } from "../../lib/types";

/** Backend RejectionReason enum names → the kebab ids the i18n reason labels are keyed by. */
const reasonFromApi: Record<RejectionReason, RejectionReasonId> = {
  MissingRequirement: "missing-requirement",
  MisleadingClaim: "misleading-claim",
  Legal: "legal",
  OffBrand: "off-brand",
};

const statusChip: Record<ApplicationStatus, { tone: "amber" | "mint" | "error"; icon: string; key: "pending" | "approved" | "rejected" }> = {
  Pending: { tone: "amber", icon: "pending", key: "pending" },
  Approved: { tone: "mint", icon: "check_circle", key: "approved" },
  Rejected: { tone: "error", icon: "block", key: "rejected" },
};

function formatSubmitted(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * The creator's own applications — what they submitted for approval and what the brand decided.
 *
 * Approval is permission, not distribution: an approved draft means "post this natively on TikTok",
 * not that Vira published anything. A rejection always carries the brand's reason + note, so the
 * creator knows exactly what to change before re-uploading.
 */
export default function ApplicationsPage() {
  const { data: applications, isLoading, isError } = useCreatorApplications();

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 md:px-12">
      <PageHeader title={t.myApplications.title} subtitle={t.myApplications.subtitle} />

      {isLoading ? (
        <Card className="mt-8 p-10 text-center">
          <p className="text-[13px] text-on-surface-variant">{t.myApplications.loading}</p>
        </Card>
      ) : isError ? (
        <Card className="mt-8 border-error/20 bg-error/5 p-10 text-center">
          <p className="text-[13px] text-error">{t.myApplications.loadError}</p>
        </Card>
      ) : (applications ?? []).length === 0 ? (
        <Card className="mt-8 p-10 text-center">
          <Icon name="drafts" size={32} className="mx-auto text-on-surface-variant/40" />
          <p className="mt-3 font-display text-[16px] font-semibold text-on-surface">
            {t.myApplications.emptyTitle}
          </p>
          <p className="mt-1 text-[13px] text-on-surface-variant">{t.myApplications.emptyText}</p>
          <div className="mt-6 flex justify-center">
            <Link to="/campanii">
              <Button variant="creator" icon="campaign">
                {t.myApplications.browseCampaigns}
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {(applications ?? []).map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ application }: { application: CampaignApplicationDto }) {
  const chip = statusChip[application.status];
  const reason = application.rejectionReason ? reasonFromApi[application.rejectionReason] : null;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-[10px]">{application.brandName}</p>
          <h3 className="font-display text-[18px] font-semibold text-on-surface">
            {application.campaignName}
          </h3>
          <p className="mt-1 text-[11px] text-on-surface-variant/60">
            {t.myApplications.submitted}: {formatSubmitted(application.submittedAt)}
          </p>
        </div>
        <Chip tone={chip.tone} icon={chip.icon}>
          {t.myApplications.status[chip.key]}
        </Chip>
      </div>

      {application.note.trim().length > 0 && (
        <div className="mt-4">
          <p className="label-caps text-[10px]">{t.myApplications.yourNote}</p>
          <p className="mt-1 text-[13px] leading-6 text-on-surface-variant">{application.note}</p>
        </div>
      )}

      {/* The brand's decision. */}
      {application.status === "Pending" && (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-amber/20 bg-amber/5 px-3.5 py-3 text-[13px] text-amber">
          <Icon name="hourglass_top" size={16} />
          {t.myApplications.pendingNote}
        </p>
      )}

      {application.status === "Approved" && (
        <p className="mt-4 flex items-center gap-2 rounded-md border border-mint/20 bg-mint/5 px-3.5 py-3 text-[13px] text-mint">
          <Icon name="check_circle" size={16} filled />
          {application.decisionNote.trim().length > 0
            ? application.decisionNote
            : t.myApplications.approvedNote}
        </p>
      )}

      {application.status === "Rejected" && (
        <div className="mt-4 rounded-md border border-error/20 bg-error/5 p-4">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-error">
            <Icon name="block" size={16} />
            {t.myApplications.rejectedTitle}
          </p>
          {reason && (
            <p className="mt-2 text-[13px] leading-6 text-on-surface">
              <span className="font-semibold">{t.approvals.reasons[reason]}</span>
              {application.decisionNote ? ` — ${application.decisionNote}` : ""}
            </p>
          )}
          <Link
            to={`/campanii/${application.campaignId}/aplica`}
            className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-creator transition-opacity hover:opacity-80"
          >
            <Icon name="autorenew" size={15} />
            {t.myApplications.reapply}
          </Link>
        </div>
      )}
    </Card>
  );
}
