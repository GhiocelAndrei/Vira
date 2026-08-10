import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Icon } from "../components/Icon";
import { SurfaceBackdrop } from "../components/SurfaceBackdrop";
import { cn } from "../lib/cn";
import { t } from "@vira/core";
import { formatMoney } from "@vira/core";
import { useSession } from "../lib/session";
import { useMe } from "../lib/queries";
import { logout } from "../lib/auth";
import { earnings } from "@vira/core";

const navItems = [
  { to: "/feed", icon: "dynamic_feed", label: t.nav.feed },
  { to: "/campanii", icon: "campaign", label: t.nav.campaigns },
  { to: "/profil", icon: "account_circle", label: t.nav.profile },
  { to: "/castiguri", icon: "payments", label: t.nav.earnings },
  { to: "/asistent", icon: "smart_toy", label: t.nav.assistant },
];

const secondaryItems = [
  { icon: "settings", label: t.nav.settings },
  { icon: "help", label: t.nav.support },
];

/**
 * Creator chrome.
 *
 * Navigation hangs off the identity rather than occupying a permanent column.
 * The creator app is built around a full-bleed feed, and a 280px rail parked
 * beside it spent most of its width on links nobody was about to use while
 * scrolling — so the name is the handle, and the menu comes out of it.
 *
 * The identity menu works at every width and carries the secondary items —
 * settings, support, signing out. Below `md` the five primary destinations
 * additionally get the bottom tab bar CLAUDE.md asks for, which is where a
 * creator's thumb already is.
 *
 * Identity stays top-left, per the decision already settled in HANDOFF §4, and
 * the header carries no duplicate of it.
 */
export function CreatorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const signOut = useSession((state) => state.signOut);
  const { data: me } = useMe();
  const displayName = me?.displayName ?? t.roles.creator;

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /**
   * The feed is full-bleed: its backdrop is the screen, so a solid bar across
   * the top would cut it off. There the header floats over the content instead
   * of sitting above it. Every other creator screen is a normal document and
   * keeps the bar, which is what their top padding is written against.
   */
  const immersive = location.pathname === "/feed";

  /** Navigating is the most common way to be done with the menu. */
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    function onPointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [menuOpen]);

  async function leave() {
    await logout().catch(() => {}); // best-effort: clear the server session + cookie
    signOut();
    navigate("/", { replace: true });
  }

  return (
    <div className="relative min-h-full">
      {/* Not on the feed: that screen brings its own per-campaign moodboard, and
          two textures stacked read as neither. */}
      {!immersive && <SurfaceBackdrop />}

      <header
        className={cn(
          "z-40 flex items-start justify-between gap-4 px-4 py-4 md:px-8",
          immersive
            ? "pointer-events-none absolute inset-x-0 top-0"
            : "sticky top-0 border-b border-white/5 bg-background/70 backdrop-blur-xl",
        )}
      >
        <div ref={menuRef} className="pointer-events-auto relative">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className={cn(
              "flex items-center gap-3 rounded-full border py-1.5 pl-1.5 pr-3 transition-colors",
              menuOpen
                ? "border-white/15 bg-surface-container-high"
                : "border-white/10 bg-background/60 backdrop-blur-xl hover:border-white/20",
            )}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5">
              {me?.displayName ? (
                <span className="font-display text-[15px] font-semibold text-on-surface">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              ) : (
                <Icon name="account_circle" size={22} className="text-on-surface-variant" />
              )}
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block truncate font-display text-[14px] font-bold leading-tight text-on-surface">
                {displayName}
              </span>
              <span className="label-caps block text-[9px] leading-tight">{t.roles.creator}</span>
            </span>
            <Icon
              name="expand_more"
              size={18}
              className={cn(
                "text-on-surface-variant transition-transform",
                menuOpen && "rotate-180",
              )}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className={cn(
                "absolute left-0 top-full z-50 mt-2 w-72 animate-fade-up overflow-hidden rounded-lg",
                "border border-white/10 bg-surface-container/95 shadow-creator-glow backdrop-blur-xl",
              )}
            >
              <nav className="flex flex-col py-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    role="menuitem"
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 border-l-2 px-5 py-2.5 transition-colors",
                        isActive
                          ? "border-creator bg-creator/10 font-semibold text-creator"
                          : "border-transparent text-on-surface-variant hover:bg-white/5 hover:text-on-surface",
                      )
                    }
                  >
                    <Icon name={item.icon} size={20} />
                    <span className="font-display text-[14px]">{item.label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* The number that should always be one glance away — now one tap. */}
              <div className="mx-3 mb-3 rounded-md border border-white/5 bg-surface-container-lowest/80 p-4">
                <p className="label-caps text-[10px]">{t.feed.yourEarnings}</p>
                <p className="numeric mt-1 text-[22px] font-semibold text-creator">
                  {formatMoney(earnings.thisMonthMinor)}
                </p>
                <NavLink
                  to="/campanii"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] text-on-surface-variant transition-colors hover:text-creator"
                >
                  {t.feed.firstCampaignCta}
                  <Icon name="arrow_forward" size={13} />
                </NavLink>
              </div>

              <div className="flex flex-col border-t border-white/5 py-2">
                {secondaryItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className="flex items-center gap-3 px-5 py-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-on-surface"
                  >
                    <Icon name={item.icon} size={18} />
                    <span className="font-display text-[13px]">{item.label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  role="menuitem"
                  onClick={leave}
                  className="flex items-center gap-3 px-5 py-2 text-on-surface-variant transition-colors hover:bg-white/5 hover:text-error"
                >
                  <Icon name="logout" size={18} />
                  <span className="font-display text-[13px]">{t.nav.logout}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* No wordmark here: `Logo` is documented as belonging to public
            surfaces, and inside the app the top-left slot is the user's. */}
        <div className={cn("flex items-center gap-4 pt-2", immersive && "pointer-events-auto")}>
          <button
            type="button"
            aria-label={t.common.notifications}
            className="text-on-surface-variant transition-colors hover:text-on-surface"
          >
            <Icon name="notifications" size={22} />
          </button>
        </div>
      </header>

      {/* The feed is a full-height snap scroller and brings its own bottom
          padding; every other screen is a normal document and needs the room
          cleared for it. */}
      <div className={cn("relative z-10", !immersive && "pb-[76px] md:pb-0")}>
        <Outlet />
      </div>

      {/* Mobile navigation.
       *
       * The creator is the one who lives on a phone — the whole product sits
       * next to TikTok — and until now they were the audience without a tab
       * bar, reaching navigation through a dropdown in the top-left corner
       * while brands had one. That was backwards.
       *
       * It floats over the feed rather than displacing it, which is what every
       * app this one is measured against does: the content runs to the bottom
       * edge and the bar sits on the glass above it. */}
      <nav
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 md:hidden",
          "border-t border-white/5 bg-background/80 backdrop-blur-xl",
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <div className="flex items-stretch">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-1 flex-col items-center gap-1 py-3 transition-colors",
                  isActive ? "text-creator" : "text-on-surface-variant",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon name={item.icon} size={22} filled={isActive} />
                  <span className="font-body text-[10px] font-semibold">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
