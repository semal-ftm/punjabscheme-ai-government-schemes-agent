import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Lock, MessagesSquare, Send, ShieldCheck, Sparkles, UserRound, Wand2 } from "lucide-react";
import { api } from "../../api.js";
import { useUser } from "../../lib/UserContext.jsx";
import { useAsync } from "../../lib/useAsync.js";
import { CATEGORY_LABELS, VERDICTS, fieldLabel } from "../../lib/constants.js";
import { Ring } from "./Animated.jsx";
import { PunjabSkyline } from "../art/SchemeArt.jsx";
import PunjabScene from "../art/PunjabScene.jsx";

const ROTATING = [
  "I am a matric student from Lahore. Which schemes can I apply for?",
  "Mujhe ghar banane ke liye qarza chahiye",
  "I'm a farmer with 5 acres in Okara. Any help for me?",
  "What documents do I need for BISP Kafaalat?",
  "Meri beti ki shadi hai, koi madad mil sakti hai?",
];

// The facts that most often decide a verdict; used for the "profile completeness" bar.
const KEY_FIELDS = [
  "age", "gender", "district", "area_type", "education_level", "monthly_household_income",
  "employment_type", "marital_status", "bisp_beneficiary",
];

const VERDICT_DOT = {
  [VERDICTS.ELIGIBLE]: { dot: "bg-emerald-400", text: "text-emerald-300", short: "Potentially eligible" },
  [VERDICTS.NEED_INFO]: { dot: "bg-amber-300", text: "text-amber-200", short: "Needs more info" },
  [VERDICTS.NOT_ELIGIBLE]: { dot: "bg-slate-400", text: "text-slate-300", short: "Not eligible" },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ------------------------------------------------------------------ search */
function AskBar() {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % ROTATING.length), 3500);
    return () => clearInterval(t);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const text = value.trim() || ROTATING[i];
    navigate(`/chat?ask=${encodeURIComponent(text)}`);
  };

  return (
    <form onSubmit={submit} className="group relative mt-4 max-w-xl">
      <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 opacity-40 blur transition group-focus-within:opacity-80" aria-hidden />
      <div className="relative flex items-center gap-2 rounded-2xl bg-white p-1.5 pl-4 shadow-lift">
        <Sparkles className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
        <div className="relative min-w-0 flex-1">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Ask the AI about government schemes"
            className="w-full bg-transparent py-2.5 text-sm text-navy-900 outline-none sm:text-base"
          />
          {!value && (
            <span key={i} className="pointer-events-none absolute inset-y-0 left-0 right-0 flex animate-text-swap items-center truncate text-sm text-slate-400 sm:text-base" aria-hidden>
              {ROTATING[i]}
            </span>
          )}
        </div>
        <button type="submit" className="btn-primary shrink-0 rounded-xl px-3 sm:px-4">
          <Send className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-navy-200">
        Ask in
        {["English", "اردو", "Roman Urdu"].map((l) => (
          <span key={l} className="rounded-full bg-white/10 px-2 py-0.5 font-medium text-white ring-1 ring-white/10">
            {l}
          </span>
        ))}
        <span className="hidden xl:inline">· Enter tries the example</span>
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ matches */
function PanelShell({ children, title, icon: Icon = Sparkles }) {
  return (
    <div className="glass relative rounded-3xl p-5 shadow-2xl sm:p-6">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-200">
        <Icon className="h-4 w-4" aria-hidden /> {title}
      </p>
      {children}
    </div>
  );
}

function GhostRows() {
  return (
    <ul className="mt-4 space-y-2" aria-hidden>
      {["w-3/4", "w-2/3", "w-1/2"].map((w, n) => (
        <li key={w} className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10" style={{ opacity: 1 - n * 0.25 }}>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10">
            <Lock className="h-3.5 w-3.5 text-navy-200" />
          </span>
          <span className="flex-1 space-y-1.5">
            <span className={`block h-2.5 rounded bg-white/20 ${w}`} />
            <span className="block h-2 w-1/3 rounded bg-white/10" />
          </span>
        </li>
      ))}
    </ul>
  );
}

function SignedOut() {
  return (
    <PanelShell title="Your personal matches">
      <h2 className="mt-3 text-xl font-bold text-white">See the schemes made for you</h2>
      <p className="mt-1.5 text-sm text-navy-200">
        Choose a username in the sidebar and switch on <b className="text-white">Remember my profile</b>. Your matches appear here every time you come back.
      </p>
      <GhostRows />
      <Link to="/eligibility" className="btn-primary mt-5 w-full">
        <Wand2 className="h-4 w-4" aria-hidden /> Start the 1-minute check
      </Link>
    </PanelShell>
  );
}

function EmptyProfile({ userId, consent }) {
  return (
    <PanelShell title="Your personal matches" icon={UserRound}>
      <div className="mt-3 flex items-center gap-4">
        <Ring percent={0} size={76} stroke={8} label="Profile 0% complete">
          <span className="text-sm font-bold text-white">0%</span>
        </Ring>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold text-white">Hi {userId}, let's get to know you</h2>
          <p className="mt-1 text-sm text-navy-200">Tell the AI a few facts and your matches will appear here.</p>
        </div>
      </div>
      {!consent && (
        <p className="mt-4 rounded-xl bg-amber-400/15 px-3 py-2 text-xs text-amber-100 ring-1 ring-amber-300/30">
          Switch on <b>Remember my profile</b> in the sidebar so your facts are kept for next time.
        </p>
      )}
      <GhostRows />
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link to="/chat?q=I%20am%20" className="btn-primary">
          <MessagesSquare className="h-4 w-4" aria-hidden /> Tell the AI
        </Link>
        <Link to="/eligibility" className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
          <Wand2 className="h-4 w-4" aria-hidden /> Use the form
        </Link>
      </div>
    </PanelShell>
  );
}

function Matches({ userId, profile }) {
  const key = JSON.stringify(profile);
  const { data, error, loading } = useAsync((signal) => api.eligibility(profile, [], { signal }), [key]);

  const summary = useMemo(() => {
    const results = data?.results || [];
    const count = (v) => results.filter((r) => r.verdict === v).length;
    // Which missing fact would settle the most "More Information Needed" verdicts?
    const unlock = {};
    results.forEach((r) => (r.missing_fields || []).forEach((f) => (unlock[f] = (unlock[f] || 0) + 1)));
    const [topField, topCount] = Object.entries(unlock).sort((a, b) => b[1] - a[1])[0] || [];
    return {
      total: results.length,
      eligible: count(VERDICTS.ELIGIBLE),
      needInfo: count(VERDICTS.NEED_INFO),
      notEligible: count(VERDICTS.NOT_ELIGIBLE),
      top: results.filter((r) => r.verdict !== VERDICTS.NOT_ELIGIBLE).slice(0, 3),
      topField,
      topCount,
    };
  }, [data]);

  const known = KEY_FIELDS.filter((f) => profile[f] !== undefined && profile[f] !== null && profile[f] !== "").length;
  const completeness = Math.round((known / KEY_FIELDS.length) * 100);
  const pct = summary.total ? Math.round((summary.eligible / summary.total) * 100) : 0;

  return (
    <PanelShell title="Your personal matches">
      {loading && !data ? (
        <div className="mt-4 space-y-3" aria-busy="true">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-white/15" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-white/10" />
            </div>
          </div>
          {[0, 1, 2].map((n) => <div key={n} className="h-14 animate-pulse rounded-xl bg-white/10" />)}
          <p className="text-center text-xs text-navy-200">Checking your profile against verified rules via MCP…</p>
        </div>
      ) : error ? (
        <p className="mt-4 rounded-xl bg-rose-500/15 p-3 text-sm text-rose-100 ring-1 ring-rose-300/30">
          Couldn't check your matches right now. {error.message}
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-4">
            <Ring percent={pct} size={96} label={`${summary.eligible} of ${summary.total} schemes potentially eligible`}>
              <span>
                <span className="block text-2xl font-extrabold leading-none text-white">{summary.eligible}</span>
                <span className="text-[10px] uppercase tracking-wide text-navy-200">of {summary.total}</span>
              </span>
            </Ring>
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-snug text-white">
                {summary.eligible > 0
                  ? `${userId}, you may qualify for ${summary.eligible} scheme${summary.eligible === 1 ? "" : "s"}`
                  : `${userId}, let's narrow it down`}
              </h2>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                {[VERDICTS.ELIGIBLE, VERDICTS.NEED_INFO, VERDICTS.NOT_ELIGIBLE].map((v) => (
                  <span key={v} className={`inline-flex items-center gap-1.5 ${VERDICT_DOT[v].text}`}>
                    <span className={`h-2 w-2 rounded-full ${VERDICT_DOT[v].dot}`} />
                    {v === VERDICTS.ELIGIBLE ? summary.eligible : v === VERDICTS.NEED_INFO ? summary.needInfo : summary.notEligible}{" "}
                    {VERDICT_DOT[v].short}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {summary.top.length > 0 && (
            <ul className="mt-4 space-y-2">
              {summary.top.map((r, n) => (
                <li key={r.scheme_id} className="animate-fade-up" style={{ animationDelay: `${150 + n * 90}ms` }}>
                  <Link
                    to={`/schemes/${encodeURIComponent(r.scheme_id)}`}
                    className="group flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-emerald-300/40"
                  >
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${VERDICT_DOT[r.verdict]?.dot} ring-4 ring-white/5`} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">{r.scheme_name}</span>
                      <span className={`block truncate text-xs ${VERDICT_DOT[r.verdict]?.text}`}>
                        {VERDICT_DOT[r.verdict]?.short} · {CATEGORY_LABELS[r.category] || r.category}
                      </span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-navy-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-300" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 rounded-xl bg-navy-950/40 p-3 ring-1 ring-white/10">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-navy-100">Profile completeness</span>
              <span className="font-bold text-white">{completeness}%</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-all duration-1000"
                style={{ width: `${completeness}%` }}
              />
            </div>
            {summary.topField && (
              <Link to="/eligibility" className="mt-2 flex items-center gap-1 text-xs text-emerald-200 hover:text-emerald-100">
                Add <b className="text-white">{fieldLabel(summary.topField)}</b> to settle {summary.topCount} more verdict
                {summary.topCount === 1 ? "" : "s"} <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            )}
          </div>
        </>
      )}
    </PanelShell>
  );
}

export function MatchesPanel() {
  const { userId, user, consent } = useUser();
  if (!userId) return <SignedOut />;
  if (!user) {
    return (
      <PanelShell title="Your personal matches">
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-white/10" />
      </PanelShell>
    );
  }
  const profile = user.profile || {};
  if (!Object.keys(profile).length) return <EmptyProfile userId={userId} consent={consent} />;
  return <Matches userId={userId} profile={profile} />;
}

/* ------------------------------------------------------------------ hero */
export default function Hero() {
  const { userId } = useUser();
  return (
    <section className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-navy-950 via-navy-900 to-[#123b4a] px-5 py-6 text-white shadow-lift sm:px-8 sm:py-7 xl:px-10">
      {/* decoration */}
      <div className="phulkari absolute inset-0 -z-10 opacity-40" aria-hidden />
      <PunjabSkyline className="absolute inset-x-0 bottom-0 -z-10 h-24 w-full text-white/[0.06] sm:h-32" />
      <div className="absolute -left-24 -top-24 -z-10 h-72 w-72 animate-blob rounded-full bg-emerald-500/30 blur-3xl" aria-hidden />
      <div className="absolute -right-10 -top-20 -z-10 h-64 w-64 animate-blob rounded-full bg-gold-400/20 blur-3xl [animation-delay:-3s]" aria-hidden />
      <div className="absolute -bottom-32 right-10 -z-10 h-80 w-80 animate-blob rounded-full bg-sky-500/25 blur-3xl [animation-delay:-5s]" aria-hidden />

      <div className="grid items-center gap-6 lg:grid-cols-[1.15fr_0.85fr] min-[1440px]:grid-cols-[1fr_1fr] min-[1440px]:gap-10">
        <div className="animate-fade-up">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-sm font-medium text-navy-200">
              {greeting()}
              {userId ? `, ${userId}` : ""} 👋
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200 ring-1 ring-white/15">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Every answer cites an official source
            </span>
          </div>
          <h1 className="mt-3 text-[1.9rem] font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-[2.15rem] min-[1440px]:text-[2.75rem]">
            Find the Punjab schemes{" "}
            <span className="whitespace-nowrap bg-gradient-to-r from-gold-200 via-gold-300 to-emerald-300 bg-clip-text text-transparent">made for you</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-navy-200">
            One AI agent checks CM Punjab, department and federal schemes against verified official rules, and shows how it
            reached every answer.
          </p>
          <AskBar />
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link to="/eligibility" className="btn bg-gradient-to-r from-gold-300 to-gold-500 text-navy-950 shadow-lg hover:brightness-105">
              <Wand2 className="h-4 w-4" aria-hidden /> Start the 1-minute check
            </Link>
            <Link to="/schemes" className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">
              Browse schemes <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="animate-fade-up [animation-delay:150ms]">
          <PunjabScene />
        </div>
      </div>
    </section>
  );
}
