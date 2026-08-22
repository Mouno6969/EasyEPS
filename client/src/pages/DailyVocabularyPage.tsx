import { Button } from "@/components/ui/button";
import { PageIntro } from "@/components/PageIntro";
import { recordItemResult, useLocalLearning } from "@/lib/localProgress";
import { speakKorean } from "@/lib/speakKorean";
import { trpc } from "@/lib/trpc";
import { buildDailyVocabularySelection, normalizeLearningText, type ConfidenceLevel, type DailyVocabularyPracticeItem } from "@shared/learning";
import { ChevronLeft, ChevronRight, Check, Loader2, RotateCcw, Volume2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

export default function DailyVocabularyPage() {
  const { data: pool = [], isLoading, error } = trpc.curriculum.dailyVocabulary.useQuery();
  const state = useLocalLearning();
  const [dateKey] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionItems, setSessionItems] = useState<DailyVocabularyPracticeItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [confidence, setConfidence] = useState<ConfidenceLevel>("uncertain");
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);

  const candidates = useMemo(() => pool.map(item => ({ ...item, layer: item.layer as "core" | "exam-transfer" })), [pool]);
  const items = sessionItems;
  const current = items[index];
  const score = Object.values(results).filter(Boolean).length;

  useEffect(() => {
    if (!sessionItems.length && candidates.length) {
      setSessionItems(buildDailyVocabularySelection(candidates, state.itemEvidence, { limit: 8, date: dateKey }));
    }
  }, [candidates, dateKey, sessionItems.length, state.itemEvidence]);

  const resetCurrent = () => {
    setAnswer("");
    setConfidence("uncertain");
    setChecked(false);
  };

  const checkAnswer = () => {
    if (!current || !answer.trim()) return;
    const correct = normalizeLearningText(answer) === normalizeLearningText(current.word.ko);
    if (!results[current.itemId]) {
      recordItemResult({
        itemId: current.itemId,
        kind: "vocabulary",
        chapter: current.chapter,
        skillTags: [current.practiceLayer === "extra" ? "exam-transfer" : "recycling", current.word.pos],
        correct,
        confidence,
        isRetentionCheck: Boolean(state.itemEvidence[current.itemId]),
        minutes: 1,
      });
      setResults(previous => ({ ...previous, [current.itemId]: correct }));
    }
    setChecked(true);
  };

  const next = () => {
    if (!current) return;
    if (index >= items.length - 1) {
      setFinished(true);
      return;
    }
    setIndex(value => value + 1);
    resetCurrent();
  };

  const restart = () => {
    setSessionItems(buildDailyVocabularySelection(candidates, state.itemEvidence, { limit: 8, date: dateKey }));
    setIndex(0);
    setResults({});
    setFinished(false);
    resetCurrent();
  };

  if (isLoading) return <div className="container flex min-h-[50vh] items-center justify-center"><Loader2 className="size-8 animate-spin text-[var(--gold-dark)]" /></div>;
  if (error) return <div className="container py-20"><div className="paper-card p-8 text-center text-red-700">দৈনিক vocabulary লোড করা যায়নি: {error.message}</div></div>;
  if (!current || finished) return <>
    <PageIntro eyebrow="Daily extra vocabulary" title="আজকের শব্দ সেশন শেষ" description="নতুন exam-transfer term এবং পুরোনো শব্দের active recall একসাথে অনুশীলন করুন।" actions={<Button onClick={restart} className="rounded-full bg-[var(--navy)] text-white"><RotateCcw className="size-4" />আবার শুরু</Button>} />
    <div className="container py-12"><section className="mx-auto max-w-2xl paper-card p-8 text-center md:p-12"><span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--gold)]/18 text-[var(--gold-dark)]"><Sparkles className="size-7" /></span><p className="mt-6 eyebrow">আজকের ফলাফল</p><h2 className="mt-3 font-serif text-4xl font-bold text-[var(--navy)]">{score}/{items.length} সঠিক</h2><p className="mt-3 leading-7 text-[var(--navy)]/60">প্রথমে বাংলা দেখে Korean মনে করুন। ভুল হলে সঠিক শব্দ, উদাহরণ ও উচ্চারণ আবার বলুন।</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Button onClick={restart} variant="outline" className="rounded-full"><RotateCcw className="size-4" />নতুন daily set</Button><Link href="/dashboard"><Button className="rounded-full bg-[var(--navy)] text-white">অগ্রগতি দেখুন</Button></Link></div></section></div>
  </>;

  const correct = results[current.itemId];
  const hasResult = Object.prototype.hasOwnProperty.call(results, current.itemId);
  return <>
    <PageIntro eyebrow="Daily extra vocabulary" title="আজকের শব্দ অনুশীলন" description="প্রতিদিনের ছোট সেশনে নতুন exam-transfer শব্দ শিখুন এবং পুরোনো শব্দ না দেখে recall করুন।" actions={<Link href="/dashboard"><Button variant="outline" className="rounded-full">অগ্রগতি</Button></Link>} />
    <div className="container py-10"><div className="mx-auto max-w-3xl"><div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--gold-dark)]">{current.practiceLayer === "extra" ? "নতুন exam-transfer term" : "Recycled core term"}</p><p className="mt-2 text-sm font-semibold text-[var(--navy)]/55">অধ্যায় {current.chapter} · {index + 1}/{items.length}</p></div><span className="rounded-full bg-[var(--gold)]/15 px-3 py-1.5 text-xs font-bold text-[var(--gold-dark)]">{score} সঠিক</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--navy)]/8"><div className="h-full rounded-full bg-[var(--sage)] transition-all" style={{ width: `${(index + 1) / items.length * 100}%` }} /></div><section className="paper-card mt-6 overflow-hidden"><div className="border-b border-[var(--navy)]/8 p-7 md:p-10"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold text-[var(--gold-dark)]">বাংলা অর্থ</p><h2 className="mt-3 font-serif text-4xl font-bold text-[var(--navy)]">{current.word.bn}</h2><p className="mt-2 text-lg text-[var(--navy)]/52">{current.word.en} · {current.word.pos}</p></div><button type="button" onClick={() => void speakKorean(`${current.word.ko}. ${current.word.example.ko}`)} aria-label="শব্দ শুনুন" className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--gold)]/18 text-[var(--gold-dark)]"><Volume2 className="size-5" /></button></div><div className="mt-7 rounded-2xl bg-[var(--cream)] p-5"><p className="text-xs font-bold uppercase tracking-wider text-[var(--navy)]/42">Context</p><p className="mt-2 text-xl font-bold text-[var(--navy)]">{current.word.example.ko}</p><p className="mt-2 leading-7 text-[var(--navy)]/62">{current.word.example.bn}</p></div><p className="mt-4 text-sm leading-6 text-[var(--navy)]/50">শুধু অর্থ দেখে Korean শব্দটি লিখুন বা জোরে বলুন।</p><input value={answer} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if (event.key === "Enter") checkAnswer(); }} disabled={checked} placeholder="যেমন: 지게차" className="mt-5 h-14 w-full rounded-2xl border border-[var(--navy)]/12 bg-white px-5 text-lg font-semibold text-[var(--navy)] outline-none ring-[var(--gold)] focus:ring-2" /></div><div className="border-b border-[var(--navy)]/8 bg-[var(--cream)]/55 p-6"><p className="text-sm font-bold text-[var(--navy)]">এই recall-এর confidence</p><div className="mt-3 flex flex-wrap gap-2">{([['sure', 'নিশ্চিত'], ['uncertain', 'অনিশ্চিত'], ['guessed', 'অনুমান']] as Array<[ConfidenceLevel, string]>).map(([value, label]) => <button key={value} type="button" disabled={checked} onClick={() => setConfidence(value)} className={`rounded-full border px-4 py-2 text-xs font-bold ${confidence === value ? "border-[var(--gold-dark)] bg-[var(--gold)]/25 text-[var(--navy)]" : "border-[var(--navy)]/12 bg-white text-[var(--navy)]/55"}`}>{label}</button>)}</div></div>{checked && <div className={`p-6 ${correct ? "bg-emerald-50" : "bg-red-50"}`}><p className={`font-bold ${correct ? "text-emerald-800" : "text-red-800"}`}>{correct ? "সঠিক recall" : `সঠিক উত্তর: ${current.word.ko}`}</p><p className="mt-2 text-sm leading-6 text-[var(--navy)]/65">{current.word.example.ko} — {current.word.example.bn}</p>{current.word.pronunciationTipBn ? <p className="mt-2 text-sm font-semibold text-[var(--gold-dark)]">উচ্চারণ: {current.word.pronunciationTipBn}</p> : null}</div>}<div className="flex items-center justify-between gap-3 border-t border-[var(--navy)]/8 bg-white p-6"><Button variant="outline" disabled={index === 0} onClick={() => { setIndex(value => value - 1); resetCurrent(); }} className="rounded-full"><ChevronLeft className="size-4" />আগেরটি</Button>{checked ? <Button onClick={next} className="rounded-full bg-[var(--navy)] text-white">{index === items.length - 1 ? "ফলাফল দেখুন" : "পরেরটি"}<ChevronRight className="size-4" /></Button> : <Button onClick={checkAnswer} disabled={!answer.trim()} className="rounded-full bg-[var(--navy)] text-white"><Check className="size-4" />উত্তর যাচাই</Button>}</div></section></div></div>
  </>;
}
