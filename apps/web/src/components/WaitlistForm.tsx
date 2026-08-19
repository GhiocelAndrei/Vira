import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Icon } from "./Icon";
import { cn } from "../lib/cn";
import { t } from "@vira/core";

/**
 * The waitlist form, in one place.
 *
 * It lives at the bottom of the landing and on `/lista`, and it exists as a
 * component because two copies of a form drift: one grows a validation rule the
 * other does not, and the address the page collects starts depending on which
 * door somebody came through.
 *
 * One field. The questionnaire that decides who gets in belongs after the
 * invitation, not in front of it — a stranger who has been given nothing yet
 * does not fill in a form about their audience, and asking is how a gate meant
 * to feel selective ends up feeling like paperwork.
 *
 * ⚠️ TODO(api): the address goes nowhere. There is no `POST /waitlist` and
 * nothing is persisted, so this tells a real person they are on a list that does
 * not exist. Fine behind a dev server, NOT fine on the public deployment — wire
 * the endpoint, or take the form off the published landing, before it ships.
 */

/** Deliberately loose. The server has to validate anyway, and a clever regex
 *  here only ever rejects somebody's legitimate address. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function WaitlistForm({ className }: { className?: string }) {
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

  if (done) {
    return (
      <div className={cn("animate-fade-up text-center", className)}>
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-mint/30 bg-mint/10">
          <Icon name="check" size={24} className="text-mint" />
        </span>
        <p className="mt-5 font-display text-[22px] font-medium tracking-[-0.02em] text-on-surface">
          {t.waitlist.doneTitle}
        </p>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-relaxed text-on-surface-variant">
          {t.waitlist.doneText}
        </p>
        <p className="numeric mx-auto mt-5 max-w-sm truncate rounded border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-on-surface">
          {email.trim()}
        </p>
        <button
          type="button"
          onClick={() => {
            setEmail("");
            setTouched(false);
            setDone(false);
          }}
          className="mt-5 text-[13px] text-primary transition-opacity hover:opacity-80"
        >
          {t.waitlist.doneAnother}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("text-left", className)} noValidate>
      <label htmlFor="waitlist-email" className="label-caps text-[10px]">
        {t.waitlist.emailLabel}
      </label>
      <input
        id="waitlist-email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setTouched(true)}
        placeholder={t.waitlist.emailPlaceholder}
        aria-invalid={showError || undefined}
        aria-describedby={showError ? "waitlist-email-error" : undefined}
        className={cn(
          "mt-2 w-full rounded border bg-surface-container-lowest px-4 py-3.5",
          // 16px, not smaller: iOS zooms the whole page in on focus for anything
          // under it, and the reader lands on a landing page they cannot see.
          "font-body text-[16px] text-on-surface placeholder:text-on-surface-variant/40",
          "outline-none transition-colors",
          showError ? "border-error/60 focus:border-error" : "border-white/10 focus:border-primary/60",
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
          "group mt-4 inline-flex w-full items-center justify-center gap-2.5 rounded px-6 py-3.5",
          "bg-primary font-body text-[15px] font-semibold text-on-primary",
          "transition-[background-color,transform] duration-150 ease-out hover:bg-primary/90 active:scale-[0.97]",
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

      {/* An address collected in the EU comes with this attached; it is not fine
          print we get to decide about. */}
      <p className="mt-5 text-[12px] leading-relaxed text-on-surface-variant/70">
        {t.waitlist.consentLead}{" "}
        <Link to="/privacy" className="text-on-surface underline underline-offset-2">
          {t.waitlist.consentLink}
        </Link>
        . {t.waitlist.consentTail}
      </p>
    </form>
  );
}
