import { Icon } from "./Icon";
import { cn } from "../lib/cn";
import { portrait, STYLE_DIMENSIONS, t } from "@vira/core";

/**
 * The creator portrait, shown rather than described.
 *
 * Two paragraphs used to explain that the product reads a creator's clips and
 * learns what works for them. This is that, in the product's own interface.
 *
 * Real fixture data in the real contract shape (`CreatorPortrait`, ADR-011 →
 * ADR-016): the same object `/profil` renders, so the landing cannot advertise a
 * screen the product does not have. It used to show an archetype, a tagline and
 * a standalone claim with a receipt — none of which exist in the contract, and
 * two of the old claims were things the generator is explicitly forbidden to
 * produce (a percentile ranking, and retention attributed to a filming choice).
 *
 * Four of the eight axes — enough to show the shape, not so many that the panel
 * turns into a table — and one rationale, because per-dimension grounding is the
 * thing that makes this different from a personality quiz.
 */
export function PortraitPreview({ className }: { className?: string }) {
  const axes = STYLE_DIMENSIONS.slice(0, 4);
  /** The strongest grounded axis carries the example rationale. */
  const lead = [...STYLE_DIMENSIONS]
    .filter((key) => portrait.styleEvidence[key].evidenceClipIds.length > 0)
    .sort((a, b) => portrait.styleEvidence[b].confidence - portrait.styleEvidence[a].confidence)[0];

  return (
    <div
      className={cn(
        // Reads as a device without drawing one: a tall panel, lit from above,
        // sitting slightly proud of the page.
        //
        // It capped itself at 380px, which was right when it only ever appeared
        // beside a column of text. Now it also sits in a two-up grid where the
        // other panel fills its cell, and a self-centring 380px next to a
        // full-width card reads as a mistake. `cn` is a plain join, not
        // tailwind-merge, so a caller cannot override a width set here — the cap
        // belongs to whoever places it.
        "surface-lit w-full overflow-hidden rounded-2xl p-6",
        className,
      )}
    >
      <p className="label-caps text-[9px] text-creator">{t.portrait.dossierTitle}</p>

      {/* The dossier is capped at 80 words by the generator and written as
          profile copy, so it is quoted as-is and clamped rather than summarised. */}
      <p className="mt-3 line-clamp-4 text-[13px] leading-relaxed text-on-surface">
        {portrait.narrativeDossier}
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {axes.map((key) => (
          <div key={key}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-on-surface-variant">
                {t.portrait.dimensions[key]}
              </span>
              <span className="numeric text-[12px] font-semibold text-on-surface">
                {Math.round(portrait.styleVector[key] * 100)}
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-creator"
                style={{ width: `${portrait.styleVector[key] * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* The part that matters: a score that carries its own reason and the
          clips it was read from. */}
      {lead && (
        <div className="mt-6 border-t border-white/5 pt-4">
          <p className="label-caps text-[9px]">
            {t.portrait.whyThisScore} · {t.portrait.dimensions[lead]}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-on-surface-variant">
            {portrait.styleEvidence[lead].rationale}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-on-surface-variant/50">
            <Icon name="play_circle" size={13} />
            {t.portrait.groundedIn(portrait.styleEvidence[lead].evidenceClipIds.length)}
          </p>
        </div>
      )}
    </div>
  );
}
