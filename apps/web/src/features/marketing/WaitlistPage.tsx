import { Link } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Logo } from "../../components/Logo";
import { SurfaceBackdrop } from "../../components/SurfaceBackdrop";
import { WaitlistForm } from "../../components/WaitlistForm";
import { t } from "@vira/core";

/**
 * The waitlist as its own page — for a direct link, a QR code, an email.
 *
 * The landing carries the same form in its closing section, and both render
 * `WaitlistForm` rather than each keeping a copy: two forms drift, and the
 * address a person hands over should not depend on which door they came in by.
 *
 * This page is the bare version — a logo, the ask, the field. No argument,
 * because whoever arrives here directly has already been given one somewhere
 * else.
 */
export default function WaitlistPage() {
  return (
    <div className="relative min-h-dvh">
      <SurfaceBackdrop />

      <div className="relative z-10 mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
        <Link to="/" className="mb-10 self-start">
          <Logo size={34} />
        </Link>

        <h1 className="font-display text-[34px] font-medium leading-[1.1] tracking-[-0.035em] text-on-surface sm:text-[42px]">
          {t.waitlist.title}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-on-surface-variant sm:text-[17px]">
          {t.waitlist.subtitle}
        </p>

        <WaitlistForm className="mt-9" />

        <Link
          to="/"
          className="mt-8 inline-flex items-center gap-1.5 self-start text-[14px] text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name="arrow_back" size={16} />
          {t.waitlist.back}
        </Link>
      </div>
    </div>
  );
}
