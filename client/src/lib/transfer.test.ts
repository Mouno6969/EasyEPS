import { describe, expect, it } from "vitest";
import {
  selectTransferItems,
  scoreTransferItem,
  transferItemSchema,
  type TransferItem,
} from "@shared/transfer";

const base = (overrides: Partial<TransferItem> = {}) => transferItemSchema.parse({
  id: "transfer:1:test",
  chapter: 1,
  sourceWordKo: "기계실",
  format: "word-to-situation",
  prompt: { ko: "고르세요.", bn: "বেছে নিন।", en: "Choose." },
  context: { ko: "상황", bn: "পরিস্থিতি", en: "Situation" },
  options: [
    { id: "correct", label: { ko: "기계실", bn: "মেশিন কক্ষ", en: "machine room" } },
    { id: "wrong", label: { ko: "식당", bn: "রেস্তোরাঁ", en: "restaurant" } },
  ],
  answerOptionId: "correct",
  explanation: { ko: "설명", bn: "ব্যাখ্যা", en: "Explanation" },
  hintBn: "ইঙ্গিত",
  skillTags: ["transfer", "vocabulary"],
  contentVersion: "test-v1",
  ...overrides,
});

describe("transfer scoring", () => {
  it("scores the selected choice against the canonical answer id", () => {
    expect(scoreTransferItem(base(), { optionId: "correct" }).correct).toBe(true);
    expect(scoreTransferItem(base(), { optionId: "wrong" }).correct).toBe(false);
  });

  it("normalizes typed Korean answers without accepting a different word", () => {
    const item = base({
      format: "short-typed",
      options: [],
      answerOptionId: undefined,
      acceptedAnswers: ["기계실"],
    });
    expect(scoreTransferItem(item, { text: " 기계실! " }).correct).toBe(true);
    expect(scoreTransferItem(item, { text: "식당" }).correct).toBe(false);
  });

  it("marks an explicit unknown answer wrong while retaining the expected answer", () => {
    const result = scoreTransferItem(base(), { skipped: true });
    expect(result).toMatchObject({ correct: false, selectedAnswer: "", expectedAnswer: "correct" });
  });
});

describe("transfer selection", () => {
  it("is deterministic and includes a varied format starter set", () => {
    const formats = ["picture-to-word", "word-to-situation", "short-typed", "cloze", "listening-to-meaning", "polite-response"] as const;
    const items = formats.map((format, index) => base({ id: `item-${index}`, format, sourceWordKo: `শব্দ-${index}`, options: format === "short-typed" ? [] : base().options, answerOptionId: format === "short-typed" ? undefined : "correct", acceptedAnswers: format === "short-typed" ? [`শব্দ-${index}`] : [] }));
    const first = selectTransferItems(items, undefined, { limit: 6, date: "2026-08-23" });
    const second = selectTransferItems(items, undefined, { limit: 6, date: "2026-08-23" });
    expect(first.map(item => item.id)).toEqual(second.map(item => item.id));
    expect(new Set(first.map(item => item.format))).toEqual(new Set(formats));
  });
});
