import { useEffect, useState } from "react";
import { api } from "../api.js";

/** Small sidebar card: backend health + LLM / MCP / embeddings info. Refreshes every 30 s. */
export default function AgentStatus() {
  const [health, setHealth] = useState(null);
  const [info, setInfo] = useState(null);
  const [down, setDown] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const h = await api.health();
        if (!alive) return;
        setHealth(h);
        setDown(false);
        if (h.status === "ok") {
          const i = await api.agentInfo().catch(() => null);
          if (alive && i) setInfo(i);
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

  const state = down ? "offline" : health?.status === "ok" ? "online" : health ? "starting" : "checking";
  const dot = { online: "bg-emerald-400", starting: "bg-amber-400", offline: "bg-rose-400", checking: "bg-navy-400" }[state];
  const label = { online: "Online", starting: "Starting up", offline: "Backend offline", checking: "Checking..." }[state];

  const rows = info
    ? [
        ["LLM", info.llm],
        ["MCP server", info.mcp_server?.name ? `${info.mcp_server.name} · ${info.mcp_tools?.length ?? 0} tools` : "—"],
        ["Embeddings", (info.embedding_model || "").split("/").pop()],
        ["Chunks indexed", info.chunks_indexed ?? "indexing..."],
      ]
    : [];

  return (
    <div className="rounded-2xl border border-navy-700/70 p-3 text-xs text-navy-200">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-white">Agent status</span>
        <span className="inline-flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${dot} ${state === "online" ? "animate-pulse" : ""}`} aria-hidden />
          {label}
        </span>
      </div>
      {down && <p className="mt-2 leading-snug text-navy-300">Run <code className="text-emerald-300">uvicorn app.api:app</code> in the backend folder.</p>}
      {(health?.llm_error || info?.llm_error) && (
        <p className="mt-2 leading-snug text-amber-300" title={health?.llm_error || info?.llm_error}>
          LLM unavailable: rule-based fallback active.
        </p>
      )}
      {rows.length > 0 && (
        <dl className="mt-2 space-y-1">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <dt className="shrink-0 text-navy-400">{k}</dt>
              <dd className="truncate text-right text-navy-100" title={String(v)}>
                {String(v)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
