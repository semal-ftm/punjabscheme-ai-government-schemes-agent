import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Bell, Bookmark, BrainCircuit, CheckCircle2, ChevronDown, Columns3, Database, FlaskConical, Globe, History, Home,
  Menu, MessageCircle, Network, Search, TerminalSquare, Wrench, X,
} from "lucide-react";
import { api } from "../api.js";
import { useUser } from "../lib/UserContext.jsx";
import Disclaimer from "./Disclaimer.jsx";
import { Brand } from "./Logo.jsx";
import UserControl from "./UserControl.jsx";

export const NAV_GROUPS = [
  {
    items: [
      { to: "/", label: "Home", icon: Home, end: true },
      { to: "/schemes", label: "Explore Schemes", icon: Search },
      { to: "/eligibility", label: "Eligibility Checker", icon: CheckCircle2 },
      { to: "/chat", label: "AI Assistant", icon: MessageCircle },
      { to: "/studio", label: "Agent Studio", icon: BrainCircuit, end: true },
    ],
  },
  {
    title: "Agent internals",
    items: [
      { to: "/studio/rag", label: "RAG Documents", icon: Database },
      { to: "/studio/live", label: "Tavily Live Search", icon: Globe },
      { to: "/studio/mcp", label: "MCP Tools", icon: Wrench },
      { to: "/studio/memory", label: "Memory", icon: Network },
      { to: "/studio/prompts", label: "Prompt Studio", icon: TerminalSquare },
      { to: "/studio/testing", label: "Simulation & Testing", icon: FlaskConical },
    ],
  },
  {
    title: "More",
    items: [
      { to: "/compare", label: "Compare", icon: Columns3 },
      { to: "/saved", label: "Saved", icon: Bookmark },
      { to: "/updates", label: "Recent Updates", icon: History },
    ],
  },
];
export const NAV = NAV_GROUPS.flatMap((g) => g.items);

function useHealth() {
  const [health, setHealth] = useState(null);
  const [down, setDown] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const h = await api.health();
        if (alive) {
          setHealth(h);
          setDown(false);
        }
      } catch {
        if (alive) setDown(true);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return { health, down };
}

function SidebarNav({ onNavigate, health, down }) {
  const state = down ? "offline" : health?.status === "ok" ? "online" : "starting";
  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto px-3 py-4 scroll-thin">
      <nav aria-label="Main" className="space-y-5">
        {NAV_GROUPS.map((g, gi) => (
          <div key={gi}>
            {g.title && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g.title}</p>}
            <ul className="space-y-0.5">
              {g.items.map(({ to, label, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-emerald-100 font-semibold text-emerald-900"
                          : "font-medium text-navy-700 hover:bg-cream-300/70 hover:text-navy-900"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-200 bg-cream-50 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-navy-800">Agent status</span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span
              className={`h-2 w-2 rounded-full ${
                state === "online" ? "animate-pulse bg-emerald-500" : state === "offline" ? "bg-rose-500" : "bg-gold-400"
              }`}
            />
            {state === "online" ? "Online" : state === "offline" ? "Offline" : "Starting"}
          </span>
        </div>
        {health && (
          <dl className="mt-2 space-y-1 text-slate-600">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">LLM</dt>
              <dd className="truncate" title={health.llm}>{health.llm === "unavailable" ? "fallback rules" : health.llm}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-400">Tavily</dt>
              <dd>{health.live_search ? "live" : health.tavily_configured ? "off" : "no key"}</dd>
            </div>
          </dl>
        )}
        {down && <p className="mt-2 text-slate-500">Start the API: <code className="kbd">uvicorn app.api:app</code></p>}
      </div>
    </div>
  );
}

function UserMenu() {
  const { userId } = useUser();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1 rounded-full p-0.5 pr-1.5 hover:bg-cream-300/70"
        aria-label="Account"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-plum-600 text-sm font-bold uppercase text-white">
          {userId ? userId.slice(0, 1) : "P"}
        </span>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div className="fade-up absolute right-0 top-11 z-40 w-80 rounded-2xl border border-slate-200 bg-cream-50 p-2 shadow-lift">
          <UserControl />
        </div>
      )}
    </div>
  );
}

function Bellbutton() {
  const [pending, setPending] = useState(0);
  useEffect(() => {
    api.stats().then((s) => setPending(s?.pending_review || 0)).catch(() => {});
  }, []);
  return (
    <Link
      to="/updates"
      className="relative rounded-full p-2 text-navy-700 hover:bg-cream-300/70"
      aria-label={`Recent updates${pending ? `, ${pending} pending review` : ""}`}
    >
      <Bell className="h-5 w-5" aria-hidden />
      {pending > 0 && (
        <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-plum-600 px-1 text-[10px] font-bold text-white">
          {pending > 9 ? "9+" : pending}
        </span>
      )}
    </Link>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const scroller = useRef(null);
  const { health, down } = useHealth();

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
    <div className="jaali relative flex h-dvh flex-col overflow-clip bg-cream-200">
      {/* overflow-clip (not overflow-hidden): a hidden box can still be scrolled by scrollIntoView(),
          which shifted the whole shell up and left a blank strip below it. A clipped box can't be scrolled.
          `relative` here and on <main> keeps absolutely positioned descendants (e.g. sr-only inputs)
          inside the shell, so they can't stretch the document and make the window scroll. */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>

      {/* Top header */}
      <header className="z-30 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 bg-cream-100/90 px-3 py-2.5 backdrop-blur sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="rounded-lg p-2 text-navy-800 hover:bg-cream-300 lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="min-w-0">
            <Brand />
          </Link>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          {health?.live_search && (
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 md:inline-flex">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Live search on
            </span>
          )}
          <Bellbutton />
          <UserMenu />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-cream-100 lg:block">
          <SidebarNav health={health} down={down} />
        </aside>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" className="absolute inset-0 bg-navy-950/40" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
            <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col bg-cream-100 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <Brand compact />
                <button type="button" onClick={() => setMenuOpen(false)} className="rounded-lg p-1.5 text-navy-700 hover:bg-cream-300" aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <SidebarNav onNavigate={() => setMenuOpen(false)} health={health} down={down} />
              </div>
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Disclaimer />
          <main id="main" ref={scroller} className={`relative min-h-0 flex-1 ${isChat ? "overflow-clip" : "overflow-y-auto"}`}>
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
    </div>
  );
}
