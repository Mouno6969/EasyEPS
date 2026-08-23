import { audioClipIsUsable, type AudioClipRef } from "@shared/audio";
import { cancelSpeech, speakKorean, type SpeechSequence } from "./speakKorean";

export type AudioPlaybackSource = "reviewed-audio" | "browser-tts";
export type AudioPlaybackOptions = {
  rate?: number;
  pitch?: number;
  voice?: SpeechSynthesisVoice;
  sequence?: SpeechSequence;
  onError?: (error: Error) => void;
};

let activeAudio: HTMLAudioElement | null = null;
let settleActiveAudio: ((result: boolean) => void) | null = null;
let audioGeneration = 0;

function audioSupported() {
  return typeof window !== "undefined" && typeof HTMLAudioElement !== "undefined";
}

function stopNativeAudio() {
  audioGeneration += 1;
  settleActiveAudio?.(false);
  settleActiveAudio = null;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio.src = "";
    activeAudio = null;
  }
}

/** Stop an approved clip or any browser speech that is currently playing. */
export function cancelAudioPlayback() {
  stopNativeAudio();
  cancelSpeech();
}

export function hasUsableAudio(clip: AudioClipRef | undefined) {
  return audioSupported() && audioClipIsUsable(clip);
}

/**
 * Play a reviewed audio clip. `play()` is invoked immediately so mobile
 * browsers retain the click/tap user activation required for audio playback.
 */
export function playAudioClip(clip: AudioClipRef, options?: AudioPlaybackOptions): Promise<boolean> {
  if (!hasUsableAudio(clip)) return Promise.resolve(false);
  stopNativeAudio();
  if (options?.sequence === undefined) cancelSpeech();
  const generation = audioGeneration;
  const audio = new Audio(clip.src);
  audio.preload = "auto";
  audio.playbackRate = Math.min(2, Math.max(0.5, options?.rate ?? 1));
  activeAudio = audio;

  return new Promise(resolve => {
    let settled = false;
    const finish = (success: boolean) => {
      if (settled) return;
      settled = true;
      audio.onended = null;
      audio.onerror = null;
      if (settleActiveAudio === finish) settleActiveAudio = null;
      if (activeAudio === audio) activeAudio = null;
      resolve(success && generation === audioGeneration);
    };
    settleActiveAudio = finish;
    audio.onended = () => finish(true);
    audio.onerror = () => {
      if (generation === audioGeneration) options?.onError?.(new Error(`audio clip failed: ${clip.voiceId}`));
      finish(false);
    };
    const started = audio.play();
    void started.catch(error => {
      if (generation === audioGeneration) options?.onError?.(error instanceof Error ? error : new Error("audio playback was blocked"));
      finish(false);
    });
  });
}

/** Play approved audio first; use browser Korean TTS only when it is absent or fails. */
export async function playAudioOrTts(input: { text: string; audio?: AudioClipRef; options?: AudioPlaybackOptions }): Promise<{ ok: boolean; source: AudioPlaybackSource }> {
  if (input.audio && audioClipIsUsable(input.audio)) {
    const played = await playAudioClip(input.audio, input.options);
    if (played) return { ok: true, source: "reviewed-audio" };
  }
  const ok = await speakKorean(input.text, { rate: input.options?.rate, pitch: input.options?.pitch, voice: input.options?.voice, sequence: input.options?.sequence, onError: input.options?.onError });
  return { ok, source: "browser-tts" };
}
