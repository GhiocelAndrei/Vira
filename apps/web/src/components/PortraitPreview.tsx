import { Icon } from "./Icon";
import { cn } from "../lib/cn";
import { portrait } from "@vira/core";

/**
 * The creator portrait, shown rather than described.
 *
 * Two paragraphs used to explain that Vira reads a creator's clips and learns
 * what works for them. This is that, in the product's own interface — the
 * archetype, a few of the axes, and one claim with the clip and second it came
 * from. Nobody has to be told the AI is evidence-backed if the evidence is on
 * screen next to the sentence.
 *
 * Real fixture data, not a mockup: it is the same object `/profil` renders, so
 * the landing cannot drift into advertising a screen the product does not have.
 * Four of the eight axes — enough to show the shape, not so many that the panel
 * turns into a table.
 */
export function PortraitPreview({ className }: { className?: string }) {
  const axes = portrait.dimensions.slice(0, 4);
  const claim = portrait.claims[0];

  return (
    <div
      className={cn(
        "surface-lit overflow-hidden rounded-2xl p-6",
        // Reads as a device without drawing one: a tall panel, lit from above,
        // sitting slightly proud of the page.
        "mx-auto w-full max-w-[380px]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="label-caps text-[9px] text-creator">{portrait.archetype}</p>
        <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-1 text-[10px] font-semibold text-amber">
          Preliminar
        </span>
      </div>

      <p className="mt-3 font-display text-[19px] font-semibold leading-snug text-on-surface">
        „{portrait.tagline}”
      </p>

      <div className="mt-6 flex flex-col gap-3">
        {axes.map((axis) => (
          <div key={axis.key}>
            <div className="flex items-baseline justify-between">
              <span className="text-[12px] text-on-surface-variant">{axis.label}</span>
              <span className="numeric text-[12px] font-semibold text-on-surface">
                {axis.value}
              </span>
            </div>
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-creator" style={{ width: `${axis.value}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* The part that matters: a claim that carries its own receipt. */}
      <div className="mt-6 rounded-lg border border-white/[0.07] bg-white/[0.02] p-4">
        <p className="text-[12px] leading-relaxed text-on-surface">{claim.statement}</p>
        <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-on-surface-variant/60">
          <Icon name="play_circle" size={13} />
          {claim.evidence.clipTitle} · {claim.evidence.clipDate} · {claim.evidence.timestamp}
        </p>
      </div>
    </div>
  );
}
