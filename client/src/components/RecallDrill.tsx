import { Button } from "@/components/ui/button";
import { recordItemResult } from "@/lib/localProgress";
import { learningItemId, normalizeLearningText } from "@shared/learning";
import { speakKorean } from "@/lib/speakKorean";
import { Check, ChevronLeft, ChevronRight, RotateCcw, Volume2, X } from "lucide-react";
import { useState } from "react";
import type { VocabularyItem } from "@shared/lesson";

export function RecallDrill({ words, chapter }: { words: VocabularyItem[]; chapter: number }) {
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [checked, setChecked] = useState(false);
  const word = words[index];
  const matches = normalizeLearningText(answer) === normalizeLearningText(word.ko);
  const check = () => {
    setChecked(true);
    setRevealed(true);
    recordItemResult({
      itemId: learningItemId("vocabulary", chapter, word.ko),
      kind: "vocabulary",
      chapter,
      skillTags: ["vocabulary", "free-recall", word.pos],
      correct: matches,
      confidence: matches ? "sure" : "guessed",
      isRetentionCheck: index > 0,
    });
  };
  const next = () => {
    setIndex(value => (value + 1) % words.length);
    setAnswer("");
    setRevealed(false);
    setChecked(false);
  };
  const previous = () => {
    setIndex(value => (value - 1 + words.length) % words.length);
    setAnswer("");
    setRevealed(false);
    setChecked(false);
  };

  return <section className="paper-card mt-6 overflow-hidden"><div className="border-b border-[var(--navy)]/8 bg-[var(--navy)] p-6 text-white"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--gold)]">Active recall</p><h2 className="mt-2 font-serif text-2xl font-bold">বাংলা দেখে Korean মনে করুন</h2></div><span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{index + 1}/{words.length}</span></div><p className="mt-3 text-sm leading-6 text-white/60">শুধু দেখে চেনা নয়—উত্তর না দেখে Korean শব্দটি লিখুন বা জোরে বলুন।</p></div><div className="p-6 md:p-8"><div className="rounded-3xl bg-[var(--cream)] p-7 text-center"><p className="text-xs font-bold uppercase tracking-wider text-[var(--gold-dark)]">বাংলা অর্থ</p><p className="mt-3 font-serif text-4xl font-bold text-[var(--navy)]">{word.bn}</p><p className="mt-2 text-sm text-[var(--navy)]/50">{word.en}</p><div className="mt-5 flex items-center justify-center gap-2"><button type="button" onClick={() => void speakKorean(word.ko)} aria-label="শব্দ শুনুন" className="grid size-10 place-items-center rounded-full bg-white text-[var(--gold-dark)]"><Volume2 className="size-4" /></button><span className="text-xs font-semibold text-[var(--navy)]/45">উচ্চারণ শুনুন</span></div></div><label className="mt-6 block text-sm font-bold text-[var(--navy)]">আপনার Korean উত্তর<InputLike value={answer} onChange={setAnswer} disabled={checked} /></label>{checked ? <div className={`mt-4 rounded-2xl p-4 ${matches ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-900"}`}><p className="flex items-center gap-2 font-bold">{matches ? <Check className="size-4" /> : <X className="size-4" />}{matches ? "সঠিক recall" : "আরও একবার চেষ্টা করুন"}</p><p className="mt-2 font-serif text-2xl font-bold">{word.ko}</p><p className="mt-1 text-sm leading-6">{word.example.ko}</p><p className="mt-1 text-xs">{word.example.bn}</p></div> : null}<div className="mt-6 flex items-center justify-between gap-3"><Button variant="outline" onClick={previous} className="rounded-full"><ChevronLeft className="size-4" />আগেরটি</Button>{!checked ? <Button onClick={check} disabled={!answer.trim()} className="rounded-full bg-[var(--navy)] text-white">উত্তর যাচাই <Check className="size-4" /></Button> : <Button onClick={next} className="rounded-full bg-[var(--navy)] text-white">পরেরটি <ChevronRight className="size-4" /></Button>}</div>{checked && !matches ? <button type="button" onClick={() => { setAnswer(""); setChecked(false); setRevealed(false); }} className="mx-auto mt-4 flex items-center gap-1 text-xs font-bold text-[var(--gold-dark)]"><RotateCcw className="size-3.5" />আবার না দেখে চেষ্টা করুন</button> : null}{revealed && !checked ? <p className="mt-4 text-center font-bold text-[var(--navy)]">{word.ko}</p> : null}</div></section>;
}

function InputLike({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <input value={value} onChange={event => onChange(event.target.value)} disabled={disabled} placeholder="যেমন: 지게차" className="mt-2 h-12 w-full rounded-2xl border border-[var(--navy)]/12 bg-white px-4 text-lg font-semibold text-[var(--navy)] outline-none focus:border-[var(--gold-dark)]" />;
}
