import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Cpu, Download, Eraser, Lock, Save, ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import EligibilityCard from "../components/EligibilityCard.jsx";
import SchemePicker from "../components/SchemePicker.jsx";
import { EmptyState, ErrorState, PageHeader, Spinner } from "../components/States.jsx";
import VerdictBadge from "../components/VerdictBadge.jsx";
import { PROFILE_FIELDS, VERDICT_ORDER, VERDICTS, fieldLabel, optionLabel } from "../lib/constants.js";
import { formatValue } from "../lib/format.js";
import { KEYS, readJSON, writeJSON } from "../lib/storage.js";
import { useUser } from "../lib/UserContext.jsx";

const SECTIONS = [
  ["Personal", ["age", "gender", "marital_status", "has_disability", "has_driving_licence"]],
  ["Where you live", ["district", "province"]],
  ["Education", ["education_level", "currently_enrolled", "current_semester", "institution_type", "intermediate_marks_percent", "received_laptop_before"]],
  ["Household & work", ["monthly_household_income", "employment_type", "registered_with_pessi", "registered_industrial_worker", "bisp_beneficiary"]],
  ["Property & land", ["owns_plot", "plot_size_marla", "area_type", "land_acres"]],
];

/** Form strings -> typed profile (empty values omitted, as the backend expects). */
function toProfile(form) {
  const out = {};
  for (const [key, def] of Object.entries(PROFILE_FIELDS)) {
    const v = form[key];
    if (v === undefined || v === null || v === "") continue;
    if (def.type === "int") out[key] = parseInt(v, 10);
    else if (def.type === "float") out[key] = parseFloat(v);
    else if (def.type === "bool") out[key] = v === "yes";
    else out[key] = String(v).trim();
    if (typeof out[key] === "number" && Number.isNaN(out[key])) delete out[key];
  }
  return out;
}

/** Typed profile -> form strings. */
function fromProfile(profile = {}) {
  const form = {};
  for (const [key, v] of Object.entries(profile)) {
    if (!PROFILE_FIELDS[key] || v === null || v === undefined) continue;
    form[key] = typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
  }
  return form;
}

