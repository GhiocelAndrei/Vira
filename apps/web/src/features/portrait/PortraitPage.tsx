import { useState } from "react";
import { Icon } from "../../components/Icon";
import { Card, Chip } from "../../components/ui";
import { STYLE_DIMENSIONS, t } from "@vira/core";
import { formatCompactNumber, formatViews } from "@vira/core";
import type { CreatorPortrait, StyleDimensionKey } from "@vira/core";
import { cn } from "../../lib/cn";
import { useCreatorPortrait, useCreatorProfile } from "../../lib/queries";
import type { ClipDto } from "../../lib/types";

/**
 * The creator's profile — their real TikTok identity and clips, plus the AI
 * portrait generated from them.
 *
 * The portrait renders the `CreatorPortrait` contract (ADR-011 → ADR-016) and
 * nothing else. Three rules from that contract shape this screen more than any
 * layout decision:
 *
 *  - Evidence is per style dimension, not a list of claims. Every axis shows the
 *    reason it scored what it did and the clips behind it.
 *  - An axis with no clips behind it is *unmeasured*, not average. It gets a
 *    different treatment entirely, because 0.5-with-no-evidence and a genuine
 *    mid score are different facts (CLAUDE.md rule 3).
 *  - `limitations` is never rendered. ADR-015 moved the caveats there precisely
 *    because they no longer sit beside the prose that gave them context.
 *
 * Two tabs, portrait first. The clips are the raw material; the portrait is what
 * is made of them, and that is the thing a creator opens this screen for.
 */
type ProfileTab = "portrait" | "clips";

/** An axis the model could not ground: no clips cited. */
function isUngrounded(portrait: CreatorPortrait, key: StyleDimensionKey): boolean {
  return portrait.styleEvidence[key].evidenceClipIds.length === 0;
}

