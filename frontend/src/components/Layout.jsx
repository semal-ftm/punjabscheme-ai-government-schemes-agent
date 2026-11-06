import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bookmark, ClipboardCheck, Columns3, History, LayoutDashboard, Menu, MessagesSquare, Search, Workflow, X,
} from "lucide-react";
import AgentStatus from "./AgentStatus.jsx";
import Disclaimer from "./Disclaimer.jsx";
import UserControl from "./UserControl.jsx";
import { useUser } from "../lib/UserContext.jsx";

export const NAV_GROUPS = [
  {
    title: "Discover",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/schemes", label: "Explore Schemes", icon: Search },
      { to: "/saved", label: "Saved", icon: Bookmark, badge: "saved" },
    ],
  },
  {
    title: "AI tools",
    items: [
      { to: "/chat", label: "AI Chat", icon: MessagesSquare, badge: "ai" },
      { to: "/eligibility", label: "Eligibility Checker", icon: ClipboardCheck },
      { to: "/compare", label: "Compare", icon: Columns3 },
    ],
  },
  {
    title: "Stay informed",
    items: [{ to: "/updates", label: "Recent Updates", icon: History }],
  },
  {
    title: "Learn",
    items: [{ to: "/how-it-works", label: "How it works", icon: Workflow, badge: "new" }],
  },
];
export const NAV = NAV_GROUPS.flatMap((g) => g.items);

function Brand() {
  return (
    <div className="flex items-center gap-3 px-1">
      <img
        src="/logo.png"
        alt=""
        width="48"
        height="48"
        className="h-12 w-12 shrink-0 drop-shadow-[0_4px_14px_rgba(251,180,36,0.35)]"
      />
      <div className="min-w-0">
        <p className="font-display text-[1.05rem] font-extrabold leading-tight tracking-tight text-white">
          PunjabScheme{" "}
          <span className="bg-gradient-to-r from-gold-200 to-gold-400 bg-clip-text text-transparent">AI</span>
        </p>
        <p className="text-[11px] leading-snug text-navy-300">Government schemes discovery agent</p>
      </div>
    </div>
  );
}

function NavBadge({ kind, savedCount }) {
  if (kind === "ai")
    return (
      <span className="ml-auto rounded-full bg-gradient-to-r from-emerald-400 to-gold-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-950">
        AI
      </span>
    );
  if (kind === "new")
    return <span className="ml-auto rounded-full bg-gold-400/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-950">Guide</span>;
  if (kind === "saved" && savedCount > 0)
    return <span className="ml-auto min-w-[1.25rem] rounded-full bg-white/10 px-1.5 py-0.5 text-center text-[10px] font-bold text-white">{savedCount}</span>;
  return null;
}

function SidebarContent({ onNavigate }) {
  const { user } = useUser();
  const savedCount = user?.saved?.length || 0;
  return (
    <div className="relative flex h-full flex-col gap-6 overflow-y-auto p-4 scroll-thin">
      <div className="phulkari pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
      <div className="pointer-events-none absolute -left-20 -top-20 h-56 w-56 rounded-full bg-emerald-500/15 blur-3xl" aria-hidden />
      <div className="relative pt-1">
        <Brand />
      </div>
      <nav aria-label="Main" className="relative space-y-5">
        {NAV_GROUPS.map((g) => (
          <div key={g.title}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-400">{g.title}</p>
            <ul className="space-y-1">
              {g.items.map(({ to, label, icon: Icon, end, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `group relative flex items-center gap-3 rounded-xl px-2.5 py-2 text-sm font-medium transition-all duration-200 focus-visible:ring-offset-navy-950 ${
                        isActive
                          ? "bg-gradient-to-r from-white/[0.14] to-white/[0.04] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                          : "text-navy-200 hover:bg-white/[0.06] hover:text-white"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-gold-300 to-emerald-400 shadow-[0_0_12px_rgba(251,180,36,0.7)]" aria-hidden />
                        )}
                        <span
                          className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-br from-emerald-400 to-teal-600 text-white shadow-glow"
                              : "bg-white/[0.05] text-navy-300 group-hover:bg-white/10 group-hover:text-white"
                          }`}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        {label}
                        <NavBadge kind={badge} savedCount={savedCount} />
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="relative mt-auto space-y-3">
        <UserControl />
        <AgentStatus />
      </div>
    </div>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const scroller = useRef(null);

  // Each page scrolls inside <main>; reset it on navigation.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isChat = location.pathname.startsWith("/chat");

  return (
    // `relative` keeps visually-hidden (absolute) inputs inside the app frame; otherwise focusing one can scroll
    // the whole browser page past the app and reveal empty space below it.
    <div className="relative flex h-dvh overflow-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 bg-gradient-to-b from-navy-950 via-navy-950 to-[#0d2a33] lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-navy-950/60" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-gradient-to-b from-navy-950 to-[#0d2a33] shadow-2xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-navy-200 hover:bg-navy-800"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between gap-3 bg-navy-950 px-4 py-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <img src="/logo.png" alt="" width="28" height="28" className="h-7 w-7 shrink-0" />
            <span className="truncate font-bold text-white">PunjabScheme AI</span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-white hover:bg-navy-800"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>
        <Disclaimer />
        <main
          id="main"
          ref={scroller}
          className={`min-h-0 flex-1 ${isChat ? "overflow-hidden" : "overflow-y-auto"}`}
        >
          {isChat ? (
            <Outlet />
          ) : (
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
