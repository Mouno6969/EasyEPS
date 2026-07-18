import { useLocalBasics, useLocalLearning, learningOverview } from "@/lib/localProgress";
import {
  BASICS_MODULE_IDS,
  isBasicsComplete,
  type BasicsModuleId,
} from "@shared/basics";
import { ArrowRight, Flame, Sparkles } from "lucide-react";
import { Link, useLocation } from "wouter";

/** Bangla labels for basics modules (coach chip). */
const MODULE_BN: Record<BasicsModuleId, string> = {
  welcome: "হ্যাঙ্গুল পরিচিতি",
  consonants: "মৌলিক ব্যঞ্জনবর্ণ",
  vowels: "মৌলিক স্বরবর্ণ",
  syllables: "অক্ষর গঠন",
  batchim: "ব্যাচিম পরিচিতি",
  "speak-lab": "উচ্চারণ অনুশীলন",
  "write-lab": "লেখা অনুশীলন",
  checkpoint: "বেসিক পরীক্ষা",
};

function moduleDone(id: BasicsModuleId, modules: Record<string, { completed?: boolean } | undefined>) {
  return Boolean(modules[id]?.completed);
}

/** First incomplete teaching module, else checkpoint, else null when hangul ready. */
export function nextBasicsModuleId(
  modules: Record<string, { completed?: boolean } | undefined>,
  hangulReady: boolean,
): BasicsModuleId | null {
  if (hangulReady) return null;
  for (const id of BASICS_MODULE_IDS) {
    if (id === "checkpoint") continue;
    if (!moduleDone(id, modules)) return id;
  }
  return "checkpoint";
}

export function ProgressRibbon() {
  const [location] = useLocation();
  const basics = useLocalBasics();
  const state = useLocalLearning();
  const overview = learningOverview(state);
  const hangulReady = isBasicsComplete(basics);

  const nextModule = nextBasicsModuleId(basics.modules, hangulReady);
  const completedModules = BASICS_MODULE_IDS.filter(
    id => id !== "checkpoint" && moduleDone(id, basics.modules),
  ).length;
  const teachingTotal = BASICS_MODULE_IDS.length - 1; // exclude checkpoint from “done” count display
  const nextChapter = Math.min(60, Math.max(1, overview.completedLessons + 1));

  // Hide ribbon on pure marketing home when completely fresh? Keep it — coaches beginners.
  const href = hangulReady
    ? `/lesson/${overview.completedLessons ? nextChapter : 1}`
    : nextModule
      ? `/basics/${nextModule}`
      : "/basics";

  const label = hangulReady
    ? overview.completedLessons
      ? `পরবর্তী: অধ্যায় ${nextChapter}`
      : "পরবর্তী: অধ্যায় ১"
    : nextModule
      ? `পরবর্তী: ${MODULE_BN[nextModule]}`
      : "পরবর্তী: হ্যাঙ্গুল বেসিক";

  const detail = hangulReady
    ? `সম্পন্ন ${overview.completedLessons}/৬০ অধ্যায়`
    : `বেসিক ${completedModules}/${teachingTotal}`;

  // Don't stack under itself on basics module pages with sticky tabs — still useful as coach.
  const onAuthHeavy = location.startsWith("/admin");
  if (onAuthHeavy) return null;

  return (
    <div className="sticky top-[72px] z-40 border-b border-[var(--navy)]/8 bg-[var(--cream)]/92 backdrop-blur-xl">
      <div className="container flex flex-wrap items-center gap-2 py-2 sm:gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--navy)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold)]">
          <Sparkles className="size-3" />
          কোচ
        </span>
        <Link
          href={href}
          className="group inline-flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--navy)]/10 bg-white/70 px-3 py-1.5 text-sm font-semibold text-[var(--navy)] transition hover:border-[var(--gold)]/40 sm:flex-none"
        >
          <span className="truncate">{label}</span>
          <ArrowRight className="size-3.5 shrink-0 text-[var(--gold-dark)] transition group-hover:translate-x-0.5" />
        </Link>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--navy)]/55">
          <span className="rounded-full bg-white/70 px-2.5 py-1">{detail}</span>
          {overview.streak > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--gold)]/15 px-2.5 py-1 text-[var(--gold-dark)]">
              <Flame className="size-3.5" />
              {overview.streak} দিন স্ট্রিক
            </span>
          ) : null}
          {hangulReady ? (
            <span className="rounded-full bg-[var(--sage)]/15 px-2.5 py-1 text-[var(--sage-dark)]">
              হ্যাঙ্গুল প্রস্তুত
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
