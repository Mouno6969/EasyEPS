import { CheckCircle2, Mic, MicOff, RotateCcw, ShieldAlert } from "lucide-react";
import { useRef, useState } from "react";

interface RecognitionAlternativeLike {
  transcript: string;
}

interface RecognitionEventLike {
  results: ArrayLike<ArrayLike<RecognitionAlternativeLike>>;
}

interface RecognitionErrorEventLike {
  error?: string;
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type RecognitionConstructor = new () => RecognitionLike;

function recognitionConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

function normalizeKorean(value: string) {
  return value.toLowerCase().replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-z0-9]/g, "");
}

export function pronunciationSimilarity(target: string, spoken: string) {
  const a = normalizeKorean(target);
  const b = normalizeKorean(spoken);
  if (!a.length || !b.length) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return Math.max(0, Math.round((1 - previous[b.length] / Math.max(a.length, b.length)) * 100));
}

export function PronunciationCoach({ text, compact = true }: { text: string; compact?: boolean }) {
  const supported = Boolean(recognitionConstructor());
  const recognitionRef = useRef<RecognitionLike | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [error, setError] = useState("");

  const begin = () => {
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    recognitionRef.current?.stop();
    const recognition = new Constructor();
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      const spoken = event.results[0]?.[0]?.transcript?.trim() ?? "";
      setTranscript(spoken);
      setScore(pronunciationSimilarity(text, spoken));
      setError("");
    };
    recognition.onerror = event => {
      const message = event.error === "not-allowed"
        ? "মাইক্রোফোন অনুমতি দিন, তারপর আবার চেষ্টা করুন।"
        : "কথা স্পষ্ট ধরা যায়নি—শান্ত জায়গায় আবার বলুন।";
      setError(message);
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setTranscript("");
    setScore(null);
    setError("");
    setListening(true);
    recognition.start();
  };

  if (!supported) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--navy)]/38" title="Speech recognition is unavailable in this browser">
        <MicOff className="size-3" /> pronunciation check unavailable
      </span>
    );
  }

  const verdict = score == null
    ? ""
    : score >= 85
      ? "খুব ভালো—উচ্চারণ লক্ষ্য বাক্যের কাছাকাছি।"
      : score >= 65
        ? "ভালো শুরু—ধীরে শুনে শব্দের শেষ অংশ মিলিয়ে বলুন।"
        : "আরেকবার শুনে ছোট ছোট অংশে অনুকরণ করুন।";

  return (
    <div className={`${compact ? "mt-3" : "mt-5"} rounded-xl border border-current/10 bg-white/8 p-3`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={begin} disabled={listening} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--gold)] px-3 py-1.5 text-xs font-bold text-[var(--navy)] disabled:opacity-60">
          {listening ? <Mic className="size-3.5 animate-pulse" /> : score == null ? <Mic className="size-3.5" /> : <RotateCcw className="size-3.5" />}
          {listening ? "বলুন…" : score == null ? "উচ্চারণ যাচাই" : "আবার বলুন"}
        </button>
        {score != null && <span className={`inline-flex items-center gap-1 text-xs font-bold ${score >= 85 ? "text-emerald-600" : score >= 65 ? "text-amber-700" : "text-red-600"}`}><CheckCircle2 className="size-3.5" />মিল {score}%</span>}
      </div>
      {transcript && <p className="mt-2 text-xs leading-5 opacity-70"><strong>শোনা গেছে:</strong> {transcript}</p>}
      {verdict && <p className="mt-1 text-xs font-semibold leading-5 opacity-75">{verdict}</p>}
      {error && <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-red-600"><ShieldAlert className="mt-0.5 size-3.5 shrink-0" />{error}</p>}
      {!transcript && !error && <p className="mt-2 text-[11px] leading-4 opacity-45">Browser speech service Korean শব্দ চিনে মিল দেখাবে; ফলটি অনুশীলন-সহায়ক, চূড়ান্ত উচ্চারণ মূল্যায়ন নয়।</p>}
    </div>
  );
}
