import { useEffect, type RefObject } from "react";

/**
 * Plays each screen's entrance as the reader arrives on it.
 *
 * The observer watches the screens rather than the elements inside them. One
 * `.in` on the screen releases every `.rv` it contains, and the `dl-*` classes
 * on those turn the release into a sequence — which means a screen's choreography
 * lives in its markup, next to the content, instead of in a timeline here.
 *
 * Unlike a long scrolling page, this one re-animates: the class comes off when a
 * screen leaves. Somewhere that moves a screen at a time, every arrival is an
 * arrival, and a slide that plays only the first time you ever see it feels
 * broken the second time. The threshold is high enough that a screen has to be
 * properly in view — halfway through a snap the incoming screen is already
 * mostly there, so it starts before it settles and is finished on landing.
 */
export function useScrollReveal(root?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const screens = Array.from(document.querySelectorAll<HTMLElement>(".snap-page"));
    const loose = Array.from(document.querySelectorAll<HTMLElement>(".rv")).filter(
      (element) => !element.closest(".snap-page"),
    );

    // Matches the CSS escape hatch: no observer, no transition, final state now.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      screens.forEach((screen) => screen.classList.add("in"));
      loose.forEach((element) => element.classList.add("in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle("in", entry.isIntersecting);
        }
      },
      { root: root?.current ?? null, threshold: 0.35 },
    );

    screens.forEach((screen) => observer.observe(screen));

    // Anything outside the screen structure keeps the old one-way behaviour.
    const onceObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          onceObserver.unobserve(entry.target);
        }
      },
      { root: root?.current ?? null, threshold: 0.1, rootMargin: "0px 0px -60px 0px" },
    );
    loose.forEach((element) => onceObserver.observe(element));

    return () => {
      observer.disconnect();
      onceObserver.disconnect();
    };
  }, [root]);
}
