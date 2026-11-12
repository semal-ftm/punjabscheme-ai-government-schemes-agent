import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight, BrainCircuit, CheckCircle2, Database, FileSearch, Globe, GraduationCap, HeartPulse, Home as HomeIcon,
  Landmark, MessageCircle, Search, ShieldCheck, Sprout, Users, Wrench, BookmarkCheck, HandHeart, Sparkles,
} from "lucide-react";
import { api } from "../api.js";
import { Skeleton } from "../components/States.jsx";
import AgentLive from "../components/home/AgentLive.jsx";
import FlipSchemeCard from "../components/home/FlipSchemeCard.jsx";
import HeroArt, { DayGreeting, PhulkariFloat, dayPhase } from "../components/home/HeroArt.jsx";
import PunjabMap from "../components/home/PunjabMap.jsx";
import QuickQuiz from "../components/home/QuickQuiz.jsx";
import UpdatesFeed from "../components/home/UpdatesFeed.jsx";
import { MagneticLink, Reveal, Tilt, useInView } from "../components/fx.jsx";
import { useAsync } from "../lib/useAsync.js";
import { useCountUp, useTypewriter } from "../lib/motion.js";
import { TOPICS, TOPIC_IMAGES, matchesTopic, schemeImage } from "../lib/constants.js";

// Example searches typed out in the hero search bar (English, Urdu and Roman Urdu).
const TYPED = [
  "Scholarships for a matric student in Lahore",
  "مجھے گھر بنانے کے لیے قرض چاہیے",
  "Kisan card ke liye kya documents chahiye?",
  "Which schemes help widows in Multan?",
  "BISP Kafaalat ke liye kaun eligible hai?",
];

/** Stat card that pops in with a small bounce (staggered by `index`) and counts up its number. */
function Stat({ icon: Icon, value, label, index = 0, show }) {
  const [ref, n] = useCountUp(value);
  return (
    <div
      ref={ref}
      className={`group flex flex-col rounded-2xl bg-cream-50/80 p-3.5 ring-1 ring-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-lift ${show ? "pop-in" : "opacity-0"}`}
      style={{ animationDelay: `${index * 110}ms` }}
    >
      {/* Icon and number share the top row of every card, so all numbers line up whatever the label length. */}
      <span className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-50 to-plum-50 text-plum-600 ring-1 ring-gold-100 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
          <Icon className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-display text-3xl font-bold leading-none text-navy-900">{value == null ? "—" : n}</span>
      </span>
      <span className="mt-2 text-xs leading-snug text-slate-500">{label}</span>
    </div>
  );
}

/** Title written letter by letter, like ink. Screen readers get the plain text. */
function InkTitle({ text, className = "", start = 0 }) {
  return (
    <span className={className} aria-hidden>
      {[...text].map((ch, i) => (
        <span key={i} className="ink-letter" style={{ animationDelay: `${start + i * 55}ms` }}>
          {ch === " " ? "\u00a0" : ch}
        </span>
      ))}
    </span>
  );
}

const QUICK = [
  { to: "/schemes", icon: Search, title: "Find Schemes", sub: "by Category", tone: "text-gold-500" },
  { to: "/eligibility", icon: CheckCircle2, title: "Check", sub: "Eligibility", tone: "text-emerald-600" },
  { to: "/chat", icon: MessageCircle, title: "Ask AI", sub: "Assistant", tone: "text-plum-500" },
  { to: "/saved", icon: BookmarkCheck, title: "Track", sub: "Information", tone: "text-plum-600" },
];

const TOPIC_ICONS = {
  education: GraduationCap, housing: HomeIcon, agriculture: Sprout, women: Users, youth: Sparkles,
  health: HeartPulse, welfare: HandHeart,
};
const TOPIC_TONES = {
  education: "bg-plum-50 text-plum-600", housing: "bg-gold-50 text-gold-600", agriculture: "bg-emerald-50 text-emerald-700",
  women: "bg-plum-50 text-plum-500", youth: "bg-emerald-50 text-emerald-600", health: "bg-rose-50 text-rose-600",
  welfare: "bg-gold-50 text-gold-500",
};

function iconFor(s) {
  const t = TOPICS.find((x) => matchesTopic(s, x.value));
  return { Icon: TOPIC_ICONS[t?.value] || Landmark, tone: TOPIC_TONES[t?.value] || "bg-cream-200 text-navy-700" };
}

