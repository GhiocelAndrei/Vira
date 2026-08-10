import { useQuery } from "@tanstack/react-query";
import { ApiError, getJson } from "./api";
import type { CampaignDto, CreatorProfileDto, FeedCampaignDto, Me } from "./types";

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

/** Active campaigns for the creator feed / marketplace (with match + follower gate). */
export function useCreatorCampaigns() {
  return useQuery({
    queryKey: ["creator-campaigns"],
    queryFn: () => getJson<FeedCampaignDto[]>("/creator/campaigns"),
  });
}
