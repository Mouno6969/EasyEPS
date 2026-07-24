import {
  cancelSpeech,
  getKoreanVoices,
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
    const spoken = segment.replace(LABEL_RE, "").trim();
    if (spoken) turns.push({ speaker, text: spoken });
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
  return speakers.size >= 1;
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
  /** Optional error hook, forwarded to the underlying speech calls. */
  onError?: (error: Error) => void;
};

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

  for (let index = 0; index < turns.length; index += 1) {
    const turn = turns[index];
    const voice = assignment[turn.speaker];
    const pitch = assignment.usesPitchFallback ? DIALOGUE_PITCHES[turn.speaker] : 1;

    const finished = await speakKorean(turn.text, {
      rate: opts?.rate,
      pitch,
      voice,
      // First turn owns the gesture + cancels previous speech; the rest chain.
      chained: index > 0,
      onError: opts?.onError,
    });
    if (!finished) return false;

    if (index < turns.length - 1) {
      await wait(TURN_GAP_MS);
    }
  }
  return true;
}

/** Stop dialogue playback (any in-flight and queued turns). */
export function cancelDialogue(): void {
  cancelSpeech();
}
