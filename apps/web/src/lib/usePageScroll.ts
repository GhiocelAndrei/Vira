import { useEffect, type RefObject } from "react";

/**
 * One wheel gesture, one screen, at a pace we choose.
 *
 * Native scroll-snap decides its own duration — roughly 300ms in Chrome, not
 * configurable — and on a page built out of full screens that lands too fast to
 * read as a transition. So the wheel is driven here instead.
 *
 * Only the wheel. Keyboard paging, touch and the scrollbar stay on native snap,
 * which already behaves correctly and which hijacking would break for anyone
 * driving the page by something other than a mouse. During a JS scroll the CSS
 * snap and smooth-behaviour are switched off and restored afterwards: leaving
 * them on means the browser animating toward one anchor while this animates
 * toward another, and the two fight for the same scrollTop.
 *
 * Disabled below `md` and under reduced-motion, matching the CSS.
 */
export function usePageScroll(container: RefObject<HTMLElement | null>, duration = 950) {
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 767px)").matches) return;

    let animating = false;
    let frame = 0;

    const scrollTo = (target: number) => {
      const start = element.scrollTop;
      const distance = target - start;
      if (Math.abs(distance) < 1) return;

      animating = true;
      element.style.scrollSnapType = "none";
      element.style.scrollBehavior = "auto";
      const startedAt = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        // Quartic ease-out: leaves quickly, arrives slowly, which is what makes
        // a full-screen move feel deliberate instead of thrown.
        const eased = 1 - Math.pow(1 - progress, 4);
        element.scrollTop = start + distance * eased;

        if (progress < 1) {
          frame = requestAnimationFrame(step);
          return;
        }
        animating = false;
        element.style.scrollSnapType = "";
        element.style.scrollBehavior = "";
      };

      frame = requestAnimationFrame(step);
    };

    const onWheel = (event: WheelEvent) => {
      // The gesture is ours whether or not it moves anything, otherwise the
      // browser scrolls underneath the animation.
      event.preventDefault();
      if (animating) return;

      const direction = Math.sign(event.deltaY);
      if (direction === 0) return;

      const pages = Array.from(element.querySelectorAll<HTMLElement>(".snap-page"));
      if (pages.length === 0) return;

      // Which screen is filling the viewport right now, rather than which one
      // we last sent it to — the reader may have dragged the scrollbar.
      const current = pages.reduce(
        (closest, page, index) =>
          Math.abs(page.offsetTop - element.scrollTop) <
          Math.abs(pages[closest].offsetTop - element.scrollTop)
            ? index
            : closest,
        0,
      );

      // A screen taller than the viewport must be read before it is left.
      // Jumping straight to the next page's offset would step over whatever sits
      // below the fold inside this one, and with mandatory snapping there is no
      // way back to it — the content would simply be unreachable. So when there
      // is more of the current screen in the direction of travel, go there
      // first and let the next gesture move on.
      const page = pages[current];
      const viewportBottom = element.scrollTop + element.clientHeight;
      const pageBottom = page.offsetTop + page.offsetHeight;

      if (direction > 0 && pageBottom > viewportBottom + 4) {
        scrollTo(Math.min(pageBottom - element.clientHeight, element.scrollHeight));
        return;
      }
      if (direction < 0 && element.scrollTop > page.offsetTop + 4) {
        scrollTo(page.offsetTop);
        return;
      }

      const next = Math.min(pages.length - 1, Math.max(0, current + direction));
      if (next === current) return;
      scrollTo(pages[next].offsetTop);
    };

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(frame);
      element.style.scrollSnapType = "";
      element.style.scrollBehavior = "";
    };
  }, [container, duration]);
}
