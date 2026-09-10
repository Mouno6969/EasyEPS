import { DialogueScript } from "@/components/DialogueScript";
import { EpsQuestionImage } from "@/components/EpsQuestionImage";
import { EpsOptionImages } from "@/components/EpsOptionImages";
import { GuidedListening } from "@/components/GuidedListening";
import { Button } from "@/components/ui/button";
import { addLocalAttempt, useLocalLearning } from "@/lib/localProgress";
import { speakDialogue } from "@/lib/dialogueSpeech";
import { warmSpeechVoices } from "@/lib/speakKorean";
import { listDueReviews, listRecentWeak, recordWeakAttempt } from "@/lib/srs";
import { deriveSmartMockFocus } from "@/lib/smartMock";
import { getWeeklyChallenge, recordWeeklyChallengeScore } from "@/lib/weeklyChallenge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { EPS_FORMAT_META, getEpsQuestionFormat } from "@shared/epsFormat";
import type { EpsQuestion } from "@shared/lesson";
import { BrainCircuit, Check, ChevronLeft, ChevronRight, Clock3, GraduationCap, Headphones, Loader2, RotateCcw, ShieldCheck, Volume2, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";

/**
 * Real EPS-TOPIK CBT shape (HRD Korea): 40 MCQs / 50 min / 100 points —
 * listening 20 questions first (25 min), then reading 20 (25 min).
 * Ranking floors: manufacturing 60, other sectors 45, fishing special 30.
 */
const FULL_LISTENING = 20;
const FULL_READING = 20;
const POINTS_PER_QUESTION = 2.5;
const FLOOR_MANUFACTURING = 60;
const FLOOR_OTHER = 45;

type MockQuestion = EpsQuestion & {
  chapter: number;
  lessonTitle: { ko: string; bn: string; en: string };
  testId: string;
};

function isListeningIndex(index: number, total: number): boolean {
  const listeningCount = total === 40 ? FULL_LISTENING : Math.ceil(total / 2);
  return index < listeningCount;
}

function FormatBanner({ question }: { question: MockQuestion }) {
  const format = getEpsQuestionFormat(question);
  const meta = EPS_FORMAT_META[format];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[var(--gold)]/12 px-4 py-2.5">
      <span className="rounded-full bg-[var(--navy)] px-2.5 py-0.5 text-[11px] font-bold text-white">{meta.shortBn}</span>
      <span className="text-sm font-semibold text-[var(--navy)]">{meta.ko}</span>
      <span className="text-xs text-[var(--navy)]/55">{meta.bn}</span>
    </div>
  );
}

