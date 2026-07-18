import { BasicsCtaBanner, BasicsLockCard } from "@/components/basics/BasicsLockCard";
import { pushCelebration } from "@/components/CelebrationBanner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useBasicsGate } from "@/hooks/useBasicsGate";
import { addLocalAttempt, updateChapterProgress, useLocalBasics, useLocalLearning } from "@/lib/localProgress";
import { speakKorean } from "@/lib/speakKorean";
import { recordWeakAttempt } from "@/lib/srs";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { isBasicsComplete } from "@shared/basics";
import type { EpsQuestion, Lesson, PracticeQuestion } from "@shared/lesson";
import { ArrowLeft, ArrowRight, BookOpenText, Check, ChevronLeft, ChevronRight, Clock3, GraduationCap, Headphones, Layers3, Loader2, MessagesSquare, RotateCcw, Sparkles, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useRoute } from "wouter";

const tabs = [
  { id: "overview", label: "পাঠ পরিচিতি", icon: BookOpenText },
  { id: "vocabulary", label: "শব্দভাণ্ডার", icon: Layers3 },
  { id: "grammar", label: "ব্যাকরণ", icon: Sparkles },
  { id: "dialogue", label: "সংলাপ", icon: MessagesSquare },
  { id: "practice", label: "অনুশীলন", icon: Check },
  { id: "exam", label: "অধ্যায় পরীক্ষা", icon: GraduationCap },
] as const;
type Tab = typeof tabs[number]["id"];

/** Short Bangla learning tip after a wrong answer (static pedagogy, no LLM). */
function feedbackTipForQuestion(
  question: PracticeQuestion | EpsQuestion,
  kind: "practice" | "exam",
): string {
  const text = `${question.questionBn} ${"questionKo" in question ? question.questionKo : ""} ${question.explanationBn}`;
  if (kind === "exam" && "section" in question && question.section === "listening") {
    return "শুধু একবার শুনে মনে রাখার চেষ্টা করুন। অপরিচিত শব্দ থাকলে আগে vocabulary পুনরালোচনা করুন, তারপর আবার শুনুন।";
  }
  if (kind === "exam" && "section" in question && question.section === "reading") {
    return "passage-এর মূল ধারণা আগে খুঁজুন (কে / কোথায় / কী)। বিকল্পগুলো passage-এর সাথে মিলিয়ে দেখুন—অতিরিক্ত অর্থ যোগ করবেন না।";
  }
  if ("type" in question && question.type === "matching") {
    return "প্রতিটি Korean শব্দের বাংলা অর্থ আলাদা করে flashcard-এ পুনরায় দেখুন; একই অর্থের জোড়া মেলাতে তাড়াহুড়ো করবেন না।";
  }
  if (/조사|은\/는|이\/가|을\/를|에|에서|으로|부터|까지/.test(text) || /particle|조사/.test(text)) {
    return "조사 (은/는, 이/가, 을/를, 에…) বাক্যে noun-এর ভূমিকা বোঝায়। উদাহরণ বাক্য জোরে পড়ে মিল খুঁজুন।";
  }
  if (/아요|어요|습니다|세요|과거|future|tense|동사/.test(text)) {
    return "ক্রিয়ার শেষাংশ (-아요/어요, -습니다) ও কাল (অতীত/বর্তমান) আলাদা করে মুখস্থ করুন; pattern + উদাহরণ একসাথে পড়ুন।";
  }
  if (/숫자|번호|시간|날짜|얼마|몇/.test(text)) {
    return "সংখ্যা ও সময়ের Korean উচ্চারণ আলাদা করে drill করুন (일, 이, 삼… / 하나, 둘…).";
  }
  return "সঠিক বিকল্প ও ব্যাখ্যা আবার পড়ুন, তারপর সংশ্লিষ্ট vocabulary/grammar ট্যাবে গিয়ে একই pattern-এর আরেকটি উদাহরণ বলুন।";
}

