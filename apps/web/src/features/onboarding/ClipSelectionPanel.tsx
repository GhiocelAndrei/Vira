import { useState } from "react";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/ui";
import { cn } from "../../lib/cn";
import { t } from "@vira/core";
import { formatViews } from "@vira/core";
import { MAX_SELECTED_CLIPS, useSelectClips } from "../../lib/queries";
import type { ClipDto } from "../../lib/types";

/**
 * One-time onboarding gate: right after a creator's first TikTok login they pick up to
 * {@link MAX_SELECTED_CLIPS} clips from the ones we fetched. Non-dismissable — the panel stays until
 * a selection is saved (the backend then flips `clipsSelected` and this stops rendering). The kept
 * clips become the creator's portfolio (AI portrait + matching); the rest are discarded server-side.
 */
export function ClipSelectionPanel({ clips }: { clips: ClipDto[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const select = useSelectClips();

  const atCap = selected.size >= MAX_SELECTED_CLIPS;
  const canConfirm = selected.size > 0 && !select.isPending;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SELECTED_CLIPS) next.add(id);
      return next;
    });
  }

  function confirm() {
    if (!canConfirm) return;
    select.mutate([...selected]); // on success the hook refreshes the profile → this panel unmounts
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-background/95 backdrop-blur-xl">
      <div className="mx-auto flex h-full w-full max-w-container flex-col px-5 py-6 md:px-10 md:py-10">
        <header className="shrink-0">
          <p className="label-caps mb-2 text-creator">{t.creatorOnboarding.step(1, 2)}</p>
          <h1 className="font-display text-headline-md text-on-surface md:text-headline-lg">
            {t.clipSelect.title}
          </h1>
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">
            {t.clipSelect.subtitle(MAX_SELECTED_CLIPS)}
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-creator/30 bg-creator/10 px-3 py-1 font-body text-[12px] font-semibold text-creator">
            <Icon name="check_circle" size={14} />
            {t.clipSelect.counter(selected.size, MAX_SELECTED_CLIPS)}
          </p>
        </header>

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          {clips.length === 0 ? (
            <p className="mt-10 text-center text-[14px] text-on-surface-variant">
              {t.clipSelect.empty}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3 lg:grid-cols-4">
              {clips.map((clip) => (
                <ClipTile
                  key={clip.tikTokVideoId}
                  clip={clip}
                  selected={selected.has(clip.tikTokVideoId)}
                  disabled={atCap && !selected.has(clip.tikTokVideoId)}
                  onToggle={() => toggle(clip.tikTokVideoId)}
                />
              ))}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[12px] text-on-surface-variant">
              {select.isError ? (
                <span className="text-error">{t.clipSelect.error}</span>
              ) : selected.size === 0 ? (
                t.clipSelect.minHint
              ) : (
                t.clipSelect.counter(selected.size, MAX_SELECTED_CLIPS)
              )}
            </p>
            <Button onClick={confirm} disabled={!canConfirm} icon="check">
              {select.isPending ? t.clipSelect.saving : t.clipSelect.confirm}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ClipTile({
  clip,
  selected,
  disabled,
  onToggle,
}: {
  clip: ClipDto;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border transition-colors",
        selected ? "border-creator" : "border-white/10",
        disabled && "opacity-40",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={selected}
        className="block aspect-[9/16] w-full text-left"
      >
        {clip.coverImageUrl ? (
          <img
            src={clip.coverImageUrl}
            alt={clip.title ?? ""}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-surface-container">
            <Icon name="movie" size={28} className="text-on-surface-variant/50" />
          </div>
        )}

        {/* Bottom gradient + metrics so text is legible over any cover. */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5">
          {clip.title && (
            <p className="line-clamp-2 font-body text-[11px] leading-snug text-white">{clip.title}</p>
          )}
          <p className="numeric mt-0.5 flex items-center gap-1 text-[10px] text-white/70">
            <Icon name="play_arrow" size={12} />
            {formatViews(clip.viewCount)} {t.clipSelect.views}
          </p>
        </div>

        {/* Selection marker. */}
        <span
          className={cn(
            "absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border transition-colors",
            selected
              ? "border-creator bg-creator text-background"
              : "border-white/60 bg-black/30 text-transparent",
          )}
        >
          <Icon name="check" size={15} filled />
        </span>
      </button>

      {clip.embedLink && (
        <a
          href={clip.embedLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
        >
          <Icon name="open_in_new" size={12} />
          {t.clipSelect.preview}
        </a>
      )}
    </div>
  );
}
