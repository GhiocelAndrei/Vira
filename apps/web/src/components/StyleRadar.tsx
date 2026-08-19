import { STYLE_DIMENSIONS, t } from "@vira/core";
import type { StyleDimensionKey, StyleEvidence, StyleVector } from "@vira/core";
import { cn } from "../lib/cn";

/**
 * The eight style dimensions, drawn as a shape.
 *
 * Shared by the profile screen and the landing's product panel, because two
 * drawings of the same vector would drift and the landing would end up
 * advertising a chart the app does not have.
 *
 * Radar geometry: one centre, one radius, eight angles, computed once. The box
 * is wider than the circle needs because the labels live inside it — the axis at
 * 180° is anchored `end` and runs leftward from the ring, and a square box
 * clipped "Demonstrație" into "stratie".
 */
const CHART = {
  width: 360,
  height: 300,
  centreX: 180,
  centreY: 140,
  radius: 88,
  labelRadius: 106,
};

const AXES = STYLE_DIMENSIONS.map((key, index) => {
  const angle = ((index * 45 - 90) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    key,
    at: (value: number) => ({
      x: CHART.centreX + cos * CHART.radius * value,
      y: CHART.centreY + sin * CHART.radius * value,
    }),
    label: {
      x: CHART.centreX + cos * CHART.labelRadius,
      y: CHART.centreY + sin * CHART.labelRadius,
      // Text hugs the ring: anchored away from the centre on the sides, centred
      // top and bottom, where an anchor would push the word off its own spoke.
      anchor: (Math.abs(cos) < 0.3 ? "middle" : cos > 0 ? "start" : "end") as
        | "middle"
        | "start"
        | "end",
      dy: Math.abs(cos) < 0.3 ? (sin > 0 ? 12 : -6) : 4,
    },
  };
});

function points(value: (key: StyleDimensionKey) => number): string {
  return AXES.map((axis) => {
    const { x, y } = axis.at(value(axis.key));
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
}

export function StyleRadar({
  styleVector,
  styleEvidence,
  selected = null,
  showLabels = true,
  className,
}: {
  styleVector: StyleVector;
  styleEvidence: StyleEvidence;
  /**
   * Highlighted axes.
   *
   * One key where the surface has a single selection — `/profil`, where clicking
   * an axis opens its evidence — and a list where it is showing several readings
   * at once, which is what the landing panel does. Both shapes rather than the
   * caller wrapping a single key in an array at every call site, because the
   * profile screen's selection is genuinely one thing and typing it as a list
   * would invite a second selected axis that the screen below cannot render.
   */
  selected?: StyleDimensionKey | StyleDimensionKey[] | null;
  showLabels?: boolean;
  className?: string;
}) {
  const highlighted = new Set<StyleDimensionKey>(
    selected == null ? [] : Array.isArray(selected) ? selected : [selected],
  );

  /** No clips behind an axis means unmeasured, not average (CLAUDE.md rule 3). */
  const ungrounded = (key: StyleDimensionKey) =>
    styleEvidence[key].evidenceClipIds.length === 0;

  return (
    <svg
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      className={cn("w-full", className)}
      role="img"
      aria-label={t.portrait.styleDimensions}
    >
      {/* Rings, so a value can be read off the shape rather than guessed. */}
      {[0.25, 0.5, 0.75, 1].map((ring) => (
        <polygon
          key={ring}
          points={points(() => ring)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {AXES.map((axis) => {
        const outer = axis.at(1);
        return (
          <line
            key={axis.key}
            x1={CHART.centreX}
            y1={CHART.centreY}
            x2={outer.x}
            y2={outer.y}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
            // A spoke with no reading behind it is dashed, so the shape says
            // where it is guessing before the reader clicks anything.
            strokeDasharray={ungrounded(axis.key) ? "3 4" : undefined}
          />
        );
      })}

      <polygon
        points={points((key) => styleVector[key])}
        fill="rgba(202,190,255,0.16)"
        stroke="#cabeff"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {AXES.map((axis) => {
        const point = axis.at(styleVector[axis.key]);
        const unmeasured = ungrounded(axis.key);
        return (
          <circle
            key={axis.key}
            cx={point.x}
            cy={point.y}
            r={highlighted.has(axis.key) ? 5 : 3.5}
            // Hollow where the polygon had to pass through a value nobody
            // measured — it still closes the shape, but it is not a reading.
            fill={unmeasured ? "#0a0a0c" : "#cabeff"}
            stroke="#cabeff"
            strokeWidth={unmeasured ? 1.5 : 0}
            strokeDasharray={unmeasured ? "2 2" : undefined}
            // The indicator moves; the data does not. Selecting an axis used to
            // snap the vertex from 3.5 to 5px, which reads as a repaint.
            style={{ transition: "r 150ms var(--ease-out-expo)" }}
          />
        );
      })}

      {showLabels &&
        AXES.map((axis) => (
          <text
            key={axis.key}
            x={axis.label.x}
            y={axis.label.y + axis.label.dy}
            textAnchor={axis.label.anchor}
            className={cn(
              "font-body text-[10px] transition-[fill] duration-150 ease-out",
              highlighted.has(axis.key) ? "fill-creator font-semibold" : "fill-white/40",
            )}
          >
            {t.portrait.dimensions[axis.key]}
          </text>
        ))}
    </svg>
  );
}
