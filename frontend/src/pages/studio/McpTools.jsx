import HowItWorks from "./HowItWorks.jsx";
import { CheckCircle2, List, Scale, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Globe, Play, RotateCcw, Server, Wrench } from "lucide-react";
import { studioApi } from "../../api.js";
import { CardSkeleton, ErrorState, Spinner } from "../../components/States.jsx";
import { useAsync } from "../../lib/useAsync.js";
import { JsonView, Metric, Panel } from "./ui.jsx";

function ParamTable({ schema }) {
  const props = schema?.properties || {};
  const required = new Set(schema?.required || []);
  const rows = Object.entries(props);
  if (!rows.length) return <p className="text-xs text-slate-500">No parameters.</p>;
  const typeOf = (p) => p.type || (p.anyOf || []).map((a) => a.type).filter(Boolean).join(" | ") || "any";
  return (
    <table className="w-full text-left text-xs">
      <thead className="text-slate-500">
        <tr><th className="py-1 pr-3">Parameter</th><th className="py-1 pr-3">Type</th><th className="py-1">Default</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map(([name, p]) => (
          <tr key={name}>
            <td className="py-1.5 pr-3 font-mono text-navy-900">{name}{required.has(name) && <span className="text-plum-600">*</span>}</td>
            <td className="py-1.5 pr-3 font-mono text-slate-600">{typeOf(p)}</td>
            <td className="py-1.5 font-mono text-slate-500">{p.default !== undefined ? JSON.stringify(p.default) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function McpTools() {
  const { data, error, loading, reload } = useAsync((signal) => studioApi.tools({ signal }), []);
  const [active, setActive] = useState(null);
  const [args, setArgs] = useState("{}");
  const [parseError, setParseError] = useState("");
  const [run, setRun] = useState({ loading: false, error: null, data: null });
  const [history, setHistory] = useState([]);

  const tool = data?.tools.find((t) => t.name === active) || null;

  useEffect(() => {
    if (data && !active) setActive(data.tools[0]?.name);
  }, [data, active]);
  useEffect(() => {
    if (tool) {
      setArgs(JSON.stringify(tool.example || {}, null, 2));
      setRun({ loading: false, error: null, data: null });
      setParseError("");
    }
  }, [tool?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const execute = async () => {
    let parsed;
    try {
      parsed = JSON.parse(args || "{}");
      setParseError("");
    } catch (e) {
      setParseError(`Invalid JSON: ${e.message}`);
      return;
    }
    setRun({ loading: true, error: null, data: null });
    try {
      const r = await studioApi.callTool(tool.name, parsed);
      setRun({ loading: false, error: null, data: r });
      setHistory((h) => [{ tool: tool.name, ms: r.elapsed_ms, ok: !r.result?.error, at: new Date() }, ...h].slice(0, 8));
    } catch (e) {
      setRun({ loading: false, error: e, data: null });
    }
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <CardSkeleton lines={6} />;

  return (
    <div className="space-y-6">
      <HowItWorks
        image="/img/studio-mcp.webp"
        title="MCP — Model Context Protocol"
        summary="The agent never touches the database directly. It asks a separate MCP server to run a named tool, like calling a trusted office that applies the official rules."
        steps={[
          { icon: Server, title: "Start server", text: "When the API starts it launches the MCP server as a child process and talks to it over stdio (standard input/output).", example: `${data.server?.name} v${data.server?.version} · protocol ${data.server?.protocol}` },
          { icon: List, title: "Discover tools", text: "The client asks the server which tools exist. Each tool publishes its name, description and input schema.", example: `${data.tools.length} tools: ${data.tools.map((t) => t.name).join(", ")}` },
          { icon: Send, title: "Call", text: "The planner chooses a tool and arguments; the agent sends a JSON-RPC call_tool request. Arguments are validated against the schema." },
          { icon: Scale, title: "Execute", text: "The server runs deterministic code on verified data. check_eligibility compares the profile to official criteria, each backed by a verbatim quote." },
          { icon: CheckCircle2, title: "Return", text: "Structured JSON comes back with sources and timing, and is shown live in the trace. Try any tool on the right.", example: `${data.total_calls} tool calls recorded so far` },
        ]}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric icon={Server} label="MCP server" value={data.server?.name ? "Running" : "Down"} hint={`${data.server?.name} v${data.server?.version} · protocol ${data.server?.protocol}`} />
        <Metric icon={Wrench} label="Tools exposed" value={data.tools.length} hint={data.transport} tone="gold" />
        <Metric icon={Play} label="Tool calls recorded" value={data.total_calls} hint="from chat traces + simulations" tone="plum" />
        <Metric icon={Globe} label="External tools" value={data.tools.filter((t) => t.external).length} hint="Tavily live search" tone="emerald" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Panel title="Tools" icon={Wrench}>
          <ul className="space-y-1">
            {data.tools.map((t) => (
              <li key={t.name}>
                <button
                  type="button"
                  onClick={() => setActive(t.name)}
                  className={`w-full rounded-xl px-3 py-2 text-left transition-colors ${active === t.name ? "bg-emerald-100 text-emerald-900" : "hover:bg-cream-200"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-mono text-xs font-semibold">{t.name}</span>
                    <span className="pill bg-white/80 text-slate-600">{t.calls}</span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-[11px] text-slate-500">{t.description}</span>
                  {t.external && <span className="pill mt-1 bg-plum-50 text-plum-700">external · Tavily</span>}
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        {tool && (
          <div className="space-y-4">
            <Panel title={tool.name} icon={Play} sub={tool.description}>
              <div className="grid gap-4 xl:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Input schema</p>
                  <ParamTable schema={tool.input_schema} />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="args" className="text-xs font-semibold uppercase tracking-wide text-slate-500">Arguments (JSON)</label>
                    <button type="button" onClick={() => setArgs(JSON.stringify(tool.example || {}, null, 2))} className="btn-ghost !px-2 !py-0.5 text-[11px]">
                      <RotateCcw className="h-3 w-3" /> Example
                    </button>
                  </div>
                  <textarea
                    id="args"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    spellCheck={false}
                    rows={9}
                    className="input font-mono text-xs leading-relaxed"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) execute();
                    }}
                  />
                  {parseError && <p className="mt-1 text-xs text-rose-600">{parseError}</p>}
                  <button type="button" onClick={execute} disabled={run.loading} className="btn-primary mt-2 w-full">
                    {run.loading ? <Spinner /> : <Play className="h-4 w-4" />} Call tool over MCP <span className="kbd !bg-white/20 !text-white">Ctrl+Enter</span>
                  </button>
                </div>
              </div>
            </Panel>

            {run.error && <ErrorState error={run.error} compact />}
            {run.data && (
              <Panel
                title="Result"
                actions={<span className={`pill ${run.data.result?.error ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>{run.data.result?.error ? "tool error" : "ok"} · {run.data.elapsed_ms} ms</span>}
              >
                <JsonView value={run.data.result} maxHeight="max-h-[28rem]" />
              </Panel>
            )}
            {history.length > 0 && (
              <Panel title="Calls this session">
                <ul className="flex flex-wrap gap-2">
                  {history.map((h, i) => (
                    <li key={i} className={`pill ${h.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
                      <span className="font-mono">{h.tool}</span> · {h.ms} ms · {h.at.toLocaleTimeString()}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
