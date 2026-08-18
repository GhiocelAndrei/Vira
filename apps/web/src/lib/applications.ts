import { create } from "zustand";

/**
 * A creator's applications, keyed by campaign.
 *
 * Two states, in order: `applied` (the creator put their name on the campaign)
 * and `draftSubmitted` (a clip is waiting for the brand). They are separate on
 * purpose — applying is a commitment to try, uploading is a thing the brand can
 * act on, and a screen that collapsed them would have no way to say "you are in,
 * nothing is waiting on the brand yet".
 *
 * The draft records what the browser could actually read off the file. A
 * duration of `null` means "we could not measure it", which is deliberately not
 * the same fact as a wrong duration (CLAUDE.md #3) — the UI says so rather than
 * guessing a number.
 *
 * Demo state, not persisted, and the file never leaves the tab. TODO(api): back
 * this with `POST /creator/campaigns/{id}/application` and a multipart
 * `POST /creator/campaigns/{id}/draft` — the upload is the one place clip
 * content can come from, since the Display API never returns video files.
 */
export interface DraftUpload {
  fileName: string;
  sizeBytes: number;
  /** Seconds, from the video element's metadata; `null` when the browser could not decode it. */
  durationSeconds: number | null;
  caption: string;
  /** Requirement labels the creator ticked off — their own declaration, not a check. */
  coveredRequirements: string[];
  /** ISO timestamp; formatted for display at the edge. */
  submittedAt: string;
}

export interface CampaignApplication {
  campaignId: string;
  status: "applied" | "draftSubmitted";
  pitch: string;
  /** ISO timestamp. */
  appliedAt: string;
  draft?: DraftUpload;
}

interface ApplicationsState {
  byCampaign: Record<string, CampaignApplication>;
  apply: (campaignId: string, pitch: string) => void;
  withdraw: (campaignId: string) => void;
  submitDraft: (campaignId: string, draft: Omit<DraftUpload, "submittedAt">) => void;
}

export const useApplications = create<ApplicationsState>((set) => ({
  byCampaign: {},

  apply: (campaignId, pitch) =>
    set((state) => ({
      byCampaign: {
        ...state.byCampaign,
        [campaignId]: {
          campaignId,
          status: "applied",
          pitch,
          appliedAt: new Date().toISOString(),
        },
      },
    })),

  withdraw: (campaignId) =>
    set((state) => {
      const { [campaignId]: _removed, ...rest } = state.byCampaign;
      return { byCampaign: rest };
    }),

  submitDraft: (campaignId, draft) =>
    set((state) => {
      const existing = state.byCampaign[campaignId];
      if (!existing) return state; // a draft without an application is not a state we allow
      return {
        byCampaign: {
          ...state.byCampaign,
          [campaignId]: {
            ...existing,
            status: "draftSubmitted",
            draft: { ...draft, submittedAt: new Date().toISOString() },
          },
        },
      };
    }),
}));

/** Convenience selector — `undefined` when the creator has not applied. */
export function useApplication(campaignId: string | undefined) {
  return useApplications((state) => (campaignId ? state.byCampaign[campaignId] : undefined));
}
