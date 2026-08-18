import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portrait, type CreatorPortrait } from "@vira/core";
import { ApiError, getJson, postJson } from "./api";
import type {
  ClipDto,
  CampaignDto,
  CreatorProfileDto,
  CreatorQuestionnaireDto,
  FeedCampaignDto,
  Me,
} from "./types";

/** Max clips a creator may keep from their onboarding selection (mirrors the backend cap). */
export const MAX_SELECTED_CLIPS = 10;

/** Current session from the gateway. Resolves to `null` when signed out (401), never throws on 401. */
export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me | null> => {
      try {
        return await getJson<Me>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    retry: false,
    staleTime: 60_000,
  });
}

/** The signed-in business's campaigns. */
export function useCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => getJson<CampaignDto[]>("/brand/campaigns"),
  });
}

/** The signed-in creator's real TikTok profile + clips. */
export function useCreatorProfile() {
  return useQuery({
    queryKey: ["creator-profile"],
    queryFn: () => getJson<CreatorProfileDto>("/creator/profile"),
  });
}

/**
 * The signed-in creator's AI portrait.
 *
 * TODO(api): `GET /creator/portrait`. It does not exist — `CreatorController`
 * carries no portrait route at all, and the only portrait endpoint the backend
 * has (`POST /creators/{id}/portrait`) sits on the anonymous in-memory roster,
 * returns a raw `JsonElement`, and persists nothing. The `CreatorPortraits`
 * table and the generator both exist; nothing joins them to this screen yet.
 *
 * Until it lands this resolves to the reference fixture, which is the exact
 * shape `POST /portrait` emits (ADR-011 → ADR-016). Everything above this hook
 * is therefore already written against the real contract, and wiring the
 * endpoint changes this function body and nothing else.
 *
 * Resolving to `null` is a real state, not an error: a creator whose clips have
 * not been analysed yet has no portrait, and the screen says so rather than
 * showing an empty one.
 */
export function useCreatorPortrait() {
  return useQuery({
    queryKey: ["creator-portrait"],
    queryFn: async (): Promise<CreatorPortrait | null> => portrait,
    staleTime: Infinity,
  });
}

/** Active campaigns for the creator feed / marketplace (with match + follower gate). */
export function useCreatorCampaigns() {
  return useQuery({
    queryKey: ["creator-campaigns"],
    queryFn: () => getJson<FeedCampaignDto[]>("/creator/campaigns"),
  });
}

/**
 * Persist the creator's onboarding clip selection (up to {@link MAX_SELECTED_CLIPS}). Keeps only the
 * chosen clips server-side and returns them; refreshes the cached profile so the UI reflects the cut.
 */
export function useSelectClips() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tikTokVideoIds: string[]) =>
      postJson<ClipDto[]>("/creator/clips/selection", { tikTokVideoIds }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["creator-profile"] }),
  });
}

/** Save the creator's onboarding questionnaire; refreshes the profile so the onboarding gate clears. */
export function useSaveQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreatorQuestionnaireDto) =>
      postJson<void>("/creator/questionnaire", dto),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["creator-profile"] }),
  });
}