export default function PortraitPage() {
  const { data: profile, isLoading } = useCreatorProfile();
  const { data: portrait } = useCreatorPortrait();
  const [tab, setTab] = useState<ProfileTab>("portrait");

  if (isLoading || !profile) {
    return (
      <div className="mx-auto max-w-container px-6 py-16 text-center text-[14px] text-on-surface-variant md:px-12">
        {t.portrait.loading}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-container px-6 py-10 md:px-12">
      {/* Identity — real TikTok profile. */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="h-24 w-24 overflow-hidden rounded-full border border-creator/20 bg-creator/10">
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center font-display text-[32px] font-bold text-creator">
              {profile.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <h1 className="font-display text-headline-lg text-on-surface">{profile.displayName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Chip tone="creator">
              <span className="numeric">{formatCompactNumber(profile.followerCount)}</span>
              <span className="ml-1 font-normal">{t.portrait.followers}</span>
            </Chip>
          </div>
        </div>
      </div>

      <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
        {(
          [
            { id: "portrait", label: t.portrait.tabPortrait },
            { id: "clips", label: t.portrait.tabVideos },
          ] as const
        ).map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            aria-pressed={tab === entry.id}
            className={cn(
              "rounded-full px-4 py-1.5 font-display text-[13px] font-semibold transition-colors",
              tab === entry.id
                ? "bg-creator text-on-creator"
                : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "portrait" &&
        (portrait ? (
          <Portrait portrait={portrait} clips={profile.clips} />
        ) : (
          <Card className="mt-6 p-8">
            <h2 className="font-display text-[24px] font-semibold leading-tight text-on-surface">
              {t.portrait.pendingTitle}
            </h2>
            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-on-surface-variant">
              {t.portrait.pendingText}
            </p>
          </Card>
        ))}

      {tab === "clips" && (
        <section className="mt-6">
          <h2 className="font-display text-headline-md text-on-surface">{t.portrait.yourClips}</h2>
          {profile.clips.length === 0 ? (
            <p className="mt-4 text-[13px] text-on-surface-variant">{t.portrait.noClips}</p>
          ) : (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {profile.clips.map((clip) => (
                <a
                  key={clip.tikTokVideoId}
                  href={clip.embedLink ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-lg border border-white/5 bg-surface-container-low transition-colors hover:border-white/15"
                >
                  <div className="aspect-[9/16] w-full overflow-hidden bg-surface-container-lowest">
                    {clip.coverImageUrl ? (
                      <img
                        src={clip.coverImageUrl}
                        alt={clip.title ?? ""}
                        className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-on-surface-variant/40">
                        <Icon name="movie" size={28} />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    {clip.title && (
                      <p className="line-clamp-2 font-body text-[13px] text-on-surface">
                        {clip.title}
                      </p>
                    )}
                    <p className="numeric mt-1.5 flex items-center gap-1 text-[12px] text-on-surface-variant">
                      <Icon name="visibility" size={14} />
                      {formatViews(clip.viewCount)} {t.portrait.views}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Portrait({ portrait, clips }: { portrait: CreatorPortrait; clips: ClipDto[] }) {
  /** Citations are `tikTokVideoId`s (ADR-014), which is exactly the key the
   *  profile's own clips carry — so the evidence can be a link, not an id. */
  const clipById = new Map(clips.map((clip) => [clip.tikTokVideoId, clip]));

  return (
    <div className="mt-6 flex flex-col gap-5">
      {/* "Despre creator" — written by the generator as reader-facing profile
          copy (ADR-015), so it is rendered as prose and nothing is added to it. */}
      <Card className="p-7">
        <p className="label-caps text-[10px]">{t.portrait.dossierTitle}</p>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-on-surface">
          {portrait.narrativeDossier}
        </p>
      </Card>

      <Card className="p-7">
        <h2 className="font-display text-[16px] font-semibold text-on-surface">
          {t.portrait.styleDimensions}
        </h2>
        <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-on-surface-variant/70">
          {t.portrait.styleNote}
        </p>

        <ul className="mt-6 flex flex-col gap-6">
          {STYLE_DIMENSIONS.map((key) => {
            const value = portrait.styleVector[key];
            const evidence = portrait.styleEvidence[key];
            const ungrounded = isUngrounded(portrait, key);

            return (
              <li key={key}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-body text-[14px] font-semibold text-on-surface">
                    {t.portrait.dimensions[key]}
                  </span>
                  {ungrounded ? (
                    <Chip tone="neutral" icon="help">
                      {t.portrait.ungrounded}
                    </Chip>
                  ) : (
                    <span className="numeric text-[13px] text-on-surface-variant">
                      {Math.round(value * 100)}
                    </span>
                  )}
                </div>

                {/* An unmeasured axis gets a dashed, empty rail rather than a bar
                    at the halfway point — a filled bar would assert a reading
                    that was never taken. */}
                <div
                  className={cn(
                    "mt-2 h-1.5 w-full overflow-hidden rounded-full",
                    ungrounded ? "border border-dashed border-white/15" : "bg-white/[0.07]",
                  )}
                >
                  {!ungrounded && (
                    <div
                      className="h-full rounded-full bg-creator"
                      style={{ width: `${value * 100}%` }}
                    />
                  )}
                </div>

                <p
                  className={cn(
                    "mt-2.5 text-[13px] leading-relaxed",
                    ungrounded ? "text-on-surface-variant/60" : "text-on-surface-variant",
                  )}
                >
                  {ungrounded ? t.portrait.ungroundedNote : evidence.rationale}
                </p>

                {!ungrounded && (
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="text-[11px] text-on-surface-variant/50">
                      {t.portrait.groundedIn(evidence.evidenceClipIds.length)}
                    </span>
                    {evidence.evidenceClipIds.map((clipId) => {
                      const clip = clipById.get(clipId);
                      const label = clip?.title?.trim() || clipId;
                      return clip?.embedLink ? (
                        <a
                          key={clipId}
                          href={clip.embedLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-on-surface-variant transition-colors hover:border-white/25 hover:text-on-surface"
                        >
                          <Icon name="play_circle" size={13} />
                          <span className="truncate">{label}</span>
                        </a>
                      ) : (
                        <span
                          key={clipId}
                          className="mono inline-flex max-w-[220px] items-center gap-1 truncate rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-on-surface-variant/70"
                        >
                          {label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Brands seen on screen. `disclosed` sits beside every name because
          without it the list reads as a sponsorship roster (ADR-016). */}
      {portrait.observedProducts.length > 0 && (
        <Card className="p-7">
          <h2 className="font-display text-[16px] font-semibold text-on-surface">
            {t.portrait.productsTitle}
          </h2>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-on-surface-variant/70">
            {t.portrait.productsNote}
          </p>

          <ul className="mt-5 flex flex-col gap-3">
            {portrait.observedProducts.map((product) => (
              <li
                key={product.name}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-white/5 bg-surface-container-lowest/60 px-4 py-3"
              >
                <span className="font-body text-[14px] font-semibold text-on-surface">
                  {product.name}
                </span>
                <span className="text-[12px] text-on-surface-variant/60">
                  {t.portrait.productInClips(product.clipIds.length)}
                </span>
                <span className="ml-auto flex flex-wrap items-center gap-2">
                  {product.declaredByCreator && (
                    <Chip tone="neutral" icon="person">
                      {t.portrait.productDeclaredByCreator}
                    </Chip>
                  )}
                  <Chip
                    tone={product.disclosed ? "mint" : "amber"}
                    icon={product.disclosed ? "verified" : "info"}
                  >
                    {product.disclosed
                      ? t.portrait.productDisclosed
                      : t.portrait.productNotDisclosed}
                  </Chip>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Provenance. CLAUDE.md rule 8 requires every AI output to record what
          produced it; showing it is what makes the record checkable. */}
      <p className="mono px-1 text-[11px] text-on-surface-variant/40">
        {t.portrait.generatedWith(
          portrait.provenance.aiModel,
          portrait.provenance.promptVersion,
        )}{" "}
        ·{" "}
        {t.portrait.generatedAt(
          new Date(portrait.provenance.generatedAt).toLocaleDateString("ro-RO", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        )}
      </p>
    </div>
  );
}
