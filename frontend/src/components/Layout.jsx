import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bookmark, ClipboardCheck, Columns3, History, LayoutDashboard, Menu, MessagesSquare, Search, ShieldCheck, X,
} from "lucide-react";
import AgentStatus from "./AgentStatus.jsx";
import Disclaimer from "./Disclaimer.jsx";
import UserControl from "./UserControl.jsx";

export const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/chat", label: "AI Chat", icon: MessagesSquare },
  { to: "/schemes", label: "Explore Schemes", icon: Search },
  { to: "/eligibility", label: "Eligibility Checker", icon: ClipboardCheck },
  { to: "/compare", label: "Compare", icon: Columns3 },
  { to: "/saved", label: "Saved", icon: Bookmark },
  { to: "/updates", label: "Recent Updates", icon: History },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30">
        <ShieldCheck className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-base font-bold leading-tight text-white">PunjabScheme AI</p>
        <p className="text-[11px] leading-snug text-navy-300">Unified Government Schemes Discovery &amp; Eligibility Agent</p>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4 scroll-thin">
      <Brand />
      <nav aria-label="Main">
        <ul className="space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-offset-navy-900 ${
                    isActive ? "bg-white text-navy-900 shadow-sm" : "text-navy-200 hover:bg-navy-800 hover:text-white"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto space-y-3">
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
    <div className="flex h-dvh overflow-hidden">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 bg-navy-900 lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-navy-950/60" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-xs bg-navy-900 shadow-2xl">
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
        <header className="flex items-center justify-between gap-3 bg-navy-900 px-4 py-3 lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
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