export default function Home() {
  const navigate = useNavigate();
  const [phase] = useState(dayPhase);
  const [statsRef, statsIn] = useInView();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const typed = useTypewriter(TYPED, { active: !q && !focused });
  const schemes = useAsync((signal) => api.schemes({}, { signal }), []);
  const stats = useAsync((signal) => api.stats({ signal }), []);

  const highlighted = (schemes.data || []).filter((s) => s.origin === "curated").slice(0, 6);
  const rulesTotal = (schemes.data || []).reduce((n, s) => n + (s.criteria_count || 0), 0);
  const verified = (schemes.data || []).filter((s) => s.origin === "curated");
  const counts = Object.fromEntries(TOPICS.map((t) => [t.value, verified.filter((s) => matchesTopic(s, t.value)).length]));

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/chat?q=${encodeURIComponent(q.trim())}&send=1` : "/schemes");
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="paper folk-top relative overflow-hidden rounded-3xl border border-slate-200/80 bg-cream-50 shadow-card">
        <PhulkariFloat />
        <div className="relative grid items-center gap-4 p-6 sm:p-10 lg:grid-cols-[1.2fr_1fr] lg:gap-6 lg:py-6 lg:pr-6">
          <div className="relative z-10">
            {/* Greeting chip and "Welcome to" share one row, so the hero stays short enough to fit without scrolling. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <DayGreeting phase={phase} />
              <p className="flex items-center gap-3 font-display text-lg text-gold-500">
                <span className="h-0.5 w-8 rounded bg-gold-400" aria-hidden /> Welcome to
              </p>
            </div>
            {/* "Welcome to" → name (written letter by letter) → خوش آمدید (written right to left like a pen).
                Sizes follow the screen width so both fit on one line on laptops. */}
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1
                aria-label="PunjabScheme AI"
                className="font-display text-4xl font-bold leading-tight text-plum-700 sm:text-5xl lg:text-[clamp(2.1rem,2.9vw,3rem)]"
              >
                <InkTitle text="PunjabScheme" />{" "}
                <InkTitle text="AI" className="shimmer-text" start={12 * 55} />
              </h1>
              <span
                lang="ur"
                dir="rtl"
                className="pen-rtl font-urdu pb-2 text-2xl !leading-none text-plum-500 sm:text-3xl lg:text-[clamp(1.4rem,1.9vw,1.9rem)]"
              >
                خوش آمدید
              </span>
            </div>
            <p className="mt-3 max-w-xl text-base text-navy-700">
              Your intelligent assistant for Government Schemes, Benefits and Services in Punjab. Answers are grounded in
              official sources, checked against verified rules and kept fresh with live search.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <MagneticLink to="/schemes" className="btn-primary">
                Explore Schemes <ArrowRight className="h-4 w-4" aria-hidden />
              </MagneticLink>
              <MagneticLink to="/chat" className="btn border border-plum-200 bg-plum-50 text-plum-700 hover:bg-plum-100">
                <Sparkles className="h-4 w-4" aria-hidden /> Ask AI Assistant
              </MagneticLink>
            </div>
          </div>
          {/* The drawing keeps its own column (never under the text). On desktop its height follows the screen
              height so the whole hero, search bar included, fits without scrolling. */}
          <div className="relative z-10 hidden sm:block">
            <HeroArt phase={phase} />
          </div>
        </div>

        <form onSubmit={submit} className="relative z-10 border-t border-slate-200/70 bg-cream-100/60 p-4 sm:px-10">
          <label htmlFor="home-q" className="sr-only">Ask about schemes</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                id="home-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                dir="auto"
                placeholder={focused ? 'Search for schemes, benefits, or services (e.g., "student scholarship", "housing")' : `${typed}▏`}
                className="input !rounded-2xl !py-3 pl-10"
              />
            </div>
            <button type="submit" className="btn-primary !rounded-2xl px-6">Search</button>
          </div>
        </form>
      </section>

      {/* Animated trust numbers */}
      <section ref={statsRef} aria-label="PunjabScheme AI in numbers" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Stat index={0} show={statsIn} icon={Landmark} value={stats.data?.verified_rules} label="Schemes with verified rules" />
        <Stat index={1} show={statsIn} icon={ShieldCheck} value={schemes.data ? rulesTotal : undefined} label="Official rules quoted word-for-word" />
        <Stat index={2} show={statsIn} icon={FileSearch} value={stats.data?.documents} label="Official documents indexed" />
        <Stat index={3} show={statsIn} icon={Database} value={stats.data?.sources?.length} label="Government sources" />
        <Stat index={4} show={statsIn} icon={Wrench} value={8} label="MCP tools" />
        <Stat index={5} show={statsIn} icon={Globe} value={41} label="Districts covered" />
      </section>

      <Reveal>
        <AgentLive />
      </Reveal>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
        <Reveal>
          <QuickQuiz />
        </Reveal>
        <Reveal delay={120}>
          <PunjabMap />
        </Reveal>
      </div>

      {/* Quick actions */}
      <Reveal as="section" aria-labelledby="qa-h">
        <h2 id="qa-h" className="section-title mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {QUICK.map(({ to, icon: Icon, title, sub, tone }) => (
            <Tilt key={to} as={Link} to={to} className="card flex flex-col items-center gap-2 p-5 text-center">
              <Icon className={`h-8 w-8 ${tone} transition-transform duration-300 group-hover:scale-110`} strokeWidth={1.6} aria-hidden />
              <span className="text-sm font-semibold leading-tight text-navy-900">
                {title}
                <br />
                <span className="font-medium text-slate-600">{sub}</span>
              </span>
            </Tilt>
          ))}
        </div>
      </Reveal>

      <Reveal className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
        {/* Featured categories */}
        <section aria-labelledby="cat-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="cat-h" className="section-title">Featured Categories</h2>
            <Link to="/schemes" className="link text-sm">View All →</Link>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-3">
            {TOPICS.slice(0, 6).map((t) => {
              const Icon = TOPIC_ICONS[t.value];
              return (
                <Tilt key={t.value} as={Link} to={`/schemes?topic=${t.value}`} className="card group overflow-hidden text-center">
                  <span className="block h-20 overflow-hidden">
                    <img src={TOPIC_IMAGES[t.value]} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  </span>
                  <span className="flex items-center justify-center gap-1 px-2 pt-2 text-xs font-semibold text-navy-800">
                    <Icon className={`h-3.5 w-3.5 ${TOPIC_TONES[t.value].split(" ")[1]}`} aria-hidden /> {t.label}
                  </span>
                  <span className="block pb-2 text-[10px] text-slate-400">{schemes.data ? `${counts[t.value]} schemes` : "…"}</span>
                </Tilt>
              );
            })}
          </div>
        </section>

        {/* Highlighted schemes (flip cards) */}
        <section aria-labelledby="hl-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="hl-h" className="section-title">
              Highlighted Government Schemes <span className="ml-1 text-xs font-normal text-slate-400">hover a card to flip it</span>
            </h2>
            <Link to="/schemes" className="link text-sm">View All →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {schemes.loading && !schemes.data
              ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[19rem]" />)
              : highlighted.map((s) => {
                  const { Icon, tone } = iconFor(s);
                  return <FlipSchemeCard key={s.id} scheme={s} Icon={Icon} tone={tone} />;
                })}
          </div>
        </section>
      </Reveal>

      <Reveal className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* How it works */}
        <section className="card jaali-dark flex flex-col justify-center overflow-hidden p-6 text-cream-50 sm:p-8" aria-labelledby="how-h">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">Under the hood</p>
          <h2 id="how-h" className="mt-1 font-display text-2xl font-semibold text-white">How every answer is built</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              [BrainCircuit, "Plans", "A LangGraph agent understands you and plans which tools to use."],
              [Wrench, "Checks rules", "MCP tools apply rules quoted word-for-word from official pages."],
              [FileSearch, "Reads documents", "RAG finds the exact official excerpts and cites them."],
              [Globe, "Stays current", "Live search covers official government domains only."],
            ].map(([Icon, title, text]) => (
              <li key={title} className="flex gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                <Icon className="h-5 w-5 shrink-0 text-gold-300" aria-hidden />
                <span>
                  <span className="block text-sm font-semibold text-white">{title}</span>
                  <span className="text-xs text-cream-200/80">{text}</span>
                </span>
              </li>
            ))}
          </ol>
          <Link to="/studio" className="mt-5 inline-flex items-center gap-1.5 self-start rounded-xl bg-gold-400 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-300">
            <BrainCircuit className="h-4 w-4" aria-hidden /> Open Agent Studio
          </Link>
        </section>

        <UpdatesFeed stats={stats.data} />
      </Reveal>
    </div>
  );
}
