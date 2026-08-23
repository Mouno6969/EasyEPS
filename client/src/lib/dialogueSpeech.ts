import { playAudioClip, playAudioOrTts, type AudioPlaybackSource } from "./audioPlayback";
import { audioClipIsUsable, type AudioClipRef } from "@shared/audio";
import {
  beginSpeechSequence,
  cancelSpeech,
  getKoreanVoices,
  isSpeechSequenceCurrent,
  isSpeechSupported,
  speakKorean,
} from "./speakKorean";

/**
 * EPS-TOPIK dialogue playback.
 *
 * Real exam listening items are two-speaker dialogues (남자/여자). This module
 * parses speaker-labelled passages into turns and plays each turn with a
 * distinct voice so learners can tell the speakers apart:
 *
 * 1. If the browser has ≥2 Korean voices, a gendered pair is chosen by voice
 *    name heuristics (falling back to two different voices).
 * 2. If only one Korean voice exists, the same voice is reused with clearly
 *    different pitches (male 0.75 / female 1.3).
 *
 * Speaker labels ("남자:", "여자:") are never read aloud — exactly like the
 * real exam audio, where only the utterances are heard.
 */

export type DialogueSpeaker = "male" | "female" | "narrator";

export type DialogueTurn = {
  speaker: DialogueSpeaker;
  /** Utterance text with the speaker label stripped. */
  text: string;
};

/** Canonical labels used in lesson content (scripts normalize to these). */
const MALE_LABELS = ["남자", "남"];
const FEMALE_LABELS = ["여자", "여"];

/**
 * Matches a speaker label at the start of a segment: `남자:`, `여:`, etc.
 * Only 남/여 forms are recognized — content is normalized to this format.
 */
const TURN_SPLIT_RE = /(?=(?:^|[\s\u00a0])(?:남자|여자|남|여)\s*[:：])/g;
const LABEL_RE = /^[\s\u00a0]*(남자|여자|남|여)\s*[:：]\s*/;

/** Distinct fallback pitches when a single Korean voice must play both roles. */
export const DIALOGUE_PITCHES: Record<DialogueSpeaker, number> = {
  male: 0.75,
  female: 1.3,
  narrator: 1,
};

/** Pause between dialogue turns (ms) so speaker changes are audible. */
export const TURN_GAP_MS = 420;

/**
 * Parse a listening passage into speaker turns.
 * Passages without 남/여 labels are treated as one narrator turn.
 */
export function parseDialogueTurns(passage: string): DialogueTurn[] {
  const text = (passage ?? "").trim();
  if (!text) return [];

  const segments = text
    .split(TURN_SPLIT_RE)
    .map(segment => segment.trim())
    .filter(Boolean);

  const turns: DialogueTurn[] = [];
  for (const segment of segments) {
    const match = segment.match(LABEL_RE);
    if (!match) {
      // No label — narration (or continuation before the first label).
      turns.push({ speaker: "narrator", text: segment });
      continue;
    }
    const label = match[1];
    const speaker: DialogueSpeaker = MALE_LABELS.includes(label)
      ? "male"
      : FEMALE_LABELS.includes(label)
        ? "female"
        : "narrator";
    const [spoken, ...narratorParagraphs] = segment
      .replace(LABEL_RE, "")
      .split(/\n\s*\n/)
      .map(part => part.trim());
    if (spoken) turns.push({ speaker, text: spoken });
    for (const narration of narratorParagraphs) {
      if (narration) turns.push({ speaker: "narrator", text: narration });
    }
  }
  return turns;
}

/** True when the passage contains at least two distinct labelled speakers. */
export function isDialoguePassage(passage: string): boolean {
  const speakers = new Set(
    parseDialogueTurns(passage)
      .map(turn => turn.speaker)
      .filter(speaker => speaker !== "narrator"),
  );
  return speakers.size >= 2;
}

/** Voice-name fragments that suggest a gender, across common TTS engines. */
const FEMALE_NAME_HINTS = [/\bfemale\b/i, /여성/, /여자/, /yuna/i, /sora/i, /heami/i, /sun-?hi/i, /jimin/i, /seoyeon/i, /google.*한국/i];
const MALE_NAME_HINTS = [/\bmale\b/i, /남성/, /남자/, /minsu/i, /injoon/i, /hyunsu/i, /jinho/i, /gook/i];

function matchesAny(name: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(name));
}

