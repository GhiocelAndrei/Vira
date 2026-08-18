import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Button, Card, Chip } from "../../components/ui";
import { cn } from "../../lib/cn";
import { formatMoney, formatViews, t } from "@vira/core";
import { useCreatorCampaigns, useCreatorProfile } from "../../lib/queries";
import { estimateEarnings, presentationFor, rateForObjective } from "../../lib/feed";
import { useApplication, useApplications } from "../../lib/applications";
import type { CampaignApplication, DraftUpload } from "../../lib/applications";
import type { FeedCampaignDto } from "../../lib/types";

/**
 * One campaign, end to end: what the brand asks, what it pays, the application
 * itself, and — at the bottom — the draft the creator uploads for approval.
 *
 * The order is the order of the work. Everything above the form is what you need
 * in order to decide; the form is the decision; the uploader is the next thing
 * you do. The uploader stays visible before you apply, dimmed and labelled,
 * because a creator should be able to see what will be asked of them before
 * committing to it.
 *
 * The file never leaves the tab yet (see `lib/applications.ts`). Everything the
 * screen reports about it — duration, size, type — is read off the file in the
 * browser, and a duration it cannot decode is reported as unread rather than
 * guessed.
 */

/** Client-side guard only. The real cap belongs to the upload endpoint. TODO(api). */
const MAX_DRAFT_BYTES = 300 * 1024 * 1024;

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return `${mb.toLocaleString("ro-RO", { maximumFractionDigits: mb < 10 ? 1 : 0 })} MB`;
}

/**
 * The campaign carries its duration rule as the preset's label ("20–60 sec"),
 * which is what the brand form sends. Parsed tolerantly: an unrecognised label
 * means we skip the check rather than invent a range.
 */
function durationRange(preset: string): { min: number; max: number } | null {
  const match = preset.match(/(\d+)\s*[–—-]\s*(\d+)/);
  if (!match) return null;
  return { min: Number(match[1]), max: Number(match[2]) };
}

/** What the caption has to carry, prefilled so the creator edits rather than remembers. */
function suggestedCaption(campaign: FeedCampaignDto): string {
  return [...campaign.hashtags, campaign.mention ?? ""].filter(Boolean).join(" ");
}

/** Everything the creator ticks off before sending — the brand's asks, flattened. */
function requirementLabels(campaign: FeedCampaignDto): string[] {
  return [...campaign.requirements, ...campaign.hashtags, campaign.mention ?? ""].filter(
    (x): x is string => Boolean(x),
  );
}

