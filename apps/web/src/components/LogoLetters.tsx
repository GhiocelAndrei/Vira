import { cn } from "../lib/cn";

/**
 * "Vira" set as four marks rather than as type.
 *
 * Each letter is drawn in the same language as the V: one continuous stroke,
 * round caps, the same violet gradient, all four sharing one panel. The word
 * stops being a font and becomes a drawing — which is the point, because the V
 * was never a letter either. It is a rising measurement line that happens to
 * read as one.
 *
 * The data point stays on the V alone. It is the thing the mark means, and a
 * dot on every letter would turn an argument into a pattern.
 *
 * NOTE: the logo is an open decision (brandbook §08.03 — settled after the name
 * and the typographic variant). This is an exploration to look at, not a mark
 * to build a system on.
 */

const GRADIENT_FROM = "#947dff";
const GRADIENT_TO = "#cabeff";

interface Letter {
  key: string;
  label: string;
  /** Stroked outline of the letterform, on a 32×32 grid. */
  path: string;
  /** Where the measurement point sits, if this letter has one. */
  dot?: { cx: number; cy: number };
  /**
   * The box cropped to this letter's own ink, height fixed at 24 so every
   * letter renders at one cap height.
   *
   * Without it each glyph sat in a slot as wide as the widest — an I taking the
   * space of an A — and the word read spaced out like a licence plate instead
   * of set like a wordmark. The narrow letters get narrow slots and the
   * rhythm closes up.
   */
  viewBox: string;
  /** Slot width relative to its height, derived from the box above. */
  ratio: number;
}

/**
 * Capitals, on one cap height.
 *
 * Every letter runs from y=7 to y=25 so the four badges share a baseline and a
 * cap line — with mixed case the i and a sat visually lower than the V and the
 * word wobbled. Set as capitals it reads as a wordmark rather than as a
 * spelling.
 */
const letters: Letter[] = [
  {
    key: "v",
    label: "V",
    // The original: down and back up, overshooting into the point.
    path: "M7 7 L16 25 L25 7",
    dot: { cx: 25, cy: 7 },
    viewBox: "5 4 24 24",
    ratio: 1,
  },
  {
    key: "i",
    label: "I",
    // A bare stem. The word around it does the disambiguating, and crossbars
    // would import a serif into a set that has none.
    path: "M16 7 L16 25",
    viewBox: "13 4 6 24",
    ratio: 6 / 24,
  },
  {
    key: "r",
    label: "R",
    // Stem, bowl, leg — three strokes, one continuous weight.
    path: "M11 25 L11 7 L18 7 A 5 5 0 0 1 18 17 L11 17 M16.5 17 L23 25",
    viewBox: "9 4 16 24",
    ratio: 16 / 24,
  },
  {
    key: "a",
    label: "A",
    // Apex at the same height the V's arm reaches for.
    path: "M7 25 L16 7 L25 25 M11 18.5 L21 18.5",
    viewBox: "5 4 22 24",
    ratio: 22 / 24,
  },
];

export function LogoLetters({
  size = 34,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // One container instead of four.
    //
    // Four circles read as four objects that happen to be adjacent; a single
    // panel reads as a word. The letters keep their own geometry — only the
    // thing around them changed — so the badge can still be split back apart
    // if the mark ever needs to travel as separate pieces.
    <span
      className={cn(
        "inline-flex items-center rounded-xl border border-primary/25 bg-primary/10",
        className,
      )}
      role="img"
      aria-label="Vira"
      style={{
        gap: Math.round(size * 0.17),
        paddingInline: Math.round(size * 0.3),
        paddingBlock: Math.round(size * 0.16),
      }}
    >
      {letters.map((letter) => (
        <span
          key={letter.key}
          aria-hidden="true"
          className="grid shrink-0 place-items-center"
          style={{ width: size * 0.62 * letter.ratio, height: size * 0.62 }}
        >
          <svg
            viewBox={letter.viewBox}
            fill="none"
            role="presentation"
            style={{ width: "100%", height: "100%" }}
          >
            <defs>
              {/* One gradient per letter: a shared id would collide the moment
                  two of these render on the same page. */}
              <linearGradient
                id={`vira-letter-${letter.key}`}
                x1="4"
                y1="26"
                x2="27"
                y2="5"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor={GRADIENT_FROM} />
                <stop offset="1" stopColor={GRADIENT_TO} />
              </linearGradient>
            </defs>

            <path
              d={letter.path}
              stroke={`url(#vira-letter-${letter.key})`}
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {letter.dot && <circle cx={letter.dot.cx} cy={letter.dot.cy} r="3.2" fill={GRADIENT_TO} />}
          </svg>
        </span>
      ))}
    </span>
  );
}
