import { cn } from "../lib/cn";

/**
 * The texture every Vira surface sits on.
 *
 * Three layers, each there for a reason rather than for decoration:
 *
 *   grid    — measurement. The product's entire claim is that views are read
 *             and counted rather than estimated, and a faint ruled field says
 *             that before a word does.
 *   strokes — the logo's gesture, tiled. The mark is a V whose right arm
 *             overshoots into a data point; these are that same rising line at
 *             wallpaper scale, which makes the background ownable instead of
 *             fashionable.
 * Grain used to be the third layer here. It now lives on `body::after` in the
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
      {/* Ruled field, faded out towards the edges so it never boxes the page in. */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse 85% 65% at 50% 35%, #000 25%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse 85% 65% at 50% 35%, #000 25%, transparent 78%)",
        }}
      />

      {/* The mark's rising line, tiled. Anchored off-centre from the grid mask so
          the two layers do not peak in the same place and read as one stamp. */}
      <svg
        className="absolute inset-0 h-full w-full text-primary"
        style={{
          opacity: 0.07,
          maskImage: "radial-gradient(ellipse 75% 70% at 30% 55%, #000 10%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 70% at 30% 55%, #000 10%, transparent 72%)",
        }}
      >
        <defs>
          <pattern
            id="vira-rise"
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
        <rect width="100%" height="100%" fill="url(#vira-rise)" />
      </svg>

    </div>
  );
}
