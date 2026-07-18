import { toast } from "sonner";

/**
 * Browser Korean TTS helper (Web Speech API).
 *
 * **User-gesture requirement:** On iOS Safari (and some other mobile browsers),
 * `speechSynthesis.speak` must run inside a user gesture handler (click/tap).
 * Call `speakKorean` from button/link handlers — not from timers, effects, or
 * autoplay on mount.
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
};

const DEFAULT_RATE = 0.85;
const VOICES_TIMEOUT_MS = 1000;
const UNSUPPORTED_TOAST = "এই browser-এ voice playback নেই";

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

function pickKoreanVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  return voices.find(voice => voice.lang === "ko-KR") ?? voices.find(voice => voice.lang.startsWith("ko"));
}

/**
 * Wait until `speechSynthesis.getVoices()` is populated, or timeout (~1s).
 * Some browsers only fill the list after the `voiceschanged` event.
 */
function waitForVoices(timeoutMs = VOICES_TIMEOUT_MS): Promise<SpeechSynthesisVoice[]> {
  const immediate = window.speechSynthesis.getVoices();
  if (immediate.length > 0) return Promise.resolve(immediate);

  return new Promise(resolve => {
    let settled = false;
    const finish = (voices: SpeechSynthesisVoice[]) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(voices);
    };

    const onVoicesChanged = () => {
      finish(window.speechSynthesis.getVoices());
    };

    const timer = window.setTimeout(() => {
      finish(window.speechSynthesis.getVoices());
    }, timeoutMs);

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
  });
}

/**
 * Speak Korean text via the browser TTS engine.
 * Prefers a `ko-KR` / `ko*` voice when available; always sets `lang` to `ko-KR`.
 *
 * Must be invoked from a user gesture on iOS Safari (see file header).
 */
export async function speakKorean(text: string, opts?: SpeakKoreanOptions): Promise<void> {
  if (!isSpeechSupported()) {
    toast.error(UNSUPPORTED_TOAST);
    return;
  }

  const spoken = (opts?.audioText ?? text).trim();
  if (!spoken) return;

  // Always cancel previous utterance before starting a new one.
  cancelSpeech();

  const voices = await waitForVoices();
  const voice = pickKoreanVoice(voices);
  const rate = opts?.rate ?? DEFAULT_RATE;

  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.lang = "ko-KR";
    utterance.rate = rate;
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve();
    utterance.onerror = event => {
      // cancel()/interrupted often surfaces as error — treat as settled.
      const err = event.error;
      if (err === "canceled" || err === "interrupted") {
        resolve();
        return;
      }
      reject(new Error(err ? `speechSynthesis: ${err}` : "speechSynthesis error"));
    };

    window.speechSynthesis.speak(utterance);
  });
}
