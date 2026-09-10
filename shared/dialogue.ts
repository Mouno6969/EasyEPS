/**
 * Dialogue-passage parsing — shared by the browser speech engine (client) and
 * the EPS question-format classifier (shared/server-side safe: no DOM access).
 *
 * Real EPS-TOPIK listening items are two-speaker dialogues labelled 남자/여자.
 * Content passages normalize to `남자:` / `여자:` labels separated by newlines.
 */

export type DialogueSpeaker = "male" | "female" | "narrator";

export type DialogueTurn = {
  speaker: DialogueSpeaker;
  /** Utterance text with the speaker label stripped. */
  text: string;
};

/** Canonical labels used in lesson content (scripts normalize to these). */
export const MALE_LABELS = ["남자", "남"];
export const FEMALE_LABELS = ["여자", "여"];

/**
 * Matches a speaker label at the start of a segment: `남자:`, `여:`, etc.
 * Only 남/여 forms are recognized — content is normalized to this format.
 */
export const TURN_SPLIT_RE = /(?=(?:^|[\s\u00a0])(?:남자|여자|남|여)\s*[:：])/g;
export const LABEL_RE = /^[\s\u00a0]*(남자|여자|남|여)\s*[:：]\s*/;

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
