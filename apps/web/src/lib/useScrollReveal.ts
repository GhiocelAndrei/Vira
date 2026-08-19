import { useEffect } from "react";

/**
 * Fades content in element by element, as each one reaches the reader.
 *
 * The observer watches every `.rv` individually. A card, a beat, a column
 * appears when *it* crosses into view — so the page arrives in pieces on the way
 * down rather than a whole band at a time.
 *
 * It used to watch the sections instead: one `.in` on a `.rv-group` released
 * everything inside it at once, which made the two-band `dl-*` scale work
 * (heading, pause, evidence) but meant a section three screens tall had already
 * finished animating by the time you reached its last card. The pause is not
 * worth that — and once the stagger was compressed to 80ms it was barely audible
 * anyway.
 *
 * `dl-*` still exists and still matters, but it means something narrower now:
 * the offset between siblings that enter *together*, like the four cards of a
 * bento row. Nothing waits longer than 300ms, because an element that entered
 * alone should not sit invisible while a timer it does not know about runs down.
 *
 * One way. Replaying an entrance because the reader glanced back up is a page
 * that will not sit still.
 */
export function useScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".rv"));

    // Matches the CSS escape hatch: no observer, no transition, final state now.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("in"));
      return;
    }

    // The bottom inset means an element starts once it is genuinely on screen
    // rather than at the instant its top edge crosses the fold — otherwise the
    // entrance plays below the reader's line of sight and is over before it is
    // seen. The low threshold lets tall elements start without waiting to be
    // 10% visible, which for a full-width section could be most of a screen.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}
