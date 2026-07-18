import { describe, expect, it } from "vitest";
import {
  composeHangul,
  decomposeHangul,
  FINAL_TO_INDEX,
  INITIAL_TO_INDEX,
  V1_BATCHIM,
  V1_CONSONANTS,
  V1_VOWELS,
  VOWEL_TO_INDEX,
} from "../shared/hangul";

describe("composeHangul / decomposeHangul", () => {
  it("composes well-known CV and CVC syllables", () => {
    expect(composeHangul("ㄱ", "ㅏ")).toBe("가");
    expect(composeHangul("ㅎ", "ㅏ", "ㄴ")).toBe("한");
    expect(composeHangul("ㄱ", "ㅡ", "ㄹ")).toBe("글");
    expect(composeHangul("ㅇ", "ㅣ")).toBe("이");
    expect(composeHangul("ㅅ", "ㅏ", "ㄹ")).toBe("살");
  });

  it("round-trips every v1 consonant × vowel (no batchim)", () => {
    for (const L of V1_CONSONANTS) {
      for (const V of V1_VOWELS) {
        const syllable = composeHangul(L, V);
        const parts = decomposeHangul(syllable);
        expect(parts).toEqual({ L, V, T: "" });
        expect(composeHangul(parts.L, parts.V, parts.T)).toBe(syllable);
      }
    }
  });

  it("round-trips v1 batchim subset on 가-family", () => {
    for (const T of V1_BATCHIM) {
      const syllable = composeHangul("ㄱ", "ㅏ", T);
      const parts = decomposeHangul(syllable);
      expect(parts).toEqual({ L: "ㄱ", V: "ㅏ", T });
      expect(composeHangul(parts.L, parts.V, parts.T)).toBe(syllable);
    }
  });

  it("throws on invalid jamo", () => {
    expect(() => composeHangul("A", "ㅏ")).toThrow(/Invalid jamo/);
    expect(() => composeHangul("ㄱ", "x")).toThrow(/Invalid jamo/);
  });

  it("throws on non-syllable decompose input", () => {
    expect(() => decomposeHangul("ㄱ")).toThrow(/Not a precomposed Hangul syllable/);
    expect(() => decomposeHangul("가나다")).toThrow(/Expected single syllable/);
  });

  it("exposes full Unicode L/V/T index tables", () => {
    expect(Object.keys(INITIAL_TO_INDEX)).toHaveLength(19);
    expect(Object.keys(VOWEL_TO_INDEX)).toHaveLength(21);
    expect(Object.keys(FINAL_TO_INDEX)).toHaveLength(28);
    expect(V1_CONSONANTS).toHaveLength(14);
    expect(V1_VOWELS).toHaveLength(10);
    expect(V1_BATCHIM).toHaveLength(7);
  });
});
