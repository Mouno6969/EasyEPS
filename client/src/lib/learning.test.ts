import { describe, expect, it } from "vitest";
import {
  buildDailyVocabularySelection,
  createItemEvidence,
  masteryStage,
  updateItemEvidence,
  type DailyVocabularyCandidate,
} from "@shared/learning";

function candidate(itemId: string, chapter: number, layer: "core" | "exam-transfer"): DailyVocabularyCandidate {
  return {
    itemId,
    chapter,
    layer,
    word: {
      ko: itemId,
      romanization: "test",
      bn: "পরীক্ষা",
      en: "test",
      pos: "noun",
      example: { ko: "시험입니다.", bn: "এটি পরীক্ষা।", en: "It is a test." },
      pronunciationTipBn: "",
      collocations: [],
    },
  };
}

describe("learning evidence", () => {
  it("moves an item from new to recalled and schedules a future review", () => {
    const first = updateItemEvidence(undefined, {
      itemId: "vocabulary:1:test",
      kind: "vocabulary",
      chapter: 1,
      correct: true,
      confidence: "sure",
      format: "recall",
      now: "2026-08-23T12:00:00.000Z",
    });
    expect(first.intervalDays).toBe(4);
    expect(first.dueDate).toBe("2026-08-27");
    expect(masteryStage(first)).toBe("recalled");
  });

  it("requires transfer evidence before labeling an item transferred", () => {
    let evidence = createItemEvidence({ itemId: "eps:1:picture", kind: "eps", chapter: 1 });
    for (let index = 0; index < 2; index += 1) {
      evidence = updateItemEvidence(evidence, {
        itemId: evidence.itemId,
        kind: evidence.kind,
        chapter: evidence.chapter,
        correct: true,
        confidence: "sure",
        isTransferCheck: true,
        isRetentionCheck: true,
        format: "picture",
        now: `2026-08-${23 + index}T12:00:00.000Z`,
      });
    }
    expect(evidence.transferChecks).toBe(2);
    expect(evidence.transferCorrect).toBe(2);
    expect(masteryStage(evidence)).toBe("transferred");
  });
});

describe("daily vocabulary selection", () => {
  it("prioritizes due items, then extras, and remains stable for a date", () => {
    const candidates = [candidate("core-a", 1, "core"), candidate("extra-a", 2, "exam-transfer"), candidate("extra-b", 3, "exam-transfer")];
    const due = createItemEvidence({ itemId: "core-a", kind: "vocabulary", chapter: 1, now: "2026-08-23T12:00:00.000Z" });
    const selected = buildDailyVocabularySelection(candidates, { "core-a": due }, { limit: 4, date: "2026-08-23" });
    const repeated = buildDailyVocabularySelection(candidates, { "core-a": due }, { limit: 4, date: "2026-08-23" });
    expect(selected.map(item => item.itemId)).toEqual(repeated.map(item => item.itemId));
    expect(selected[0]?.itemId).toBe("core-a");
    expect(selected.some(item => item.practiceLayer === "extra")).toBe(true);
  });
});
