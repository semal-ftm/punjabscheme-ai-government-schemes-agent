import { NavLink, Outlet } from "react-router-dom";
import { Settings2 } from "lucide-react";

export const STUDIO_TABS = [
  { to: "/studio", label: "Overview", end: true },
  { to: "/studio/rag", label: "RAG Documents" },
  { to: "/studio/live", label: "Tavily Live Search" },
  { to: "/studio/memory", label: "Memory" },
  { to: "/studio/mcp", label: "MCP Tools" },
  { to: "/studio/prompts", label: "Prompt Studio" },
  { to: "/studio/testing", label: "Simulation & Testing" },
];

export default function StudioLayout() {
  return (
    <div>
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-cream-50 shadow-card">
        <img src="/img/studio.webp" alt="" className="absolute inset-y-0 right-0 hidden h-full w-3/5 object-cover object-right opacity-90 [mask-image:linear-gradient(to_right,transparent,black_35%)] md:block" />
        <div className="relative max-w-xl p-6 sm:p-8">
          <h1 className="flex items-center gap-2.5 font-display text-3xl font-semibold text-navy-900">
            <Settings2 className="h-6 w-6 text-gold-500" aria-hidden /> Agent Studio
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Configure, inspect and test the AI agent, its tools and its knowledge sources for PunjabScheme AI.
          </p>
        </div>
      </div>
      <nav aria-label="Agent Studio sections" className="-mx-1 mb-6 overflow-x-auto px-1 pb-1 scroll-thin">
        <ul className="flex min-w-max gap-2">
          {STUDIO_TABS.map((t) => (
            <li key={t.to}>
              <NavLink to={t.to} end={t.end} className={({ isActive }) => (isActive ? "tab-on" : "tab-off")}>
                {t.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="fade-up">
        <Outlet />
      </div>
    </div>
  );
}
