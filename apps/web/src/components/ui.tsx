import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon } from "./Icon";

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Which audience the button acts for. It no longer changes the colour — see
   * below — but it stays on the call sites, because it records whose action
   * this is, and that is the thing we would need if the sides ever have to be
   * told apart again.
   */
  variant?: "primary" | "business" | "creator" | "ghost" | "subtle";
  size?: "sm" | "md";
  icon?: string;
}

/**
 * Every filled button in the product is the same violet, whichever side is
 * acting.
 *
 * They used to differ: `business` and `creator` took the darker `-container`
 * shades, so "Aplică acum" was #947DFF while "Loghează-te" two screens earlier
 * was #CABEFF. Both are violet and neither is wrong on its own, but a reader
 * moving through the app met four or five slightly different fills and had no
 * way to learn that they all mean *this is the thing to press*. One fill, one
 * meaning. Audience still shows up everywhere else — chips, borders, tinted
 * panels, the icon tiles on the chooser.
 *
 * The exception is the feed, which paints its call to action with the
 * campaign's own accent. That is deliberate and lives in `FeedPage`: a card
 * there is a business showing up in the creator's space, and the accent is what
 * keeps one shaorma place from looking like the next.
 */
const filledVariants = new Set(["primary", "business", "creator"]);

export function Button({
  variant = "primary",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded font-body font-semibold",
        "transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out",
        "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        filledVariants.has(variant) &&
          "bg-primary text-on-primary shadow-primary-glow hover:bg-primary/90",
        variant === "ghost" &&
          "border border-primary/60 text-primary hover:bg-primary/10",
        variant === "subtle" &&
          "border border-white/5 bg-white/5 text-on-surface hover:border-white/15 hover:bg-white/10",
        className,
      )}
      {...rest}
    >
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                        */
/* -------------------------------------------------------------------------- */

export function Card({
  className,
  children,
  glass = false,
}: {
  className?: string;
  children: ReactNode;
  glass?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl",
        glass ? "glass" : "surface-lit surface-lit-interactive",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b border-white/5 px-6 py-4",
        className,
      )}
    >
      <h2 className="font-display text-[15px] font-semibold text-on-surface">{title}</h2>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Chip                                                                        */
/* -------------------------------------------------------------------------- */

type ChipTone = "neutral" | "primary" | "business" | "creator" | "mint" | "amber" | "error";

const chipTones: Record<ChipTone, string> = {
  neutral: "bg-white/5 text-on-surface-variant border-white/10",
  primary: "bg-primary/10 text-primary border-primary/20",
  business: "bg-business/10 text-business border-business/20",
  creator: "bg-creator/10 text-creator border-creator/20",
  mint: "bg-mint/10 text-mint border-mint/20",
  amber: "bg-amber/10 text-amber border-amber/20",
  error: "bg-error/10 text-error border-error/20",
};

export function Chip({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: ChipTone;
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
        "font-body text-[11px] font-semibold",
        chipTones[tone],
        className,
      )}
    >
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat tile                                                                   */
/* -------------------------------------------------------------------------- */

export function StatTile({
  label,
  value,
  hint,
  icon,
  trend,
  emphasis = false,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
  trend?: { direction: "up" | "down"; text: string };
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-start justify-between">
        <p className="label-caps">{label}</p>
        {icon && <Icon name={icon} size={18} className="text-on-surface-variant/60" />}
      </div>
      <p
        className={cn(
          "numeric mt-3 font-semibold text-on-surface",
          emphasis ? "text-[40px] leading-[48px] text-primary" : "text-[28px] leading-9",
        )}
      >
        {value}
      </p>
      {trend && (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-[12px]",
            trend.direction === "up" ? "text-mint" : "text-error",
          )}
        >
          <Icon name={trend.direction === "up" ? "trending_up" : "trending_down"} size={16} />
          {trend.text}
        </p>
      )}
      {hint && !trend && <p className="mt-2 text-[12px] text-on-surface-variant/70">{hint}</p>}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Sparkline / area chart                                                      */
/* -------------------------------------------------------------------------- */

export function AreaChart({
  points,
  className,
  height = 180,
}: {
  points: number[];
  className?: string;
  height?: number;
}) {
  if (points.length < 2) return null;

  const width = 600;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const coords = points.map((value, index) => {
    const x = (index / (points.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 16) - 8;
    return { x, y };
  });

  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      role="img"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cabeff" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#cabeff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#area-fill)" />
      <path
        d={line}
        fill="none"
        stroke="#cabeff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r="4"
        fill="#cabeff"
      />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

export function ProgressBar({
  /** 0–100. */
  percent,
  tone = "primary",
  className,
}: {
  percent: number;
  tone?: "primary" | "mint" | "amber";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fill = tone === "mint" ? "bg-mint" : tone === "amber" ? "bg-amber" : "bg-primary";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/5", className)}>
      {/* `scaleX`, not `width`: width relayouts and repaints on every frame,
          a transform is composited. Origin left so it grows from the start. */}
      <div
        className={cn("h-full w-full origin-left rounded-full transition-transform duration-300 ease-out", fill)}
        style={{ transform: `scaleX(${clamped / 100})` }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Demo-data badge — every simulated figure is labelled (demo spec).           */
/* -------------------------------------------------------------------------- */

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5",
        "px-2 py-0.5 font-body text-[10px] font-semibold uppercase tracking-[0.08em]",
        "text-on-surface-variant/70",
        className,
      )}
    >
      <Icon name="science" size={12} />
      date demo
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Page shell                                                                  */
/* -------------------------------------------------------------------------- */

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-headline-lg text-on-surface">{title}</h1>
        {subtitle && (
          <p className="mt-2 max-w-2xl text-body-md text-on-surface-variant">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
