import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Logo } from "../../components/Logo";
import { SurfaceBackdrop } from "../../components/SurfaceBackdrop";
import { cn } from "../../lib/cn";
import { t } from "@vira/core";

/**
 * The waitlist — where "Intră pe listă" lands.
 *
 * The first wave is invited, so this is the whole of what the page asks for: an
 * address to write to. The questionnaire that decides who gets in belongs after
 * the invitation, not in front of it — a stranger who has been given nothing yet
 * will not fill in a form about their audience, and asking is how a gate that is
 * meant to feel selective ends up feeling like paperwork.
 *
 * ⚠️ TODO(api): the address currently goes nowhere. There is no `POST /waitlist`
 * and nothing is persisted, so this screen tells a real person they are on a
 * list that does not exist. That is acceptable while the site is behind a dev
 * server and is NOT acceptable on the public deployment — wire the endpoint, or
 * take the button off the published landing, before this ships.
 */

/** Deliberately loose. The server has to validate anyway, and a clever regex
 *  here only ever rejects somebody's legitimate address. */
function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState(false);

  const valid = looksLikeEmail(email);
  const showError = touched && email.length > 0 && !valid;

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!valid) return;
    // TODO(api): POST /waitlist { email } — idempotent on the address.
    setDone(true);
  }

  return (
    <div className="relative min-h-dvh">
      <SurfaceBackdrop />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
        <Link to="/" className="mb-10 self-start">
          <Logo size={34} />
        </Link>

        {done ? (
          <div className="animate-fade-up">
            <span className="grid h-12 w-12 place-items-center rounded-full border border-mint/30 bg-mint/10">
              <Icon name="check" size={24} className="text-mint" />
            </span>
            <h1 className="mt-6 font-display text-[30px] font-medium leading-[1.1] tracking-[-0.03em] text-on-surface">
              {t.waitlist.doneTitle}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-on-surface-variant">
              {t.waitlist.doneText}
            </p>
            <p className="numeric mt-5 rounded border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-on-surface">
              {email.trim()}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-[14px] text-on-surface-variant transition-colors hover:text-on-surface"
              >
                <Icon name="arrow_back" size={16} />
                {t.waitlist.back}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setEmail("");
                  setTouched(false);
                  setDone(false);
                }}
                className="text-[14px] text-primary transition-opacity hover:opacity-80"
              >
                {t.waitlist.doneAnother}
              </button>
            </div>
          </div>
        ) : (
          <>
            <h1 className="font-display text-[34px] font-medium leading-[1.1] tracking-[-0.035em] text-on-surface sm:text-[42px]">
              {t.waitlist.title}
            </h1>
            <p className="mt-3 text-[15px] leading-relaxed text-on-surface-variant sm:text-[17px]">
              {t.waitlist.subtitle}
            </p>

            <form onSubmit={onSubmit} className="mt-9" noValidate>
              <label htmlFor="waitlist-email" className="label-caps text-[10px]">
                {t.waitlist.emailLabel}
              </label>
              <input
                id="waitlist-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setTouched(true)}
                placeholder={t.waitlist.emailPlaceholder}
                aria-invalid={showError || undefined}
                aria-describedby={showError ? "waitlist-email-error" : undefined}
                className={cn(
                  "mt-2 w-full rounded border bg-surface-container-lowest px-4 py-3.5",
                  "font-body text-[16px] text-on-surface placeholder:text-on-surface-variant/40",
                  "outline-none transition-colors",
                  showError
                    ? "border-error/60 focus:border-error"
                    : "border-white/10 focus:border-primary/60",
                )}
              />
              {showError && (
                <p id="waitlist-email-error" className="mt-2 text-[13px] text-error">
                  {t.waitlist.invalid}
                </p>
              )}

              <button
                type="submit"
                disabled={!valid}
                className={cn(
                  "group mt-5 inline-flex w-full items-center justify-center gap-2.5 rounded px-6 py-3.5",
                  "bg-primary font-body text-[15px] font-semibold text-on-primary",
                  "transition-[background-color,transform] duration-150 ease-out hover:bg-primary/90 active:scale-[0.98]",
                  "disabled:pointer-events-none disabled:opacity-40",
                )}
              >
                {t.waitlist.submit}
                <Icon
                  name="arrow_forward"
                  size={17}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </form>

            {/* An address collected in the EU comes with this attached; it is not
                fine print we get to decide about. */}
            <p className="mt-6 text-[12px] leading-relaxed text-on-surface-variant/70">
              {t.waitlist.consentLead}{" "}
              <Link to="/privacy" className="text-on-surface underline underline-offset-2">
                {t.waitlist.consentLink}
              </Link>
              . {t.waitlist.consentTail}
            </p>

            <Link
              to="/"
              className="mt-8 inline-flex items-center gap-1.5 self-start text-[14px] text-on-surface-variant transition-colors hover:text-on-surface"
            >
              <Icon name="arrow_back" size={16} />
              {t.waitlist.back}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
