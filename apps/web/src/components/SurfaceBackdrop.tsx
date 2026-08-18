import { cn } from "../lib/cn";

/**
 * The texture every next10 surface sits on.
 *
 * One layer now: the mark's gesture — a line that rises into a data point —
 * tiled at wallpaper scale, which makes the background ownable instead of
 * fashionable.
 *
 * A ruled grid used to sit under it, arguing measurement: the product's whole
 * claim is that views are read and counted rather than estimated, and a faint
 * ruled field said that before a word did. On the near-black it was drawn for it
 * was a texture; on pure black it became a diagram, and the page started looking
 * like a dashboard behind its own headline. The argument it was making is made
 * better by the strokes, which say *rising* as well as *measured*.
 *
 * Grain was a third layer here once. It now lives on `body::after` in the
 * stylesheet, applied app-wide — two copies stacked to over 7%, which is well
 * past the point where noise stops reading as a surface and starts reading as
 * an effect.
 *
 * Fixed rather than absolute: the texture stays put while a long page scrolls
 * over it, so it reads as the surface the product is printed on.
 *
 * Sits at `z-0`, so any page using it must lift its own content to `z-10` and
 * must not paint an opaque background over the top.
 */
export function SurfaceBackdrop({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none fixed inset-0 z-0 overflow-hidden", className)}
    >
      {/* The mark's rising line, tiled. Centred now that it is the only layer —
          it used to be pushed off-axis so it and the grid did not peak in the
          same place and read as one stamp. */}
      <svg
        className="absolute inset-0 h-full w-full text-primary"
        style={{
          opacity: 0.04,
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, #000 12%, transparent 76%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 70% at 50% 45%, #000 12%, transparent 76%)",
        }}
      >
        <defs>
          <pattern
            id="next10-rise"
            width="260"
            height="260"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-4)"
          >
            <path
              d="M-10 215 L150 62"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx="150" cy="62" r="2.6" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#next10-rise)" />
      </svg>
    </div>
  );
}
