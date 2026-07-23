import { speakKorean } from "@/lib/speakKorean";
import { Gauge, Headphones, RotateCcw, Volume2 } from "lucide-react";
import { useState } from "react";

export type GuidedListeningProps = {
  text: string;
  compact?: boolean;
  className?: string;
  label?: string;
};

export function GuidedListening({
  text,
  compact = false,
  className = "",
  label = "Audio শুনতে চাপুন",
}: GuidedListeningProps) {
  const [rate, setRate] = useState<0.68 | 0.86>(0.86);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    setPlays(value => value + 1);
    setPlaying(true);
    void speakKorean(text, { rate }).finally(() => setPlaying(false));
  };

  const guidance =
    plays === 0
      ? "প্রথমবার শুধু মূল অর্থ ধরুন।"
      : plays === 1
        ? "এবার ব্যক্তি, স্থান, সংখ্যা বা সময়ের শব্দ ধরুন।"
        : rate === 0.86
          ? "কঠিন হলে ধীর গতি বেছে নিয়ে আরেকবার শুনুন।"
          : "ধীরে শোনার পর সাধারণ গতিতে মিলিয়ে নিন।";

  return (
    <div className={`${compact ? "space-y-2" : "space-y-3"} ${className}`}>
      <button
        type="button"
        onClick={play}
        aria-label={`${label}; ${rate === 0.68 ? "slow" : "normal"} speed`}
        className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-[var(--navy)] font-bold text-white transition hover:bg-[var(--navy)]/90 ${compact ? "p-4" : "p-5"}`}
      >
        <span className={`grid place-items-center rounded-full bg-[var(--gold)] text-[var(--navy)] ${compact ? "size-9" : "size-10"}`}>
          {playing ? <Volume2 className="size-5 animate-pulse" /> : <Headphones className="size-5" />}
        </span>
        <span>{playing ? "শোনা হচ্ছে…" : label}</span>
      </button>

      <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cream)] px-3 py-1.5 text-[var(--navy)]/55">
          <RotateCcw className="size-3.5" /> শোনা {plays} বার
        </span>
        <span className="inline-flex overflow-hidden rounded-full border border-[var(--navy)]/12 bg-white p-0.5">
          <button
            type="button"
            onClick={() => setRate(0.68)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${rate === 0.68 ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}
          >
            <Gauge className="size-3.5" /> ধীর
          </button>
          <button
            type="button"
            onClick={() => setRate(0.86)}
            className={`rounded-full px-2.5 py-1 ${rate === 0.86 ? "bg-[var(--navy)] text-white" : "text-[var(--navy)]/55"}`}
          >
            সাধারণ
          </button>
        </span>
      </div>

      <p className="text-center text-xs font-semibold leading-5 text-[var(--navy)]/48">{guidance}</p>
    </div>
  );
}
