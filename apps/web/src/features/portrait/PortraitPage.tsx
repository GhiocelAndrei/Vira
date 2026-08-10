import { Icon } from "../../components/Icon";
import { Card, Chip } from "../../components/ui";
import { t } from "@vira/core";
import { formatCompactNumber, formatViews } from "@vira/core";
import { useCreatorProfile } from "../../lib/queries";

/**
 * The creator's profile — their real TikTok identity + clips (from the Display API via the gateway).
 *
 * The AI Creator Portrait (archetype, style dimensions, evidence-backed claims) is the next slice;
 * until it lands this screen is honest about it being pending rather than showing a fixture.
 */
export default function PortraitPage() {
  const { data: profile, isLoading } = useCreatorProfile();

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
            <img src={profile.avatarUrl} alt={profile.displayName} className="h-full w-full object-cover" />
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

      {/* AI portrait — pending until the next slice. */}
      <Card className="relative mt-8 overflow-hidden p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle,#cabeff,transparent 70%)" }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <p className="label-caps">{t.portrait.archetype}</p>
            <Chip tone="amber">{t.portrait.preliminary}</Chip>
          </div>
          <h2 className="mt-3 font-display text-[28px] font-semibold leading-tight text-on-surface">
            {t.portrait.pendingTitle}
          </h2>
          <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-on-surface-variant">
            {t.portrait.pendingText}
          </p>
        </div>
      </Card>

      {/* Real clips pulled from TikTok. */}
      <section className="mt-10">
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
                    <p className="line-clamp-2 font-body text-[13px] text-on-surface">{clip.title}</p>
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
    </div>
  );
}
