/**
 * Hangul jamo maps and Unicode syllable compose/decompose.
 * Formula: code = 0xAC00 + ((L * 21) + V) * 28 + T
 */

export const INITIAL_TO_INDEX: Record<string, number> = {
  ㄱ: 0, ㄲ: 1, ㄴ: 2, ㄷ: 3, ㄸ: 4, ㄹ: 5, ㅁ: 6, ㅂ: 7, ㅃ: 8,
  ㅅ: 9, ㅆ: 10, ㅇ: 11, ㅈ: 12, ㅉ: 13, ㅊ: 14, ㅋ: 15, ㅌ: 16, ㅍ: 17, ㅎ: 18,
};

export const VOWEL_TO_INDEX: Record<string, number> = {
  ㅏ: 0, ㅐ: 1, ㅑ: 2, ㅒ: 3, ㅓ: 4, ㅔ: 5, ㅕ: 6, ㅖ: 7,
  ㅗ: 8, ㅘ: 9, ㅙ: 10, ㅚ: 11, ㅛ: 12, ㅜ: 13, ㅝ: 14, ㅞ: 15,
  ㅟ: 16, ㅠ: 17, ㅡ: 18, ㅢ: 19, ㅣ: 20,
};

export const FINAL_TO_INDEX: Record<string, number> = {
  "": 0,
  ㄱ: 1, ㄲ: 2, ㄳ: 3, ㄴ: 4, ㄵ: 5, ㄶ: 6, ㄷ: 7, ㄹ: 8,
  ㄺ: 9, ㄻ: 10, ㄼ: 11, ㄽ: 12, ㄾ: 13, ㄿ: 14, ㅀ: 15,
  ㅁ: 16, ㅂ: 17, ㅄ: 18, ㅅ: 19, ㅆ: 20, ㅇ: 21, ㅈ: 22,
  ㅊ: 23, ㅋ: 24, ㅌ: 25, ㅍ: 26, ㅎ: 27,
};

const INDEX_TO_INITIAL = Object.fromEntries(
  Object.entries(INITIAL_TO_INDEX).map(([jamo, index]) => [index, jamo]),
) as Record<number, string>;

const INDEX_TO_VOWEL = Object.fromEntries(
  Object.entries(VOWEL_TO_INDEX).map(([jamo, index]) => [index, jamo]),
) as Record<number, string>;

const INDEX_TO_FINAL = Object.fromEntries(
  Object.entries(FINAL_TO_INDEX).map(([jamo, index]) => [index, jamo]),
) as Record<number, string>;

export const V1_CONSONANTS = ["ㄱ","ㄴ","ㄷ","ㄹ","ㅁ","ㅂ","ㅅ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"] as const;
export const V1_VOWELS = ["ㅏ","ㅑ","ㅓ","ㅕ","ㅗ","ㅛ","ㅜ","ㅠ","ㅡ","ㅣ"] as const;
export const V1_BATCHIM = ["ㄱ","ㄴ","ㄷ","ㄹ","ㅁ","ㅂ","ㅇ"] as const;

export type HangulParts = { L: string; V: string; T: string };

export function composeHangul(initial: string, vowel: string, final: string = ""): string {
  const L = INITIAL_TO_INDEX[initial];
  const V = VOWEL_TO_INDEX[vowel];
  // Require known final (including "" → 0); never silently map typos to empty batchim.
  const T = FINAL_TO_INDEX[final ?? ""];
  if (L == null || V == null || T == null) {
    throw new Error(`Invalid jamo ${initial}+${vowel}+${final ?? ""}`);
  }
  return String.fromCharCode(0xac00 + (L * 21 + V) * 28 + T);
}

export function decomposeHangul(syllable: string): HangulParts {
  if (syllable.length === 0) throw new Error("Empty syllable");
  // Precomposed Hangul is BMP; require a single code unit / character.
  if ([...syllable].length !== 1) {
    throw new Error(`Expected a single Hangul syllable, got length ${[...syllable].length}`);
  }
  const code = syllable.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) {
    throw new Error(`Not a precomposed Hangul syllable: ${syllable}`);
  }
  const s = code - 0xac00;
  const L = Math.floor(s / (21 * 28));
  const V = Math.floor((s % (21 * 28)) / 28);
  const T = s % 28;
  const initial = INDEX_TO_INITIAL[L];
  const vowel = INDEX_TO_VOWEL[V];
  const final = INDEX_TO_FINAL[T] ?? "";
  if (initial == null || vowel == null) {
    throw new Error(`Failed to reverse-map syllable ${syllable}`);
  }
  return { L: initial, V: vowel, T: final };
}
