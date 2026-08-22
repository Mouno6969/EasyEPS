import { KOREAN_SPEECH_RATES, type KoreanSpeechRate } from "@/lib/speakKorean";
import { speakDialogue } from "@/lib/dialogueSpeech";
import { Gauge, Headphones, RotateCcw, Volume2 } from "lucide-react";
import { useRef, useState } from "react";

export type GuidedListeningProps = {
  text: string;
  compact?: boolean;
  className?: string;
  label?: string;
  revealTranscript?: boolean;
  revealAfterPlays?: number;
  onEvidenceChange?: (evidence: { plays: number; slowPlays: number; transcriptRevealed: boolean }) => void;
};

export function GuidedListening({
  text,
  compact = false,
  className = "",
  label = "Audio শুনতে চাপুন",
  revealTranscript = true,
  revealAfterPlays = 2,
  onEvidenceChange,
}: GuidedListeningProps) {
  const [rate, setRate] = useState<KoreanSpeechRate>(KOREAN_SPEECH_RATES.normal);
  const [plays, setPlays] = useState(0);
  const [slowPlays, setSlowPlays] = useState(0);
  const [transcriptRevealed, setTranscriptRevealed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const playbackRequest = useRef(0);

  const emit = (next: { plays: number; slowPlays: number; transcriptRevealed: boolean }) => onEvidenceChange?.(next);
  const play = () => {
    const request = ++playbackRequest.current;
    const nextPlays = plays + 1;
    const nextSlowPlays = slowPlays + (rate === KOREAN_SPEECH_RATES.slow ? 1 : 0);
    setPlays(nextPlays);
    setSlowPlays(nextSlowPlays);
    emit({ plays: nextPlays, slowPlays: nextSlowPlays, transcriptRevealed });
    setPlaying(true);
    void speakDialogue(text, { rate }).finally(() => {
      if (playbackRequest.current === request) setPlaying(false);
    });
  };
  const reveal = () => {
    setTranscriptRevealed(true);
    emit({ plays, slowPlays, transcriptRevealed: true });
  };

  const guidance = plays === 0
    ? "প্রথমবার শুধু মূল অর্থ ধরুন।"
    : plays === 1
      ? "এবার ব্যক্তি, স্থান, সংখ্যা বা সময়ের শব্দ ধরুন।"
      : rate === KOREAN_SPEECH_RATES.normal
        ? "কঠিন হলে ধীর গতি বেছে নিয়ে আরেকবার শুনুন।"
        : "ধীরে শোনার পর সাধারণ গতিতে মিলিয়ে নিন।";

  return (
    <div className={`${compact ? "space-y-2" : "space-y-3"} ${className}`}>
      <button type="button" onClick={play} aria-label={`${label}; ${rate === KOREAN_SPEECH_RATES.slow ? "slow" : "normal"} speed`} className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--navy)] font-bold text-white transition hover:bg-[var(--navy)]/90 ${compact ? "p-4" : "p-5"}`}>
        <span className={`grid place-items-center rounded-full bg-[var(--gold)] text-[var(--navy)] ${compact ? "size-9" : "size-10"}`}>{playing ? <Volume2 className="size-5 animate-pulse" /> : <Headphones className="size-5" />}</span>
        <span>{playing ? "শোনা হচ্ছে…" : label}</span>
      </button>
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cream)] px-3 py-1.5 text-[var(--navy)]/55"><RotateCcw className="size-3.5" /> শোনা {plays} বার</span>
        <span className="inline-flex overflow-hidden rounded-full border border-[var(--navy)]/12 bg-white p-0.5">
          <button type="button" onClick={() => setRate(KOREAN_SPEECH_RATES.slow)} aria-pressed={rate === KOREAN_SPEECH_RATES.slow} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${rate === KOREAN_SPEECH_RATES.slow ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}><Gauge className="size-3.5" /> ধীর 0.6×</button>
          <button type="button" onClick={() => setRate(KOREAN_SPEECH_RATES.normal)} aria-pressed={rate === KOREAN_SPEECH_RATES.normal} className={`rounded-full px-2.5 py-1 ${rate === KOREAN_SPEECH_RATES.normal ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}>সাধারণ 1×</button>
        </span>
      </div>
      {revealTranscript && plays >= revealAfterPlays && !transcriptRevealed ? <button type="button" onClick={reveal} className="mx-auto block rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/12 px-4 py-2 text-xs font-bold text-[var(--gold-dark)]">Script দেখুন</button> : null}
      {revealTranscript && transcriptRevealed ? <div className="rounded-2xl bg-[var(--cream)] p-4 text-sm font-semibold leading-7 text-[var(--navy)]">{text}</div> : null}
      <p className="text-center text-xs font-semibold leading-5 text-[var(--navy)]/48">{guidance}</p>
    </div>
  );
}
