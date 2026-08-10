import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/Logo";
import { SurfaceBackdrop } from "../../components/SurfaceBackdrop";

/** Contact address shown on the legal pages. TODO: replace with the real inbox before submission. */
export const LEGAL_CONTACT_EMAIL = "contact@vira.ro";

/**
 * Shared frame for the public legal pages (Terms, Privacy). Deliberately plain and readable —
 * these are linked from the TikTok app submission and read by reviewers.
 */
export function LegalShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen">
      <SurfaceBackdrop />
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-12 md:px-8">
        <Link to="/" aria-label="Vira">
          <Logo size={34} />
        </Link>

        <h1 className="mt-10 font-display text-[32px] font-semibold text-on-surface">{title}</h1>
        <p className="mt-2 text-[13px] text-on-surface-variant">Last updated: {lastUpdated}</p>

        <div className="mt-8 flex flex-col gap-8 text-[15px] leading-7 text-on-surface-variant">
          {children}
        </div>

        <p className="mt-12 border-t border-white/5 pt-6 text-[13px] text-on-surface-variant/70">
          Questions? Contact us at{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:opacity-80">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </div>
  );
}

/** A titled section within a legal document. */
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[18px] font-semibold text-on-surface">{heading}</h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}
