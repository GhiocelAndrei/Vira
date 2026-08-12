import type { CreatorProfileDto } from "../../lib/types";
import { ClipSelectionPanel } from "./ClipSelectionPanel";
import { QuestionnaireForm } from "./QuestionnaireForm";

/**
 * Guided one-time creator onboarding, shown as a full-screen gate right after first TikTok login:
 *   step 1 — pick the clips that represent you (skipped when the account has no clips to pick from)
 *   step 2 — the intake questionnaire that feeds brand/campaign matching
 * Each step clears its own flag on the profile; once both are set the parent stops rendering this.
 */
export function CreatorOnboarding({ profile }: { profile: CreatorProfileDto }) {
  // A creator with no clips has nothing to select — skip straight to the questionnaire.
  if (!profile.clipsSelected && profile.clips.length > 0) {
    return <ClipSelectionPanel clips={profile.clips} />;
  }
  if (!profile.questionnaireComplete) return <QuestionnaireForm />;
  return null;
}
