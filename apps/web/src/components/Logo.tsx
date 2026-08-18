import { cn } from "../lib/cn";

/**
 * next10 mark — the number, drawn.
 *
 * A one and an open zero, in the same single-weight stroke language the product
 * uses everywhere else. The ring is broken at the top right, and that gap is the
 * whole idea: the count is not closed, there is a next one. A sealed O would
 * have said "ten, finished".
 *
 * It replaces the rising measurement line, which was inherited from the previous
 * name and read as a V no matter what the comment claimed. A mark that has to be
 * explained before it stops looking like a letter is a mark that lost.
 *
 * Deliberately not a letterform: numerals survive a rename, and the name is not
 * settled (brandbook §08.03, and the trademark search is still not done).
 */
/**
 * Ten ticks, evenly spaced, first one at twelve o'clock.
 *
 * Generated rather than written out: ten hand-typed line elements is ten chances
 * for one of them to sit a degree off, and the evenness is the only reason the
 * ring reads as a count instead of as decoration.
 */
const TICKS = Array.from({ length: 10 }, (_, index) => {
  const lead = index === 0;
  const angle = ((index * 36 - 90) * Math.PI) / 180;
  const inner = 7.2;
  const outer = lead ? 14 : 12.6;
  return {
    key: index,
    lead,
    x1: 16 + Math.cos(angle) * inner,
    y1: 16 + Math.sin(angle) * inner,
    x2: 16 + Math.cos(angle) * outer,
    y2: 16 + Math.sin(angle) * outer,
  };
});

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    // A solid tile with the glyph knocked out of it, not an outlined badge.
    //
    // The old mark was a stroke floating inside a tinted circle: three levels of
    // translucency stacked, which is why it dissolved at 20px and why the ring
    // read as the loudest part of it. One filled shape holds at any size, and
    // the mark becomes the silhouette rather than the line inside it.
    <span
      className={cn("grid shrink-0 place-items-center bg-on-surface", className)}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.22) }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        style={{ width: size * 0.72, height: size * 0.72 }}
        role="presentation"
      >
        {/* Ten marks on a ring, and you can count them.
         *
         * That is the whole requirement: the name is a number, so the mark is
         * the number — not spelled, but countable. A chevron said "forward" and
         * could have belonged to anything; a "10" repeated the word sitting next
         * to it and read as "IO" at tile size.
         *
         * The tick at twelve o'clock is longer and violet: it is the next one,
         * which is the other half of the name, and it stops the ring reading as
         * a generic dial or a sunburst. It is also the only violet in the mark —
         * the tile went white because a filled violet square was a large slab of
         * accent on a page that has been shedding exactly that. */}
        {TICKS.map((tick) => (
          <line
            key={tick.key}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.lead ? "#947dff" : "#0a0a0c"}
            strokeWidth={tick.lead ? 3.2 : 2.8}
            strokeLinecap="round"
          />
        ))}
      </svg>
    </span>
  );
}

/** Mark plus wordmark. Used on public surfaces only — inside the app the
 *  top-left slot belongs to the signed-in user. */
export function Logo({
  size = 36,
  className,
  wordmarkClassName,
}: {
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-3", className)}>
      <LogoMark size={size} />
      {/* NEXT10, set rather than drawn.
       *
       * Caps at the heaviest weight Geist carries, tracked in hard. Capitals in
       * a wordmark always need negative tracking — the sidebearings a typeface
       * gives them are set for running text, and at logo size they read as gaps
       * between six separate letters instead of as one word.
       *
       * The uppercase is a CSS transform over a lowercase source, so the brand
       * string stays "next10" everywhere it is written and only the mark shouts.
       *
       * "NEXT" carries the word; "10" carries the promise, and the only colour
       * in the mark. Violet on two glyphs rather than on a whole fill — the
       * direction the rest of the surface is moving in as well.
       *
       * Set, not drawn: the logo is still an open decision (brandbook §08.03),
       * and custom letterforms are the expensive thing to commission twice. */}
      <span
        className={cn(
          "font-display font-black uppercase tracking-[-0.045em] text-on-surface",
          wordmarkClassName ?? "text-[21px]",
        )}
      >
        next<span className="text-primary">10</span>
      </span>
    </span>
  );
}
