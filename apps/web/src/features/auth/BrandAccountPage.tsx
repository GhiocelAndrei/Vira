import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { cn } from "../../lib/cn";
import { t } from "@vira/core";
import { AuthShell } from "./AuthShell";
import { homeFor, useSession } from "../../lib/session";
import { loginBrand, registerBrand } from "../../lib/auth";
import { isFirebaseConfigured } from "../../lib/firebase";

type Mode = "register" | "login";

const inputClass = cn(
  "w-full rounded border border-white/10 bg-surface-container-lowest px-4 py-3",
  "font-body text-[15px] text-on-surface placeholder:text-on-surface-variant/40",
  "outline-none transition-colors focus:border-business/60",
);

/**
 * Business account — register or sign in.
 *
 * Unlike the creator door, this side needs a real account: a business does not
 * post on TikTok, its creators do, so there is no TikTok identity to borrow.
 * That asymmetry is the whole reason these are two separate screens instead of
 * one with a toggle.
 *
 * Registration and login live together because they are the same form with one
 * field removed, and splitting them into two routes would strand a returning
 * manager who arrived from the landing page's "create an account" call.
 *
 * TODO(auth): submit to the gateway (Firebase per BUILD_PLAN D5), which sets an
 * HttpOnly cookie. Nothing typed here is stored or sent anywhere today — the
 * handler only flips the local role, which decides chrome and nothing else.
 */
export default function BrandAccountPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const hydrate = useSession((state) => state.hydrate);

  const state = location.state as { from?: string; mode?: Mode } | null;
  const [mode, setMode] = useState<Mode>(state?.mode ?? "register");

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const registering = mode === "register";

  function validate(): boolean {
    const next: Record<string, string> = {};

    if (registering) {
      if (!businessName.trim()) next.businessName = t.brandAuth.errors.required;
      if (!contactName.trim()) next.contactName = t.brandAuth.errors.required;
    }
    if (!email.trim()) next.email = t.brandAuth.errors.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = t.brandAuth.errors.email;

    if (!password) next.password = t.brandAuth.errors.required;
    else if (registering && password.length < 8) next.password = t.brandAuth.errors.password;

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    if (!isFirebaseConfigured) {
      setFormError(t.brandAuth.errors.notConfigured);
      return;
    }

    setSubmitting(true);
    try {
      const me = registering
        ? await registerBrand(email.trim(), password)
        : await loginBrand(email.trim(), password);
      hydrate(me);
      // New accounts always land on onboarding (prefilled with the business name); returning
      // managers go to their dashboard (or wherever they were headed).
      if (registering) {
        navigate("/brand/onboarding", { replace: true, state: { companyName: businessName.trim() } });
      } else {
        navigate(me.onboardingComplete ? (state?.from ?? homeFor("brand")) : "/brand/onboarding", {
          replace: true,
        });
      }
    } catch (err) {
      setFormError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setErrors({});
    setFormError(null);
  }

  return (
    <AuthShell
      title={registering ? t.brandAuth.registerTitle : t.brandAuth.loginTitle}
      subtitle={registering ? t.brandAuth.registerSubtitle : t.brandAuth.loginSubtitle}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {registering && (
          <>
            <Field label={t.brandAuth.businessName} error={errors.businessName}>
              <input
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
                placeholder={t.brandAuth.businessNamePlaceholder}
                autoComplete="organization"
                className={inputClass}
              />
            </Field>

            <Field label={t.brandAuth.contactName} error={errors.contactName}>
              <input
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                placeholder={t.brandAuth.contactNamePlaceholder}
                autoComplete="name"
                className={inputClass}
              />
            </Field>
          </>
        )}

        <Field label={t.brandAuth.email} error={errors.email}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.brandAuth.emailPlaceholder}
            autoComplete="email"
            className={inputClass}
          />
        </Field>

        <Field label={t.brandAuth.password} error={errors.password}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={registering ? t.brandAuth.passwordPlaceholder : ""}
            autoComplete={registering ? "new-password" : "current-password"}
            className={inputClass}
          />
        </Field>

        {formError && <p className="text-[13px] text-error">{formError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3.5",
            "bg-primary font-body text-[15px] font-bold text-on-primary",
            "shadow-primary-glow transition-transform hover:bg-primary/90 active:scale-[0.99]",
            "disabled:cursor-not-allowed disabled:opacity-60",
          )}
        >
          {submitting
            ? t.brandAuth.submitting
            : registering
              ? t.brandAuth.submitRegister
              : t.brandAuth.submitLogin}
          <Icon name="arrow_forward" size={18} />
        </button>
      </form>

      <p className="mt-5 text-center text-[13px] text-on-surface-variant">
        {registering ? t.brandAuth.toLogin : t.brandAuth.toRegister}{" "}
        <button
          type="button"
          onClick={() => switchMode(registering ? "login" : "register")}
          className="font-semibold text-business transition-opacity hover:opacity-80"
        >
          {registering ? t.brandAuth.toLoginAction : t.brandAuth.toRegisterAction}
        </button>
      </p>

      {registering && (
        <p className="mt-8 text-[12px] leading-relaxed text-on-surface-variant/60">
          {t.brandAuth.legal}
        </p>
      )}

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

/** Map Firebase auth error codes to a Romanian message; fall back to a generic one. */
function mapAuthError(err: unknown): string {
  const code = typeof err === "object" && err !== null && "code" in err ? String((err as { code: unknown }).code) : "";
  switch (code) {
    case "auth/email-already-in-use":
      return t.brandAuth.errors.emailInUse;
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return t.brandAuth.errors.invalidCredentials;
    case "auth/weak-password":
      return t.brandAuth.errors.password;
    default:
      return t.brandAuth.errors.generic;
  }
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      {/* The label wraps the control so the association is implicit — no id
          plumbing to keep in sync, and it still reads correctly to a screen
          reader. */}
      <label className="block">
        <span className="label-caps mb-2 block">{label}</span>
        {children}
      </label>
      {error && <p className="mt-1.5 text-[12px] text-error">{error}</p>}
    </div>
  );
}
