import { cn } from "../lib/cn";

/**
 * A generated avatar, drawn from a seed rather than photographed.
 *
 * It exists because the alternative was worse. Fixture creators need a face on
 * screen, and the only faces available are real people's — putting one on a
 * fabricated profile, on a page that goes public, attaches somebody's likeness
 * to claims about content they never filmed. A generated mark is obviously
 * generated, which is the honest state of a creator who has not connected a
 * TikTok avatar yet.
 *
 * It doubles as the real fallback: a signed-in creator whose `avatarUrl` is null
 * gets this instead of an empty circle, and because it is derived from their
 * handle it is stable — the same person is the same colour every time, on every
 * screen, which is most of what an avatar is actually for.
 *
 * Deterministic, not random: `Math.random()` here would give one person a
 * different face on every render.
 */

/** djb2. Small, stable, and enough to spread a handful of seeds across a palette. */
function hash(seed: string): number {
  let value = 5381;
  for (let i = 0; i < seed.length; i += 1) {
    value = ((value << 5) + value + seed.charCodeAt(i)) >>> 0;
  }
  return value;
}

/**
 * Pairs from the product's own palette, never arbitrary hues. An avatar that
 * introduced a sixth colour would be the only thing on the page outside the
 * system, and at 44px that reads as a bug rather than as variety.
 */
const PAIRS: [string, string][] = [
  ["#947dff", "#cabeff"],
  ["#80A8FF", "#AFC8FF"],
  ["#7CFFB2", "#80A8FF"],
  ["#FFCC7C", "#947dff"],
  ["#cabeff", "#7CFFB2"],
  ["#AFC8FF", "#947dff"],
];

export function GeneratedAvatar({
  seed,
  label,
  size = 44,
  className,
}: {
  /** Stable identity — a handle, not a display name, which people change. */
  seed: string;
  /** What the avatar stands for; the initial is taken from it. */
  label: string;
  size?: number;
  className?: string;
}) {
  const h = hash(seed);
  const [from, to] = PAIRS[h % PAIRS.length];
  const angle = h % 360;
  // Two soft lobes, placed off-centre by the seed so no two look alike.
  const lobeX = 26 + (h % 30);
  const lobeY = 24 + ((h >> 3) % 34);
  const initial = label.trim().charAt(0).toUpperCase();
  const gradientId = `avatar-${h.toString(36)}`;

  return (
    <span
      className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-full", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} gradientTransform={`rotate(${angle} 0.5 0.5)`}>
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gradientId})`} />
        <circle cx={lobeX} cy={lobeY} r="34" fill="#ffffff" opacity="0.18" />
        <circle cx={100 - lobeX} cy={100 - lobeY} r="26" fill="#0a0a0c" opacity="0.14" />
      </svg>

      {/* The initial sits on top in the page's own dark, so it reads at 24px as
          well as at 96 and never fights the gradient for contrast. */}
      <span
        className="relative font-display font-bold text-[#0a0a0c]"
        style={{ fontSize: Math.round(size * 0.38) }}
      >
        {initial}
      </span>
    </span>
  );
}
