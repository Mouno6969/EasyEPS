import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useLocalLearning, recordItemResult } from "@/lib/localProgress";
import { speakKorean } from "@/lib/speakKorean";
import { buildDailyVocabularySelection, masteryStage, masteryStageLabel, type ConfidenceLevel, type DailyVocabularyPracticeItem } from "@shared/learning";
import { trpc } from "@/lib/trpc";
import { BookMarked, Check, ChevronRight, CircleHelp, RotateCcw, Volume2, X } from "lucide-react";
import { useMemo, useState } from "react";

const confidenceOptions: Array<{ value: ConfidenceLevel; label: string; className: string }> = [
  { value: "sure", label: "জানি", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
  { value: "uncertain", label: "আংশিক জানি", className: "bg-[var(--gold)] text-[var(--navy)] hover:bg-[var(--gold)]/85" },
  { value: "unknown", label: "জানি না", className: "bg-red-700 text-white hover:bg-red-800" },
];

function promptFor(item: DailyVocabularyPracticeItem) {
  return item.practiceLayer === "extra" ? "আজকের নতুন exam-transfer শব্দ" : "আজকের review শব্দ";
}

export default function DailyVocabularyPage() {
  const { locale } = useLocale();
  const learning = useLocalLearning();
  const query = trpc.curriculum.dailyVocabulary.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [completed, setCompleted] = useState(false);

  const items = useMemo(
    () => buildDailyVocabularySelection(query.data ?? [], learning.itemEvidence, { limit: 10 }),
    [query.data, learning.itemEvidence],
  );
  const current = items[index];
  const currentEvidence = current ? learning.itemEvidence[current.itemId] : undefined;
  const completedCount = items.filter(item => (learning.itemEvidence[item.itemId]?.lastAttemptedAt ?? "").slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  const answer = (confidence: ConfidenceLevel) => {
    if (!current) return;
    const correct = confidence === "sure";
    recordItemResult({
      itemId: current.itemId,
      kind: "vocabulary",
      chapter: current.chapter,
      skillTags: [current.layer, current.practiceLayer],
      correct,
      confidence,
      responseMs: Math.max(0, Date.now() - startedAt),
      isRetentionCheck: current.practiceLayer === "recycled",
      isTransferCheck: current.layer === "exam-transfer",
      format: "recall",
      minutes: 1,
    });
    if (index >= items.length - 1) setCompleted(true);
    else {
      setIndex(value => value + 1);
      setRevealed(false);
      setStartedAt(Date.now());
    }
  };

  const reset = () => {
    setIndex(0);
    setRevealed(false);
    setCompleted(false);
    setStartedAt(Date.now());
  };

  if (query.isLoading) {
    return <div className="container py-20 text-center text-[var(--navy)]">লোড হচ্ছে…</div>;
  }
  if (query.isError) {
    return <div className="container py-20 text-center"><p className="text-red-700">শব্দের তালিকা লোড করা যায়নি।</p><Button className="mt-4" onClick={() => query.refetch()}>আবার চেষ্টা করুন</Button></div>;
  }
  if (!current || completed) {
    return (
      <>
        <section className="bg-[var(--navy)] text-white"><div className="sacred-grid-dark"><div className="container py-16"><p className="eyebrow text-[var(--gold)]">Daily transfer practice</p><h1 className="mt-4 max-w-3xl font-serif text-5xl font-bold md:text-6xl">আজকের শব্দ-চর্চা শেষ</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">নতুন শব্দ এবং আগের শেখা শব্দকে আলাদা context-এ ফিরিয়ে আনা হয়েছে। এই ছোট session প্রতিদিন শেষ করুন।</p></div></div></section>
        <div className="container py-12"><div className="mx-auto max-w-2xl paper-card p-8 text-center"><Check className="mx-auto size-12 text-emerald-600" /><h2 className="mt-4 font-serif text-3xl font-bold text-[var(--navy)]">১০টি item সম্পন্ন</h2><p className="mt-3 text-sm leading-7 text-[var(--navy)]/65">ভুল হওয়া শব্দগুলো পরের due review-এ আবার আসবে। confidence সৎভাবে দেওয়ায় আপনার পুনরাবৃত্তি আরও কার্যকর হবে।</p><Button className="mt-6 rounded-full bg-[var(--navy)] text-white hover:bg-[var(--navy)]/90" onClick={reset}><RotateCcw className="size-4" />আবার অনুশীলন</Button></div></div>
      </>
    );
  }

  const word = current.word;
  const meaning = locale === "ko" ? word.en : locale === "en" ? word.en : word.bn;
  const example = locale === "ko" ? word.example.ko : locale === "en" ? word.example.en : word.example.bn;
  const stage = masteryStage(currentEvidence);

  return (
    <>
      <section className="bg-[var(--navy)] text-white"><div className="sacred-grid-dark"><div className="container py-14"><div className="flex items-center gap-3 text-[var(--gold)]"><BookMarked className="size-6" /><p className="eyebrow">Daily transfer practice</p></div><h1 className="mt-4 max-w-3xl font-serif text-5xl font-bold md:text-6xl">দৈনিক অতিরিক্ত শব্দ</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">প্রতিদিন ১০টি শব্দ: নতুন workplace vocabulary, due review এবং recall confidence—একসাথে।</p></div></div></section>
      <div className="container py-10"><div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center justify-between text-sm font-bold text-[var(--navy)]"><span>{index + 1} / {items.length}</span><span>{completedCount} আজ record হয়েছে</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--navy)]/10"><div className="h-full rounded-full bg-[var(--gold)] transition-all" style={{ width: `${((index + 1) / items.length) * 100}%` }} /></div>
        <article className="paper-card mt-8 overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--navy)]/10 px-6 py-5"><div><p className="eyebrow">Chapter {current.chapter} · {promptFor(current)}</p><p className="mt-2 text-sm text-[var(--navy)]/55">Mastery: {masteryStageLabel(stage)}</p></div><Button variant="outline" size="icon" aria-label="Korean শব্দটি শুনুন" onClick={() => speakKorean(word.ko)}><Volume2 className="size-5" /></Button></div><div className="p-7 md:p-10"><p className="text-sm font-semibold text-[var(--navy)]/55">শব্দটি মনে করে অর্থ বলুন</p><div className="mt-4 flex flex-wrap items-end gap-4"><h2 className="font-serif text-5xl font-bold text-[var(--navy)]">{word.ko}</h2><span className="rounded-full bg-[var(--gold)]/15 px-3 py-1 text-sm font-bold text-[var(--navy)]">{word.pos}</span></div><p className="mt-3 text-lg text-[var(--navy)]/60">{word.romanization}</p><Button variant="outline" className="mt-6 rounded-full" onClick={() => setRevealed(value => !value)}>{revealed ? "উত্তর লুকান" : "উত্তর দেখুন"}<ChevronRight className="size-4" /></Button>{revealed && <div className="mt-6 rounded-2xl border border-emerald-700/20 bg-emerald-50 p-5"><p className="text-2xl font-bold text-[var(--navy)]">{meaning}</p><p className="mt-3 text-sm leading-7 text-[var(--navy)]/70">{example}</p><p className="mt-3 text-xs font-semibold text-[var(--navy)]/55">{word.example.ko}</p></div>}</div>
          <div className="border-t border-[var(--navy)]/10 bg-[var(--cream)]/60 p-6"><p className="mb-4 text-sm font-bold text-[var(--navy)]">আপনার confidence বেছে নিন</p><div className="grid gap-3 sm:grid-cols-3">{confidenceOptions.map(option => <Button key={option.value} className={`h-12 rounded-xl ${option.className}`} onClick={() => answer(option.value)}>{option.value === "sure" ? <Check className="size-4" /> : option.value === "unknown" ? <X className="size-4" /> : <CircleHelp className="size-4" />}{option.label}</Button>)}</div><p className="mt-4 text-xs leading-6 text-[var(--navy)]/55">“জানি না” বেছে নেওয়া ভুল নয়—এটি সিস্টেমকে item-টি দ্রুত review-এ ফেরাতে সাহায্য করে।</p></div>
        </article></div></div>
    </>
  );
}