function CompleteButton({ done, onClick, children }: { done?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <Button onClick={onClick} className={`mt-7 rounded-full px-6 ${done ? "bg-[var(--sage)] text-white" : "bg-[var(--navy)] text-white"}`}>{done ? <Check className="size-4" /> : null}{done ? "সম্পন্ন হয়েছে" : children}</Button>;
}

function SpeakRateToggle({
  rate,
  onChange,
}: {
  rate: number;
  onChange: (rate: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[var(--navy)]/12 bg-white p-1 text-xs font-bold">
      <button
        type="button"
        onClick={() => onChange(0.7)}
        className={`rounded-full px-3 py-1.5 ${rate === 0.7 ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}
      >
        ধীর
      </button>
      <button
        type="button"
        onClick={() => onChange(1)}
        className={`rounded-full px-3 py-1.5 ${rate === 1 ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}
      >
        সাধারণ
      </button>
    </div>
  );
}

function VocabularyView({ lesson, done, onDone }: { lesson: Lesson; done?: boolean; onDone: () => void }) {
  const [flashcards, setFlashcards] = useState(false);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [speakRate, setSpeakRate] = useState(0.85);
  const item = lesson.vocabulary[index];
  if (flashcards) return <section className="paper-card p-6 md:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Flashcard {index + 1}/{lesson.vocabulary.length}</p><h2 className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">শব্দ মনে রাখুন</h2></div><div className="flex flex-wrap items-center gap-2"><SpeakRateToggle rate={speakRate === 0.7 ? 0.7 : 1} onChange={r => setSpeakRate(r === 0.7 ? 0.7 : 0.85)} /><Button variant="outline" onClick={() => setFlashcards(false)} className="rounded-full">তালিকা</Button></div></div><button onClick={() => setFlipped(value => !value)} className="mt-8 grid min-h-80 w-full place-items-center rounded-[2rem] border border-[var(--gold)]/25 bg-[radial-gradient(circle_at_top,rgba(204,166,92,.18),transparent_45%)] p-8 text-center shadow-inner"><div>{flipped ? <><p className="font-serif text-4xl font-bold text-[var(--navy)]">{item.bn}</p><p className="mt-3 text-lg text-[var(--navy)]/55">{item.en}</p><div className="mx-auto mt-7 max-w-2xl rounded-2xl bg-white/70 p-5"><p className="text-xl font-bold text-[var(--navy)]">{item.example.ko}</p><p className="mt-2 text-sm leading-6 text-[var(--navy)]/60">{item.example.bn}</p></div></> : <><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--gold-dark)]">{item.pos}</p><p className="mt-5 font-serif text-6xl font-bold text-[var(--navy)]">{item.ko}</p><p className="mt-3 text-lg text-[var(--navy)]/45">{item.romanization}</p><p className="mt-7 text-sm font-semibold text-[var(--navy)]/45">অর্থ দেখতে কার্ডে চাপুন</p></>}</div></button><div className="mt-6 flex items-center justify-between"><Button variant="outline" onClick={() => { setIndex(value => Math.max(0, value - 1)); setFlipped(false); }} disabled={index === 0} className="rounded-full"><ChevronLeft className="size-4" />আগেরটি</Button><button onClick={() => void speakKorean(item.ko, { rate: speakRate })} className="grid size-11 place-items-center rounded-full bg-[var(--gold)]/18 text-[var(--gold-dark)]"><Volume2 className="size-5" /></button><Button onClick={() => { if (index === lesson.vocabulary.length - 1) onDone(); else { setIndex(value => value + 1); setFlipped(false); } }} className="rounded-full bg-[var(--navy)] text-white">{index === lesson.vocabulary.length - 1 ? "সম্পন্ন" : "পরেরটি"}<ChevronRight className="size-4" /></Button></div></section>;
  return <section className="paper-card p-6 md:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">{lesson.vocabulary.length}টি দরকারি শব্দ</p><h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">শব্দভাণ্ডার</h2></div><div className="flex flex-wrap items-center gap-2"><SpeakRateToggle rate={speakRate === 0.7 ? 0.7 : 1} onChange={r => setSpeakRate(r === 0.7 ? 0.7 : 0.85)} /><Button variant="outline" onClick={() => setFlashcards(true)} className="rounded-full"><RotateCcw className="size-4" />Flashcard mode</Button></div></div><div className="mt-7 grid gap-3">{lesson.vocabulary.map((word, wordIndex) => <div key={`${word.ko}-${wordIndex}`} className="group grid gap-4 rounded-2xl border border-[var(--navy)]/8 bg-white p-4 transition hover:border-[var(--gold)]/30 md:grid-cols-[1.1fr_1fr_2fr_auto] md:items-center"><div><p className="text-xl font-bold text-[var(--navy)]">{word.ko}</p><p className="mt-1 text-xs text-[var(--navy)]/42">{word.romanization} · {word.pos}</p></div><div><p className="font-bold text-[var(--navy)]">{word.bn}</p><p className="text-xs text-[var(--navy)]/45">{word.en}</p></div><div className="rounded-xl bg-[var(--cream)] px-4 py-3"><p className="font-semibold text-[var(--navy)]">{word.example.ko}</p><p className="mt-1 text-xs leading-5 text-[var(--navy)]/52">{word.example.bn}</p></div><button onClick={() => void speakKorean(`${word.ko}. ${word.example.ko}`, { rate: speakRate })} aria-label="Play Korean" className="grid size-10 place-items-center rounded-full bg-[var(--gold)]/14 text-[var(--gold-dark)]"><Volume2 className="size-4" /></button></div>)}</div><CompleteButton done={done} onClick={onDone}>শব্দভাণ্ডার সম্পন্ন করুন</CompleteButton></section>;
}

function PracticeRunner({
  lesson,
  kind,
  savedScore,
  onComplete,
}: {
  lesson: Lesson;
  kind: "practice" | "exam";
  savedScore?: number;
  onComplete: (
    score: number,
    total: number,
    duration: number,
    payload: { answers: Record<string, number>; matching: Record<string, Record<number, string>> },
  ) => void;
}) {
  const questions = kind === "practice" ? lesson.practice : lesson.epsQuestions;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [matching, setMatching] = useState<Record<string, Record<number, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [startedAt] = useState(Date.now());
  const [remaining, setRemaining] = useState(kind === "exam" ? 15 * 60 : 0);

  const score = useMemo(() => questions.reduce((sum, question) => {
    if (kind === "practice" && (question as PracticeQuestion).type === "matching") {
      const q = question as PracticeQuestion;
      const selections = matching[q.id] ?? {};
      return sum + (q.pairs.every((pair, index) => selections[index] === pair.right) ? 1 : 0);
    }
    return sum + (answers[question.id] === question.answer ? 1 : 0);
  }, 0), [answers, matching, questions, kind]);

  const finish = (finalScore: number) => {
    setSubmitted(true);
    onComplete(finalScore, questions.length, Math.round((Date.now() - startedAt) / 1000), { answers, matching });
  };

  useEffect(() => {
    if (kind !== "exam" || submitted) return;
    const timer = window.setInterval(() => setRemaining(value => {
      if (value <= 1) {
        window.clearInterval(timer);
        queueMicrotask(() => finish(score));
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  });

  const submit = () => finish(score);
  const reset = () => { setAnswers({}); setMatching({}); setSubmitted(false); };
  return <section className="paper-card overflow-hidden"><div className="flex flex-col gap-4 border-b border-[var(--navy)]/8 p-6 md:flex-row md:items-center md:justify-between"><div><p className="eyebrow">{kind === "exam" ? "EPS-style chapter test" : "নিজেকে যাচাই করুন"}</p><h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">{kind === "exam" ? "অধ্যায় পরীক্ষা" : "অনুশীলন"}</h2>{typeof savedScore === "number" && !submitted && <p className="mt-2 text-sm text-[var(--sage-dark)]">সর্বশেষ স্কোর: {savedScore}/{questions.length}</p>}</div>{kind === "exam" && <div className="inline-flex items-center gap-2 self-start rounded-full bg-[var(--navy)] px-4 py-2 font-mono text-sm font-bold text-white"><Clock3 className="size-4 text-[var(--gold)]" />{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</div>}</div><div className="divide-y divide-[var(--navy)]/8">{questions.map((question, questionIndex) => {
    const practice = question as PracticeQuestion;
    const isMatching = kind === "practice" && practice.type === "matching";
    const chosen = answers[question.id];
    const correct = isMatching ? practice.pairs.every((pair, index) => matching[practice.id]?.[index] === pair.right) : chosen === question.answer;
    const optionList = question.options ?? [];
    const isListening = kind === "exam" && (question as EpsQuestion).section === "listening";
    const passageText = "passage" in question ? question.passage : "";
    return <article key={question.id} className="p-6 md:p-8"><div className="flex gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--navy)] font-serif font-bold text-white">{questionIndex + 1}</span><div className="min-w-0 flex-1"><p className="font-bold leading-7 text-[var(--navy)]">{question.questionBn}</p>{question.questionKo && <p className="mt-2 text-lg font-semibold text-[var(--navy)]">{question.questionKo}</p>}
      {passageText ? (
        isListening && !submitted ? (
          <div className="mt-4 space-y-2">
            <button type="button" onClick={() => void speakKorean(passageText, { rate: 0.82 })} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--navy)] p-4 font-bold text-white hover:bg-[var(--navy)]/90">
              <span className="grid size-9 place-items-center rounded-full bg-[var(--gold)] text-[var(--navy)]"><Headphones className="size-4" /></span>
              শুনতে চাপুন · লিখনটি পরীক্ষার আগে দেখা যাবে না
            </button>
            <p className="text-center text-xs font-semibold text-[var(--navy)]/45">EPS listening মোড: জমা দেওয়ার পর script দেখা যাবে।</p>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4 text-left font-semibold leading-7 text-[var(--navy)]">
            {isListening && submitted ? <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">শোনার script (জমার পর)</p> : null}
            {passageText}
            {isListening && submitted ? (
              <button type="button" onClick={() => void speakKorean(passageText, { rate: 0.82 })} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--gold-dark)]">
                <Volume2 className="size-4" />আবার শুনুন
              </button>
            ) : null}
          </div>
        )
      ) : null}
      {isMatching ? <div className="mt-5 grid gap-3">{practice.pairs.map((pair, pairIndex) => <div key={`${pair.left}-${pairIndex}`} className="grid gap-2 sm:grid-cols-2 sm:items-center"><div className="rounded-xl bg-[var(--cream)] px-4 py-3 font-bold text-[var(--navy)]">{pair.left}</div><select disabled={submitted} value={matching[practice.id]?.[pairIndex] ?? ""} onChange={event => setMatching(previous => ({ ...previous, [practice.id]: { ...(previous[practice.id] ?? {}), [pairIndex]: event.target.value } }))} className="h-12 rounded-xl border border-[var(--navy)]/12 bg-white px-3"><option value="">সঠিক অর্থ বেছে নিন</option>{[...practice.pairs].sort((a, b) => a.right.localeCompare(b.right)).map(option => <option key={option.right} value={option.right}>{option.right}</option>)}</select></div>)}</div> : <div className="mt-5 grid gap-2 sm:grid-cols-2">{optionList.map((option, optionIndex) => { const selected = chosen === optionIndex; const revealCorrect = submitted && optionIndex === question.answer; const revealWrong = submitted && selected && optionIndex !== question.answer; return <button key={`${option}-${optionIndex}`} disabled={submitted} onClick={() => setAnswers(previous => ({ ...previous, [question.id]: optionIndex }))} className={`answer-option ${selected ? "answer-selected" : ""} ${revealCorrect ? "answer-correct" : ""} ${revealWrong ? "answer-wrong" : ""}`}><span>{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{revealCorrect && <Check className="ml-auto size-4" />}{revealWrong && <X className="ml-auto size-4" />}</button>; })}</div>}
      {submitted && <div className={`mt-5 rounded-2xl p-4 text-sm leading-6 ${correct ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}><strong>{correct ? "সঠিক।" : "সঠিক উত্তর দেখুন।"}</strong> {question.explanationBn}
        {!correct ? <p className="mt-2 border-t border-red-200/80 pt-2 text-red-900/80"><strong>শেখার টিপ:</strong> {feedbackTipForQuestion(question, kind)}</p> : null}
      </div>}
    </div></div></article>;
  })}</div><div className="flex flex-col gap-4 border-t border-[var(--navy)]/8 bg-[var(--cream)] p-6 sm:flex-row sm:items-center sm:justify-between">{submitted ? <><div><p className="font-serif text-3xl font-bold text-[var(--navy)]">স্কোর {score}/{questions.length}</p><p className="text-sm text-[var(--navy)]/50">{Math.round(score / questions.length * 100)}% · {score / questions.length >= .75 ? "ভালো করেছেন!" : "ব্যাখ্যা পড়ে আবার চেষ্টা করুন।"}</p></div><Button onClick={reset} variant="outline" className="rounded-full"><RotateCcw className="size-4" />আবার চেষ্টা</Button></> : <><p className="text-sm font-semibold text-[var(--navy)]/50">উত্তর দেওয়া হয়েছে {Object.keys(answers).length + Object.keys(matching).length}/{questions.length}</p><Button onClick={submit} className="rounded-full bg-[var(--navy)] px-7 text-white">উত্তর জমা দিন</Button></>}</div></section>;
}

export default function LessonPage() {
  const [, params] = useRoute("/lesson/:chapter");
  const chapter = Math.min(60, Math.max(1, Number(params?.chapter ?? 1)));
  const [active, setActive] = useState<Tab>("overview");
  const { locale, t } = useLocale();
  const state = useLocalLearning();
  const localBasics = useLocalBasics();
  const local = state.progress[chapter];
  const { isAuthenticated } = useAuth();
  const gate = useBasicsGate();
  const lessonQuery = trpc.curriculum.get.useQuery({ chapter });
  const saveRemote = trpc.progress.save.useMutation();
  const recordRemote = trpc.attempts.record.useMutation();
  const lesson = lessonQuery.data;

  /** Soft: incomplete hangul without checkpoint; hard: gateEnabled && !completed */
  const hangulReadyLocal = isBasicsComplete(localBasics);
  const hardBlocked = !gate.loading && gate.gateEnabled && !gate.completed;
  const softBanner = !gate.loading && !hardBlocked && !hangulReadyLocal && !gate.completed;
  const writesBlocked = hardBlocked;

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); setActive("overview"); }, [chapter]);
  const saveProgress = (patch: Parameters<typeof updateChapterProgress>[1], minutes = 5) => {
    if (writesBlocked) {
      toast.message(t.completeBasicsFirst);
      return local;
    }
    const saved = updateChapterProgress(chapter, patch, minutes);
    if (isAuthenticated) saveRemote.mutate({ chapter, ...patch, minutes });
    return saved;
  };
  const record = (
    kind: "practice" | "chapter-exam",
    score: number,
    total: number,
    durationSec: number,
    payload?: { answers: Record<string, number>; matching?: Record<string, Record<number, string>> },
  ) => {
    if (writesBlocked) {
      toast.message(t.completeBasicsFirst);
      return;
    }
    addLocalAttempt({ kind, chapter, score, total, durationSec });
    if (isAuthenticated) {
      const matching =
        payload?.matching &&
        Object.fromEntries(
          Object.entries(payload.matching).map(([id, pairs]) => [
            id,
            Object.fromEntries(Object.entries(pairs).map(([index, value]) => [String(index), value])),
          ]),
        );
      recordRemote.mutate({
        kind,
        chapter,
        durationSec,
        answers: payload?.answers ?? {},
        matching,
        score,
        total,
      });
    }
    if (kind === "practice") saveProgress({ practiceScore: score, practiceTotal: total }, Math.max(1, Math.round(durationSec / 60)));
    else saveProgress({ examScore: score, examTotal: total, completed: score / total >= .75 }, Math.max(1, Math.round(durationSec / 60)));
    recordWeakAttempt({
      kind: "chapter",
      chapter,
      labelBn: `অধ্যায় ${chapter} · ${kind === "practice" ? "অনুশীলন" : "পরীক্ষা"}`,
      score,
      total,
    });
    toast.success(`স্কোর ${score}/${total} সংরক্ষিত হয়েছে`);
    if (total > 0 && score / total >= 0.75) {
      const next = Math.min(60, chapter + 1);
      const isExam = kind === "chapter-exam";
      pushCelebration({
        title: kind === "practice" ? "ভালো স্কোর!" : "অধ্যায় পরীক্ষা পাস!",
        body: `স্কোর ${score}/${total} (${Math.round((score / total) * 100)}%) — চালিয়ে যান।`,
        href: isExam && chapter < 60 ? `/lesson/${next}` : `/lesson/${chapter}`,
        cta: isExam && chapter < 60 ? `অধ্যায় ${next}` : "পাঠে থাকুন",
      });
    }
  };

  if (lessonQuery.isLoading) return <div className="container py-32 text-center"><Loader2 className="mx-auto size-8 animate-spin text-[var(--gold-dark)]" /><p className="mt-4 font-semibold text-[var(--navy)]/55">পাঠ প্রস্তুত হচ্ছে…</p></div>;
  if (!lesson) return <div className="container py-28 text-center"><h1 className="font-serif text-4xl font-bold text-[var(--navy)]">পাঠ পাওয়া যায়নি</h1><Link href="/curriculum" className="mt-5 inline-flex font-bold text-[var(--gold-dark)]">পাঠ্যক্রমে ফিরুন</Link></div>;
  const title = lesson.title[locale];
  return <>
    <section className="bg-[var(--navy)] text-white"><div className="sacred-grid-dark"><div className="container py-10 md:py-14"><div className="flex items-center justify-between gap-4"><Link href="/curriculum" className="inline-flex items-center gap-2 text-sm font-bold text-white/60 hover:text-[var(--gold)]"><ArrowLeft className="size-4" />পাঠ্যক্রম</Link><span className="rounded-full bg-white/8 px-3 py-1 text-xs font-bold text-[var(--gold)]">{local?.completed ? "সম্পন্ন" : `CHAPTER ${String(chapter).padStart(2, "0")}`}</span></div><div className="mt-9 max-w-4xl"><p className="text-sm font-bold uppercase tracking-[.2em] text-[var(--gold)]">{lesson.category.replace("-", " ")}</p><h1 className="mt-4 font-serif text-4xl font-bold leading-tight md:text-6xl">{title}</h1>{locale !== "ko" && <p className="mt-3 text-2xl font-semibold text-white/45">{lesson.title.ko}</p>}<div className="mt-8 flex flex-wrap gap-4 text-sm text-white/55"><span>{lesson.vocabulary.length} শব্দ</span><span>·</span><span>{lesson.grammar.length} ব্যাকরণ</span><span>·</span><span>{lesson.practice.length} অনুশীলন</span><span>·</span><span>{lesson.epsQuestions.length} পরীক্ষার প্রশ্ন</span></div></div></div></div></section>

    <div className="sticky top-[7.25rem] z-30 overflow-x-auto border-b border-[var(--navy)]/10 bg-[var(--cream)]/95 backdrop-blur-xl"><div className="container flex min-w-max gap-1 py-2">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActive(id)} className={`lesson-tab ${active === id ? "lesson-tab-active" : ""}`}><Icon className="size-4" />{label}</button>)}</div></div>

    <div className="container py-8 md:py-12">
      {chapter === 1 && (
        <div className="mb-7 flex flex-col gap-3 rounded-2xl border border-[var(--gold)]/35 bg-[var(--gold)]/12 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold leading-6 text-[var(--navy)]">
            <strong>হ্যাঙ্গুল শেষ—এখন শব্দ শিখুন।</strong> জামো ভুলে গেলে বেসিক রিভিউ করুন।
          </p>
          <Link href="/basics">
            <Button variant="outline" className="rounded-full border-[var(--navy)]/20 shrink-0">
              বেসিক রিভিউ
            </Button>
          </Link>
        </div>
      )}
      {softBanner && <BasicsCtaBanner className="mb-7" />}
      {hardBlocked && (active === "practice" || active === "exam") ? (
        <BasicsLockCard hard />
      ) : (
        <>
      {active === "overview" && <section className="grid gap-7 lg:grid-cols-[1.15fr_.85fr]"><div className="paper-card p-7 md:p-9"><p className="eyebrow">এই অধ্যায়ে শিখবেন</p><h2 className="mt-3 font-serif text-3xl font-bold text-[var(--navy)]">শেখার লক্ষ্য</h2><div className="mt-7 grid gap-4">{lesson.objectives[locale === "en" ? "en" : "bn"].map((objective, index) => <div key={objective} className="flex gap-4"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--gold)]/18 font-serif font-bold text-[var(--gold-dark)]">{index + 1}</span><p className="pt-1 leading-7 text-[var(--navy)]/70">{objective}</p></div>)}</div><Button onClick={() => setActive("vocabulary")} className="mt-9 rounded-full bg-[var(--navy)] px-6 text-white">শব্দভাণ্ডার শুরু করুন <ArrowRight className="size-4" /></Button></div><aside className="paper-card overflow-hidden"><div className="bg-[var(--gold)]/14 p-7"><p className="eyebrow">পাঠের অগ্রগতি</p><p className="mt-2 font-serif text-4xl font-bold text-[var(--navy)]">{[local?.vocabDone, local?.grammarDone, local?.dialogueDone, typeof local?.practiceScore === "number", typeof local?.examScore === "number"].filter(Boolean).length}/5</p><div className="mt-4 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[var(--navy)]" style={{ width: `${[local?.vocabDone, local?.grammarDone, local?.dialogueDone, typeof local?.practiceScore === "number", typeof local?.examScore === "number"].filter(Boolean).length / 5 * 100}%` }} /></div></div><div className="divide-y divide-[var(--navy)]/8 p-3">{tabs.slice(1).map(tab => { const done = tab.id === "vocabulary" ? local?.vocabDone : tab.id === "grammar" ? local?.grammarDone : tab.id === "dialogue" ? local?.dialogueDone : tab.id === "practice" ? typeof local?.practiceScore === "number" : typeof local?.examScore === "number"; return <button key={tab.id} onClick={() => setActive(tab.id)} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold hover:bg-[var(--cream)]"><span className={`grid size-7 place-items-center rounded-full ${done ? "bg-[var(--sage)] text-white" : "bg-[var(--cream)] text-[var(--navy)]/35"}`}>{done ? <Check className="size-4" /> : <tab.icon className="size-4" />}</span>{tab.label}<ChevronRight className="ml-auto size-4 text-[var(--navy)]/30" /></button>; })}</div></aside></section>}
      {active === "vocabulary" && <VocabularyView lesson={lesson} done={local?.vocabDone} onDone={() => saveProgress({ vocabDone: true })} />}
      {active === "grammar" && <section className="paper-card p-6 md:p-8"><p className="eyebrow">Pattern + meaning + examples</p><h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">ব্যাকরণ</h2><div className="mt-7 space-y-5">{lesson.grammar.map((grammar, index) => <article key={grammar.pattern} className="overflow-hidden rounded-3xl border border-[var(--navy)]/9"><div className="flex flex-col gap-3 bg-[var(--navy)] p-5 text-white sm:flex-row sm:items-center sm:justify-between"><span className="text-xs font-bold text-[var(--gold)]">GRAMMAR {index + 1}</span><p className="font-serif text-2xl font-bold">{grammar.pattern}</p></div><div className="p-6"><h3 className="text-lg font-bold text-[var(--navy)]">{grammar.titleBn}</h3><p className="mt-3 leading-7 text-[var(--navy)]/65">{grammar.explanationBn}</p><p className="mt-2 text-sm leading-6 text-[var(--navy)]/45">{grammar.explanationEn}</p><div className="mt-5 grid gap-3">{grammar.examples.map((example, exampleIndex) => <div key={exampleIndex} className="rounded-2xl bg-[var(--cream)] p-4"><div className="flex items-start justify-between gap-3"><p className="font-bold leading-7 text-[var(--navy)]">{example.ko}</p><button onClick={() => void speakKorean(example.ko)} className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[var(--gold-dark)]"><Volume2 className="size-3.5" /></button></div><p className="mt-1 text-sm leading-6 text-[var(--navy)]/58">{example.bn}</p></div>)}</div></div></article>)}</div><CompleteButton done={local?.grammarDone} onClick={() => saveProgress({ grammarDone: true })}>ব্যাকরণ সম্পন্ন করুন</CompleteButton></section>}
      {active === "dialogue" && <section className="paper-card p-6 md:p-8"><p className="eyebrow">শুনুন ও অনুকরণ করুন</p><h2 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">বাস্তব সংলাপ</h2><div className="mt-7 grid gap-6">{lesson.dialogues.map((dialogue, dialogueIndex) => <article key={dialogueIndex} className="rounded-3xl border border-[var(--navy)]/9 p-5 md:p-7"><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">Dialogue {dialogueIndex + 1}</p><h3 className="mt-1 font-serif text-2xl font-bold text-[var(--navy)]">{dialogue.titleBn}</h3></div><button onClick={() => void speakKorean(dialogue.lines.map(line => line.ko).join(". "), { rate: .8 })} className="grid size-11 place-items-center rounded-full bg-[var(--gold)]/18 text-[var(--gold-dark)]"><Headphones className="size-5" /></button></div><div className="mt-6 space-y-4">{dialogue.lines.map((line, lineIndex) => <div key={lineIndex} className={`flex ${lineIndex % 2 ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-2xl p-4 md:max-w-[72%] ${lineIndex % 2 ? "rounded-tr-md bg-[var(--navy)] text-white" : "rounded-tl-md bg-[var(--cream)] text-[var(--navy)]"}`}><p className={`text-xs font-bold ${lineIndex % 2 ? "text-[var(--gold)]" : "text-[var(--gold-dark)]"}`}>{line.speaker}</p><div className="mt-2 flex items-start gap-3"><p className="text-lg font-semibold leading-7">{line.ko}</p><button onClick={() => void speakKorean(line.ko)} className="mt-1 opacity-60 hover:opacity-100"><Volume2 className="size-3.5" /></button></div><p className={`mt-2 text-sm leading-6 ${lineIndex % 2 ? "text-white/60" : "text-[var(--navy)]/55"}`}>{line.bn}</p></div></div>)}</div></article>)}</div><CompleteButton done={local?.dialogueDone} onClick={() => saveProgress({ dialogueDone: true })}>সংলাপ সম্পন্ন করুন</CompleteButton></section>}
      {active === "practice" && <PracticeRunner lesson={lesson} kind="practice" savedScore={local?.practiceScore} onComplete={(score, total, duration, payload) => record("practice", score, total, duration, payload)} />}
      {active === "exam" && <PracticeRunner lesson={lesson} kind="exam" savedScore={local?.examScore} onComplete={(score, total, duration, payload) => record("chapter-exam", score, total, duration, payload)} />}
        </>
      )}
    </div>
    <div className="container flex items-center justify-between border-t border-[var(--navy)]/10 py-7"><Link href={`/lesson/${Math.max(1, chapter - 1)}`} className={`inline-flex items-center gap-2 text-sm font-bold text-[var(--navy)] ${chapter === 1 ? "pointer-events-none opacity-30" : ""}`}><ChevronLeft className="size-4" />আগের অধ্যায়</Link><Link href={`/lesson/${Math.min(60, chapter + 1)}`} className={`inline-flex items-center gap-2 text-sm font-bold text-[var(--navy)] ${chapter === 60 ? "pointer-events-none opacity-30" : ""}`}>পরের অধ্যায়<ChevronRight className="size-4" /></Link></div>
  </>;
}
