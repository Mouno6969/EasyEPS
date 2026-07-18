import { toast } from "sonner";

/**
 * Browser Korean TTS helper (Web Speech API).
 *
 * **User-gesture requirement:** On iOS Safari (and some other mobile browsers),
 * `speechSynthesis.speak` must run inside a user gesture handler (click/tap).
 * Call `speakKorean` from button/link handlers — not from timers, effects, or
 * autoplay on mount.
 *
 * Speak is started **synchronously** in the caller's turn (no await before
 * `speak()`), so the user activation is preserved. Voice list is read
 * immediately; if empty, voices are warmed in the background for later taps.
 *
 * Pedagogy note: for isolated jamo, pass `audioText` as a CV syllable
 * (e.g. text "ㄱ", audioText "가") because engines often mangle bare jamo.
 */

export type SpeakKoreanOptions = {
  /** Playback rate. Defaults to 0.85 (lesson vocab). Jamo drills ~0.75; syllables ~0.8. */
  rate?: number;
  /**
   * Optional TTS payload override. When set, this is spoken instead of `text`
   * (display text can stay as jamo while audio uses a clearer CV form).
   */
  audioText?: string;
  /** Optional error hook (in addition to toast). Never causes rejection. */
  onError?: (error: Error) => void;
};

const DEFAULT_RATE = 0.85;
const MIN_RATE = 0.1;
const MAX_RATE = 10;
const UNSUPPORTED_TOAST = "এই browser-এ voice playback নেই";

/** Monotonic token so concurrent taps only keep the latest utterance. */
let speakGeneration = 0;

/** One-shot voiceschanged warm-up so later taps can attach a ko voice. */
let voicesWarmStarted = false;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Cancel any in-flight utterance. Safe when speech is unsupported. */
export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

/** @deprecated Prefer {@link cancelSpeech}. Alias for design-doc naming. */
export function stopSpeaking(): void {
  cancelSpeech();
}

function normalizeLang(lang: string): string {
  return lang.replace(/_/g, "-").toLowerCase();
}

function pickKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  const exact = voices.find(voice => normalizeLang(voice.lang) === "ko-kr");
  if (exact) return exact;
  return voices.find(voice => normalizeLang(voice.lang).startsWith("ko"));
}

function clampRate(rate: number): number {
  if (!Number.isFinite(rate)) return DEFAULT_RATE;
  return Math.min(MAX_RATE, Math.max(MIN_RATE, rate));
}

/**
 * Warm the browser voice list without blocking speak (background only).
 * Safe to call from any context; does not invoke `speak()`.
 */
function warmVoicesInBackground(): void {
  if (!isSpeechSupported() || voicesWarmStarted) return;
  if (window.speechSynthesis.getVoices().length > 0) return;
  voicesWarmStarted = true;

  const onVoicesChanged = () => {
    window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
  };
  window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
  // Some engines populate only after a getVoices call under the listener.
  window.speechSynthesis.getVoices();
}

/**
 * Speak Korean text via the browser TTS engine.
 * Prefers a `ko-KR` / `ko*` voice when already loaded; always sets `lang` to `ko-KR`.
 *
 * Must be invoked from a user gesture on iOS Safari (see file header).
 * Resolves `true` on successful end, `false` on cancel/error/unsupported.
 * Never rejects — safe with `void speakKorean(...)` call sites.
 */
export async function speakKorean(text: string, opts?: SpeakKoreanOptions): Promise<boolean> {
  if (!isSpeechSupported()) {
    toast.error(UNSUPPORTED_TOAST);
    opts?.onError?.(new Error("speechSynthesis unsupported"));
    return false;
  }

  const spoken = (opts?.audioText ?? text).trim();
  if (!spoken) return false;

  // Bump generation + cancel so concurrent taps only keep the latest speak.
  const generation = ++speakGeneration;
  cancelSpeech();

  // Use currently available voices only — never await before speak()
  // (preserves user-gesture activation on iOS Safari).
  const voices = window.speechSynthesis.getVoices();
  const voice = pickKoreanVoice(voices);
  if (voices.length === 0) {
    warmVoicesInBackground();
  }

  const rate = clampRate(opts?.rate ?? DEFAULT_RATE);

  return new Promise<boolean>(resolve => {
    // Another tap may have started already.
    if (generation !== speakGeneration) {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = "ko-KR";
    utterance.rate = rate;
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (generation !== speakGeneration) {
        resolve(false);
        return;
      }
      resolve(true);
    };

    utterance.onerror = event => {
      // cancel()/interrupted often surfaces as error — treat as settled, no toast.
      const err = event.error;
      if (err === "canceled" || err === "interrupted") {
        resolve(false);
        return;
      }
      if (generation === speakGeneration) {
        toast.error(UNSUPPORTED_TOAST);
        opts?.onError?.(new Error(err ? `speechSynthesis: ${err}` : "speechSynthesis error"));
      }
      resolve(false);
    };

    // Cancel again immediately before speak to close concurrent races.
    if (generation !== speakGeneration) {
      resolve(false);
      return;
    }
    cancelSpeech();
    window.speechSynthesis.speak(utterance);
  });
}
