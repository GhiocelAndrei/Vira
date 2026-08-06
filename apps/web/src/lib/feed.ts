import { campaignObjectives } from "@vira/core";
import type { CampaignObjective } from "./types";

/**
 * Presentation derived from a campaign's objective — rate, earnings estimate, and card theming.
 * Real campaigns carry no imagery/accent, so we key the look off the (real) objective until brands
 * supply media. Nothing here is fabricated campaign data; it's theming + client-side estimates.
 */

/** Backend objective is PascalCase ("Awareness"); the fixture table is keyed by lowercase id. */
function objectiveId(objective: CampaignObjective): string {
  return objective.toLowerCase();
}

/** Paid per 1.000 validated views for this objective (EUR cents). */
export function rateForObjective(objective: CampaignObjective): number {
  return campaignObjectives.find((o) => o.id === objectiveId(objective))?.ratePerMilleMinor ?? 0;
}

export interface CardPresentation {
  accent: string;
  palette: [string, string, string];
  motifs: [string, string, string];
  gradientStops: [string, string];
}

const PRESENTATION: Record<string, CardPresentation> = {
  awareness: {
    accent: "#947dff",
    palette: ["#947dff", "#6d5bd0", "#2a2350"],
    motifs: ["campaign", "volume_up", "groups"],
    gradientStops: ["#2a2350", "#141126"],
  },
  visits: {
    accent: "#7CFFB2",
    palette: ["#7CFFB2", "#3fbf82", "#14361f"],
    motifs: ["storefront", "location_on", "directions_walk"],
    gradientStops: ["#14361f", "#0c1f12"],
  },
  offer: {
    accent: "#FFCC7C",
    palette: ["#FFCC7C", "#e8a34a", "#4a2f14"],
    motifs: ["local_offer", "sell", "schedule"],
    gradientStops: ["#3b2a17", "#221407"],
  },
  launch: {
    accent: "#7CC8FF",
    palette: ["#7CC8FF", "#4a90e8", "#142c4a"],
    motifs: ["rocket_launch", "new_releases", "auto_awesome"],
    gradientStops: ["#142c4a", "#0c1a2e"],
  },
  community: {
    accent: "#FF9EDB",
    palette: ["#FF9EDB", "#e05fb0", "#4a1f3b"],
    motifs: ["group_add", "favorite", "forum"],
    gradientStops: ["#3b1730", "#24071c"],
  },
};

export function presentationFor(objective: CampaignObjective): CardPresentation {
  return PRESENTATION[objectiveId(objective)] ?? PRESENTATION.awareness;
}

/**
 * Estimated earnings band for a creator = rate × views / 1000, over a plausible view range around
 * their own average. Falls back to a default when we don't have their metrics yet.
 */
export function estimateEarnings(
  rateMinor: number,
  avgViews: number,
): { minMinor: number; maxMinor: number } {
  const base = avgViews > 0 ? avgViews : 20_000;
  const minMinor = Math.round((rateMinor * (base * 0.6)) / 1000);
  const maxMinor = Math.round((rateMinor * (base * 1.5)) / 1000);
  return { minMinor, maxMinor };
}
