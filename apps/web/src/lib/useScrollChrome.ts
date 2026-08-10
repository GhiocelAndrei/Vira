import { useEffect, useState, type RefObject } from "react";

export interface ScrollChrome {
  /** 0–1 through the scrollable length of the document. */
  progress: number;
  /** True once the reader has left the first screen behind. */
  scrolled: boolean;
}

/**
 * Chrome that only exists once the reader has committed to the page.
 *
 * The first screen is a poster: a progress bar across the top of it would be
 * answering a question nobody has asked yet. Both values come from one scroll
 * listener, throttled to a frame — two listeners doing the same arithmetic is
 * how a landing page starts dropping frames on a mid-range phone.
 */
export function useScrollChrome(
  /** The element that actually scrolls. Omit to watch the window. */
  target?: RefObject<HTMLElement | null>,
  threshold = 40,
): ScrollChrome {
  const [state, setState] = useState<ScrollChrome>({ progress: 0, scrolled: false });

  useEffect(() => {
    const element = target?.current;
    // A scroll container reports its own geometry; the window has to be asked
    // for the document's.
    const source: HTMLElement | Window = element ?? window;
    let queued = false;

    const read = () => {
      const y = element ? element.scrollTop : window.scrollY;
      const scrollable = element
        ? element.scrollHeight - element.clientHeight
        : document.body.scrollHeight - window.innerHeight;

      setState({
        progress: scrollable > 0 ? Math.min(y / scrollable, 1) : 0,
        scrolled: y > threshold,
      });
      queued = false;
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(read);
    };

    read();
    source.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      source.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [target, threshold]);

  return state;
}