export type DialogueVoiceAssignment = {
  male?: SpeechSynthesisVoice;
  female?: SpeechSynthesisVoice;
  narrator?: SpeechSynthesisVoice;
  /** True when male/female use the same underlying voice (pitch fallback). */
  usesPitchFallback: boolean;
};

/**
 * Choose voices for the two dialogue roles from installed Korean voices.
 * Exported for tests; UI callers just use {@link speakDialogue}.
 */
export function assignDialogueVoices(voices: SpeechSynthesisVoice[]): DialogueVoiceAssignment {
  const korean = voices;
  if (korean.length === 0) return { usesPitchFallback: true };
  if (korean.length === 1) {
    return { male: korean[0], female: korean[0], narrator: korean[0], usesPitchFallback: true };
  }

  const female = korean.find(voice => matchesAny(voice.name, FEMALE_NAME_HINTS) && !matchesAny(voice.name, MALE_NAME_HINTS));
  const male = korean.find(voice => voice !== female && matchesAny(voice.name, MALE_NAME_HINTS));

  // Guarantee two distinct voices even when names carry no gender hints.
  const resolvedFemale = female ?? korean.find(voice => voice !== male) ?? korean[0];
  const resolvedMale = male ?? korean.find(voice => voice !== resolvedFemale) ?? korean[0];

  return {
    male: resolvedMale,
    female: resolvedFemale,
    narrator: resolvedFemale,
    usesPitchFallback: resolvedMale === resolvedFemale,
  };
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, ms));
}

export type SpeakDialogueOptions = {
  /** Playback rate for every turn. Defaults to 1×. */
  rate?: number;
  /** Optional reviewed natural clip for a single named line. */
  audio?: import("@shared/audio").AudioClipRef;
  /** Optional error hook, forwarded to the underlying speech calls. */
  onError?: (error: Error) => void;
  /** Internal voice controls used when a browser fallback is needed. */
  pitch?: number;
  voice?: SpeechSynthesisVoice;
  sequence?: import("./speakKorean").SpeechSequence;
};

type PreparedSpeechTurn = {
  text: string;
  pitch: number;
  voice?: SpeechSynthesisVoice;
  audio?: import("@shared/audio").AudioClipRef;
};

async function playPreparedTurns(turns: PreparedSpeechTurn[], opts?: SpeakDialogueOptions): Promise<boolean> {
  const sequence = beginSpeechSequence();
  for (let index = 0; index < turns.length; index += 1) {
    if (!isSpeechSequenceCurrent(sequence)) return false;
    const turn = turns[index];
    const finished = await playAudioOrTts({
      text: turn.text,
      audio: turn.audio,
      options: { rate: opts?.rate, onError: opts?.onError, sequence, pitch: turn.pitch, voice: turn.voice },
    });
    if (!finished.ok) return false;

    if (index < turns.length - 1) {
      await wait(TURN_GAP_MS);
      if (!isSpeechSequenceCurrent(sequence)) return false;
    }
  }
  return true;
}

/**
 * Speak a listening passage with one distinct voice per speaker.
 *
 * Must be called from a user gesture (same iOS Safari rule as `speakKorean`).
 * The first turn starts synchronously to preserve the gesture activation;
 * later turns chain after it. Tapping play again (or any other speak call)
 * cancels the remaining turns automatically via the generation token.
 *
 * Resolves `true` when every turn finished, `false` when unsupported,
 * cancelled midway, or the passage is empty.
 */
export async function speakDialogue(passage: string, opts?: SpeakDialogueOptions): Promise<boolean> {
  const turns = parseDialogueTurns(passage);
  if (turns.length === 0) return false;

  // Single narrator block — plain playback, one voice, default pitch.
  if (turns.length === 1 && turns[0].speaker === "narrator") {
    return speakKorean(turns[0].text, { rate: opts?.rate, onError: opts?.onError });
  }

  if (!isSpeechSupported()) {
    // Delegate the unsupported toast/error path to speakKorean.
    return speakKorean(turns[0].text, { rate: opts?.rate, onError: opts?.onError });
  }

  const assignment = assignDialogueVoices(getKoreanVoices());
  return playPreparedTurns(
    turns.map(turn => ({
      text: turn.text,
      voice: assignment[turn.speaker],
      pitch: assignment.usesPitchFallback ? DIALOGUE_PITCHES[turn.speaker] : 1,
    })),
    opts,
  );
}

