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

export const KOREAN_SPEECH_RATES = {
  /** Deliberately well below 1× so browser TTS engines produce an audible difference. */
  slow: 0.6,
  /** Native browser speech-synthesis speed. */
  normal: 1,
} as const;

export type KoreanSpeechRate = typeof KOREAN_SPEECH_RATES[keyof typeof KOREAN_SPEECH_RATES];

export type SpeakKoreanOptions = {
  /** Playback rate. Defaults to normal 1×; focused jamo/syllable drills may pass a custom rate. */
  rate?: number;
  /**
   * Optional TTS payload override. When set, this is spoken instead of `text`
   * (display text can stay as jamo while audio uses a clearer CV form).
   */
  audioText?: string;
  /**
   * Voice pitch (0–2, engine default 1). Dialogue playback uses distinct
   * pitches per speaker when only a single Korean voice is installed.
   */
  pitch?: number;
  /** Explicit voice to use (dialogue playback picks gendered voices). */
  voice?: SpeechSynthesisVoice;
  /**
   * Internal sequence token for multi-utterance playback. Calls that share a
   * token never cancel one another, while any newer standalone playback or
   * explicit cancellation invalidates the whole sequence.
   */
  sequence?: SpeechSequence;
  /** Optional error hook (in addition to toast). Never causes rejection. */
  onError?: (error: Error) => void;
};

const DEFAULT_RATE = KOREAN_SPEECH_RATES.normal;
const MIN_RATE = 0.1;
const MAX_RATE = 10;
const UNSUPPORTED_TOAST = "এই browser-এ voice playback নেই";

/** Monotonic token so concurrent taps only keep the latest utterance. */
let speakGeneration = 0;

/** Resolver for the one utterance that can be active at a time. */
let settleActiveSpeech: ((result: boolean) => void) | null = null;

/** One-shot voiceschanged warm-up so later taps can attach a ko voice. */
let voicesWarmStarted = false;

export type SpeechSequence = number;

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function cancelNativeSpeech(): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
}

function invalidateCurrentSpeech(): SpeechSequence {
  speakGeneration += 1;
  settleActiveSpeech?.(false);
  settleActiveSpeech = null;
  cancelNativeSpeech();
  return speakGeneration;
}

/** Start a cancellable multi-utterance sequence and stop older playback. */
export function beginSpeechSequence(): SpeechSequence {
  return invalidateCurrentSpeech();
}

/** Whether a multi-utterance sequence still owns speech playback. */
export function isSpeechSequenceCurrent(sequence: SpeechSequence): boolean {
  return sequence === speakGeneration;
}

/** Cancel any in-flight utterance or pending multi-turn sequence. */
export function cancelSpeech(): void {
  invalidateCurrentSpeech();
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

/** All installed Korean voices (ko-KR first). Empty when none are loaded yet. */
export function getKoreanVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  const voices = window.speechSynthesis.getVoices().filter(voice => normalizeLang(voice.lang).startsWith("ko"));
  return voices.sort((a, b) => Number(normalizeLang(b.lang) === "ko-kr") - Number(normalizeLang(a.lang) === "ko-kr"));
}

const MIN_PITCH = 0;
const MAX_PITCH = 2;

function clampPitch(pitch: number): number {
  if (!Number.isFinite(pitch)) return 1;
  return Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitch));
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
 * Public voice warm-up for page mounts (exam pages preload listening items).
 * Populates the voice list ahead of the first user gesture so the very first
 * tap plays instantly with the correct ko-KR voice. Never speaks.
 */
export function warmSpeechVoices(): void {
  warmVoicesInBackground();
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

  // Standalone speech starts a fresh sequence. Multi-turn callers pass the
  // token returned by beginSpeechSequence() so their turns share ownership.
  const generation = opts?.sequence ?? beginSpeechSequence();
  if (!isSpeechSequenceCurrent(generation)) return false;

  // Use currently available voices only — never await before speak()
  // (preserves user-gesture activation on iOS Safari).
  const voices = window.speechSynthesis.getVoices();
  const voice = opts?.voice ?? pickKoreanVoice(voices);
  if (voices.length === 0) {
    warmVoicesInBackground();
  }

  const rate = clampRate(opts?.rate ?? DEFAULT_RATE);
  const pitch = clampPitch(opts?.pitch ?? 1);

  return new Promise<boolean>(resolve => {
    // Another tap may have started already.
    if (!isSpeechSequenceCurrent(generation)) {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(spoken);
    let settled = false;
    const settle = (result: boolean) => {
      if (settled) return;
      settled = true;
      if (settleActiveSpeech === settle) settleActiveSpeech = null;
      resolve(result);
    };
    settleActiveSpeech = settle;
    utterance.lang = "ko-KR";
    utterance.rate = rate;
    utterance.pitch = pitch;
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      settle(isSpeechSequenceCurrent(generation));
    };

    utterance.onerror = event => {
      // cancel()/interrupted often surfaces as error — treat as settled, no toast.
      const err = event.error;
      if (err === "canceled" || err === "interrupted") {
        settle(false);
        return;
      }
      if (isSpeechSequenceCurrent(generation)) {
        toast.error(UNSUPPORTED_TOAST);
        opts?.onError?.(new Error(err ? `speechSynthesis: ${err}` : "speechSynthesis error"));
      }
      settle(false);
    };

    if (!isSpeechSequenceCurrent(generation)) {
      settle(false);
      return;
    }
    window.speechSynthesis.speak(utterance);
  });
}
