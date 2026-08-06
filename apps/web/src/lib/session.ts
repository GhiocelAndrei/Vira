import { create } from "zustand";
import { persist } from "zustand/middleware";
import { homeFor, type Role } from "@vira/core";
import type { Me } from "./types";

/**
 * Client-side view of who is signed in.
 *
 * Presentation state only: it decides which chrome and which routes to render.
 * It is NOT the security boundary. The real session is an HttpOnly cookie issued
 * by the .NET gateway (BUILD_PLAN D5), which the SPA cannot read, and every
 * protected endpoint re-checks the role server-side.
 *
 * `hydrate` is the source of truth: the app calls `GET /auth/me` on boot and
 * feeds the result here. The persisted role is only a first-paint hint that the
 * server response then confirms or overrides.
 */
interface SessionState {
  role: Role;
  businessId?: string;
  creatorId?: string;
  onboardingComplete: boolean;
  /** Apply the server's view of the session (null → signed out). */
  hydrate: (me: Me | null) => void;
  /** Flip the onboarding flag locally right after a successful save (avoids a redirect race). */
  setOnboardingComplete: (value: boolean) => void;
  /** Creator door is still mocked (TikTok OAuth is a later slice). */
  signInAsCreator: () => void;
  /** Clears local presentation state; call the API logout separately (lib/auth). */
  signOut: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      role: "guest",
      businessId: undefined,
      creatorId: undefined,
      onboardingComplete: false,
      hydrate: (me) =>
        set(
          me
            ? {
                role: me.type === "Business" ? "brand" : "creator",
                businessId: me.businessId ?? undefined,
                creatorId: me.creatorId ?? undefined,
                onboardingComplete: me.onboardingComplete,
              }
            : { role: "guest", businessId: undefined, creatorId: undefined, onboardingComplete: false },
        ),
      setOnboardingComplete: (value) => set({ onboardingComplete: value }),
      signInAsCreator: () => set({ role: "creator" }),
      signOut: () => set({ role: "guest", businessId: undefined, creatorId: undefined, onboardingComplete: false }),
    }),
    { name: "vira.session" },
  ),
);

export { homeFor };
export type { Role };
