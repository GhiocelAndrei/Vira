import { useEffect } from "react";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { BrandLayout } from "./layouts/BrandLayout";
import { CreatorLayout } from "./layouts/CreatorLayout";
import { GuestOnly, RequireRole } from "./routes/guards";
import { DevAuthBar } from "./components/DevAuthBar";
import { useMe } from "./lib/queries";
import { useSession } from "./lib/session";
import AnalyticsPage from "./features/business/AnalyticsPage";
import ApprovalQueue from "./features/business/ApprovalQueue";
import AssistantPanel from "./features/assistant/AssistantPanel";
import BusinessDashboard from "./features/business/BusinessDashboard";
import CampaignsPage from "./features/campaigns/CampaignsPage";
import CreatorsPage from "./features/business/CreatorsPage";
import EarningsPage from "./features/earnings/EarningsPage";
import FeedPage from "./features/feed/FeedPage";
import LandingPage from "./features/marketing/LandingPage";
import NewCampaignPage from "./features/business/NewCampaignPage";
import BrandOnboardingPage from "./features/business/BrandOnboardingPage";
import PortraitPage from "./features/portrait/PortraitPage";
import SignInPage from "./features/auth/SignInPage";
import CreatorSignInPage from "./features/auth/CreatorSignInPage";
import BrandAccountPage from "./features/auth/BrandAccountPage";
import TermsPage from "./features/legal/TermsPage";
import PrivacyPage from "./features/legal/PrivacyPage";

/** Confirms the session with the gateway on boot and hydrates the presentation store. */
function SessionBootstrap() {
  const { data, isSuccess } = useMe();
  const hydrate = useSession((s) => s.hydrate);
  useEffect(() => {
    if (isSuccess) hydrate(data ?? null);
  }, [isSuccess, data, hydrate]);
  return null;
}

/** Brand chrome, gated on completed onboarding — an un-onboarded brand is sent to the form. */
function BrandArea() {
  const onboardingComplete = useSession((s) => s.onboardingComplete);
  if (!onboardingComplete) return <Navigate to="/brand/onboarding" replace />;
  return <BrandLayout />;
}

/**
 * One app, three audiences (BUILD_PLAN D13):
 *
 *   guest    → public landing, no app chrome
 *   creator  → sidebar app: the campaign feed, portrait, earnings, assistant
 *   brand    → dashboard, responsive down to a phone browser
 *
 * This is the whole product. The native app comes later and is derived from
 * these screens — so anything built here is the source, not a preview.
 *
 * Routes are Romanian because they are user-visible; everything else stays
 * English (CLAUDE.md §Conventions). The guards only shape navigation — the
 * gateway re-checks the role on every request.
 */
export default function App() {
  return (
    <Router>
      <SessionBootstrap />
      <DevAuthBar />
      <Routes>
        {/* Public */}
        <Route
          path="/"
          element={
            <GuestOnly>
              <LandingPage />
            </GuestOnly>
          }
        />
        {/* Three entry screens, not one: `/intra` only picks a side, and the two
            below are the actual doors. A creator signs in with TikTok and never
            registers; a business registers an account of its own. */}
        <Route
          path="/intra"
          element={
            <GuestOnly>
              <SignInPage />
            </GuestOnly>
          }
        />
        <Route
          path="/intra/creator"
          element={
            <GuestOnly>
              <CreatorSignInPage />
            </GuestOnly>
          }
        />
        <Route
          path="/intra/afacere"
          element={
            <GuestOnly>
              <BrandAccountPage />
            </GuestOnly>
          }
        />

        {/* Creator */}
        <Route
          element={
            <RequireRole role="creator">
              <CreatorLayout />
            </RequireRole>
          }
        >
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/campanii" element={<CampaignsPage />} />
          <Route path="/profil" element={<PortraitPage />} />
          <Route path="/castiguri" element={<EarningsPage />} />
          <Route path="/asistent" element={<AssistantPanel />} />
        </Route>

        {/* Brand onboarding — brand-guarded but outside the onboarding gate (else it'd loop). */}
        <Route
          path="/brand/onboarding"
          element={
            <RequireRole role="brand">
              <BrandOnboardingPage />
            </RequireRole>
          }
        />

        {/* Brand app — requires the brand role AND completed onboarding. */}
        <Route
          element={
            <RequireRole role="brand">
              <BrandArea />
            </RequireRole>
          }
        >
          <Route path="/brand" element={<BusinessDashboard />} />
          <Route path="/brand/campanii/nou" element={<NewCampaignPage />} />
          <Route path="/brand/aprobari" element={<ApprovalQueue />} />
          <Route path="/brand/analize" element={<AnalyticsPage />} />
          <Route path="/brand/creatori" element={<CreatorsPage />} />
        </Route>

        {/* Public legal pages — always reachable (linked from the TikTok app submission). */}
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