/** Play one reviewed full-passage clip, otherwise retain speaker-aware dialogue TTS. */
export async function speakDialogueWithAudio(passage: string, audio?: AudioClipRef, opts?: SpeakDialogueOptions): Promise<{ ok: boolean; source: AudioPlaybackSource }> {
  if (audio && audioClipIsUsable(audio)) {
    const played = await playAudioClip(audio, { rate: opts?.rate, onError: opts?.onError });
    if (played) return { ok: true, source: audio.reviewStatus === "generated" ? "generated-audio" : "reviewed-audio" };
  }
  return { ok: await speakDialogue(passage, opts), source: "browser-tts" };
}

export type NamedDialogueLine = {
  speaker: string;
  text: string;
  audio?: import("@shared/audio").AudioClipRef;
};

const NAMED_SPEAKER_PITCHES = [0.78, 1.22, 0.92, 1.08];

type NamedVoiceProfile = { voice?: SpeechSynthesisVoice; pitch: number };

export type NamedDialogueVoiceMode = "separate-voices" | "pitch-fallback" | "unsupported";

/** Report what the current browser can actually provide for named dialogue speakers. */
export function getNamedDialogueVoiceMode(speakers: string[]): NamedDialogueVoiceMode {
  if (!isSpeechSupported()) return "unsupported";
  const uniqueCount = new Set(speakers.map(speaker => speaker.trim()).filter(Boolean)).size;
  return getKoreanVoices().length >= Math.max(2, uniqueCount) ? "separate-voices" : "pitch-fallback";
}

function namedVoiceProfiles(speakers: string[], voices: SpeechSynthesisVoice[]): Map<string, NamedVoiceProfile> {
  const unique = [...new Set(speakers.map(speaker => speaker.trim() || "narrator"))];
  const needsPitchProfiles = voices.length < unique.length;
  return new Map(unique.map((speaker, index) => [
    speaker,
    {
      voice: voices.length > 0 ? voices[index % voices.length] : undefined,
      pitch: needsPitchProfiles ? NAMED_SPEAKER_PITCHES[index % NAMED_SPEAKER_PITCHES.length] : 1,
    },
  ]));
}

/** Speak a line with the same stable profile used by the complete dialogue. */
export function speakNamedTurn(
  speaker: string,
  text: string,
  allSpeakers: string[],
  opts?: SpeakDialogueOptions,
): Promise<boolean> {
  const spoken = text.trim();
  if (!spoken) return Promise.resolve(false);
  const profile = namedVoiceProfiles(allSpeakers, isSpeechSupported() ? getKoreanVoices() : []).get(speaker.trim() || "narrator");
  return playAudioOrTts({
    text: spoken,
    audio: opts?.audio,
    options: { rate: opts?.rate, pitch: profile?.pitch ?? 1, voice: profile?.voice, onError: opts?.onError },
  }).then(result => result.ok);
}

/**
 * Speak lesson dialogue lines while keeping each named speaker on a stable,
 * distinguishable voice-and-pitch profile. Supports the repository's
 * two-, three-, and four-speaker lesson examples.
 */
export async function speakNamedDialogue(
  lines: NamedDialogueLine[],
  opts?: SpeakDialogueOptions,
): Promise<boolean> {
  const turns = lines
    .map(line => ({ speaker: line.speaker.trim(), text: line.text.trim(), audio: line.audio }))
    .filter(line => line.text);
  if (turns.length === 0) return false;
  if (turns.length === 1) {
    return playAudioOrTts({ text: turns[0].text, audio: turns[0].audio, options: { rate: opts?.rate, onError: opts?.onError } }).then(result => result.ok);
  }
  if (opts?.audio && audioClipIsUsable(opts.audio)) {
    const played = await playAudioClip(opts.audio, { rate: opts.rate, onError: opts.onError });
    if (played) return true;
  }
  const voices = isSpeechSupported() ? getKoreanVoices() : [];
  const profiles = namedVoiceProfiles(turns.map(turn => turn.speaker || "narrator"), voices);

  return playPreparedTurns(
    turns.map(turn => {
      const profile = profiles.get(turn.speaker || "narrator");
      return { text: turn.text, audio: turn.audio, voice: profile?.voice, pitch: profile?.pitch ?? 1 };
    }),
    opts,
  );
}

/** Stop dialogue playback (any in-flight and queued turns). */
export function cancelDialogue(): void {
  cancelSpeech();
}
