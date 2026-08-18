import { useEffect, useRef } from "react";
import { cn } from "../lib/cn";
import { t } from "@vira/core";

/**
 * The vocabulary, drifting up behind the hero.
 *
 * The technique is borrowed; the content deliberately is not. The site this
 * came from fills its background with the vocabulary of its trade — REACH,
 * CPM, CPC, ROAS — which works for a media agency and would be self-sabotage
 * here: those are the exact words the brandbook bans as "marfă nedovedită".
 *
 * The field carries the brandbook's own words instead — validat, dovadă,
 * potrivire, curat. It is the argument at the volume of weather: nobody reads
 * it, everybody is standing in it.
 *
 * Canvas rather than DOM: sixty text nodes animating their opacity every frame
 * is sixty style recalculations, and this has to cost nothing since it runs
 * under the first thing anyone sees.
 */

/** Visible text, so it lives in i18n like every other word on the page. */
const WORDS = t.landing.wordfall;

interface Word {
  x: number;
  y: number;
  vy: number;
  alpha: number;
  targetAlpha: number;
  size: number;
  text: string;
  life: number;
  maxLife: number;
}

export function HeroWordfall({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Movement someone asked to be spared, and a phone that would rather spend
    // the battery elsewhere.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 767px)").matches) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;
    const words: Word[] = [];

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    /**
     * Always somewhere on the field, never from the floor.
     *
     * At this drift a word covers about a hundred pixels in its whole life, so
     * respawning at the bottom meant it died near the bottom — the top of the
     * canvas emptied out within a minute and never refilled. Words fade in
     * where they are and fade out in place; the drift is a slow current
     * through a field that stays evenly populated, not a queue rising from an
     * edge.
     */
    const spawn = (): Word => ({
      x: Math.random() * width,
      y: Math.random() * height,
      // Slow. A word that races past is a distraction; one that drifts is
      // weather, and weather is what a background should be.
      vy: -(Math.random() * 0.22 + 0.06),
      alpha: 0,
      /**
       * Tuned three times, and the third one is why the size below moved too.
       *
       * It began at 2.5–8.5% of the pale violet, which resolved to about
       * rgb(12,10,20) over black — technically violet, perceptually a grey
       * smudge. Doubling it made the colour read and lifted the whole page off
       * black in the process: two dozen words at 20% are a wash, not a texture.
       * Halving it back fixed the black and left the words unreadable.
       *
       * Opacity was the wrong dial to keep turning. A 13px glyph at 4% loses
       * most of its ink to antialiasing before it reaches the screen, so the
       * words were faint because they were *small*, not only because they were
       * dim. Bigger type carries the same alpha across more contiguous pixels
       * and reads at a fraction of the total light — hence 16–30px against a
       * modest lift to 6–14%, and four fewer words so the field does not close
       * up now that each one takes more room.
       */
      targetAlpha: Math.random() * 0.08 + 0.06,
      size: Math.random() * 14 + 16,
      text: WORDS[Math.floor(Math.random() * WORDS.length)],
      life: 0,
      maxLife: Math.random() * 500 + 400,
    });

    const draw = () => {
      if (!running) return;
      context.clearRect(0, 0, width, height);

      for (const word of words) {
        word.life += 1;
        word.y += word.vy;

        // Fade in over the first fifth of its life, out over the last third.
        const fadingIn = word.life < word.maxLife * 0.2;
        const fadingOut = word.life > word.maxLife * 0.66;
        if (fadingIn) word.alpha = Math.min(word.targetAlpha, word.alpha + word.targetAlpha / 60);
        else if (fadingOut) word.alpha = Math.max(0, word.alpha - word.targetAlpha / 120);

        context.font = `600 ${word.size}px Geist, system-ui, sans-serif`;
        // `primary-container` (#947dff), not `primary` (#cabeff). Over black a
        // colour is multiplied by its own alpha, and the paler violet loses its
        // hue on the way down — the saturated one keeps a blue channel well
        // clear of the other two, which is what makes it read as a colour at all
        // at these opacities.
        context.fillStyle = `rgba(148, 125, 255, ${word.alpha})`;
        context.fillText(word.text, word.x, word.y);

        if (word.life > word.maxLife || word.y < -40) Object.assign(word, spawn());
      }

      frame = requestAnimationFrame(draw);
    };

    resize();
    // Staggered lifetimes, so they do not all fade out on the same frame.
    for (let i = 0; i < 22; i += 1) {
      const word = spawn();
      word.alpha = word.targetAlpha;
      word.life = Math.random() * word.maxLife * 0.6;
      words.push(word);
    }
    draw();

    // Nothing burns frames while the reader is three screens down.
    const observer = new IntersectionObserver(
      ([entry]) => {
        running = entry.isIntersecting;
        if (running) frame = requestAnimationFrame(draw);
        else cancelAnimationFrame(frame);
      },
      { threshold: 0 },
    );
    observer.observe(canvas);
    window.addEventListener("resize", resize);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}
