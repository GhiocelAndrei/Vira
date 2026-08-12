import { useState } from "react";
import { postJson } from "../lib/api";

/**
 * Dev-only sign-in shortcut. Renders only when VITE_DEV_AUTH === "true" (local .env), and calls the
 * backend's gated /auth/dev/login shim to open a session for a seeded demo creator/brand — no TikTok
 * or Firebase needed. Never shipped to prod: the Vercel build leaves VITE_DEV_AUTH unset, and the
 * backend returns 404 unless App:DevAuth:Enabled is on.
 */
const enabled = import.meta.env.VITE_DEV_AUTH === "true";

export function DevAuthBar() {
  const [busy, setBusy] = useState<"creator" | "brand" | "reset" | null>(null);
  const [error, setError] = useState(false);
  if (!enabled) return null;

  async function enter(role: "creator" | "brand") {
    setError(false);
    setBusy(role);
    try {
      await postJson(`/auth/dev/login?role=${role}`);
      // Full reload so the session bootstrap re-runs with the new cookie.
      window.location.href = role === "creator" ? "/feed" : "/brand";
    } catch {
      setError(true);
      setBusy(null);
    }
  }

  // Clears the signed-in creator's onboarding flags so the clip + questionnaire flow runs again.
  async function resetOnboarding() {
    setError(false);
    setBusy("reset");
    try {
      await postJson("/creator/dev/reset-onboarding");
      window.location.href = "/feed";
    } catch {
      setError(true);
      setBusy(null);
    }
  }

  return (
    <div className="fixed bottom-3 left-3 z-[9999] flex items-center gap-2 rounded-lg border border-amber/30 bg-background/90 p-2 shadow-lg backdrop-blur">
      <span className="px-1 font-body text-[11px] font-bold text-amber">DEV</span>
      <button
        type="button"
        onClick={() => enter("creator")}
        disabled={busy !== null}
        className="rounded bg-creator px-3 py-1.5 font-body text-[12px] font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Intră ca creator
      </button>
      <button
        type="button"
        onClick={() => enter("brand")}
        disabled={busy !== null}
        className="rounded bg-business px-3 py-1.5 font-body text-[12px] font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Intră ca brand
      </button>
      <button
        type="button"
        onClick={resetOnboarding}
        disabled={busy !== null}
        title="Resetează onboarding-ul creatorului conectat"
        className="rounded border border-white/15 px-3 py-1.5 font-body text-[12px] font-semibold text-on-surface-variant transition-colors hover:text-on-surface disabled:opacity-50"
      >
        Reset onboarding
      </button>
      {error && <span className="px-1 text-[11px] text-error">eșuat</span>}
    </div>
  );
}
