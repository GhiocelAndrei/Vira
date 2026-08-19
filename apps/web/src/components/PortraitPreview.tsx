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
  /**
   * The three best-grounded axes carry the example rationales.
   *
   * It was one, and one is a caption: the reader saw a chart with eight labels
   * and a sentence about a single word on it, which reads as the only thing the
   * analysis actually found. Three is where it stops looking like an example and
   * starts looking like a reading — and it is still short of the eight the app
   * shows, which is the difference between a preview and the screen itself.
   *
   * Sorted by confidence, not by score. The panel is arguing that the portrait
   * is *grounded*, so the axes it puts in front are the ones with the most clips
   * behind them, not the ones that happen to be high. Ungrounded axes are
   * filtered out entirely — the honest gap (`humor`, no clips) belongs on
   * `/profil`, where a creator can see what their own portrait is missing, not
   * on a page that is introducing the product.
   */
  const leads = [...STYLE_DIMENSIONS]
    .filter((key) => portrait.styleEvidence[key].evidenceClipIds.length > 0)
    .sort((a, b) => portrait.styleEvidence[b].confidence - portrait.styleEvidence[a].confidence)
    .slice(0, 3);

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
          {/* Capped at 80 words by the generator and written as profile copy, so
              it is quoted whole. The clamp was at four lines, which cut the
              fixture's last sentence — the one where the creator refuses a
              category — on a panel whose entire argument is that the portrait
              says specific things. `line-clamp-6` stays as a guard against a
              generator that ignores ADR-012, not as a design decision. */}
          <p className="mt-2 line-clamp-6 text-[13px] leading-relaxed text-on-surface">
            {portrait.narrativeDossier}
          </p>

          {/* The brands, in this column rather than in a band of their own.
           *
           * They belong beside the dossier: both are what the clips contained.
           * As a full-width strip they were a fourth region in a panel that
           * already had three, and they left the text column ending two hundred
           * pixels above the radar next to it — a hole big enough that the panel
           * read as a chart with a caption stuck in the corner.
           *
           * `disclosed` travels with each name, or the row becomes a claim the
           * analysis never made (ADR-016): a product on screen is not a
           * sponsorship. */}
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

          {/* What the shape is for. The panel drew eight axes and never said
              what the product does with them, which leaves a reader to file it
              as a personality quiz. */}
          <p className="mt-5 border-t border-white/5 pt-4 text-[12px] leading-relaxed text-on-surface-variant/80">
            {t.landing.showcaseNote}
          </p>
        </div>

        {/* Labelled, and sized so the labels are legible.
            An unlabelled radar is a shape with no claim in it — the reader sees
            that something was measured but not what, which is the opposite of a
            portrait. At 200px the 10px labels rendered near 5px; 330px puts them
            around 9, the same as the profile screen. */}
        <StyleRadar
          styleVector={portrait.styleVector}
          styleEvidence={portrait.styleEvidence}
          selected={leads}
          className="mx-auto w-full max-w-[330px] shrink-0 sm:w-[330px]"
        />
      </div>

      {/* The readings, side by side under both columns rather than stacked in
          the left one.
       *
       * Three rationales in the text column would have made it half again as
       * tall as the radar beside it, so the panel would have ended in a column
       * of prose with a chart floating at the top of it. Across the full width
       * they are three parallel statements, which is what they are — and they
       * sit directly under the shape whose vertices they explain.
       *
       * Each carries its clip count. That number is the entire claim the product
       * makes: not that a machine had an opinion about a creator, but that it
       * can say which clips it read to get there. A rationale without it is the
       * same sentence any tool could have generated. */}
      {leads.length > 0 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="label-caps text-[9px]">{t.portrait.whyThisScore}</p>
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
            {leads.map((key) => (
              <div
                key={key}
                className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
              >
                <p className="font-display text-[13px] font-semibold text-creator">
                  {t.portrait.dimensions[key]}
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-on-surface-variant">
                  {portrait.styleEvidence[key].rationale}
                </p>
                <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-on-surface-variant/60">
                  <Icon name="play_circle" size={11} />
                  {t.portrait.clipsCited(portrait.styleEvidence[key].evidenceClipIds.length)}
                </p>
              </div>
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
