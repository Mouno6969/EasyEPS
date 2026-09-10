import { toast } from "sonner";

/**
 * Bengali TTS helper (Web Speech API) — reads word MEANINGS aloud so learners
 * connect the Korean audio with its Bangla sense, mirroring how BOESL
 * classroom drills pair sound with meaning.
 *
 * The exam never requires Bengali audio, so callers degrade gracefully:
 * `hasBengaliVoice()` reports availability and UI hides the control when the
 * device has no Bengali voice installed (common on desktop Chrome).
 */

const UNSUPPORTED_TOAST = "এই browser-এ বাংলা voice playback নেই";

export function isBengaliSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function normalizeLang(lang: string): string {
  return lang.replace(/_/g, "-").toLowerCase();
}

/** All installed Bengali voices; bn-BD (Bangladesh) first, bn-IN fallback. */
export function getBengaliVoices(): SpeechSynthesisVoice[] {
  if (!isBengaliSpeechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter(voice => normalizeLang(voice.lang).startsWith("bn"))
    .sort((a, b) => Number(normalizeLang(b.lang) === "bn-bd") - Number(normalizeLang(a.lang) === "bn-bd"));
}

/** True when the device ships a Bengali TTS voice (bd or Indian fallback). */
export function hasBengaliVoice(): boolean {
  return getBengaliVoices().length > 0;
}

/**
 * Speak a Bengali word/phrase via the browser TTS engine.
 * Must be invoked from a user gesture (same iOS Safari rule as speakKorean).
 * Resolves true on successful end; never rejects.
 */
export async function speakBengali(text: string): Promise<boolean> {
  if (!isBengaliSpeechSupported()) {
    toast.error(UNSUPPORTED_TOAST);
    return false;
  }
  const spoken = (text ?? "").trim();
  if (!spoken) return false;

  const voices = getBengaliVoices();
  if (voices.length === 0) {
    // No Bengali voice installed — silently skip rather than reading Bangla
    // script with an unrelated voice (produces gibberish).
    toast.error("এই ডিভাইসে বাংলা voice নেই — অর্থ লেখা আছে পাশেই");
    return false;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(spoken);
  utterance.lang = normalizeLang(voices[0]!.lang) === "bn-bd" ? "bn-BD" : voices[0]!.lang;
  utterance.voice = voices[0]!;
  utterance.rate = 0.95;

  return new Promise<boolean>(resolve => {
    let settled = false;
    const settle = (value: boolean) => {
      if (!settled) {
        settled = true;
        resolve(value);
      }
    };
    utterance.onend = () => settle(true);
    utterance.onerror = () => settle(false);
    window.speechSynthesis.speak(utterance);
  });
}
