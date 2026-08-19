import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "../../components/Logo";
import { SurfaceBackdrop } from "../../components/SurfaceBackdrop";
import { t } from "@vira/core";

/**
 * Shared frame for every way into the app.
 *
 * One centred column over a full-bleed backdrop, rather than the split screen
 * this started as: at desktop widths a half-page column left the form marooned
 * against a wall of empty space, and the eye had nowhere to land first. Centred,
 * the mark leads, the question follows, and the doors sit directly under it.
 *
 * Extracted once there were three of these screens — the chooser, the creator's
 * TikTok door and the business account form — so they cannot drift into looking
 * like three different products. Everything that differs is passed as children.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16">
      {/* The same texture the landing page uses. The campaign mosaic that was
          here gave the sign-in its own look, which is exactly the drift a shared
          surface is meant to prevent. */}
      <SurfaceBackdrop />

      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="flex justify-center">
          <Logo size={72} wordmarkClassName="text-[34px]" />
        </Link>

        <h1 className="mt-10 text-center font-display text-headline-lg leading-tight text-on-surface">
          {title}
        </h1>
        <p className="mt-3 text-center text-body-md text-on-surface-variant">{subtitle}</p>

        <div className="mt-10">{children}</div>

        {/* A hardcoded "€134.000 plătiți către creatori" used to sit here. It
            was invented — nothing has been paid to anyone — on the one screen
            where a stranger decides whether to trust us with a TikTok account.
            That is the exact shape CLAUDE.md rule 7 exists to forbid, and a
            figure nobody can produce is worse than no figure at all. */}
      </div>
    </div>
  );
}
