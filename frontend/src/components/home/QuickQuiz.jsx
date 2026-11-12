import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Briefcase, GraduationCap, Hammer, HelpCircle, Home as HomeIcon, RotateCcw, Sprout, Timer, User, UserRound,
} from "lucide-react";
import { api } from "../../api.js";
import { VERDICTS, VERDICT_ORDER } from "../../lib/constants.js";
import { DISTRICTS } from "../../lib/districts.js";
import VerdictBadge, { VERDICT_STYLE } from "../VerdictBadge.jsx";
import { Spinner } from "../States.jsx";
import { useCountUp } from "../../lib/motion.js";

const ROLE = {
  key: "role",
  question: "Who are you?",
  options: [
    { label: "Student", icon: GraduationCap, set: { employment_type: "student", currently_enrolled: true } },
    { label: "Worker / labourer", icon: Hammer, set: { employment_type: "industrial_worker" } },
    { label: "Farmer / kisan", icon: Sprout, set: { employment_type: "farmer" } },
    { label: "Homemaker / unemployed", icon: HomeIcon, set: { employment_type: "unemployed" } },
    { label: "Job / business", icon: Briefcase, set: { employment_type: "private_employee" } },
    { label: "Something else", icon: HelpCircle, set: { employment_type: "other" } },
  ],
};
const EDUCATION = {
  key: "education",
  question: "What are you studying?",
  when: (p) => p.employment_type === "student",
  options: [
    { label: "School (grade 6–8)", set: { education_level: "middle" } },
    { label: "Matric (9–10)", set: { education_level: "matric" } },
    { label: "Intermediate (FSc / FA / ICS)", set: { education_level: "intermediate" } },
    { label: "University (BS / bachelor)", set: { education_level: "undergraduate" } },
  ],
};
const GENDER = {
  key: "gender",
  question: "Your gender?",
  options: [
    { label: "Female", icon: UserRound, set: { gender: "female" } },
    { label: "Male", icon: User, set: { gender: "male" } },
    { label: "Transgender", icon: User, set: { gender: "transgender" } },
  ],
};
const INCOME = {
  key: "income",
  question: "Family income per month?",
  options: [
    { label: "Under Rs 25,000", set: { monthly_household_income: 20000 } },
    { label: "Rs 25,000 – 50,000", set: { monthly_household_income: 40000 } },
    { label: "Rs 50,000 – 100,000", set: { monthly_household_income: 75000 } },
    { label: "Over Rs 100,000", set: { monthly_household_income: 150000 } },
  ],
};
const ALL_STEPS = [ROLE, EDUCATION, GENDER, INCOME, { key: "district", question: "Which district do you live in?" }];
const SORTED_DISTRICTS = DISTRICTS.map((d) => d.name).sort();

function Counter({ value, verdict }) {
  const [ref, n] = useCountUp(value, 900);
  const s = VERDICT_STYLE[verdict];
  return (
    <div ref={ref} className={`rounded-2xl border p-3 text-center ${s.soft}`}>
      <p className={`font-display text-3xl font-bold ${s.text}`}>{n}</p>
      <p className={`text-[11px] font-semibold ${s.text}`}>{verdict}</p>
    </div>
  );
}

/** "Find my schemes in 30 seconds": big tappable answers, then the real rule engine decides. */
export default function QuickQuiz() {
  const [profile, setProfile] = useState({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [state, setState] = useState({ loading: false, error: null });

  const steps = useMemo(() => ALL_STEPS.filter((s) => !s.when || s.when(profile)), [profile]);
  const current = steps[step];

  const choose = async (set) => {
    const next = { ...profile, ...set };
    setProfile(next);
    if (step + 1 < ALL_STEPS.filter((s) => !s.when || s.when(next)).length) {
      setStep(step + 1);
      return;
    }
    setState({ loading: true, error: null });
    try {
      setResult(await api.eligibility(next, []));
      setState({ loading: false, error: null });
    } catch (err) {
      setState({ loading: false, error: err });
    }
  };

  const reset = () => {
    setProfile({});
    setStep(0);
    setResult(null);
    setState({ loading: false, error: null });
  };

  const grouped = VERDICT_ORDER.map((v) => [v, (result?.results || []).filter((r) => r.verdict === v)]);
  const progress = result ? 100 : Math.round((step / steps.length) * 100);

  return (
    <section className="card folk-top relative flex flex-col overflow-hidden" aria-labelledby="quiz-h">
      <div className="h-1.5 bg-cream-300">
        <div className="h-full bg-gradient-to-r from-gold-400 via-plum-500 to-emerald-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 id="quiz-h" className="section-title flex items-center gap-2">
            <Timer className="h-5 w-5 text-gold-500" aria-hidden /> Find my schemes in 30 seconds
          </h2>
          {(step > 0 || result) && (
            <button type="button" onClick={reset} className="btn-ghost !px-2 !py-1 text-xs">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Start over
            </button>
          )}
        </div>

        {!result && !state.loading && (
          <div key={current.key} className="fade-up mt-4 flex flex-1 flex-col">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Question {step + 1} of {steps.length}
            </p>
            <p className="mt-1 font-display text-2xl font-semibold text-navy-900">{current.question}</p>
            {current.key === "district" ? (
              <div className="mt-4 grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-1 scroll-thin sm:grid-cols-3">
                {SORTED_DISTRICTS.map((d) => (
                  <button key={d} type="button" onClick={() => choose({ district: d })} className="quiz-option !py-2 text-sm">
                    {d}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {current.options.map(({ label, icon: Icon, set }) => (
                  <button key={label} type="button" onClick={() => choose(set)} className="quiz-option">
                    {Icon && <Icon className="h-5 w-5 shrink-0 text-plum-600" aria-hidden />}
                    {label}
                  </button>
                ))}
              </div>
            )}
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-ghost mt-auto self-start !px-2 pt-4 text-xs">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Back
              </button>
            )}
          </div>
        )}

        {state.loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-sm text-slate-500">
            <Spinner className="h-6 w-6 text-emerald-700" /> Checking every scheme against the official rules…
          </div>
        )}
        {state.error && <p className="mt-4 text-sm text-rose-700">{state.error.message}</p>}

        {result && (
          <div className="fade-up mt-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {grouped.map(([v, list]) => (
                <Counter key={v} verdict={v} value={list.length} />
              ))}
            </div>
            <ul className="max-h-64 space-y-1.5 overflow-y-auto pr-1 scroll-thin">
              {grouped
                .filter(([v]) => v !== VERDICTS.NOT_ELIGIBLE)
                .flatMap(([, list]) => list)
                .map((r, i) => (
                  <li key={r.scheme_id} className="fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                    <Link
                      to={`/schemes/${encodeURIComponent(r.scheme_id)}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-cream-50 px-3 py-2 text-sm hover:border-emerald-300"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-navy-900">{r.scheme_name}</span>
                        {r.missing_fields?.length > 0 && (
                          <span className="text-[11px] text-slate-500">{r.missing_fields.length} more detail(s) needed</span>
                        )}
                      </span>
                      <VerdictBadge verdict={r.verdict} />
                    </Link>
                  </li>
                ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Link to="/eligibility" className="btn-primary text-xs">Answer the missing details</Link>
              <Link to="/chat" className="btn-secondary text-xs">Ask the AI about these</Link>
            </div>
            <p className="text-[11px] text-slate-400">Guidance only. The scheme authority makes the final decision.</p>
          </div>
        )}
      </div>
    </section>
  );
}
