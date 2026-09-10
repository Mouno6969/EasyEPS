import {
  beginSpeechSequence,
  cancelSpeech,
  getKoreanVoices,
  isSpeechSequenceCurrent,
  isSpeechSupported,
  speakKorean,
} from "./speakKorean";
import {
  isDialoguePassage,
  parseDialogueTurns,
  type DialogueSpeaker,
  type DialogueTurn,
} from "@shared/dialogue";

/** Re-exported so existing client callers keep a single import site. */
export { isDialoguePassage, parseDialogueTurns };
export type { DialogueSpeaker, DialogueTurn };

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

/** Distinct fallback pitches when a single Korean voice must play both roles. */
export const DIALOGUE_PITCHES: Record<DialogueSpeaker, number> = {
  male: 0.75,
  female: 1.3,
  narrator: 1,
};

/** Pause between dialogue turns (ms) so speaker changes are audible. */
export const TURN_GAP_MS = 420;

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
  /** Optional error hook, forwarded to the underlying speech calls. */
  onError?: (error: Error) => void;
};

type PreparedSpeechTurn = {
  text: string;
  pitch: number;
  voice?: SpeechSynthesisVoice;
};

async function playPreparedTurns(turns: PreparedSpeechTurn[], opts?: SpeakDialogueOptions): Promise<boolean> {
  const sequence = beginSpeechSequence();
  for (let index = 0; index < turns.length; index += 1) {
    if (!isSpeechSequenceCurrent(sequence)) return false;
    const turn = turns[index];
    const finished = await speakKorean(turn.text, {
      rate: opts?.rate,
      pitch: turn.pitch,
      voice: turn.voice,
      sequence,
      onError: opts?.onError,
    });
    if (!finished) return false;

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

export type NamedDialogueLine = {
  speaker: string;
  text: string;
};

const NAMED_SPEAKER_PITCHES = [0.78, 1.22, 0.92, 1.08];

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
    .map(line => ({ speaker: line.speaker.trim(), text: line.text.trim() }))
    .filter(line => line.text);
  if (turns.length === 0) return false;
  if (turns.length === 1) {
    return speakKorean(turns[0].text, { rate: opts?.rate, onError: opts?.onError });
  }
  if (!isSpeechSupported()) {
    return speakKorean(turns[0].text, { rate: opts?.rate, onError: opts?.onError });
  }

  const speakers = [...new Set(turns.map(turn => turn.speaker || "narrator"))];
  const voices = getKoreanVoices();
  const needsPitchProfiles = voices.length < speakers.length;
  const profiles = new Map(
    speakers.map((speaker, index) => [
      speaker,
      {
        voice: voices.length > 0 ? voices[index % voices.length] : undefined,
        pitch: needsPitchProfiles ? NAMED_SPEAKER_PITCHES[index % NAMED_SPEAKER_PITCHES.length] : 1,
      },
    ]),
  );

  return playPreparedTurns(
    turns.map(turn => {
      const profile = profiles.get(turn.speaker || "narrator");
      return { text: turn.text, voice: profile?.voice, pitch: profile?.pitch ?? 1 };
    }),
    opts,
  );
}

/** Stop dialogue playback (any in-flight and queued turns). */
export function cancelDialogue(): void {
  cancelSpeech();
}
