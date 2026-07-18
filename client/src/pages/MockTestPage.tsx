import { Button } from "@/components/ui/button";
import { addLocalAttempt } from "@/lib/localProgress";
import { speakKorean } from "@/lib/speakKorean";
import { recordWeakAttempt } from "@/lib/srs";
import { getWeeklyChallenge, recordWeeklyChallengeScore } from "@/lib/weeklyChallenge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Check, ChevronLeft, ChevronRight, Clock3, GraduationCap, Headphones, Loader2, RotateCcw, ShieldCheck, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

export default function MockTestPage() {
  const { isAuthenticated } = useAuth();
  const weekly = useMemo(() => getWeeklyChallenge(), []);
  const [count, setCount] = useState<20 | 40>(weekly.count);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [remaining, setRemaining] = useState(50 * 60);
  const [startedAt, setStartedAt] = useState(0);
  const query = trpc.curriculum.mockTest.useQuery({ count }, { enabled: started, retry: false, refetchOnWindowFocus: false });
  const recordRemote = trpc.attempts.record.useMutation();
  const questions = query.data ?? [];
  const current = questions[index];
  const score = useMemo(() => questions.reduce((sum, question) => sum + (answers[question.testId] === question.answer ? 1 : 0), 0), [questions, answers]);

  const finish = () => {
    if (!questions.length || finished) return;
    const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    setFinished(true);
    addLocalAttempt({ kind: "mock-test", score, total: questions.length, durationSec });
    recordWeakAttempt({
      kind: "mock",
      labelBn: "পূর্ণাঙ্গ মক টেস্ট",
      score,
      total: questions.length,
    });
    recordWeeklyChallengeScore(score, questions.length);
    if (isAuthenticated) {
      recordRemote.mutate({
        kind: "mock-test",
        score,
        total: questions.length,
        durationSec,
        answers,
        mockQuestions: questions.map(question => ({
          chapter: question.chapter,
          id: question.id,
          testId: question.testId,
        })),
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!started || finished) return;
    const timer = window.setInterval(() => setRemaining(value => {
      if (value <= 1) { window.clearInterval(timer); queueMicrotask(finish); return 0; }
      return value - 1;
    }), 1000);
    return () => window.clearInterval(timer);
  });

  const begin = () => {
    setStarted(true); setFinished(false); setIndex(0); setAnswers({}); setStartedAt(Date.now());
    setRemaining(count === 40 ? 50 * 60 : 25 * 60);
  };
  const reset = () => { setStarted(false); setFinished(false); setAnswers({}); setIndex(0); };

  if (!started) return <>
    <section className="bg-[var(--navy)] text-white"><div className="sacred-grid-dark"><div className="container grid min-h-[420px] items-center gap-10 py-16 lg:grid-cols-[1fr_.55fr]"><div><p className="eyebrow text-[var(--gold)]">Realistic EPS practice</p><h1 className="mt-4 font-serif text-5xl font-bold md:text-6xl">পূর্ণাঙ্গ মক টেস্ট</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/60">সময় নিয়ন্ত্রণ, reading ও listening প্রশ্ন, তাৎক্ষণিক স্কোর এবং বিস্তারিত ব্যাখ্যার মাধ্যমে পরীক্ষার পরিবেশে নিজেকে যাচাই করুন।</p></div><GraduationCap className="mx-auto size-40 text-[var(--gold)]/25" /></div></div></section>
    <div className="container py-12"><div className="mx-auto max-w-3xl paper-card p-7 md:p-10"><p className="eyebrow">পরীক্ষা সেটআপ</p><h2 className="mt-3 font-serif text-3xl font-bold text-[var(--navy)]">কোন পরীক্ষা দেবেন?</h2>
      <div className="mt-4 rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-4 text-sm leading-6 text-[var(--navy)]">
        <strong>এই সপ্তাহের চ্যালেঞ্জ ({weekly.week}):</strong> {weekly.count} প্রশ্ন
        {weekly.bestScore != null && weekly.bestTotal
          ? ` · আপনার সেরা: ${weekly.bestScore}/${weekly.bestTotal}`
          : " · এখনও অংশ নেননি"}
        {" · "}{weekly.attempts} বার চেষ্টা
      </div><div className="mt-7 grid gap-4 sm:grid-cols-2">{([20, 40] as const).map(value => <button key={value} onClick={() => setCount(value)} className={`rounded-3xl border p-6 text-left transition ${count === value ? "border-[var(--gold)] bg-[var(--gold)]/10 shadow-md" : "border-[var(--navy)]/10 bg-white"}`}><div className="flex items-center justify-between"><span className="font-serif text-3xl font-bold text-[var(--navy)]">{value}</span>{count === value && <span className="grid size-7 place-items-center rounded-full bg-[var(--navy)] text-white"><Check className="size-4" /></span>}</div><p className="mt-2 font-bold text-[var(--navy)]">{value === 20 ? "দ্রুত অনুশীলন" : "পূর্ণাঙ্গ পরীক্ষা"}</p><p className="mt-2 text-sm leading-6 text-[var(--navy)]/50">{value === 20 ? "২৫ মিনিট · ১২ reading + ৮ listening" : "৫০ মিনিট · ২৪ reading + ১৬ listening"}</p></button>)}</div><div className="mt-7 rounded-2xl bg-[var(--cream)] p-5"><h3 className="flex items-center gap-2 font-bold text-[var(--navy)]"><ShieldCheck className="size-5 text-[var(--sage-dark)]" />শুরু করার আগে</h3><div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--navy)]/58"><p>• Listening প্রশ্নে script দেখতে নয়—headphone বোতাম চাপুন এবং মনোযোগ দিয়ে শুনুন।</p><p>• উত্তর না জানা থাকলে question palette থেকে পরে ফিরে আসুন।</p><p>• জমা দেওয়ার পর সঠিক উত্তর ও বাংলা ব্যাখ্যা দেখানো হবে।</p></div></div><Button onClick={begin} className="mt-8 h-13 w-full rounded-full bg-[var(--navy)] text-base text-white">পরীক্ষা শুরু করুন <ChevronRight className="size-4" /></Button></div></div>
  </>;

  if (query.isLoading || !current) return <div className="container py-32 text-center"><Loader2 className="mx-auto size-8 animate-spin text-[var(--gold-dark)]" /><p className="mt-4 font-semibold text-[var(--navy)]/55">প্রশ্নপত্র তৈরি হচ্ছে…</p></div>;

  if (finished) return <div className="container py-12"><section className="mx-auto max-w-4xl paper-card overflow-hidden"><div className="bg-[var(--navy)] p-8 text-center text-white md:p-12"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--gold)] text-[var(--navy)]"><GraduationCap className="size-7" /></span><p className="mt-6 text-sm font-bold uppercase tracking-[.2em] text-[var(--gold)]">Mock test complete</p><h1 className="mt-3 font-serif text-5xl font-bold">{score}/{questions.length}</h1><p className="mt-3 text-xl text-white/65">{Math.round(score / questions.length * 100)}% · {score / questions.length >= .8 ? "অসাধারণ প্রস্তুতি!" : score / questions.length >= .6 ? "ভালো—আরও অনুশীলন করুন।" : "ভিত্তি শক্ত করতে পাঠগুলো পুনরালোচনা করুন।"}</p></div><div className="flex flex-wrap items-center justify-center gap-3 border-b border-[var(--navy)]/8 p-6"><Button onClick={reset} variant="outline" className="rounded-full"><RotateCcw className="size-4" />নতুন পরীক্ষা</Button><Link href="/dashboard"><Button className="rounded-full bg-[var(--navy)] text-white">অগ্রগতি দেখুন</Button></Link></div><div className="divide-y divide-[var(--navy)]/8">{questions.map((question, questionIndex) => { const selected = answers[question.testId]; const correct = selected === question.answer; return <article key={question.testId} className="p-6 md:p-8"><div className="flex gap-4"><span className={`grid size-9 shrink-0 place-items-center rounded-full ${correct ? "bg-emerald-600" : "bg-red-600"} text-white`}>{correct ? <Check className="size-4" /> : <X className="size-4" />}</span><div className="min-w-0 flex-1"><p className="text-xs font-bold text-[var(--gold-dark)]">অধ্যায় {question.chapter} · {question.section === "reading" ? "READING" : "LISTENING"}</p><p className="mt-2 font-bold leading-7 text-[var(--navy)]">{question.questionBn}</p><p className="mt-1 font-semibold text-[var(--navy)]">{question.questionKo}</p>
            {question.passage ? (
              <div className="mt-4 rounded-2xl bg-[var(--cream)] p-4 text-sm leading-7 text-[var(--navy)]/75">
                {question.section === "listening" ? <p className="mb-2 text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">শোনার script</p> : null}
                <p className="font-semibold text-[var(--navy)]">{question.passage}</p>
                {question.section === "listening" ? (
                  <button type="button" onClick={() => void speakKorean(question.passage, { rate: 0.82 })} className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-[var(--gold-dark)]">
                    <Volume2 className="size-4" />আবার শুনুন
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{question.options.map((option, optionIndex) => <div key={optionIndex} className={`rounded-xl border px-4 py-3 text-sm ${optionIndex === question.answer ? "border-emerald-300 bg-emerald-50 font-bold text-emerald-800" : optionIndex === selected ? "border-red-300 bg-red-50 text-red-800" : "border-[var(--navy)]/8 text-[var(--navy)]/55"}`}>{String.fromCharCode(65 + optionIndex)}. {option}</div>)}</div>
            <p className="mt-4 rounded-xl bg-[var(--cream)] p-4 text-sm leading-6 text-[var(--navy)]/65">{question.explanationBn}</p>
            {!correct ? <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-900"><strong>শেখার টিপ:</strong> {question.section === "listening" ? "আবার audio শুনে মূল শব্দ/স্থান/সময় ধরুন; vocabulary ট্যাবে অপরিচিত শব্দ রিভিউ করুন।" : "passage-এর সাথে বিকল্প মিলিয়ে দেখুন—অতিরিক্ত অনুমান এড়িয়ে চলুন।"}</p> : null}
          </div></div></article>; })}</div></section></div>;

  return <div className="container py-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--navy)] px-5 py-4 text-white"><div><p className="text-xs font-bold uppercase tracking-wider text-[var(--gold)]">EasyEPS Mock Test</p><p className="mt-1 text-sm text-white/55">প্রশ্ন {index + 1}/{questions.length} · উত্তর {Object.keys(answers).length}</p></div><div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 font-mono font-bold ${remaining < 300 ? "bg-red-600" : "bg-white/10"}`}><Clock3 className="size-4 text-[var(--gold)]" />{String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}</div></div><div className="grid gap-6 lg:grid-cols-[1fr_260px]"><section className="paper-card overflow-hidden"><div className="border-b border-[var(--navy)]/8 p-6 md:p-8"><div className="flex items-center justify-between gap-4"><span className="rounded-full bg-[var(--gold)]/14 px-3 py-1 text-xs font-bold text-[var(--gold-dark)]">{current.section === "reading" ? "읽기 · READING" : "듣기 · LISTENING"}</span><span className="text-xs font-semibold text-[var(--navy)]/40">অধ্যায় {current.chapter}</span></div><h1 className="mt-6 text-lg font-bold leading-8 text-[var(--navy)]">{current.questionBn}</h1><p className="mt-2 text-xl font-semibold leading-8 text-[var(--navy)]">{current.questionKo}</p>{current.section === "listening" ? (
                <div className="mt-6 space-y-2">
                  <button type="button" onClick={() => void speakKorean(current.passage, { rate: 0.82 })} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--navy)] p-5 font-bold text-white hover:bg-[var(--navy)]/90">
                    <span className="grid size-10 place-items-center rounded-full bg-[var(--gold)] text-[var(--navy)]"><Volume2 className="size-5" /></span>
                    Audio শুনতে চাপুন
                  </button>
                  <p className="text-center text-xs font-semibold text-[var(--navy)]/45">Listening script পরীক্ষা চলাকালীন লুকানো—জমা দেওয়ার পর দেখা যাবে।</p>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl bg-[var(--cream)] p-5 text-lg font-semibold leading-8 text-[var(--navy)]">{current.passage}</div>
              )}</div><div className="grid gap-3 p-6 md:p-8">{current.options.map((option, optionIndex) => <button key={optionIndex} onClick={() => setAnswers(previous => ({ ...previous, [current.testId]: optionIndex }))} className={`answer-option min-h-14 ${answers[current.testId] === optionIndex ? "answer-selected" : ""}`}><span>{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></button>)}</div><div className="flex items-center justify-between border-t border-[var(--navy)]/8 bg-[var(--cream)] p-5"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(value => value - 1)} className="rounded-full"><ChevronLeft className="size-4" />আগেরটি</Button>{index === questions.length - 1 ? <Button onClick={finish} className="rounded-full bg-[var(--gold-dark)] text-white">পরীক্ষা জমা দিন</Button> : <Button onClick={() => setIndex(value => value + 1)} className="rounded-full bg-[var(--navy)] text-white">পরেরটি<ChevronRight className="size-4" /></Button>}</div></section><aside className="paper-card h-fit p-5 lg:sticky lg:top-28"><div className="flex items-center gap-2"><Headphones className="size-5 text-[var(--gold-dark)]" /><h2 className="font-bold text-[var(--navy)]">Question palette</h2></div><div className="mt-5 grid grid-cols-5 gap-2">{questions.map((question, questionIndex) => <button key={question.testId} onClick={() => setIndex(questionIndex)} className={`grid aspect-square place-items-center rounded-lg text-xs font-bold ${index === questionIndex ? "ring-2 ring-[var(--gold)] ring-offset-2" : ""} ${typeof answers[question.testId] === "number" ? "bg-[var(--navy)] text-white" : "bg-[var(--cream)] text-[var(--navy)]/55"}`}>{questionIndex + 1}</button>)}</div><div className="mt-6 border-t border-[var(--navy)]/8 pt-5 text-xs leading-6 text-[var(--navy)]/50"><p><span className="mr-2 inline-block size-2 rounded-full bg-[var(--navy)]" />উত্তর দেওয়া হয়েছে</p><p><span className="mr-2 inline-block size-2 rounded-full bg-[var(--cream)] ring-1 ring-[var(--navy)]/10" />উত্তর বাকি</p></div><Button onClick={() => { if (confirm("পরীক্ষা জমা দিতে চান?")) finish(); }} variant="outline" className="mt-5 w-full rounded-full border-[var(--navy)]/18">এখনই জমা দিন</Button></aside></div></div>;
}
