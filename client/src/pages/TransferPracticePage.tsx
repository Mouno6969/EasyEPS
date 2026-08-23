import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import { useLocalLearning, recordItemResult } from "@/lib/localProgress";
import { speakKorean } from "@/lib/speakKorean";
import { trpc } from "@/lib/trpc";
import { Check, ChevronRight, CircleHelp, Headphones, Image, Keyboard, Lightbulb, Loader2, MessageCircle, RotateCcw, Send, Sparkles, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { normalizeLearningText } from "@shared/learning";
import { selectTransferItems, scoreTransferItem, transferFormatLabel, type TransferItem, type TransferResponse } from "@shared/transfer";

const today = () => new Date().toISOString().slice(0, 10);

function localText(value: { ko: string; bn: string; en: string }, locale: "bn" | "ko" | "en") {
  return value[locale];
}

function expectedLabel(item: TransferItem, locale: "bn" | "ko" | "en") {
  if (item.format === "short-typed") return item.acceptedAnswers[0] ?? item.sourceWordKo;
  return localText(item.options.find(option => option.id === item.answerOptionId)?.label ?? { ko: item.sourceWordKo, bn: item.sourceWordKo, en: item.sourceWordKo }, locale);
}

function formatIcon(format: TransferItem["format"]) {
  if (format === "picture-to-word") return Image;
  if (format === "short-typed") return Keyboard;
  if (format === "listening-to-meaning") return Headphones;
  if (format === "polite-response") return MessageCircle;
  return Sparkles;
}

export default function TransferPracticePage() {
  const { locale } = useLocale();
  const learning = useLocalLearning();
  const query = trpc.curriculum.transferPractice.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const [session, setSession] = useState<TransferItem[]>([]);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<TransferResponse>({});
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof scoreTransferItem> | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const sessionDate = useMemo(today, []);

  useEffect(() => {
    if (query.data?.length && !session.length) {
      setSession(selectTransferItems(query.data, learning.itemEvidence, { limit: 12, date: sessionDate }));
    }
  }, [query.data, session.length, sessionDate, learning.itemEvidence]);

  const current = session[index];
  const progress = session.length ? Math.round(((index + (submitted ? 1 : 0)) / session.length) * 100) : 0;
  const chosen = response.optionId ?? response.text ?? "";

  const resetItem = () => {
    setResponse({});
    setSubmitted(false);
    setResult(null);
    setStartedAt(Date.now());
  };

  const submit = (nextResponse: TransferResponse) => {
    if (!current || submitted) return;
    const scored = scoreTransferItem(current, nextResponse);
    const confidence = nextResponse.skipped ? "unknown" : scored.correct ? "sure" : "uncertain";
    recordItemResult({
      itemId: current.id,
      kind: "vocabulary",
      chapter: current.chapter,
      skillTags: current.skillTags,
      correct: scored.correct,
      confidence,
      responseMs: Math.max(0, Date.now() - startedAt),
      isTransferCheck: true,
      format: current.format,
      minutes: 1,
    });
    setResponse(nextResponse);
    setResult(scored);
    setSubmitted(true);
  };

  const submitTyped = () => {
    if (normalizeLearningText(response.text).length > 0) submit({ text: response.text?.trim() });
  };

  if (query.isLoading) {
    return <div className="container flex min-h-[50vh] items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-[var(--gold-dark)]" aria-label="লোড হচ্ছে" /></div>;
  }
  if (query.isError) {
    return <div className="container py-24 text-center"><p className="text-red-700">Transfer practice লোড করা যায়নি।</p><Button className="mt-4 rounded-full" onClick={() => query.refetch()}>আবার চেষ্টা করুন</Button></div>;
  }
  if (!session.length) {
    return <div className="container py-24 text-center"><p className="text-[var(--navy)]/65">আজকের জন্য transfer item পাওয়া যায়নি।</p><Button className="mt-4 rounded-full" onClick={() => query.refetch()}>আবার চেষ্টা করুন</Button></div>;
  }
  if (!current) {
    const transferItems = Object.values(learning.itemEvidence).filter(item => item.transferChecks > 0);
    const transferCorrect = transferItems.reduce((sum, item) => sum + item.transferCorrect, 0);
    const transferChecks = transferItems.reduce((sum, item) => sum + item.transferChecks, 0);
    return <><section className="bg-[var(--navy)] text-white"><div className="sacred-grid-dark"><div className="container py-16"><p className="eyebrow text-[var(--gold)]">Context transfer lab</p><h1 className="mt-4 max-w-3xl font-serif text-5xl font-bold md:text-6xl">নতুন context-এও ব্যবহার করতে পারছেন</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">আজকের transfer session শেষ হয়েছে। এই ফলটি শুধু মুখস্থ নয়—অপরিচিত পরিস্থিতিতে Korean ব্যবহার করার প্রমাণ।</p></div></div></section><div className="container py-12"><div className="paper-card mx-auto max-w-2xl p-8 text-center"><Check className="mx-auto size-12 text-emerald-600" /><h2 className="mt-4 font-serif text-3xl font-bold text-[var(--navy)]">Session সম্পন্ন</h2><p className="mt-3 text-[var(--navy)]/60">মোট transfer evidence: {transferChecks} · সঠিক: {transferCorrect}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button className="rounded-full bg-[var(--navy)] text-white" onClick={() => { setIndex(0); resetItem(); }}>আবার চেষ্টা করুন</Button><Link href="/dashboard"><Button variant="outline" className="rounded-full">অগ্রগতি দেখুন</Button></Link></div></div></div></>;
  }

  const Icon = formatIcon(current.format);
  const contextText = current.context ? localText(current.context, locale) : "";
  const promptText = localText(current.prompt, locale);
  const isTyped = current.format === "short-typed";
  const isListening = current.format === "listening-to-meaning";

  return <>
    <section className="bg-[var(--navy)] text-white"><div className="sacred-grid-dark"><div className="container py-14"><div className="flex items-center gap-3 text-[var(--gold)]"><Sparkles className="size-6" /><p className="eyebrow">Context transfer lab</p></div><h1 className="mt-4 max-w-3xl font-serif text-5xl font-bold md:text-6xl">অপরিচিত context-এ ব্যবহার</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-white/65">একই শব্দকে ছবি, পরিস্থিতি, listening, cloze এবং ভদ্র workplace response-এ ব্যবহার করুন—যাতে recognition বাস্তব transfer-এ বদলে যায়।</p></div></div></section>
    <main className="container py-10"><div className="mx-auto max-w-3xl"><div className="mb-6 flex items-center justify-between text-sm font-bold text-[var(--navy)]"><span>Item {index + 1} / {session.length}</span><span>{progress}% complete</span></div><div className="h-2 overflow-hidden rounded-full bg-[var(--navy)]/10" role="progressbar" aria-label="Transfer session progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><div className="h-full rounded-full bg-[var(--gold)] transition-all" style={{ width: `${progress}%` }} /></div>
      <article className="paper-card mt-8 overflow-hidden" aria-labelledby="transfer-title"><header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--navy)]/10 px-6 py-5"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[var(--gold-dark)]"><Icon className="size-4" />{transferFormatLabel(current.format)}</div><p className="mt-2 text-sm text-[var(--navy)]/55">Chapter {current.chapter} · transfer evidence</p></div>{isListening && <Button variant="outline" size="icon" aria-label="Korean sentence শুনুন" onClick={() => void speakKorean(current.audioText ?? current.sourceWordKo)}><Volume2 className="size-5" /></Button>}</header>
        <div className="p-6 md:p-9"><h2 id="transfer-title" className="font-serif text-2xl font-bold leading-tight text-[var(--navy)]">{promptText}</h2>{current.image && <figure className="mt-6 overflow-hidden rounded-2xl border border-[var(--navy)]/10 bg-[var(--cream)]"><img src={current.image.src} alt={locale === "ko" ? current.image.altKo || current.image.altBn : current.image.altBn} className="max-h-72 w-full object-contain" /><figcaption className="p-3 text-sm text-[var(--navy)]/60">{current.image.captionBn || current.image.altBn}</figcaption></figure>}{contextText && <div className="mt-6 rounded-2xl bg-[var(--cream)] p-5"><p className="text-lg font-semibold leading-8 text-[var(--navy)]">{contextText}</p>{isListening && <p className="mt-2 text-sm text-[var(--navy)]/55">প্রথমে audio শুনুন; script না দেখে অর্থ বেছে নিন।</p>}</div>}
          {isTyped ? <div className="mt-7"><label htmlFor="transfer-answer" className="text-sm font-bold text-[var(--navy)]">Korean উত্তর লিখুন</label><input id="transfer-answer" value={response.text ?? ""} onChange={event => setResponse({ text: event.target.value })} onKeyDown={event => { if (event.key === "Enter") submitTyped(); }} disabled={submitted} autoComplete="off" className="mt-3 h-12 w-full rounded-xl border border-[var(--navy)]/15 bg-white px-4 text-lg font-semibold text-[var(--navy)] outline-none transition focus:border-[var(--gold)] focus:ring-2 focus:ring-[var(--gold)]/25 disabled:bg-[var(--cream)]" placeholder="예: 기계실" /><Button className="mt-4 rounded-full bg-[var(--navy)] text-white" disabled={submitted || normalizeLearningText(response.text).length === 0} onClick={submitTyped}><Send className="size-4" />উত্তর জমা দিন</Button></div> : <div className="mt-7 grid gap-3">{current.options.map(option => { const label = localText(option.label, locale); const active = response.optionId === option.id; return <button type="button" key={option.id} disabled={submitted} aria-pressed={active} onClick={() => setResponse({ optionId: option.id })} className={`rounded-2xl border p-4 text-left text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-[var(--gold)] ${active ? "border-[var(--gold-dark)] bg-[var(--gold)]/18 text-[var(--navy)]" : "border-[var(--navy)]/10 bg-white text-[var(--navy)] hover:border-[var(--gold)]/60"}`}>{label}</button>; })}<Button className="mt-2 rounded-full bg-[var(--navy)] text-white" disabled={submitted || !response.optionId} onClick={() => submit(response)}><Send className="size-4" />উত্তর জমা দিন</Button></div>}
          {!submitted && <Button variant="outline" className="mt-4 rounded-full border-red-700/25 text-red-700 hover:bg-red-50" onClick={() => submit({ skipped: true })}><CircleHelp className="size-4" />জানি না — উত্তর দেখান</Button>}
          {submitted && result && <div className={`mt-7 rounded-2xl border p-5 ${result.correct ? "border-emerald-700/25 bg-emerald-50" : "border-amber-700/25 bg-amber-50"}`} role="status" aria-live="polite"><div className="flex items-center gap-2 font-bold text-[var(--navy)]">{result.correct ? <Check className="size-5 text-emerald-700" /> : <X className="size-5 text-amber-700" />}{result.correct ? "সঠিক transfer" : response.skipped ? "এই item-টি review-তে ফিরবে" : "এখনও পুরোপুরি ঠিক হয়নি"}</div><p className="mt-3 text-sm leading-7 text-[var(--navy)]/75">{localText(current.explanation, locale)}</p>{!result.correct && <p className="mt-3 text-sm font-bold text-[var(--navy)]">সঠিক উত্তর: {expectedLabel(current, locale)}</p>}<p className="mt-3 rounded-xl bg-white/70 p-3 text-sm leading-6 text-[var(--navy)]/65"><strong>পরের ধাপ:</strong> {current.hintBn}</p><Button className="mt-5 rounded-full bg-[var(--navy)] text-white" onClick={() => { setIndex(value => value + 1); resetItem(); }}>{index === session.length - 1 ? "ফলাফল দেখুন" : "পরের transfer item"}<ChevronRight className="size-4" /></Button></div>}
        </div>
      </article><div className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 p-4 text-sm leading-6 text-[var(--navy)]/65"><Lightbulb className="mt-0.5 size-5 shrink-0 text-[var(--gold-dark)]" /><p><strong>Transfer rule:</strong> শব্দটি আলাদা করে চিনলেই mastery হয় না। নতুন পরিস্থিতিতে সঠিক অর্থ, বাক্য বা ভদ্র response বেছে নিতে পারলে evidence তৈরি হয়।</p></div></div></main>
  </>;
}
