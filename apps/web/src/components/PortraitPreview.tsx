import { Icon } from "./Icon";
import { StyleRadar } from "./StyleRadar";
import { cn } from "../lib/cn";
import { portrait, STYLE_DIMENSIONS, t } from "@vira/core";

/**
 * The creator portrait, shown rather than described.
 *
 * Two paragraphs used to explain that the product reads a creator's clips and
 * learns what works for them. This is that, in the product's own interface — the
 * same radar `/profil` draws, from the same shared component, so the landing
 * cannot advertise a chart the app does not have.
 *
 * Real fixture data in the real contract shape (`CreatorPortrait`, ADR-011 →
 * ADR-016). It used to show an archetype, a tagline and a standalone claim with
 * a receipt — none of which exist in the contract, and two of the old claims
 * were things the generator is explicitly forbidden to produce (a percentile
 * ranking, and retention attributed to a filming choice).
 *
 * The shape is the point. Four bars said "here are some numbers"; the silhouette
 * says "this is a specific person", which is the argument the page is making.
 */
export function PortraitPreview({ className }: { className?: string }) {
  /** The strongest grounded axis carries the example rationale. */
  const lead = [...STYLE_DIMENSIONS]
    .filter((key) => portrait.styleEvidence[key].evidenceClipIds.length > 0)
    .sort((a, b) => portrait.styleEvidence[b].confidence - portrait.styleEvidence[a].confidence)[0];

  return (
    <div
      className={cn(
        // Reads as a device without drawing one: a panel lit from above, sitting
        // slightly proud of the page. `cn` is a plain join, not tailwind-merge,
        // so a caller cannot override a width set here — the cap belongs to
        // whoever places it.
        "surface-lit w-full overflow-hidden rounded-2xl p-6",
        className,
      )}
    >
      <p className="label-caps text-[9px] text-creator">{t.portrait.dossierTitle}</p>

      {/* The dossier is capped at 80 words by the generator and written as
          profile copy, so it is quoted as-is and clamped rather than summarised. */}
      <p className="mt-2.5 line-clamp-3 text-[13px] leading-relaxed text-on-surface">
        {portrait.narrativeDossier}
      </p>

      <StyleRadar
        styleVector={portrait.styleVector}
        styleEvidence={portrait.styleEvidence}
        selected={lead}
        className="mt-4"
      />

      {/* The part that matters: a score that carries its own reason and the
          clips it was read from. */}
      {lead && (
        <div className="mt-2 border-t border-white/5 pt-4">
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
