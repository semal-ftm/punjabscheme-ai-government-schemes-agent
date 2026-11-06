import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Each persona opens the AI chat and sends a ready-made question (?ask=), so a first-time user never faces a blank box.
const PERSONAS = [
  {
    emoji: "🎓", title: "Student", hint: "Scholarships, laptops, e-bikes",
    ask: "I am a university student in Lahore. Which scholarships or laptop schemes can I apply for?",
    tint: "from-sky-50 to-white", ring: "hover:ring-sky-300", chip: "bg-sky-100",
  },
  {
    emoji: "🌾", title: "Farmer", hint: "Kissan card, tractors, inputs",
    ask: "I am a farmer with 5 acres of land in Okara. Which schemes can help me?",
    tint: "from-lime-50 to-white", ring: "hover:ring-lime-300", chip: "bg-lime-100",
  },
  {
    emoji: "🏠", title: "Need a home", hint: "Interest-free housing loans",
    ask: "I want to build a house on my own plot. Is there an interest-free loan for me?",
    tint: "from-amber-50 to-white", ring: "hover:ring-amber-300", chip: "bg-amber-100",
  },
  {
    emoji: "👩‍👧", title: "Women & daughters", hint: "Marriage support, Kafaalat",
    ask: "My daughter is getting married and our family income is low. Is there any government help?",
    tint: "from-rose-50 to-white", ring: "hover:ring-rose-300", chip: "bg-rose-100",
  },
  {
    emoji: "🏭", title: "Factory worker", hint: "PESSI & Workers Welfare",
    ask: "I am a registered industrial worker. What benefits can my family and children get?",
    tint: "from-violet-50 to-white", ring: "hover:ring-violet-300", chip: "bg-violet-100",
  },
  {
    emoji: "🤲", title: "Low-income family", hint: "Ration card, cash support",
    ask: "Our family income is about 30,000 rupees a month. Which support programmes can we get?",
    tint: "from-emerald-50 to-white", ring: "hover:ring-emerald-300", chip: "bg-emerald-100",
  },
];

export default function QuickStart() {
  return (
    <section aria-labelledby="quick-h">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">Start in one tap</p>
          <h2 id="quick-h" className="text-xl font-bold tracking-tight text-navy-900">I am a…</h2>
        </div>
        <p className="text-sm text-slate-500">Pick what fits you. The AI starts with a ready-made question.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {PERSONAS.map((p, n) => (
          <Link
            key={p.title}
            to={`/chat?ask=${encodeURIComponent(p.ask)}`}
            title={p.ask}
            className={`group tilt relative flex animate-fade-up flex-col rounded-2xl bg-gradient-to-b ${p.tint} p-4 ring-1 ring-slate-200/80 ${p.ring}`}
            style={{ animationDelay: `${n * 60}ms` }}
          >
            <span className={`grid h-12 w-12 place-items-center rounded-2xl ${p.chip} text-2xl transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110`} aria-hidden>
              {p.emoji}
            </span>
            <span className="mt-3 font-semibold text-navy-900">{p.title}</span>
            <span className="mt-0.5 text-xs leading-snug text-slate-500">{p.hint}</span>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 opacity-70 transition group-hover:opacity-100">
              Ask the AI <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" aria-hidden />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
