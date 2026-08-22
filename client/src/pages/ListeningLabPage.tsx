import { EpsQuestionImage } from "@/components/EpsQuestionImage";
import { GuidedListening } from "@/components/GuidedListening";
import { Button } from "@/components/ui/button";
import { recordItemResult, recordListeningEvidence, useLocalLearning } from "@/lib/localProgress";
import { learningItemId, normalizeLearningText, questionSkillTags } from "@shared/learning";
import { trpc } from "@/lib/trpc";
import { Check, Headphones, Loader2, RotateCcw, X } from "lucide-react";
import { useState } from "react";

export default function ListeningLabPage() {
  const learning = useLocalLearning();
  const query = trpc.curriculum.mockTest.useQuery({ count: 40, mode: "balanced", focusChapters: [], focusSection: "listening" }, { retry: false });
  const questions = (query.data ?? []).filter(question => question.section === "listening").slice(0, 10);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [dictation, setDictation] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  if (query.isLoading) return <div className="container py-32 text-center"><Loader2 className="mx-auto size-8 animate-spin text-[var(--gold-dark)]" /><p className="mt-4 font-semibold text-[var(--navy)]/55">Listening lab তৈরি হচ্ছে…</p></div>;
  if (!questions.length) return <div className="container py-32 text-center"><Headphones className="mx-auto size-10 text-[var(--gold-dark)]" /><p className="mt-4 font-semibold text-[var(--navy)]/55">এখন listening প্রশ্ন পাওয়া গেল না।</p></div>;

  const check = (question: (typeof questions)[number]) => {
    const itemId = learningItemId("listening", question.chapter, question.id);
    const typed = normalizeLearningText(dictation[question.testId]);
    const expected = normalizeLearningText(question.passage);
    const dictationCorrect = typed.length > 0 && typed === expected;
    const optionCorrect = answers[question.testId] === question.answer;
    const correct = optionCorrect && dictationCorrect;
    const previous = learning.itemEvidence[itemId];
    recordListeningEvidence({ itemId, plays: 0, slowPlays: 0, transcriptRevealed: false, typedAnswer: dictation[question.testId] });
    recordItemResult({
      itemId,
      kind: "listening",
      chapter: question.chapter,
      section: "listening",
      skillTags: [...questionSkillTags(question), "dictation"],
      correct,
      confidence: correct ? "sure" : "guessed",
      isRetentionCheck: Boolean(previous),
    });
    setChecked(previousState => ({ ...previousState, [question.testId]: true }));
  };

  return <div className="container py-8 md:py-12"><div className="mx-auto max-w-4xl"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Progressive listening</p><h1 className="mt-2 font-serif text-4xl font-bold text-[var(--navy)]">শুনুন, লিখুন, বুঝুন</h1><p className="mt-3 max-w-2xl leading-7 text-[var(--navy)]/60">প্রথমে মূল অর্থ ধরুন, তারপর ধীর গতিতে detail শুনুন, শেষে script না দেখে Korean passage লিখুন।</p></div><span className="inline-flex items-center gap-2 rounded-full bg-[var(--gold)]/15 px-4 py-2 text-sm font-bold text-[var(--navy)]"><Headphones className="size-4" />{questions.length}টি listening drill</span></div><div className="space-y-6">{questions.map((question, index) => { const isChecked = checked[question.testId]; const optionCorrect = answers[question.testId] === question.answer; const dictationCorrect = normalizeLearningText(dictation[question.testId]) === normalizeLearningText(question.passage); return <article key={question.testId} className="paper-card overflow-hidden"><div className="border-b border-[var(--navy)]/8 p-6 md:p-8"><div className="flex items-center justify-between gap-3"><span className="rounded-full bg-[var(--gold)]/15 px-3 py-1 text-xs font-bold text-[var(--gold-dark)]">DRILL {index + 1}</span><span className="text-xs font-bold text-[var(--navy)]/40">অধ্যায় {question.chapter}</span></div><p className="mt-5 font-bold leading-7 text-[var(--navy)]">{question.questionBn}</p><p className="mt-1 text-xl font-semibold leading-8 text-[var(--navy)]">{question.questionKo}</p>{question.image ? <div className="mt-5"><EpsQuestionImage image={question.image} compact /></div> : null}<div className="mt-5"><GuidedListening text={question.passage} label="প্রথমে শুনুন" revealTranscript onEvidenceChange={evidence => recordListeningEvidence({ itemId: learningItemId("listening", question.chapter, question.id), ...evidence })} /></div></div><div className="grid gap-2 p-6 md:grid-cols-2 md:p-8">{question.options.map((option, optionIndex) => <button key={optionIndex} type="button" onClick={() => setAnswers(previous => ({ ...previous, [question.testId]: optionIndex }))} className={`answer-option min-h-14 ${answers[question.testId] === optionIndex ? "answer-selected" : ""}`}><span>{String.fromCharCode(65 + optionIndex)}</span><span>{option}</span></button>)}</div><div className="border-t border-[var(--navy)]/8 bg-[var(--cream)] p-6"><label className="text-sm font-bold text-[var(--navy)]">শুনে একটি dictation লিখুন <textarea value={dictation[question.testId] ?? ""} onChange={event => setDictation(previous => ({ ...previous, [question.testId]: event.target.value }))} disabled={Boolean(isChecked)} rows={2} placeholder="উদাহরণ: 들은 Korean passage এখানে লিখুন" className="mt-2 w-full rounded-2xl border border-[var(--navy)]/12 bg-white p-3 text-sm leading-6 text-[var(--navy)] outline-none focus:border-[var(--gold-dark)]" /></label><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-[var(--navy)]/50">Script দেখার আগে নিজের শোনা Korean লিখে চেষ্টা করুন।</p><Button onClick={() => check(question)} disabled={Boolean(isChecked) || !answers[question.testId] && answers[question.testId] !== 0 || !dictation[question.testId]?.trim()} className="rounded-full bg-[var(--navy)] text-white">{isChecked ? "সংরক্ষিত" : "ফল যাচাই"}</Button></div>{isChecked ? <div className={`mt-4 rounded-2xl p-4 ${optionCorrect && dictationCorrect ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-900"}`}><p className="flex items-center gap-2 font-bold">{optionCorrect && dictationCorrect ? <Check className="size-4" /> : <X className="size-4" />}{optionCorrect && dictationCorrect ? "Listening ও dictation দুটোই সঠিক" : "আরও একবার শুনে ভুল অংশ ধরুন"}</p><p className="mt-2 text-sm leading-6"><strong>সঠিক script:</strong> {question.passage}</p></div> : null}</div></article>; })}</div><Button variant="outline" onClick={() => { setAnswers({}); setDictation({}); setChecked({}); }} className="mt-8 rounded-full"><RotateCcw className="size-4" />নতুন listening set</Button></div></div>;
}