function Field({ name, value, onChange, highlighted }) {
  const def = PROFILE_FIELDS[name];
  const id = `pf-${name}`;
  const ring = highlighted ? "ring-4 ring-amber-300 rounded-xl" : "";

  if (def.type === "bool") {
    return (
      <fieldset data-field={name} className={`transition-shadow ${ring}`}>
        <legend className="label">{def.label}</legend>
        <div className="inline-flex rounded-xl border border-slate-300 bg-white p-0.5">
          {[["yes", "Yes"], ["no", "No"], ["", "Not sure"]].map(([v, label]) => (
            <label
              key={label}
              className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-emerald-500 ${
                (value || "") === v ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-slate-100"
              }`}
            >
              <input type="radio" name={id} value={v} checked={(value || "") === v} onChange={() => onChange(name, v)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <div data-field={name} className={`transition-shadow ${ring}`}>
      <label htmlFor={id} className="label">
        {def.label}
      </label>
      {def.type === "enum" ? (
        <select id={id} value={value || ""} onChange={(e) => onChange(name, e.target.value)} className="input">
          <option value="">Not specified</option>
          {def.values.map((v) => (
            <option key={v} value={v}>
              {optionLabel(v)}
            </option>
          ))}
        </select>
      ) : (
        <>
          <input
            id={id}
            type={def.type === "str" ? "text" : "number"}
            inputMode={def.type === "int" ? "numeric" : def.type === "float" ? "decimal" : undefined}
            step={def.type === "float" ? "0.5" : def.type === "int" ? "1" : undefined}
            min={def.min}
            max={def.max}
            list={def.suggestions ? `${id}-list` : undefined}
            value={value || ""}
            onChange={(e) => onChange(name, e.target.value)}
            placeholder={name === "district" ? "e.g. Lahore" : name === "monthly_household_income" ? "e.g. 45000" : ""}
            autoComplete="off"
            className="input"
          />
          {def.suggestions && (
            <datalist id={`${id}-list`}>
              {def.suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          )}
        </>
      )}
      {def.hint && <p className="mt-1 text-xs text-slate-500">{def.hint}</p>}
    </div>
  );
}

export default function Eligibility() {
  const [params] = useSearchParams();
  const { userId, user, consent, saveProfile } = useUser();
  const [form, setForm] = useState(() => readJSON("session", KEYS.checkerProfile, {}));
  const [schemeIds, setSchemeIds] = useState(() => (params.get("scheme") ? [params.get("scheme")] : []));
  const [schemes, setSchemes] = useState([]);
  const [result, setResult] = useState(null);
  const [state, setState] = useState({ loading: false, error: null });
  const [highlight, setHighlight] = useState(null);
  const [accountMsg, setAccountMsg] = useState("");
  const resultsRef = useRef(null);

  useEffect(() => writeJSON("session", KEYS.checkerProfile, form), [form]);

  useEffect(() => {
    const ctrl = new AbortController();
    api.schemes({}, { signal: ctrl.signal }).then(setSchemes).catch(() => {});
    return () => ctrl.abort();
  }, []);

  const onChange = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const profile = useMemo(() => toProfile(form), [form]);
  const filled = Object.keys(profile).length;

  const check = async (e) => {
    e?.preventDefault();
    setState({ loading: true, error: null });
    try {
      const data = await api.eligibility(profile, schemeIds);
      setResult(data);
      setState({ loading: false, error: null });
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      setState({ loading: false, error: err });
    }
  };

  // Clicking a missing field scrolls to it, focuses its control and briefly highlights it.
  const focusField = (field) => {
    if (field === "plot_size_marla" && form.owns_plot === "no") onChange("owns_plot", "");
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-field="${field}"]`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.querySelector("input, select")?.focus({ preventScroll: true });
      setHighlight(field);
      setTimeout(() => setHighlight((h) => (h === field ? null : h)), 2500);
    });
  };

  // Missing facts across all "More Information Needed" results, most impactful first.
  const missing = useMemo(() => {
    const counts = {};
    for (const r of result?.results || []) {
      if (r.verdict !== VERDICTS.NEED_INFO) continue;
      for (const f of r.missing_fields || []) counts[f] = (counts[f] || 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [result]);

  const grouped = useMemo(
    () => VERDICT_ORDER.map((v) => [v, (result?.results || []).filter((r) => r.verdict === v)]).filter(([, list]) => list.length),
    [result]
  );

  const loadSaved = () => {
    const saved = user?.profile || {};
    if (!Object.keys(saved).length) {
      setAccountMsg("No saved profile found on your account yet.");
      return;
    }
    setForm(fromProfile(saved));
    setAccountMsg(`Loaded ${Object.keys(saved).length} saved fact(s).`);
  };

  const saveToAccount = async () => {
    setAccountMsg("");
    try {
      await saveProfile(profile);
      setAccountMsg("Profile saved to your account.");
    } catch (err) {
      setAccountMsg(err.message);
    }
  };

  return (
    <div>
      <PageHeader
        icon={ClipboardCheck}
        title="Eligibility Checker"
        subtitle="Fill in what you know. Rules are checked deterministically against officially published criteria; the AI never decides eligibility."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <form onSubmit={check} className="space-y-5">
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-900">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <p>
              <strong>CNIC, phone number and bank details are never needed</strong> for this check. Don't enter them
              anywhere in this app. All fields are optional: leave anything you're unsure about empty.
            </p>
          </div>

          {/* Long-term memory (account) */}
          <div className="card p-4 text-sm">
            {!userId ? (
              <p className="text-slate-600">Pick a username in the menu to load or save your profile. Without it, your answers only live in this browser tab.</p>
            ) : !consent ? (
              <p className="text-slate-600">
                Your profile only lives in this session. Turn on <strong>Remember my profile</strong> in the menu to
                save it to your account ({userId}).
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto inline-flex items-center gap-1.5 font-medium text-navy-800">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden /> Profile storage is on for {userId}
                </span>
                <button type="button" onClick={loadSaved} className="btn-secondary !py-1.5">
                  <Download className="h-4 w-4" aria-hidden /> Load saved
                </button>
                <button type="button" onClick={saveToAccount} disabled={!filled} className="btn-secondary !py-1.5">
                  <Save className="h-4 w-4" aria-hidden /> Save to account
                </button>
              </div>
            )}
            {accountMsg && (
              <p className="mt-2 text-xs text-slate-600" role="status">
                {accountMsg}
              </p>
            )}
          </div>

          {SECTIONS.map(([title, fields]) => (
            <fieldset key={title} className="card p-5">
              <legend className="sr-only">{title}</legend>
              <h2 className="section-title mb-4" aria-hidden>
                {title}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {fields
                  .filter((f) => !(f === "plot_size_marla" && form.owns_plot === "no"))
                  .map((f) => (
                    <Field key={f} name={f} value={form[f]} onChange={onChange} highlighted={highlight === f} />
                  ))}
              </div>
            </fieldset>
          ))}

          <div className="card p-5">
            <SchemePicker
              label="Schemes to check"
              schemes={schemes}
              value={schemeIds}
              onChange={setSchemeIds}
              max={20}
              placeholder="Leave empty to check every scheme with verified rules"
            />
            <p className="mt-2 text-xs text-slate-500">
              {schemeIds.length ? `${schemeIds.length} selected scheme(s) will be checked.` : "All schemes with verified rules will be checked."}
            </p>
          </div>

          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border">
            <button type="submit" disabled={state.loading} className="btn-primary">
              {state.loading ? <Spinner /> : <ClipboardCheck className="h-4 w-4" aria-hidden />} Check eligibility
            </button>
            <button type="button" onClick={() => setForm({})} className="btn-ghost">
              <Eraser className="h-4 w-4" aria-hidden /> Clear
            </button>
            <span className="ml-auto text-xs text-slate-500">{filled} of {Object.keys(PROFILE_FIELDS).length} fields filled</span>
          </div>
        </form>

        <section ref={resultsRef} aria-labelledby="results-h" className="scroll-mt-4 space-y-4">
          <h2 id="results-h" className="section-title">
            Results
          </h2>
          {state.error && <ErrorState error={state.error} onRetry={check} />}
          {!result && !state.error && (
            <EmptyState icon={ClipboardCheck} title="No check yet">
              Fill in a few fields and press <strong>Check eligibility</strong>. You will see a verdict per scheme with
              the official text behind every criterion.
            </EmptyState>
          )}

          {result && (
            <>
              {result.trace && (
                <p className="inline-flex items-center gap-1.5 rounded-lg bg-navy-50 px-2.5 py-1 text-xs text-navy-700">
                  <Cpu className="h-3.5 w-3.5" aria-hidden />
                  Checked via MCP tool <code className="font-semibold">{result.trace.tool}</code> ({result.trace.via}) in {result.trace.elapsed_ms} ms
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {grouped.map(([v, list]) => (
                  <span key={v} className="inline-flex items-center gap-1.5">
                    <VerdictBadge verdict={v} /> <span className="text-sm font-semibold text-navy-800">{list.length}</span>
                  </span>
                ))}
              </div>

              {missing.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="text-sm font-semibold text-amber-900">Answer only what's missing</p>
                  <p className="mt-0.5 text-xs text-amber-800">These facts would decide {missing.length > 1 ? "more verdicts" : "a verdict"}. Click one to jump to it.</p>
                  <ul className="mt-2 space-y-1.5">
                    {missing.map(([f, n]) => (
                      <li key={f}>
                        <button type="button" onClick={() => focusField(f)} className="text-left text-sm text-amber-900 hover:underline">
                          <strong>{fieldLabel(f)}</strong>: {PROFILE_FIELDS[f]?.question || f}{" "}
                          <span className="text-xs text-amber-700">({n} scheme{n > 1 ? "s" : ""})</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.errors?.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                  {result.errors.map((e) => (
                    <p key={e.error}>
                      {e.error}
                      {e.did_you_mean?.length ? ` Did you mean: ${e.did_you_mean.join(", ")}?` : ""}
                    </p>
                  ))}
                </div>
              )}

              {result.results?.length === 0 && (
                <EmptyState title="No schemes were checked">
                  There are no schemes with verified rules yet. <Link to="/schemes" className="link">Explore schemes</Link> instead.
                </EmptyState>
              )}

              {grouped.map(([verdict, list]) => (
                <div key={verdict} className="space-y-3">
                  <h3 className="flex items-center gap-2 pt-2 text-sm font-semibold text-navy-900">
                    {verdict} <span className="text-slate-400">({list.length})</span>
                  </h3>
                  {list.map((r) => (
                    <EligibilityCard key={r.scheme_id} result={r} defaultOpen={verdict !== VERDICTS.NOT_ELIGIBLE && list.length <= 3} onMissingField={focusField} />
                  ))}
                </div>
              ))}

              {result.profile_used && Object.keys(result.profile_used).length > 0 && (
                <details className="card p-4 text-sm">
                  <summary className="cursor-pointer font-semibold text-navy-800">Profile used for this check (normalized by the server)</summary>
                  <dl className="mt-2 flex flex-wrap gap-1.5">
                    {Object.entries(result.profile_used).map(([k, v]) => (
                      <div key={k} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">
                        <dt className="inline text-slate-500">{fieldLabel(k)}: </dt>
                        <dd className="inline font-medium text-navy-800">{formatValue(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </details>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
