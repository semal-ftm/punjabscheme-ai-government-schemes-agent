import HowItWorks from "./HowItWorks.jsx";
import { Brain, FileText, ListChecks, MessageSquareText, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Code2, Columns2, RotateCcw, Save } from "lucide-react";
import { studioApi } from "../../api.js";
import ConfirmDialog from "../../components/ConfirmDialog.jsx";
import { CardSkeleton, ErrorState, Spinner } from "../../components/States.jsx";
import { useAsync } from "../../lib/useAsync.js";
import { Panel } from "./ui.jsx";

const STAGE = {
  SYSTEM_PROMPT: { label: "System", tone: "bg-plum-50 text-plum-700", stage: "every LLM call" },
  UNDERSTAND_PROMPT: { label: "Understand", tone: "bg-gold-50 text-gold-600", stage: "node: understand" },
  PLAN_PROMPT: { label: "Plan", tone: "bg-emerald-50 text-emerald-800", stage: "node: plan" },
  ANSWER_PROMPT: { label: "Answer", tone: "bg-cream-200 text-navy-700", stage: "node: answer" },
};

export default function Prompts() {
  const { data, error, loading, reload, setData } = useAsync((signal) => studioApi.prompts({ signal }), []);
  const [active, setActive] = useState("SYSTEM_PROMPT");
  const [draft, setDraft] = useState("");
  const [check, setCheck] = useState({ ok: true, problems: [] });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [compare, setCompare] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const ta = useRef(null);

  const prompt = data?.prompts.find((p) => p.name === active);
  const dirty = prompt && draft !== prompt.text;

  useEffect(() => {
    if (prompt) {
      setDraft(prompt.text);
      setMsg("");
    }
  }, [prompt?.name, prompt?.text]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live validation (debounced)
  useEffect(() => {
    if (!prompt || !dirty) {
      setCheck({ ok: true, problems: [] });
      return undefined;
    }
    const t = setTimeout(() => {
      studioApi.validatePrompt(prompt.name, draft).then(setCheck).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [draft, prompt, dirty]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      setData(await studioApi.savePrompt(active, draft));
      setMsg("Saved. The agent uses this prompt from the next message.");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setSaving(false);
    }
  };
  const reset = async () => {
    setSaving(true);
    try {
      setData(await studioApi.resetPrompt(active));
      setMsg("Reset to the default prompt.");
      setConfirmReset(false);
    } finally {
      setSaving(false);
    }
  };
  const insert = (ph) => {
    const el = ta.current;
    const token = `{${ph}}`;
    if (!el) return setDraft((d) => d + token);
    const { selectionStart: a, selectionEnd: b } = el;
    setDraft((d) => d.slice(0, a) + token + d.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + token.length, a + token.length);
    });
  };

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <CardSkeleton lines={8} />;

  return (
    <>
    <HowItWorks
      image="/img/studio-prompts.webp"
      title="Prompt Studio"
      summary="Prompts are the written instructions the LLM follows at each stage. Edit them here and the agent uses the new version from the next message."
      steps={[
        { icon: ShieldCheck, title: "System", text: "Sets the role and hard rules for every call: only official evidence, cite [n], never decide eligibility, never ask for CNIC, reply in the user's language." },
        { icon: Brain, title: "Understand", text: "Turns the user's message into JSON: language, intent, facts and referenced schemes." },
        { icon: ListChecks, title: "Plan", text: "Chooses MCP tools with a reason for each. The Tavily tool is described here only when live search is on." },
        { icon: MessageSquareText, title: "Answer", text: "Writes the reply from numbered evidence only, with citations and the “confirm on the official portal” line." },
        { icon: FileText, title: "Validate", text: "Before saving, the template is checked: required {placeholders} must exist and braces must be valid, so a typo can't break the agent.", example: `${data.prompts.filter((x) => x.customized).length} of ${data.prompts.length} prompts customized` },
      ]}
    />
    <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
      <div className="space-y-4">
        <Panel title="Prompts" icon={Code2}>
          <ul className="space-y-1">
            {data.prompts.map((p) => (
              <li key={p.name}>
                <button
                  type="button"
                  onClick={() => setActive(p.name)}
                  className={`w-full rounded-xl px-3 py-2 text-left ${active === p.name ? "bg-emerald-100" : "hover:bg-cream-200"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className={`pill ${STAGE[p.name].tone}`}>{STAGE[p.name].label}</span>
                    {p.customized && <span className="pill bg-gold-100 text-gold-600">edited</span>}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] text-navy-800">{p.name}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{p.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="rounded-2xl border border-slate-200 bg-cream-100 p-4 text-xs text-slate-600">
          <p className="font-semibold text-navy-800">Guard-rails stay on</p>
          <p className="mt-1">
            Whatever the prompts say, every LLM output is validated: allowed tools only, real scheme ids, existing citation numbers.
            Eligibility is always decided by the verified rule engine.
          </p>
          <Link to="/studio/testing" className="link mt-2 inline-block">Test your changes in Simulation →</Link>
        </div>
      </div>

      {prompt && (
        <Panel
          title={prompt.name}
          sub={`${prompt.description} · used by ${STAGE[prompt.name].stage}`}
          actions={
            <>
              <button type="button" onClick={() => setCompare((c) => !c)} className={`${compare ? "chip-on" : "chip-off"} !py-1 text-xs`}>
                <Columns2 className="h-3.5 w-3.5" /> Compare default
              </button>
              <button type="button" onClick={() => setConfirmReset(true)} disabled={!prompt.customized || saving} className="btn-ghost !py-1.5 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
              <button type="button" onClick={save} disabled={!dirty || !check.ok || saving} className="btn-primary !py-1.5 text-xs">
                {saving ? <Spinner className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />} Save
              </button>
            </>
          }
        >
          {prompt.placeholders.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Required placeholders</span>
              {prompt.placeholders.map((ph) => {
                const present = draft.includes(`{${ph}}`);
                return (
                  <button
                    key={ph}
                    type="button"
                    onClick={() => insert(ph)}
                    title="Insert at cursor"
                    className={`pill font-mono ${present ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700 ring-1 ring-rose-200"}`}
                  >
                    {`{${ph}}`}
                  </button>
                );
              })}
            </div>
          )}
          <div className={`grid gap-3 ${compare ? "xl:grid-cols-2" : ""}`}>
            <div>
              <textarea
                ref={ta}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                spellCheck={false}
                rows={24}
                aria-label={`${prompt.name} text`}
                className="input !bg-[#1f1b16] font-mono text-[12px] leading-relaxed !text-[#efe6d5] caret-gold-400"
                onKeyDown={(e) => {
                  if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    if (dirty && check.ok) save();
                  }
                }}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  {draft.length.toLocaleString()} chars · {draft.split("\n").length} lines · ~{Math.round(draft.length / 4).toLocaleString()} tokens
                  {dirty && <span className="ml-2 font-semibold text-gold-600">● unsaved</span>}
                </span>
                {dirty &&
                  (check.ok ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> Template valid</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-rose-700"><AlertTriangle className="h-3.5 w-3.5" /> {check.problems.join(" ")}</span>
                  ))}
              </div>
              {msg && <p className="mt-2 rounded-lg bg-cream-200 px-3 py-2 text-xs text-navy-800">{msg}</p>}
            </div>
            {compare && (
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Default</p>
                <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white/70 p-3 font-mono text-[12px] leading-relaxed text-navy-700 scroll-thin">
                  {prompt.default}
                </pre>
              </div>
            )}
          </div>
          {prompt.name === "PLAN_PROMPT" && (
            <p className="mt-3 text-xs text-slate-500">
              <code className="kbd">{"{live_tool}"}</code> and <code className="kbd">{"{live_rule}"}</code> are filled with the Tavily tool description only when live search is on.
            </p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">Tip: write literal JSON braces as <code className="kbd">{"{{"}</code> and <code className="kbd">{"}}"}</code>. Ctrl+S saves.</p>
        </Panel>
      )}

      <ConfirmDialog open={confirmReset} title="Reset this prompt?" confirmLabel="Reset to default" busy={saving} onConfirm={reset} onCancel={() => setConfirmReset(false)}>
        Your edited version of <strong>{active}</strong> will be discarded.
      </ConfirmDialog>
    </div>
    </>
  );
}
