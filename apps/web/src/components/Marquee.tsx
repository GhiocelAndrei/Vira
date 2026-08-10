import { cn } from "../lib/cn";

/**
 * An endlessly scrolling strip.
 *
 * The list is rendered twice and the track travels exactly -50%, so the second
 * copy occupies the position the first is leaving and the loop has no seam. The
 * duplicate is `aria-hidden`: it is the same content, and a screen reader
 * reading every name twice would be the accessibility cost of a visual trick.
 *
 * Rendering the copy rather than cloning nodes at runtime — which is how most
 * implementations do it — keeps the whole thing declarative and means the strip
 * survives a re-render without accumulating clones.
 *
 * The strip pauses on hover; a name you cannot stop to read is decoration.
 */
export function Marquee({
  items,
  label,
  className,
}: {
  items: { name: string; detail: string }[];
  label: string;
  className?: string;
}) {
  if (items.length === 0) return null;

  /**
   * One half of the track has to be wider than the viewport or the -50% travel
   * exposes the gap behind it. With two ambassadors that is nowhere near true,
   * so the list repeats until it is — the loop is over a long strip, not over
   * two names sliding across an empty bar.
   */
  const repeats = Math.max(1, Math.ceil(10 / items.length));
  const half = Array.from({ length: repeats }, () => items).flat();

  return (
    <section className={cn("border-y border-white/5 py-3", className)}>
      <p className="label-caps mb-2 px-6 text-center text-[10px] md:px-12">{label}</p>

      <div className="marquee">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0" aria-hidden={copy === 1 || undefined}>
              {half.map((item, index) => (
                <div key={`${item.name}-${index}`} className="flex items-center gap-4 px-8">
                  <span className="whitespace-nowrap font-display text-[18px] font-bold text-on-surface/85 md:text-[21px]">
                    {item.name}
                  </span>
                  <span className="whitespace-nowrap text-[12px] text-on-surface-variant/60">
                    {item.detail}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-primary/40" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