export default function MockTestPage() {
  const { isAuthenticated } = useAuth();
  const learning = useLocalLearning();
  const weekly = useMemo(() => getWeeklyChallenge(), []);
  const presets = useMemo(() => {
    const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    const requestedCount = Number(params.get("count"));
    const initialCount: 10 | 20 | 40 =
      requestedCount === 10 || requestedCount === 20 || requestedCount === 40
        ? requestedCount
        : weekly.count === 40
          ? 40
          : 20;
    return {
      count: initialCount,
      mode: params.get("mode") === "balanced" ? "balanced" as const : "smart" as const,
    };
  }, [weekly.count]);
  const [count, setCount] = useState<10 | 20 | 40>(presets.count);
  const [mode, setMode] = useState<"balanced" | "smart">(presets.mode);
  const [focusSection, setFocusSection] = useState<"auto" | "reading" | "listening">("auto");
  const reviewFocus = useMemo(() => {
    const seen = new Set<string>();
    return [...listDueReviews(20), ...listRecentWeak(20)].filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [learning.attempts.length]);
  const smartFocus = useMemo(
    () => deriveSmartMockFocus(learning, reviewFocus, focusSection),
    [learning, reviewFocus, focusSection],
  );
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(50 * 60);
  const [startedAt, setStartedAt] = useState(0);
  const query = trpc.curriculum.mockTest.useQuery(
    {
      count,
      mode,
      focusChapters: mode === "smart" ? smartFocus.chapters : [],
      focusSection: mode === "smart" ? focusSection : "auto",
    },
    { enabled: started, retry: false, refetchOnWindowFocus: false },
  );
  const recordRemote = trpc.attempts.record.useMutation();
  const questions = query.data as MockQuestion[] | undefined;
  const current = questions?.[index];
  const score = useMemo(
    () => (questions ?? []).reduce((sum, question) => sum + (answers[question.testId] === question.answer ? 1 : 0), 0),
    [questions, answers],
  );
  const finishedRef = useRef(false);
  const latest = useRef({ score, questions, answers, startedAt });
  latest.current = { score, questions, answers, startedAt };

  const finish = useCallback(() => {
    const { score: latestScore, questions: latestQuestions, startedAt: start } = latest.current;
    if (!latestQuestions?.length || finishedRef.current) return;
    finishedRef.current = true;
    const durationSec = Math.max(1, Math.round((Date.now() - start) / 1000));
    setFinished(true);
    addLocalAttempt({ kind: "mock-test", score: latestScore, total: latestQuestions.length, durationSec });
    recordWeakAttempt({
      kind: "mock",
      labelBn: "পূর্ণাঙ্গ মক টেস্ট",
      score: latestScore,
      total: latestQuestions.length,
    });
    recordWeeklyChallengeScore(latestScore, latestQuestions.length);
    if (isAuthenticated) {
      recordRemote.mutate({
        kind: "mock-test",
        score: latestScore,
        total: latestQuestions.length,
        durationSec,
        answers: latest.current.answers,
        mockQuestions: latestQuestions.map(question => ({
          chapter: question.chapter,
          id: question.id,
          testId: question.testId,
        })),
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [isAuthenticated, recordRemote]);

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => {
      setRemaining(value => {
        if (value <= 1) {
          window.clearInterval(timer);
          queueMicrotask(finish);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [started, finished, finish]);

  // Warm the TTS voice list while the paper loads so question 1 plays instantly.
  useEffect(() => {
    if (started && !finished) warmSpeechVoices();
  }, [started, finished]);

  const begin = () => {
    finishedRef.current = false;
    setStarted(true); setFinished(false); setIndex(0); setAnswers({}); setStartedAt(Date.now());
    setRemaining(count === 40 ? 50 * 60 : count === 20 ? 25 * 60 : 12 * 60);
  };
  const reset = () => { setStarted(false); setFinished(false); setAnswers({}); setIndex(0); };

  const sectionOf = (questionIndex: number) => (isListeningIndex(questionIndex, questions?.length ?? count) ? "listening" : "reading");

  if (!started) return <>
    <section className="bg-[var(--navy)] text-white"><div className="sacred-grid-dark"><div className="container grid min-h-[420px] items-center gap-10 py-16 lg:grid-cols-[1fr_.55fr]"><div><p className="eyebrow text-[var(--gold)]">Realistic EPS practice</p><h1 className="mt-4 font-serif text-5xl font-bold md:text-6xl">পূর্ণাঙ্গ মক টেস্ট</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">সরকারি EPS-TOPIK CBT ফরম্যাট অনুযায়ী—আগে শ্রবণ (듣기) ২০টি প্রশ্ন, পরে পাঠ (읽기) ২০টি প্রশ্ন; মোট ৫০ মিনিট, ১০০ পয়েন্ট।</p></div><GraduationCap className="mx-auto size-40 text-[var(--gold)]/25" /></div></div></section>
    <div className="container py-12"><div className="mx-auto max-w-3xl paper-card p-7 md:p-10"><p className="eyebrow">পরীক্ষা সেটআপ</p><h2 className="mt-3 font-serif text-3xl font-bold text-[var(--navy)]">কোন পরীক্ষা দেবেন?</h2>
      <div className="mt-4 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-4 text-sm leading-6 text-[var(--navy)]">
        <strong>এই সপ্তাহের চ্যালেঞ্জ ({weekly.week}):</strong> {weekly.count} প্রশ্ন
        {weekly.bestScore != null && weekly.bestTotal
          ? ` · আপনার সেরা: ${weekly.bestScore}/${weekly.bestTotal}`
          : " · এখনও অংশ নেননি"}
        {" · "}{weekly.attempts} বার চেষ্টা
      </div>
      <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4 text-sm leading-7 text-[var(--navy)]/70">
        <p className="font-bold text-[var(--navy)]">সরকারি EPS-TOPIK (CBT) প্যাটার্ন:</p>
        <p>• <strong>듣기 Listening:</strong> ২০টি প্রশ্ন · ২৫ মিনিট · প্রতিটি অডিও সর্বোচ্চ ২ বার</p>
        <p>• <strong>읽기 Reading:</strong> ২০টি প্রশ্ন · ২৫ মিনিট</p>
        <p>• প্রতিটি প্রশ্নে ৪টি বিকল্প; পূর্ণমান ১০০ (প্রশ্নপ্রতি ২.৫)। র‍্যাঙ্কিং ফ্লোর: ম্যানুফ্যাকচারিং ৬০, অন্য সেক্টর ৪৫।</p>
      </div>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => setMode("smart")} className={`rounded-2xl border p-4 text-left transition ${mode === "smart" ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-[var(--navy)]/10 bg-white"}`}>
          <span className="flex items-center gap-2 font-bold text-[var(--navy)]"><BrainCircuit className="size-5 text-[var(--gold-dark)]" />স্মার্ট পরীক্ষা</span>
          <span className="mt-2 block text-xs leading-5 text-[var(--navy)]/52">দুর্বল অধ্যায় ও নির্ধারিত রিভিউ থেকে বেশি প্রশ্ন</span>
        </button>
        <button type="button" onClick={() => setMode("balanced")} className={`rounded-2xl border p-4 text-left transition ${mode === "balanced" ? "border-[var(--gold)] bg-[var(--gold)]/10" : "border-[var(--navy)]/10 bg-white"}`}>
          <span className="font-bold text-[var(--navy)]">ভারসাম্যপূর্ণ পরীক্ষা</span>
          <span className="mt-2 block text-xs leading-5 text-[var(--navy)]/52">সরকারি অনুপাতে ৫০% listening + ৫০% reading</span>
        </button>
      </div>
      {mode === "smart" && (
        <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-sm font-bold text-[var(--navy)]">ফোকাস: {smartFocus.chapters.length ? smartFocus.chapters.map(chapter => `অধ্যায় ${chapter}`).join(", ") : "নতুন balanced baseline"}</p><p className="mt-1 text-xs text-[var(--navy)]/48">{smartFocus.reasons.join(" · ")}</p></div>
            <div className="inline-flex rounded-full border border-[var(--navy)]/10 bg-white p-1 text-xs font-bold">
              {(["auto", "reading", "listening"] as const).map(section => <button key={section} type="button" onClick={() => setFocusSection(section)} className={`rounded-full px-3 py-1.5 ${focusSection === section ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/50"}`}>{section === "auto" ? "Auto" : section === "reading" ? "Reading" : "Listening"}</button>)}
            </div>
          </div>
        </div>
      )}
      <div className="mt-7 grid gap-4 sm:grid-cols-3">{([10, 20, 40] as const).map(value => <button key={value} onClick={() => setCount(value)} className={`rounded-3xl border p-6 text-left transition ${count === value ? "border-[var(--gold)] bg-[var(--gold)]/10 shadow-md" : "border-[var(--navy)]/10 bg-white"}`}><div className="flex items-center justify-between"><span className="font-serif text-3xl font-bold text-[var(--navy)]">{value}</span>{count === value && <span className="grid size-7 place-items-center rounded-full bg-[var(--navy)] text-white"><Check className="size-4" /></span>}</div><p className="mt-2 font-bold text-[var(--navy)]">{value === 10 ? "মাইক্রো টেস্ট" : value === 20 ? "দ্রুত অনুশীলন" : "পূর্ণাঙ্গ পরীক্ষা"}</p><p className="mt-2 text-sm leading-6 text-[var(--navy)]/50">{value === 10 ? "১২ মিনিট · ৫ listening + ৫ reading" : value === 20 ? "২৫ মিনিট · ১০ listening + ১০ reading" : "৫০ মিনিট · ২০ listening (আগে) + ২০ reading"}</p></button>)}</div><div className="mt-7 rounded-2xl bg-[var(--cream)] p-5"><h3 className="flex items-center gap-2 font-bold text-[var(--navy)]"><ShieldCheck className="size-5 text-[var(--sage-dark)]" />শুরু করার আগে</h3><div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--navy)]/58"><p>• Listening প্রশ্নে script দেখতে নয়—headphone বোতাম চাপুন এবং মনোযোগ দিয়ে শুনুন।</p><p>• পরীক্ষা চলাকালীন প্রতিটি listening অডিও সর্বোচ্চ ২ বার চালানো যায় (সরকারি CBT নিয়ম)।</p><p>• উত্তর না জানা থাকলে question palette থেকে পরে ফিরে আসুন।</p><p>• জমা দেওয়ার পর সঠিক উত্তর ও বাংলা ব্যাখ্যা দেখানো হবে।</p></div></div><Button onClick={begin} className="mt-8 h-13 w-full rounded-full bg-[var(--navy)] text-base text-white">পরীক্ষা শুরু করুন <ChevronRight className="size-4" /></Button></div></div>
  </>;

  if (query.isLoading || !current || !questions) return <div className="container py-32 text-center"><Loader2 className="mx-auto size-8 animate-spin text-[var(--gold-dark)]" /><p className="mt-4 font-semibold text-[var(--navy)]/55">প্রশ্নপত্র তৈরি হচ্ছে…</p></div>;

  if (finished) {
    const listeningTotal = questions.filter(question => question.section === "listening").length;
    const readingTotal = questions.length - listeningTotal;
    const listeningCorrect = questions.filter(question => question.section === "listening" && answers[question.testId] === question.answer).length;
    const readingCorrect = questions.filter(question => question.section === "reading" && answers[question.testId] === question.answer).length;
    const points = Math.round(score * POINTS_PER_QUESTION * 10) / 10;
    const percent = Math.round((score / questions.length) * 100);
    const percent100 = points;
    const passesManufacturing = percent100 >= FLOOR_MANUFACTURING;
    const passesOther = percent100 >= FLOOR_OTHER;
    return <div className="container py-12"><section className="mx-auto max-w-4xl paper-card overflow-hidden"><div className="bg-[var(--navy)] p-8 text-center text-white md:p-12"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--gold)] text-[var(--navy)]"><GraduationCap className="size-7" /></span><p className="mt-6 text-sm font-bold uppercase tracking-[.2em] text-[var(--gold)]">Mock test complete</p><h1 className="mt-3 font-serif text-5xl font-bold">{score}/{questions.length}</h1><p className="mt-2 text-xl text-white/65">{points}/১০০ পয়েন্ট · {percent}%</p><p className="mt-1 text-base text-white/55">{percent >= 80 ? "অসাধারণ প্রস্তুতি!" : percent >= 60 ? "ভালো—র‍্যাঙ্কিং ফ্লোরের উপরে। আরও উপরে ওঠার চেষ্টা করুন।" : "ভিত্তি শক্ত করতে পাঠগুলো পুনরালোচনা করুন।"}</p><p className="mt-3 inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/70">{passesManufacturing ? "ম্যানুফ্যাকচারিং ফ্লোর (৬০) পাশ ✓ · অন্য সেক্টর ফ্লোর (৪৫) পাশ ✓" : passesOther ? "অন্য সেক্টর ফ্লোর (৪৫) পাশ ✓ · ম্যানুফ্যাকচারিং ফ্লোর ৬০ (একটু পিছিয়ে)" : "র‍্যাঙ্কিং ফ্লোর ৪৫/৬০ এখনও বাকি—আরও অনুশীলন করুন"}</p></div>
      <div className="grid gap-4 border-b border-[var(--navy)]/8 p-6 sm:grid-cols-2">
        {[
          { label: "듣기 · LISTENING", correct: listeningCorrect, total: listeningTotal },
          { label: "읽기 · READING", correct: readingCorrect, total: readingTotal },
        ].map(section => (
          <div key={section.label} className="rounded-2xl bg-[var(--cream)] p-5">
            <div className="flex items-center justify-between text-sm font-bold text-[var(--navy)]"><span>{section.label}</span><span>{section.correct}/{section.total}</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[var(--navy)]" style={{ width: `${section.total ? (section.correct / section.total) * 100 : 0}%` }} /></div>
            <p className="mt-2 text-xs text-[var(--navy)]/50">{Math.round((section.correct / Math.max(1, section.total)) * 100)}% সঠিক</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 border-b border-[var(--navy)]/8 p-6"><Button onClick={reset} variant="outline" className="rounded-full"><RotateCcw className="size-4" />নতুন পরীক্ষা</Button><Link href="/dashboard"><Button className="rounded-full bg-[var(--navy)] text-white">অগ্রগতি দেখুন</Button></Link></div>
      <div className="divide-y divide-[var(--navy)]/8">{questions.map((question, questionIndex) => {
        const selected = answers[question.testId];
        const correct = selected === question.answer;
        const format = getEpsQuestionFormat(question);
        const sectionLabel = question.section === "reading" ? "읽기 · READING" : "듣기 · LISTENING";
        return <article key={question.testId} className="p-6 md:p-8"><div className="flex gap-4"><span className={`grid size-9 shrink-0 place-items-center rounded-full ${correct ? "bg-emerald-600" : "bg-red-600"} text-white`}>{correct ? <Check className="size-4" /> : <X className="size-4" />}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[var(--gold-dark)]">প্রশ্ন {questionIndex + 1} · {sectionLabel} · {EPS_FORMAT_META[format].shortBn}</p><p className="mt-2 font-bold leading-7 text-[var(--navy)]">{question.questionBn}</p><p className="mt-1 text-sm font-semibold text-[var(--navy)]/60">{EPS_FORMAT_META[format].ko}</p>
            {question.image ? <EpsQuestionImage image={question.image} compact /> : null}
            {question.imageOptions ? (
              <EpsOptionImages images={question.imageOptions} selected={selected} answer={question.answer} revealed />
            ) : null}
            {question.passage ? (
              <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4 text-sm leading-7 text-[var(--navy)]/75">
                {question.section === "listening" ? <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">শোনার script</p> : null}
                {question.section === "listening" ? <DialogueScript passage={question.passage} /> : <p className="font-semibold text-[var(--navy)]">{question.passage}</p>}
                {question.section === "listening" ? (
                  <button type="button" onClick={() => void speakDialogue(question.passage, { rate: 0.82 })} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--gold-dark)]">
                    <Volume2 className="size-4" />আবার শুনুন
                  </button>
                ) : null}
              </div>
            ) : null}
            {question.imageOptions ? null : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className={`rounded-xl border px-4 py-3 text-sm ${optionIndex === question.answer ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-800" : optionIndex === selected ? "border-red-300 bg-red-50 text-red-800" : "border-[var(--navy)]/8 text-[var(--navy)]/55"}`}>{String.fromCharCode(65 + optionIndex)}. {option}</div>)}</div>
            )}
            <p className="mt-4 rounded-xl bg-[var(--cream)] p-4 text-sm leading-6 text-[var(--navy)]/65">{question.explanationBn}</p>
            {!correct ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900"><strong>শেখার টিপ:</strong> {question.section === "listening" ? "আবার audio শুনে মূল শব্দ/স্থান/সময় ধরুন; vocabulary ট্যাবে অপরিচিত শব্দ রিভিউ করুন।" : "passage-এর সাথে বিকল্প মিলিয়ে দেখুন—অতিরিক্ত অনুমান এড়িয়ে চলুন।"}</p> : null}
          </div></div></article>; })}</div></section></div>;
  }

  const totalQuestions = questions.length;
  const currentSection = sectionOf(index);
  const currentSectionStart = currentSection === "listening" ? 1 : (totalQuestions === 40 ? FULL_LISTENING : Math.ceil(totalQuestions / 2)) + 1;
  const currentSectionEnd = currentSection === "listening" ? (totalQuestions === 40 ? FULL_LISTENING : Math.ceil(totalQuestions / 2)) : totalQuestions;

  return <div className="container py-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--navy)] px-5 py-4 text-white"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]">EasyEPS Mock Test</p><p className="mt-1 text-sm text-white/55">প্রশ্ন {index + 1}/{questions.length} · উত্তর {Object.keys(answers).length}</p></div><div className="flex items-center gap-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${currentSection === "listening" ? "bg-[var(--gold)] text-[var(--navy)]" : "bg-white/10 text-white"}`}><Headphones className="size-3.5" />{currentSection === "listening" ? `듣기 ${currentSectionStart}–${currentSectionEnd}` : `읽기 ${currentSectionStart}–${currentSectionEnd}`}</span><div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono font-bold ${remaining < 300 ? "bg-red-600" : "bg-white/10"}`}><Clock3 className="size-4 text-[var(--gold)]" />{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</div></div></div><div className="grid gap-6 lg:grid-cols-[1fr_260px]"><section className="paper-card overflow-hidden"><div className="border-b border-[var(--navy)]/8 p-6 md:p-8"><div className="flex items-center justify-between gap-4"><span className="rounded-full bg-[var(--gold)]/14 px-3 py-1 text-xs font-bold text-[var(--gold-dark)]">{current.section === "reading" ? "읽기 · READING" : "듣기 · LISTENING"}</span><span className="text-xs font-semibold text-[var(--navy)]/40">অধ্যায় {current.chapter}</span></div>
        <FormatBanner question={current} />
        <h1 className="mt-5 text-lg font-bold leading-8 text-[var(--navy)]">{current.questionBn}</h1><p className="mt-2 text-xl font-semibold leading-8 text-[var(--navy)]">{current.questionKo}</p>{current.image ? <div className="mt-2"><EpsQuestionImage image={current.image} /></div> : null}{current.section === "listening" ? (
                <div className="mt-6 space-y-2">
                  <GuidedListening text={current.passage} maxPlays={2} label="Audio শুনতে চাপুন" />
                  <p className="text-center text-xs font-semibold text-[var(--navy)]/45">Listening script পরীক্ষা চলাকালীন লুকানো—জমা দেওয়ার পর দেখা যাবে।</p>
                </div>
              ) : current.passage ? (
                <div className="mt-6 rounded-2xl bg-[var(--cream)] p-5 text-lg font-semibold leading-8 text-[var(--navy)]">{current.passage}</div>
              ) : null}</div>
      {current.imageOptions ? (
        <div className="p-6 md:p-8">
          <EpsOptionImages
            images={current.imageOptions}
            selected={answers[current.testId]}
            answer={current.answer}
            onSelect={optionIndex => setAnswers(previous => ({ ...previous, [current.testId]: optionIndex }))}
          />
        </div>
      ) : (
        <div className="grid gap-3 p-6 md:p-8">{current.options.map((option, optionIndex) => <button key={optionIndex} onClick={() => setAnswers(previous => ({ ...previous, [current.testId]: optionIndex }))} className={`answer-option min-h-14 ${answers[current.testId] === optionIndex ? "answer-selected" : ""}`}><span>{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></button>)}</div>
      )}
      <div className="flex items-center justify-between border-t border-[var(--navy)]/8 bg-[var(--cream)] p-5"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(value => value - 1)} className="rounded-full"><ChevronLeft className="size-4" />আগেরটি</Button>{index === questions.length - 1 ? <Button onClick={finish} className="rounded-full bg-[var(--gold-dark)] text-white">পরীক্ষা জমা দিন</Button> : <Button onClick={() => setIndex(value => value + 1)} className="rounded-full bg-[var(--navy)] text-white">পরেরটি<ChevronRight className="size-4" /></Button>}</div></section><aside className="paper-card h-fit p-5 lg:sticky lg:top-28"><div className="flex items-center gap-2"><Headphones className="size-5 text-[var(--gold-dark)]" /><h2 className="font-bold text-[var(--navy)]">Question palette</h2></div><div className="mt-5 grid grid-cols-5 gap-2">{questions.map((question, questionIndex) => {
        const startsReading = questionIndex > 0 && sectionOf(questionIndex) === "reading" && sectionOf(questionIndex - 1) === "listening";
        return (
          <span key={question.testId} className={startsReading ? "col-span-5 mt-1 block text-center text-[10px] font-bold uppercase tracking-wider text-[var(--gold-dark)]" : "contents"}>
            {startsReading ? <span className="block">읽기 · Reading শুরু</span> : null}
            <button onClick={() => setIndex(questionIndex)} className={`grid aspect-square place-items-center rounded-lg text-xs font-bold ${index === questionIndex ? "ring-2 ring-[var(--gold)] ring-offset-2" : ""} ${typeof answers[question.testId] === "number" ? "bg-[var(--navy)] text-white" : sectionOf(questionIndex) === "listening" ? "bg-[var(--gold)]/14 text-[var(--gold-dark)]" : "bg-[var(--cream)] text-[var(--navy)]/55"}`}>{questionIndex + 1}</button>
          </span>
        );
      })}</div><div className="mt-6 border-t border-[var(--navy)]/8 pt-5 text-xs leading-6 text-[var(--navy)]/50"><p><span className="mr-2 inline-block size-2 rounded-full bg-[var(--navy)]" />উত্তর দেওয়া হয়েছে</p><p><span className="mr-2 inline-block size-2 rounded-full bg-[var(--gold)]/40" />듣기 (Listening)</p><p><span className="mr-2 inline-block size-2 rounded-full bg-[var(--cream)] ring-1 ring-[var(--navy)]/10" />উত্তর বাকি</p></div><Button onClick={() => { if (confirm("পরীক্ষা জমা দিতে চান?")) finish(); }} variant="outline" className="mt-5 w-full rounded-full border-[var(--navy)]/18">এখনই জমা দিন</Button></aside></div></div>;
}
