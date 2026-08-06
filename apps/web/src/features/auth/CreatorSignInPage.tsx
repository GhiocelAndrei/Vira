import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/cn";
import { t } from "@vira/core";
import { AuthShell } from "./AuthShell";
import { API_BASE } from "../../lib/api";

/**
 * Creator sign-in — TikTok and nothing else.
 *
 * There is no registration counterpart on purpose: a creator never makes a Vira
 * account. Their TikTok account *is* the account, which is why this screen has
 * one button and no form. Signing up and signing in are the same act, so the
 * page does not offer a choice between them.
 *
 * The button hands off to the gateway's OAuth start route (a full-page
 * navigation, not a fetch): the backend redirects to TikTok, exchanges the code
 * on the callback, sets the HttpOnly session cookie, and returns the browser to
 * /feed (BUILD_PLAN D5). Boot hydration then flips the local role to creator.
 */
export default function CreatorSignInPage() {
  function enter() {
    window.location.href = `${API_BASE}/auth/tiktok/start`;
  }

  return (
    <AuthShell title={t.creatorAuth.title} subtitle={t.creatorAuth.subtitle}>
      <button
        type="button"
        onClick={enter}
        className={cn(
          "flex w-full items-center justify-center gap-3 rounded-lg px-6 py-4",
          "bg-primary font-body text-[15px] font-bold text-on-primary",
          "shadow-primary-glow transition-transform hover:bg-primary/90 active:scale-[0.99]",
        )}
      >
        <Icon name="music_note" size={22} />
        {t.creatorAuth.button}
      </button>

      <p className="mt-3 text-center text-[12px] text-on-surface-variant/70">
        {t.creatorAuth.noSeparateAccount}
      </p>

      {/* Stating the scope in plain words. A creator handing over an account is
          entitled to know what is read before the TikTok consent screen, not
          after it. */}
      <div className="mt-8 rounded-lg border border-white/5 bg-surface-container-low p-5">
        <p className="label-caps">{t.creatorAuth.readsTitle}</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {t.creatorAuth.reads.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <Icon name="visibility" size={16} className="mt-0.5 shrink-0 text-on-surface-variant/50" />
              <span className="text-[13px] leading-5 text-on-surface-variant">{line}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2.5 border-t border-white/5 pt-3.5 text-[13px] leading-5 text-mint">
          <Icon name="lock" size={16} className="mt-0.5 shrink-0" />
          {t.creatorAuth.readsNot}
        </p>
      </div>

      <p className="mt-8 text-[12px] leading-relaxed text-on-surface-variant/60">
        {t.creatorAuth.legal}
      </p>

      <Link
        to="/intra"
        className="mt-6 inline-flex items-center gap-1.5 text-[13px] text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <Icon name="arrow_back" size={16} />
        {t.signIn.backToChooser}
      </Link>
    </AuthShell>
  );
}
