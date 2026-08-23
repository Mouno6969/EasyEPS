import { KOREAN_SPEECH_RATES, type KoreanSpeechRate } from "@/lib/speakKorean";
import { speakDialogue } from "@/lib/dialogueSpeech";
import { recordListeningEvidence } from "@/lib/localProgress";
import { normalizeLearningText } from "@shared/learning";
import { Gauge, Headphones, RotateCcw, ScrollText, Check, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type GuidedListeningProps = {
  text: string;
  /** Stable item ID so replay and dictation evidence aggregate with the question. */
  itemId?: string;
  /** Set after grading when the learner answered the item correctly. */
  firstPlayCorrect?: boolean;
  compact?: boolean;
  className?: string;
  label?: string;
};

function dictationKey(value: string) {
  return normalizeLearningText(value).replace(/[.,!?…。！？၊:：;；()（）\[\]「」"“”']/g, "");
}

export function GuidedListening({
  text,
  itemId,
  firstPlayCorrect,
  compact = false,
  className = "",
  label = "Audio শুনতে চাপুন",
}: GuidedListeningProps) {
  const evidenceId = itemId ?? `listening:${text}`;
  const [rate, setRate] = useState<KoreanSpeechRate>(KOREAN_SPEECH_RATES.normal);
  const [plays, setPlays] = useState(0);
  const [normalPlays, setNormalPlays] = useState(0);
  const [slowPlays, setSlowPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [transcriptRevealed, setTranscriptRevealed] = useState(false);
  const [transcriptDependentCount, setTranscriptDependentCount] = useState(0);
  const [dictation, setDictation] = useState("");
  const [dictationAttempts, setDictationAttempts] = useState(0);
  const [dictationCorrect, setDictationCorrect] = useState(0);
  const [dictationSubmitted, setDictationSubmitted] = useState(false);
  const playbackRequest = useRef(0);

  const persist = (patch: Partial<{
    plays: number;
    normalPlays: number;
    slowPlays: number;
    transcriptRevealed: boolean;
    transcriptDependentCount: number;
    dictationAttempts: number;
    dictationCorrect: number;
    firstPlayCorrect: boolean;
  }> = {}) => {
    recordListeningEvidence({
      itemId: evidenceId,
      plays: patch.plays ?? plays,
      normalPlays: patch.normalPlays ?? normalPlays,
      slowPlays: patch.slowPlays ?? slowPlays,
      transcriptRevealed: patch.transcriptRevealed ?? transcriptRevealed,
      transcriptDependentCount: patch.transcriptDependentCount ?? transcriptDependentCount,
      dictationAttempts: patch.dictationAttempts ?? dictationAttempts,
      dictationCorrect: patch.dictationCorrect ?? dictationCorrect,
      firstPlayCorrect: patch.firstPlayCorrect ?? firstPlayCorrect,
    });
  };

  useEffect(() => {
    if (typeof firstPlayCorrect === "boolean") persist({ firstPlayCorrect });
    // firstPlayCorrect is deliberately the only dependency: replay state changes are handled by click handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstPlayCorrect]);

  const play = () => {
    const request = ++playbackRequest.current;
    const nextPlays = plays + 1;
    const nextNormalPlays = normalPlays + (rate === KOREAN_SPEECH_RATES.normal ? 1 : 0);
    const nextSlowPlays = slowPlays + (rate === KOREAN_SPEECH_RATES.slow ? 1 : 0);
    setPlays(nextPlays);
    setNormalPlays(nextNormalPlays);
    setSlowPlays(nextSlowPlays);
    setPlaying(true);
    persist({ plays: nextPlays, normalPlays: nextNormalPlays, slowPlays: nextSlowPlays });
    // Dialogue-aware: two-speaker passages play with distinct voices per speaker.
    void speakDialogue(text, { rate }).finally(() => {
      if (playbackRequest.current === request) setPlaying(false);
    });
  };

  const toggleTranscript = () => {
    const next = !transcriptRevealed;
    const nextDependentCount = next && plays > 0 ? transcriptDependentCount + 1 : transcriptDependentCount;
    setTranscriptRevealed(next);
    setTranscriptDependentCount(nextDependentCount);
    persist({ transcriptRevealed: next, transcriptDependentCount: nextDependentCount });
  };

  const submitDictation = () => {
    if (!dictation.trim()) return;
    const nextAttempts = dictationAttempts + 1;
    const isCorrect = dictationKey(dictation) === dictationKey(text);
    const nextCorrect = dictationCorrect + (isCorrect ? 1 : 0);
    setDictationAttempts(nextAttempts);
    setDictationCorrect(nextCorrect);
    setDictationSubmitted(true);
    persist({ dictationAttempts: nextAttempts, dictationCorrect: nextCorrect });
  };

  const guidance =
    plays === 0
      ? "প্রথমবার শুধু মূল অর্থ ধরুন।"
      : plays === 1
        ? "এবার ব্যক্তি, স্থান, সংখ্যা বা সময়ের শব্দ ধরুন।"
        : rate === KOREAN_SPEECH_RATES.normal
          ? "কঠিন হলে ধীর গতি বেছে নিয়ে আরেকবার শুনুন।"
          : "ধীরে শোনার পর সাধারণ গতিতে মিলিয়ে নিন।";

  return (
    <div className={`${compact ? "space-y-2" : "space-y-3"} ${className}`}>
      <button
        type="button"
        onClick={play}
        aria-label={`${label}; ${rate === KOREAN_SPEECH_RATES.slow ? "slow" : "normal"} speed`}
        className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--navy)] font-bold text-white transition hover:bg-[var(--navy)]/90 ${compact ? "p-4" : "p-5"}`}
      >
        <span className={`grid place-items-center rounded-full bg-[var(--gold)] text-[var(--navy)] ${compact ? "size-9" : "size-10"}`}>
          {playing ? <Volume2 className="size-5 animate-pulse" /> : <Headphones className="size-5" />}
        </span>
        <span>{playing ? "শোনা হচ্ছে…" : label}</span>
      </button>

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cream)] px-3 py-1.5 text-[var(--navy)]/55">
          <RotateCcw className="size-3.5" /> শোনা {plays} বার · সাধারণ {normalPlays} · ধীর {slowPlays}
        </span>
        <span className="inline-flex overflow-hidden rounded-full border border-[var(--navy)]/12 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setRate(KOREAN_SPEECH_RATES.slow)}
            aria-pressed={rate === KOREAN_SPEECH_RATES.slow}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${rate === KOREAN_SPEECH_RATES.slow ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}
          >
            <Gauge className="size-3.5" /> ধীর 0.6×
          </button>
          <button
            type="button"
            onClick={() => setRate(KOREAN_SPEECH_RATES.normal)}
            aria-pressed={rate === KOREAN_SPEECH_RATES.normal}
            className={`rounded-full px-2.5 py-1 ${rate === KOREAN_SPEECH_RATES.normal ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}
          >
            সাধারণ 1×
          </button>
        </span>
      </div>

      <div className="rounded-2xl border border-[var(--navy)]/10 bg-white/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--navy)]/60"><ScrollText className="size-3.5" />Script ও dictation</p>
          <button type="button" onClick={toggleTranscript} className="text-xs font-bold text-[var(--gold-dark)]">{transcriptRevealed ? "Script লুকান" : "Script দেখুন"}</button>
        </div>
        {transcriptRevealed ? <p className="mt-3 rounded-xl bg-[var(--cream)] p-3 text-sm font-semibold leading-6 text-[var(--navy)]">{text}</p> : null}
        {plays > 0 ? <div className="mt-3 border-t border-[var(--navy)]/8 pt-3"><label className="text-xs font-bold text-[var(--navy)]/60">শুনে Korean বাক্যটি লিখুন</label><div className="mt-2 flex gap-2"><input value={dictation} onChange={event => { setDictation(event.target.value); setDictationSubmitted(false); }} placeholder="এখানে লিখুন" aria-label="Korean dictation" className="min-w-0 flex-1 rounded-xl border border-[var(--navy)]/12 bg-white px-3 py-2 text-sm" /><button type="button" onClick={submitDictation} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[var(--navy)] px-3 py-2 text-xs font-bold text-white"><Check className="size-3.5" />মিলান</button></div>{dictationSubmitted ? <p className={`mt-2 text-xs font-semibold ${dictationKey(dictation) === dictationKey(text) ? "text-emerald-700" : "text-red-700"}`}>{dictationKey(dictation) === dictationKey(text) ? "সঠিক dictation।" : "পুরোপুরি মেলেনি—script দেখে ভুল অংশটি আবার বলুন।"}</p> : null}<p className="mt-2 text-[11px] text-[var(--navy)]/45">চেষ্টা {dictationAttempts} · সঠিক {dictationCorrect}</p></div> : null}
      </div>

      <p className="text-center text-xs font-semibold leading-5 text-[var(--navy)]/48">{guidance}</p>
    </div>
  );
}
