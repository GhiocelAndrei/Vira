import { Icon } from "./Icon";
import { GeneratedAvatar } from "./GeneratedAvatar";
import { StyleRadar } from "./StyleRadar";
import { cn } from "../lib/cn";
import { currentCreator, formatCompactNumber, portrait, STYLE_DIMENSIONS, t } from "@vira/core";

/**
 * The creator portrait, shown rather than described.
 *
 * Two paragraphs used to explain that the product reads a creator's clips and
 * learns what works for them. This is that, in the product's own interface — the
 * same radar `/profil` draws, from the same shared component, so the landing
 * cannot advertise a chart the app does not have.
 *
 * It was the radar and a paragraph, which showed one thing and read as a chart
 * with a caption. A portrait is a document: who it is about, what it says, what
 * it read, and what produced it. So the panel carries five regions rather than
 * one — identity, dossier, the shape, the brands the clips actually contained,
 * and the provenance stamp. None of it is invented: every field is on the
 * `CreatorPortrait` contract (ADR-011 → ADR-016) and every value comes from the
 * same fixture `/profil` renders.
 *
 * The brands are the part nobody else shows, and they are the reason `disclosed`
 * travels beside each name: a product on screen is not a sponsorship, and a list
 * without that distinction is a claim the analysis never made (ADR-016).
 */
export function PortraitPreview({ className }: { className?: string }) {
  /** The strongest grounded axis carries the example rationale. */
  const lead = [...STYLE_DIMENSIONS]
    .filter((key) => portrait.styleEvidence[key].evidenceClipIds.length > 0)
    .sort((a, b) => portrait.styleEvidence[b].confidence - portrait.styleEvidence[a].confidence)[0];

  /** Distinct clips cited anywhere in the evidence — what the portrait was read from. */
  const clipCount = new Set(
    STYLE_DIMENSIONS.flatMap((key) => portrait.styleEvidence[key].evidenceClipIds),
  ).size;

  return (
    <div className={cn("w-full", className)}>
      {/* Identity. Without it the panel is a chart about nobody. */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/5 pb-4">
        {/* Generated, not photographed. Alex Dumitrescu is a fixture, and a
            real person's face on a fabricated profile — on a page that goes
            public — attaches somebody's likeness to claims about content they
            never filmed. A real `avatarUrl` still wins when there is one. */}
        {currentCreator.avatarUrl ? (
          <img
            src={currentCreator.avatarUrl}
            alt={currentCreator.displayName}
            className="h-11 w-11 shrink-0 rounded-full border border-white/10 object-cover"
          />
        ) : (
          <GeneratedAvatar
            seed={currentCreator.handle}
            label={currentCreator.displayName}
            size={44}
            className="border border-white/10"
          />
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-semibold text-on-surface">
            {currentCreator.displayName}
          </p>
          <p className="numeric text-[12px] text-on-surface-variant/70">
            {formatCompactNumber(currentCreator.followerCount)} {t.portrait.followers}
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-on-surface-variant/70">
          <Icon name="play_circle" size={13} />
          {t.portrait.groundedIn(clipCount)}
        </span>
      </div>

      <div className="grid gap-6 pt-5 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="min-w-0">
          <p className="label-caps text-[9px] text-creator">{t.portrait.dossierTitle}</p>
          {/* Capped at 80 words by the generator and written as profile copy, so
              it is quoted as-is and clamped rather than summarised. */}
          <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-on-surface">
            {portrait.narrativeDossier}
          </p>

          {lead && (
            <div className="mt-5">
              <p className="label-caps text-[9px]">
                {t.portrait.whyThisScore} · {t.portrait.dimensions[lead]}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-on-surface-variant">
                {portrait.styleEvidence[lead].rationale}
              </p>
            </div>
          )}
        </div>

        <StyleRadar
          styleVector={portrait.styleVector}
          styleEvidence={portrait.styleEvidence}
          selected={lead}
          showLabels={false}
          className="mx-auto w-full max-w-[200px] shrink-0 sm:w-[200px]"
        />
      </div>

      {/* The brands the clips actually contained. `disclosed` beside each name,
          or the row reads as a sponsorship list. */}
      {portrait.observedProducts.length > 0 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="label-caps text-[9px]">{t.portrait.productsTitle}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {portrait.observedProducts.map((product) => (
              <span
                key={product.name}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                  product.disclosed
                    ? "border-mint/25 bg-mint/[0.07] text-mint"
                    : "border-amber/25 bg-amber/[0.07] text-amber",
                )}
              >
                <Icon name={product.disclosed ? "verified" : "info"} size={13} />
                {product.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* No provenance stamp here. It belongs on `/profil`, where a creator can
          check what produced their own portrait (CLAUDE.md rule 8) — on a
          landing page a model id and a prompt version are engineering exhaust in
          front of somebody deciding whether to sign up. */}
    </div>
  );
}
