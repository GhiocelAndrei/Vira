import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Button, Card } from "../../components/ui";
import { cn } from "../../lib/cn";
import { t, formatMoney, formatViews } from "@vira/core";
import { useApplyToCampaign, useCreatorCampaigns, useCreatorProfile } from "../../lib/queries";
import { estimateEarnings, presentationFor, rateForObjective } from "../../lib/feed";

/**
 * Apply to a single campaign by uploading a draft video. Both the feed's "Aplică la campanie" and the
 * marketplace's "Aplică acum" land here (`/campanii/:campaignId/aplica`).
 *
 * The draft is the creator's proposed clip — the brand reviews it in the approval queue before the
 * creator posts natively on TikTok (CLAUDE.md: we never post for them; we verify afterwards). The
 * file stays client-side for now: there is no upload endpoint yet, so submit is a local confirmation.
 * TODO(api): POST /creator/campaigns/{id}/applications (multipart) → surface in the brand queue.
 */

const MAX_DRAFT_MB = 200;
const MAX_DRAFT_BYTES = MAX_DRAFT_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["video/mp4", "video/quicktime"]; // MP4, MOV

export default function CampaignApplyPage() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const { data: dtos } = useCreatorCampaigns();
  const { data: profile } = useCreatorProfile();
  const apply = useApplyToCampaign();
  const avgViews = profile?.aggregates.avgViews ?? 0;

  const loading = dtos === undefined;
  const campaign = dtos?.find((c) => c.id === campaignId);

  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const accent = campaign ? presentationFor(campaign.objective).accent : "#947dff";

  const estimate = useMemo(() => {
    if (!campaign) return null;
    const rate = rateForObjective(campaign.objective);
    return { rate, ...estimateEarnings(rate, avgViews) };
  }, [campaign, avgViews]);

  function acceptFile(next: File | undefined | null) {
    if (!next) return;
    if (!ACCEPTED_TYPES.includes(next.type)) {
      setError(t.apply.invalidType);
      return;
    }
    if (next.size > MAX_DRAFT_BYTES) {
      setError(t.apply.tooLarge(MAX_DRAFT_MB));
      return;
    }
    setError(null);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(next);
    });
    setFile(next);
  }

  function clearFile() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onSubmit() {
    if (!file || !campaign) {
      setError(t.apply.missingDraft);
      return;
    }
    setError(null);
    apply.mutate(
      { campaignId: campaign.id, draft: file, note },
      {
        onSuccess: () => setSubmitted(true),
        onError: () => setError(t.apply.submitError),
      },
    );
  }

  /* ---- states before the form ---- */

  if (loading) {
    return <CenteredNote>{t.apply.loading}</CenteredNote>;
  }

  if (!campaign) {
    return (
      <Shell>
        <BackLink />
        <Card className="mt-8 p-8 text-center">
          <Icon name="search_off" size={32} className="mx-auto text-on-surface-variant/50" />
          <h1 className="mt-4 font-display text-headline-md text-on-surface">
            {t.apply.notFoundTitle}
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">{t.apply.notFoundText}</p>
          <div className="mt-6 flex justify-center">
            <Button variant="creator" onClick={() => navigate("/campanii")}>
              {t.apply.backToCampaigns}
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  if (campaign.locked) {
    return (
      <Shell>
        <BackLink />
        <Card className="mt-8 p-8 text-center">
          <Icon name="lock" size={32} className="mx-auto text-amber" />
          <h1 className="mt-4 font-display text-headline-md text-on-surface">
            {t.apply.lockedTitle}
          </h1>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {t.apply.lockedText(campaign.minFollowerThreshold.toLocaleString("ro-RO"))}
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="subtle" onClick={() => navigate("/campanii")}>
              {t.apply.backToCampaigns}
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  if (submitted) {
    return (
      <Shell>
        <Card className="mt-4 p-8 text-center">
          <div
            className="mx-auto grid h-14 w-14 place-items-center rounded-full"
            style={{ backgroundColor: `${accent}1a`, border: `1px solid ${accent}33` }}
          >
            <Icon name="check" size={28} style={{ color: accent }} />
          </div>
          <h1 className="mt-5 font-display text-headline-md text-on-surface">
            {t.apply.successTitle}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-body-md text-on-surface-variant">
            {t.apply.successText}
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Button variant="creator" onClick={() => navigate("/aplicatii")}>
              {t.apply.viewApplications}
            </Button>
            <Button variant="subtle" onClick={() => navigate("/campanii")}>
              {t.apply.backToCampaigns}
            </Button>
          </div>
        </Card>
      </Shell>
    );
  }

  /* ---- the apply form ---- */

  return (
    <Shell>
      <BackLink />

      <header className="mt-6">
        <p className="label-caps text-[10px]" style={{ color: accent }}>
          {campaign.brandName}
        </p>
        <h1 className="mt-1 font-display text-headline-lg text-on-surface">{t.apply.title}</h1>
        <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">{t.apply.subtitle}</p>
      </header>

      {/* Campaign summary — what the creator is applying to, and what it's worth to them. */}
      <Card className="mt-6 p-6">
        <div className="flex items-start gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-md"
            style={{ backgroundColor: `${accent}1a`, border: `1px solid ${accent}33` }}
          >
            <span className="font-display text-[15px] font-bold" style={{ color: accent }}>
              {campaign.brandName.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[20px] font-semibold text-on-surface">
              {campaign.title}
            </h2>
            {campaign.message && (
              <p className="mt-1 text-[13px] leading-snug text-on-surface-variant">
                {campaign.message}
              </p>
            )}
          </div>
        </div>

        {estimate && (
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-md border border-white/5 bg-surface-container-lowest/60 p-4">
            <div>
              <p className="label-caps text-[10px]">{t.apply.rate}</p>
              <p className="numeric mt-1 text-[18px] font-semibold text-creator">
                {formatMoney(estimate.rate)}
                <span className="ml-1 font-body text-[11px] font-normal text-on-surface-variant">
                  {t.apply.perMille}
                </span>
              </p>
            </div>
            <div>
              <p className="label-caps text-[10px]">{t.apply.yourEstimate}</p>
              <p className="numeric mt-1 text-[18px] font-semibold text-on-surface">
                {formatMoney(estimate.minMinor, { compactZeroCents: true })} –{" "}
                {formatMoney(estimate.maxMinor, { compactZeroCents: true })}
              </p>
              {avgViews > 0 && (
                <p className="mt-1 text-[11px] text-on-surface-variant/60">
                  {formatViews(avgViews)} {t.feed.viewsShort}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Draft upload. */}
      <Card className="mt-5 p-6">
        <h2 className="font-display text-[15px] font-semibold text-on-surface">
          {t.apply.draftTitle}
        </h2>
        <p className="mt-1 text-[12px] text-on-surface-variant/70">{t.apply.draftHint}</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(e) => acceptFile(e.target.files?.[0])}
        />

        {file && previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-black/40">
            <video src={previewUrl} controls className="max-h-[320px] w-full bg-black" />
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-on-surface">{file.name}</p>
                <p className="text-[11px] text-on-surface-variant/60">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] text-on-surface-variant transition-colors hover:text-on-surface"
                >
                  <Icon name="autorenew" size={15} />
                  {t.apply.replace}
                </button>
                <button
                  type="button"
                  onClick={clearFile}
                  className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] text-on-surface-variant transition-colors hover:text-error"
                >
                  <Icon name="delete" size={15} />
                  {t.apply.remove}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={cn(
              "mt-4 flex w-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center transition-colors",
              dragging
                ? "border-creator/60 bg-creator/5"
                : "border-white/15 bg-white/[0.02] hover:border-white/30",
            )}
          >
            <Icon name="video_library" size={30} className="text-on-surface-variant/60" />
            <div>
              <p className="text-[14px] font-semibold text-on-surface">{t.apply.dropHere}</p>
              <p className="mt-0.5 text-[12px] text-on-surface-variant/60">{t.apply.or}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded border border-creator/50 px-3 py-1.5 text-[13px] font-semibold text-creator">
              <Icon name="upload" size={16} />
              {t.apply.chooseFile}
            </span>
          </button>
        )}

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-[12px] text-error">
            <Icon name="error" size={15} />
            {error}
          </p>
        )}

        <div className="mt-6">
          <label htmlFor="apply-note" className="label-caps text-[10px]">
            {t.apply.noteLabel}
          </label>
          <textarea
            id="apply-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={t.apply.notePlaceholder}
            className="mt-2 w-full resize-none rounded-md border border-white/10 bg-surface-container-lowest/60 px-3.5 py-3 font-body text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:border-creator/50 focus:outline-none"
          />
        </div>

        <div className="mt-6 flex justify-end border-t border-white/5 pt-5">
          <Button
            variant="creator"
            icon={apply.isPending ? undefined : "send"}
            disabled={!file || apply.isPending}
            onClick={onSubmit}
          >
            {apply.isPending ? t.apply.submitting : t.apply.submit}
          </Button>
        </div>
      </Card>
    </Shell>
  );
}

/* -------------------------------------------------------------------------- */

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-2xl px-6 py-10 md:px-12">{children}</div>;
}

function BackLink() {
  return (
    <Link
      to="/campanii"
      className="inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant transition-colors hover:text-on-surface"
    >
      <Icon name="arrow_back" size={16} />
      {t.apply.back}
    </Link>
  );
}

function CenteredNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh items-center justify-center px-6 text-center text-[14px] text-on-surface-variant">
      {children}
    </div>
  );
}