function formatMoment(iso: string): string {
  return new Date(iso).toLocaleString("ro-RO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Reading the duration is asynchronous and can fail — three states, not a nullable number. */
type DurationState = { kind: "reading" } | { kind: "known"; seconds: number } | { kind: "unknown" };

export default function CampaignApplyPage() {
  const { id } = useParams<{ id: string }>();
  const { data: campaigns } = useCreatorCampaigns();
  const { data: profile } = useCreatorProfile();

  const campaign = (campaigns ?? []).find((c) => c.id === id);
  const loading = campaigns === undefined;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-center md:px-8">
        <p className="text-[14px] text-on-surface-variant">{t.apply.loading}</p>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 md:px-8">
        <Card className="p-10 text-center">
          <Icon name="search_off" size={32} className="text-on-surface-variant/40" />
          <p className="mt-3 font-display text-[16px] font-semibold text-on-surface">
            {t.apply.notFoundTitle}
          </p>
          <p className="mt-1 text-[13px] text-on-surface-variant">{t.apply.notFoundText}</p>
          <Link
            to="/campanii"
            className="mt-5 inline-flex items-center gap-1 text-[13px] text-creator hover:underline"
          >
            <Icon name="arrow_back" size={16} />
            {t.apply.back}
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <ApplyScreen
      campaign={campaign}
      avgViews={profile?.aggregates.avgViews ?? 0}
      followerCount={profile?.followerCount ?? 0}
    />
  );
}

/* -------------------------------------------------------------------------- */

function ApplyScreen({
  campaign,
  avgViews,
  followerCount,
}: {
  campaign: FeedCampaignDto;
  avgViews: number;
  followerCount: number;
}) {
  const application = useApplication(campaign.id);
  const apply = useApplications((s) => s.apply);
  const withdraw = useApplications((s) => s.withdraw);

  const accent = presentationFor(campaign.objective).accent;
  const rate = rateForObjective(campaign.objective);
  const estimate = estimateEarnings(rate, avgViews);
  const requirements = requirementLabels(campaign);

  const step =
    application === undefined ? 0 : application.status === "applied" ? 1 : 2;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-4 md:px-8 md:pt-8">
      <Link
        to="/campanii"
        className="inline-flex items-center gap-1 text-[13px] text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <Icon name="arrow_back" size={16} />
        {t.apply.back}
      </Link>

      <CampaignHeader campaign={campaign} accent={accent} />

      <Steps current={step} />

      <Brief campaign={campaign} />

      <Payout campaign={campaign} rate={rate} avgViews={avgViews} estimate={estimate} />

      {campaign.locked ? (
        <LockedPanel campaign={campaign} followerCount={followerCount} />
      ) : (
        <ApplicationPanel
          campaignId={campaign.id}
          application={application}
          onApply={apply}
          onWithdraw={withdraw}
        />
      )}

      {/* The bottom of the screen, always: upload the draft for approval. */}
      <DraftPanel campaign={campaign} requirements={requirements} unlocked={application !== undefined} />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function CampaignHeader({ campaign, accent }: { campaign: FeedCampaignDto; accent: string }) {
  const deadlineDays =
    campaign.deadline === null || campaign.deadline === undefined
      ? null
      : Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / 86_400_000);

  return (
    <div className="mt-5 flex items-start gap-4">
      <div
        className="grid h-14 w-14 shrink-0 place-items-center rounded-lg"
        style={{ backgroundColor: `${accent}1a`, border: `1px solid ${accent}33` }}
      >
        <span className="font-display text-[22px] font-bold" style={{ color: accent }}>
          {campaign.brandName.charAt(0)}
        </span>
      </div>
      <div className="min-w-0">
        <p className="label-caps text-[10px]">{campaign.brandName}</p>
        <h1 className="font-display text-[26px] font-semibold leading-tight text-on-surface md:text-[32px]">
          {campaign.title}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Chip tone="creator" icon="campaign">
            {t.brandOnboarding.objectives[campaign.objective]}
          </Chip>
          {campaign.category && (
            <Chip icon="sell">{t.brandOnboarding.categories[campaign.category]}</Chip>
          )}
          <Chip
            tone={deadlineDays !== null && deadlineDays <= 7 ? "amber" : "neutral"}
            icon="schedule"
          >
            {deadlineDays === null ? t.apply.noDeadline : t.campaigns.deadlineLeft(deadlineDays)}
          </Chip>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

const stepLabels = [
  t.apply.steps.apply,
  t.apply.steps.draft,
  t.apply.steps.approval,
  t.apply.steps.post,
  t.apply.steps.paid,
];

/** Where the creator is in the five steps. Done, current, and not-yet read differently. */
function Steps({ current }: { current: number }) {
  return (
    <Card className="mt-6 p-5">
      <p className="label-caps text-[10px]">{t.apply.stepsTitle}</p>

      <ol className="mt-4 grid grid-cols-5 gap-1">
        {stepLabels.map((label, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <li key={label} className="relative flex flex-col items-center text-center">
              {index < stepLabels.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    "absolute left-1/2 top-[11px] h-px w-full",
                    done ? "bg-creator/50" : "bg-white/10",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 grid h-[23px] w-[23px] place-items-center rounded-full border",
                  done && "border-creator/50 bg-creator/20 text-creator",
                  active && "border-creator bg-creator text-on-primary",
                  !done && !active && "border-white/10 bg-surface-container-lowest text-on-surface-variant/50",
                )}
              >
                {done ? (
                  <Icon name="check" size={14} />
                ) : (
                  <span className="numeric text-[11px] font-semibold">{index + 1}</span>
                )}
              </span>
              <span
                className={cn(
                  "mt-2 text-[10px] leading-tight md:text-[11px]",
                  active ? "font-semibold text-on-surface" : "text-on-surface-variant/70",
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="mt-5 flex items-start gap-2 border-t border-white/5 pt-4 text-[12px] leading-5 text-amber">
        <Icon name="warning" size={16} className="mt-px shrink-0" />
        {t.apply.stepsNote}
      </p>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function Brief({ campaign }: { campaign: FeedCampaignDto }) {
  const rows: { label: string; value: string }[] = [
    { label: t.apply.duration, value: campaign.durationPreset },
    ...(campaign.mention ? [{ label: t.apply.mention, value: campaign.mention }] : []),
  ];

  return (
    <Card className="mt-5 p-6">
      <h2 className="font-display text-[15px] font-semibold text-on-surface">
        {t.apply.briefTitle}
      </h2>

      {campaign.message && (
        <>
          <p className="label-caps mt-5 text-[10px]">{t.apply.message}</p>
          <p className="mt-2 text-[14px] leading-6 text-on-surface">{campaign.message}</p>
        </>
      )}

      {campaign.requirements.length > 0 && (
        <>
          <p className="label-caps mt-5 text-[10px]">{t.apply.requirements}</p>
          <ul className="mt-2 grid gap-2">
            {campaign.requirements.map((requirement) => (
              <li
                key={requirement}
                className="flex items-start gap-2 text-[13px] leading-5 text-on-surface-variant"
              >
                <Icon name="check_circle" size={16} className="mt-0.5 shrink-0 text-creator" />
                {requirement}
              </li>
            ))}
          </ul>
        </>
      )}

      {campaign.hashtags.length > 0 && (
        <>
          <p className="label-caps mt-5 text-[10px]">{t.apply.hashtags}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {campaign.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-creator/20 bg-creator/10 px-2.5 py-1 font-body text-[12px] text-creator"
              >
                {tag}
              </span>
            ))}
          </div>
        </>
      )}

      <dl className="mt-5 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="label-caps text-[10px]">{row.label}</dt>
            <dd className="mt-1 text-[14px] text-on-surface">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function Payout({
  campaign,
  rate,
  avgViews,
  estimate,
}: {
  campaign: FeedCampaignDto;
  rate: number;
  avgViews: number;
  estimate: { minMinor: number; maxMinor: number };
}) {
  return (
    <Card className="mt-5 p-6">
      <h2 className="font-display text-[15px] font-semibold text-on-surface">{t.apply.payTitle}</h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="label-caps text-[10px]">{t.apply.rate}</p>
          <p className="numeric mt-1 text-[20px] font-semibold text-creator">
            {formatMoney(rate)}
          </p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant/70">{t.apply.perMille}</p>
        </div>
        <div>
          <p className="label-caps text-[10px]">{t.apply.estimate}</p>
          <p className="numeric mt-1 text-[20px] font-semibold text-on-surface">
            {formatMoney(estimate.minMinor, { compactZeroCents: true })} –{" "}
            {formatMoney(estimate.maxMinor, { compactZeroCents: true })}
          </p>
          <p className="mt-0.5 text-[11px] text-on-surface-variant/70">
            {avgViews > 0
              ? `${t.apply.yourAverage}: ${formatViews(avgViews)}`
              : t.apply.estimateHow}
          </p>
        </div>
        <div>
          <p className="label-caps text-[10px]">{t.apply.budgetLeft}</p>
          <p className="numeric mt-1 text-[20px] font-semibold text-on-surface">
            {formatMoney(campaign.budgetMinor, { compactZeroCents: true })}
          </p>
        </div>
      </div>

      <p className="mt-5 border-t border-white/5 pt-4 text-[12px] leading-5 text-on-surface-variant/70">
        {avgViews > 0 ? t.apply.payNote : `${t.apply.noAverageNote} ${t.apply.payNote}`}
      </p>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function LockedPanel({
  campaign,
  followerCount,
}: {
  campaign: FeedCampaignDto;
  followerCount: number;
}) {
  return (
    <Card className="mt-5 border-amber/20 bg-amber/5 p-6">
      <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-amber">
        <Icon name="lock" size={18} />
        {t.apply.lockedTitle}
      </p>
      <p className="mt-2 text-[13px] leading-5 text-on-surface-variant">
        {t.campaigns.lockedFollowers(campaign.minFollowerThreshold.toLocaleString("ro-RO"))} —{" "}
        {t.apply.yourFollowers(followerCount.toLocaleString("ro-RO"))}
      </p>
      <p className="mt-2 text-[12px] leading-5 text-on-surface-variant/70">{t.apply.lockedNote}</p>
      <Link
        to="/campanii"
        className="mt-4 inline-flex items-center gap-1 text-[13px] text-creator hover:underline"
      >
        {t.apply.back}
        <Icon name="arrow_forward" size={15} />
      </Link>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function ApplicationPanel({
  campaignId,
  application,
  onApply,
  onWithdraw,
}: {
  campaignId: string;
  application: CampaignApplication | undefined;
  onApply: (campaignId: string, pitch: string) => void;
  onWithdraw: (campaignId: string) => void;
}) {
  const [pitch, setPitch] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  if (application) {
    return (
      <Card className="mt-5 border-mint/20 bg-mint/5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-mint">
            <Icon name="check_circle" size={18} filled />
            {t.apply.appliedTitle}
          </p>
          <span className="text-[12px] text-on-surface-variant/70">
            {t.apply.appliedAt}: {formatMoment(application.appliedAt)}
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-5 text-on-surface-variant">{t.apply.appliedNote}</p>

        {application.pitch.trim().length > 0 && (
          <>
            <p className="label-caps mt-5 text-[10px]">{t.apply.yourPitch}</p>
            <p className="mt-1.5 text-[13px] leading-5 text-on-surface">{application.pitch}</p>
          </>
        )}

        {/* Withdrawing stays available until a draft is in: after that the brand
            has something in its queue, and pulling it silently is not a thing
            the creator should be able to do from here. */}
        {application.status === "applied" && (
          <button
            type="button"
            onClick={() => onWithdraw(campaignId)}
            className="mt-5 text-[12px] text-on-surface-variant transition-colors hover:text-error"
          >
            {t.apply.withdraw}
          </button>
        )}
      </Card>
    );
  }

  return (
    <Card className="mt-5 p-6">
      <h2 className="font-display text-[15px] font-semibold text-on-surface">
        {t.apply.formTitle}
      </h2>

      <p className="label-caps mt-5 text-[10px]">
        {t.apply.pitchLabel}
        <span className="ml-2 font-normal normal-case tracking-normal text-on-surface-variant/50">
          {t.apply.pitchOptional}
        </span>
      </p>
      <textarea
        value={pitch}
        onChange={(event) => setPitch(event.target.value)}
        rows={3}
        placeholder={t.apply.pitchPlaceholder}
        className={cn(
          "mt-2 w-full resize-y rounded border border-white/10 bg-surface-container-lowest px-4 py-3",
          "font-body text-[14px] leading-6 text-on-surface placeholder:text-on-surface-variant/40",
          "outline-none transition-colors focus:border-creator/60",
        )}
      />

      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-[13px] leading-5 text-on-surface-variant">
          {t.apply.confirmLabel}
        </span>
      </label>

      <Button
        variant="creator"
        icon="send"
        className="mt-5 w-full sm:w-auto"
        disabled={!confirmed}
        onClick={() => onApply(campaignId, pitch.trim())}
      >
        {t.apply.submit}
      </Button>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Draft upload — the bottom of the screen                                     */
/* -------------------------------------------------------------------------- */

function DraftPanel({
  campaign,
  requirements,
  unlocked,
}: {
  campaign: FeedCampaignDto;
  requirements: string[];
  unlocked: boolean;
}) {
  const application = useApplication(campaign.id);
  const submitDraft = useApplications((s) => s.submitDraft);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<DurationState>({ kind: "reading" });
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [caption, setCaption] = useState(() => suggestedCaption(campaign));
  const [covered, setCovered] = useState<string[]>([]);
  const [replacing, setReplacing] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  /** Object URLs are a resource, not a string — release the previous one every time. */
  function setPreview(next: File | null) {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next ? URL.createObjectURL(next) : null;
    setPreviewUrl(urlRef.current);
  }

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  function chooseFile(next: File | null) {
    if (!next) return;
    if (!next.type.startsWith("video/")) {
      setFileError(t.apply.notVideo);
      return;
    }
    if (next.size > MAX_DRAFT_BYTES) {
      setFileError(t.apply.tooLarge(formatBytes(MAX_DRAFT_BYTES)));
      return;
    }
    setFileError(null);
    setFile(next);
    setPreview(next);
    setDuration({ kind: "reading" });
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setDuration({ kind: "reading" });
    setFileError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const range = durationRange(campaign.durationPreset);
  const canSend = file !== null && caption.trim().length > 0;
  const sent = application?.status === "draftSubmitted" && !replacing;

  function send() {
    if (!file || !canSend) return;
    submitDraft(campaign.id, {
      fileName: file.name,
      sizeBytes: file.size,
      durationSeconds: duration.kind === "known" ? duration.seconds : null,
      caption: caption.trim(),
      coveredRequirements: covered,
    });
    setReplacing(false);
  }

  return (
    <Card className={cn("mt-5 p-6", !unlocked && "opacity-60")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[15px] font-semibold text-on-surface">
            <Icon name="upload" size={18} className="text-creator" />
            {t.apply.draftTitle}
          </h2>
          <p className="mt-1.5 max-w-xl text-[13px] leading-5 text-on-surface-variant">
            {t.apply.draftSubtitle}
          </p>
        </div>
        {sent && (
          <Chip tone="amber" icon="pending">
            {t.apply.waiting}
          </Chip>
        )}
      </div>

      {!unlocked ? (
        <p className="mt-5 flex items-center gap-2 rounded-md border border-white/5 bg-white/5 px-4 py-3 text-[13px] text-on-surface-variant">
          <Icon name="lock" size={16} />
          {t.apply.draftLocked}
        </p>
      ) : sent && application?.draft ? (
        <SentDraft
          draft={application.draft}
          previewUrl={previewUrl}
          onReplace={() => setReplacing(true)}
        />
      ) : (
        <>
          {/* Picker */}
          {file === null ? (
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                chooseFile(event.dataTransfer.files[0] ?? null);
              }}
              className={cn(
                "mt-5 flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-10 text-center transition-colors",
                dragging
                  ? "border-creator/60 bg-creator/10"
                  : "border-white/15 bg-surface-container-lowest/60",
              )}
            >
              <Icon name="movie" size={28} className="text-on-surface-variant/50" />
              <p className="mt-3 text-[14px] text-on-surface">{t.apply.dropzone}</p>
              <p className="mt-1 text-[12px] text-on-surface-variant/60">{t.apply.dropzoneOr}</p>
              <Button
                variant="subtle"
                size="sm"
                icon="folder_open"
                className="mt-3"
                onClick={() => inputRef.current?.click()}
              >
                {t.apply.choose}
              </Button>
              <p className="mt-3 text-[11px] text-on-surface-variant/60">
                {t.apply.dropzoneHint(formatBytes(MAX_DRAFT_BYTES))}
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 sm:grid-cols-[140px_1fr]">
              <video
                src={previewUrl ?? undefined}
                controls
                playsInline
                preload="metadata"
                onLoadedMetadata={(event) => {
                  const seconds = event.currentTarget.duration;
                  setDuration(
                    Number.isFinite(seconds) && seconds > 0
                      ? { kind: "known", seconds: Math.round(seconds) }
                      : { kind: "unknown" },
                  );
                }}
                onError={() => setDuration({ kind: "unknown" })}
                className="aspect-[9/16] w-full rounded-md bg-black object-contain sm:w-[140px]"
              />

              <div className="min-w-0">
                <p className="truncate font-body text-[14px] font-semibold text-on-surface">
                  {file.name}
                </p>
                <p className="numeric mt-1 text-[12px] text-on-surface-variant">
                  {formatBytes(file.size)}
                  {" · "}
                  {t.apply.durationLabel}:{" "}
                  {duration.kind === "known"
                    ? t.approvals.duration(duration.seconds)
                    : duration.kind === "reading"
                      ? t.apply.durationReading
                      : t.apply.durationUnknown}
                </p>

                {/* Advisory, never a block: the brand decides, and a file we could
                    not measure must not be reported as one that failed. */}
                {duration.kind === "known" && range && (
                  <p
                    className={cn(
                      "mt-2 flex items-start gap-1.5 text-[12px] leading-5",
                      duration.seconds >= range.min && duration.seconds <= range.max
                        ? "text-mint"
                        : "text-amber",
                    )}
                  >
                    <Icon
                      name={
                        duration.seconds >= range.min && duration.seconds <= range.max
                          ? "check_circle"
                          : "warning"
                      }
                      size={15}
                      className="mt-px shrink-0"
                    />
                    {duration.seconds >= range.min && duration.seconds <= range.max
                      ? t.apply.durationOk(campaign.durationPreset)
                      : t.apply.durationOff(campaign.durationPreset)}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="subtle"
                    size="sm"
                    icon="cached"
                    onClick={() => inputRef.current?.click()}
                  >
                    {t.apply.replaceFile}
                  </Button>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="text-[12px] text-on-surface-variant transition-colors hover:text-error"
                  >
                    {t.apply.removeFile}
                  </button>
                </div>
              </div>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            hidden
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />

          {fileError && (
            <p className="mt-3 flex items-center gap-1.5 text-[12px] text-error">
              <Icon name="error" size={15} />
              {fileError}
            </p>
          )}

          {/* Caption */}
          <p className="label-caps mt-6 text-[10px]">{t.apply.captionLabel}</p>
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            rows={3}
            placeholder={t.apply.captionPlaceholder}
            className={cn(
              "mt-2 w-full resize-y rounded border border-white/10 bg-surface-container-lowest px-4 py-3",
              "font-body text-[14px] leading-6 text-on-surface placeholder:text-on-surface-variant/40",
              "outline-none transition-colors focus:border-creator/60",
            )}
          />
          <p className="mt-2 text-[12px] leading-5 text-on-surface-variant/70">
            {t.apply.captionHint}
          </p>

          {/* Self-declared checklist */}
          {requirements.length > 0 && (
            <>
              <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
                <p className="label-caps text-[10px]">{t.apply.checklistTitle}</p>
                <span className="numeric text-[11px] text-on-surface-variant/60">
                  {t.apply.coveredCount(covered.length, requirements.length)}
                </span>
              </div>
              <ul className="mt-2 grid gap-1.5">
                {requirements.map((requirement) => {
                  const checked = covered.includes(requirement);
                  return (
                    <li key={requirement}>
                      <label className="flex cursor-pointer items-start gap-3 rounded px-1 py-1.5 transition-colors hover:bg-white/[0.03]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) =>
                            setCovered((current) =>
                              event.target.checked
                                ? [...current, requirement]
                                : current.filter((item) => item !== requirement),
                            )
                          }
                          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                        />
                        <span
                          className={cn(
                            "text-[13px] leading-5",
                            checked ? "text-on-surface" : "text-on-surface-variant",
                          )}
                        >
                          {requirement}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[12px] text-on-surface-variant/70">
                {t.apply.checklistNote}
              </p>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/5 pt-5">
            <Button
              variant="creator"
              icon="send"
              disabled={!canSend}
              onClick={send}
              className="w-full sm:w-auto"
            >
              {t.apply.sendDraft}
            </Button>
            {!canSend && (
              <span className="text-[12px] text-on-surface-variant/70">
                {t.apply.sendDraftHint}
              </span>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function SentDraft({
  draft,
  previewUrl,
  onReplace,
}: {
  draft: DraftUpload;
  previewUrl: string | null;
  onReplace: () => void;
}) {
  return (
    <div className="mt-5">
      <div className="grid gap-5 sm:grid-cols-[140px_1fr]">
        {previewUrl ? (
          <video
            src={previewUrl}
            controls
            playsInline
            preload="metadata"
            className="aspect-[9/16] w-full rounded-md bg-black object-contain sm:w-[140px]"
          />
        ) : (
          <div className="grid aspect-[9/16] w-full place-items-center rounded-md bg-surface-container-lowest sm:w-[140px]">
            <Icon name="movie" size={26} className="text-on-surface-variant/40" />
          </div>
        )}

        <div className="min-w-0">
          <p className="flex items-center gap-2 font-display text-[15px] font-semibold text-on-surface">
            <Icon name="schedule_send" size={18} className="text-amber" />
            {t.apply.draftSentTitle}
          </p>
          <p className="mt-1.5 text-[13px] leading-5 text-on-surface-variant">
            {t.apply.draftSentNote}
          </p>

          <p className="numeric mt-3 truncate text-[12px] text-on-surface-variant/70">
            {draft.fileName} · {formatBytes(draft.sizeBytes)}
            {draft.durationSeconds !== null
              ? ` · ${t.approvals.duration(draft.durationSeconds)}`
              : ` · ${t.apply.durationUnknown}`}
          </p>
          <p className="text-[12px] text-on-surface-variant/70">
            {t.apply.draftSentAt}: {formatMoment(draft.submittedAt)}
          </p>

          <p className="label-caps mt-4 text-[10px]">{t.apply.captionLabel}</p>
          <p className="mt-1.5 text-[13px] leading-5 text-on-surface">{draft.caption}</p>

          <Button variant="subtle" size="sm" icon="cached" className="mt-5" onClick={onReplace}>
            {t.apply.replaceDraft}
          </Button>
        </div>
      </div>
    </div>
  );
}
