import { EpsQuestionImage } from "@/components/EpsQuestionImage";
import { GuidedListening } from "@/components/GuidedListening";
import { Button } from "@/components/ui/button";
import { addLocalAttempt, recordItemResult, saveDiagnosticResult } from "@/lib/localProgress";
import { diagnosticRecommendation, learningItemId, questionSkillTags, type ConfidenceLevel } from "@shared/learning";
import { trpc } from "@/lib/trpc";
import { Check, ChevronLeft, ChevronRight, Compass, Loader2, Target, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";

const confidenceOptions: Array<{ id: ConfidenceLevel; label: string; detail: string }> = [
  { id: "sure", label: "নিশ্চিত", detail: "উত্তরটি ভালোভাবে জানি" },
  { id: "uncertain", label: "অনিশ্চিত", detail: "কিছুটা অনুমান করেছি" },
  { id: "guessed", label: "অনুমান", detail: "শুধু আন্দাজ করেছি" },
];

function diagnosticDomain(question: { section: "reading" | "listening"; questionBn: string; questionKo: string; image?: unknown }) {
  const text = `${question.questionBn} ${question.questionKo}`;
  if (question.section === "listening") return "listening" as const;
  if (/নিরাপ|표지|안전|위험|금지|조심/.test(text) || question.image) return "safety" as const;
  if (/단어|শব্দ|맞는 단어|어휘/.test(text)) return "vocabulary" as const;
  return "reading" as const;
}

export default function DiagnosticPage() {
  const query = trpc.curriculum.diagnostic.useQuery(undefined, { retry: false });
  const questions = query.data ?? [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [confidence, setConfidence] = useState<Record<string, ConfidenceLevel>>({});
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof diagnosticRecommendation> & { score: number; total: number }>();

  const current = questions[index];
  const score = useMemo(() => questions.reduce((sum, question) => sum + (answers[question.testId] === question.answer ? 1 : 0), 0), [answers, questions]);

  const finish = () => {
    if (!questions.length) return;
    const domains = {
      reading: { score: 0, total: 0 },
      listening: { score: 0, total: 0 },
      vocabulary: { score: 0, total: 0 },
      safety: { score: 0, total: 0 },
    };
    for (const question of questions) {
      const domain = diagnosticDomain(question);
      domains[domain].total += 1;
      if (answers[question.testId] === question.answer) domains[domain].score += 1;
      const itemId = learningItemId(question.section === "listening" ? "listening" : "eps", question.chapter, question.id);
      recordItemResult({
        itemId,
        kind: question.section === "listening" ? "listening" : "eps",
        chapter: question.chapter,
        section: question.section,
        skillTags: questionSkillTags(question),
        correct: answers[question.testId] === question.answer,
        confidence: confidence[question.testId] ?? "guessed",
        isRetentionCheck: false,
      });
    }
    const recommendation = diagnosticRecommendation({
      score,
      total: questions.length,
      listeningScore: domains.listening.score,
      listeningTotal: domains.listening.total,
      readingScore: domains.reading.score + domains.vocabulary.score + domains.safety.score,
      readingTotal: domains.reading.total + domains.vocabulary.total + domains.safety.total,
    });
    saveDiagnosticResult({
      completedAt: new Date().toISOString(),
      score,
      total: questions.length,
      domains,
      recommendedChapter: recommendation.recommendedChapter,
      recommendedFocus: recommendation.recommendedFocus,
    });
    addLocalAttempt({ kind: "diagnostic", score, total: questions.length, durationSec: 0 });
    setResult({ ...recommendation, score, total: questions.length });
    setFinished(true);
  };

  if (query.isLoading || !current) return <div className="container py-32 text-center"><Loader2 className="mx-auto size-8 animate-spin text-[var(--gold-dark)]" /><p className="mt-4 font-semibold text-[var(--navy)]/55">আপনার diagnostic তৈরি হচ্ছে…</p></div>;

  if (finished && result) return <div className="container py-12"><section className="mx-auto max-w-3xl paper-card overflow-hidden"><div className="bg-[var(--navy)] p-8 text-center text-white md:p-12"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--gold)] text-[var(--navy)]"><Compass className="size-7" /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[var(--gold)]">Diagnostic complete</p><h1 className="mt-3 font-serif text-5xl font-bold">{result.score}/{result.total}</h1><p className="mt-3 text-lg text-white/65">আপনার জন্য অধ্যায় {result.recommendedChapter} থেকে শুরু করা ভালো।</p></div><div className="space-y-5 p-7 md:p-10"><div className="rounded-2xl border border-[var(--gold)]/30 bg-[var(--gold)]/10 p-5"><p className="text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">ব্যক্তিগত focus</p><p className="mt-2 font-serif text-2xl font-bold text-[var(--navy)]">{result.recommendedFocus === "listening" ? "Listening শক্ত করুন" : result.recommendedFocus === "foundation" ? "ভিত্তি মজবুত করুন" : result.recommendedFocus === "reading" ? "Reading গভীর করুন" : "Balanced practice চালিয়ে যান"}</p><p className="mt-2 text-sm leading-6 text-[var(--navy)]/60">এই recommendation আপনার diagnostic accuracy এবং reading/listening gap থেকে তৈরি হয়েছে।</p></div><div className="grid gap-3 sm:grid-cols-2"><Link href={`/lesson/${result.recommendedChapter}`}><Button className="h-12 w-full rounded-full bg-[var(--navy)] text-white"><Target className="size-4" />প্রস্তাবিত পাঠ শুরু করুন</Button></Link><Link href="/dashboard"><Button variant="outline" className="h-12 w-full rounded-full">Dashboard দেখুন</Button></Link></div></div></section></div>;

  const chosen = answers[current.testId];
  const selectedConfidence = confidence[current.testId];
  return <div className="container py-8 md:py-12"><div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center justify-between gap-4"><div><p className="eyebrow">Placement diagnostic</p><h1 className="mt-2 font-serif text-3xl font-bold text-[var(--navy)]">আপনার শেখার শুরুটা ঠিক করি</h1></div><span className="rounded-full bg-[var(--navy)] px-4 py-2 text-sm font-bold text-white">{index + 1}/{questions.length}</span></div><div className="mb-6 h-2 overflow-hidden rounded-full bg-[var(--navy)]/8"><div className="h-full rounded-full bg-[var(--gold)] transition-all" style={{ width: `${((index + 1) / questions.length) * 100}%` }} /></div><section className="paper-card overflow-hidden"><div className="border-b border-[var(--navy)]/8 p-6 md:p-8"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold text-[var(--gold-dark)]">{current.section === "listening" ? "LISTENING" : "READING"}</span><span className="text-xs font-bold text-[var(--navy)]/40">অধ্যায় {current.chapter}</span></div><p className="mt-6 text-lg font-bold leading-8 text-[var(--navy)]">{current.questionBn}</p><p className="mt-2 text-xl font-semibold leading-8 text-[var(--navy)]">{current.questionKo}</p>{current.image ? <div className="mt-5"><EpsQuestionImage image={current.image} /></div> : null}{current.section === "listening" && current.passage ? <div className="mt-5"><GuidedListening text={current.passage} label="শুনে উত্তর দিন" /><p className="mt-2 text-center text-xs text-[var(--navy)]/45">Script এখন লুকানো থাকবে।</p></div> : current.passage ? <div className="mt-5 rounded-2xl bg-[var(--cream)] p-4 font-semibold leading-7 text-[var(--navy)]">{current.passage}</div> : null}</div><div className="grid gap-3 p-6 md:p-8">{current.options.map((option, optionIndex) => <button key={optionIndex} type="button" onClick={() => setAnswers(previous => ({ ...previous, [current.testId]: optionIndex }))} className={`answer-option min-h-14 ${chosen === optionIndex ? "answer-selected" : ""}`}><span>{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span>{chosen === optionIndex ? <Check className="ml-auto size-4" /> : null}</button>)}</div><div className="border-t border-[var(--navy)]/8 bg-[var(--cream)] p-6"><p className="text-sm font-bold text-[var(--navy)]">আপনার confidence কতটা?</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{confidenceOptions.map(option => <button key={option.id} type="button" onClick={() => setConfidence(previous => ({ ...previous, [current.testId]: option.id }))} className={`rounded-2xl border p-3 text-left ${selectedConfidence === option.id ? "border-[var(--gold)] bg-[var(--gold)]/15" : "border-[var(--navy)]/10 bg-white"}`}><span className="block text-sm font-bold text-[var(--navy)]">{option.label}</span><span className="mt-1 block text-xs text-[var(--navy)]/50">{option.detail}</span></button>)}</div></div><div className="flex items-center justify-between gap-3 border-t border-[var(--navy)]/8 p-5"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(value => value - 1)} className="rounded-full"><ChevronLeft className="size-4" />আগেরটি</Button>{index === questions.length - 1 ? <Button onClick={finish} disabled={typeof chosen !== "number"} className="rounded-full bg-[var(--navy)] text-white">ফলাফল দেখুন <Target className="size-4" /></Button> : <Button onClick={() => setIndex(value => value + 1)} disabled={typeof chosen !== "number"} className="rounded-full bg-[var(--navy)] text-white">পরেরটি <ChevronRight className="size-4" /></Button>}</div></section></div></div>;
}
