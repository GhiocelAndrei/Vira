import { useEffect } from "react";

/**
 * Fades content in as the reader reaches it.
 *
 * The observer watches the *sections*, not the elements inside them. One `.in`
 * on a section releases every `.rv` it contains, and the `dl-*` classes on those
 * turn the release into a sequence — so a section's choreography lives in its
 * markup, next to the content, instead of in a timeline here.
 *
 * The grouping is what makes the two-band delay scale work at all. Band one is
 * the heading, then a 650ms hole, then the evidence; observed per element, each
 * delay would count from that element's own arrival and the pause would land in
 * the middle of nothing.
 *
 * One way, unlike the version this replaces. That one toggled `.in` off again,
 * which was right when the page moved a full screen at a time and every arrival
 * was an arrival. On a page that simply scrolls, replaying an entrance because
 * the reader glanced back up is a page that will not sit still.
 */
export function useScrollReveal() {
  useEffect(() => {
    const groups = Array.from(document.querySelectorAll<HTMLElement>(".rv-group"));
    const loose = Array.from(document.querySelectorAll<HTMLElement>(".rv")).filter(
      (element) => !element.closest(".rv-group"),
    );

    // Matches the CSS escape hatch: no observer, no transition, final state now.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      groups.forEach((group) => group.classList.add("in"));
      loose.forEach((element) => element.classList.add("in"));
      return;
    }

    // The bottom inset means a section starts when it has genuinely come up into
    // the page, not at the instant its top edge grazes the fold — otherwise the
    // heading animates while it is still below the reader's line of sight and
    // the entrance is over before it is visible.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0, rootMargin: "0px 0px -15% 0px" },
    );

    [...groups, ...loose].forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);
}
