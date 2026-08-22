import { describe, expect, it } from "vitest";
import {
  buildDailyVocabularySelection,
  diagnosticRecommendation,
  evaluateMilestones,
  rankAdaptiveCandidates,
  summarizeItemEvidence,
  updateItemEvidence,
  type AdaptiveCandidate,
  type DailyVocabularyCandidate,
  type ItemEvidence,
} from "@shared/learning";

function evidence(overrides: Partial<ItemEvidence> = {}): ItemEvidence {
  return {
    itemId: "eps:1:a",
    kind: "eps",
    chapter: 1,
    section: "reading",
    skillTags: [],
    attempts: 1,
    correct: 1,
    firstAttemptedAt: "2026-08-01T00:00:00.000Z",
    lastAttemptedAt: "2026-08-01T00:00:00.000Z",
    lastCorrect: true,
    lastConfidence: "sure",
    confidenceSum: 1,
    sureCount: 1,
    uncertainCount: 0,
    guessedCount: 0,
    confidentCorrect: 1,
    uncertainCorrect: 0,
    guessedCorrect: 0,
    firstAttemptCorrect: true,
    firstAttemptAt: "2026-08-01T00:00:00.000Z",
    totalResponseMs: 0,
    retentionChecks: 0,
    retentionCorrect: 0,
    dueDate: "2026-08-01",
    intervalDays: 1,
    easeFactor: 2.3,
    mastery: 85,
    ...overrides,
  };
}

describe("learning system algorithms", () => {
  it("schedules a missed item for tomorrow and reduces mastery", () => {
    const next = updateItemEvidence(undefined, {
      itemId: "eps:1:a",
      kind: "eps",
      chapter: 1,
      correct: false,
      confidence: "guessed",
      now: "2026-08-23T10:00:00.000Z",
    });
    expect(next.dueDate).toBe("2026-08-24");
    expect(next.mastery).toBeLessThan(50);
    expect(next.attempts).toBe(1);
  });

  it("prioritizes due weak and unseen candidates over recently mastered items", () => {
    const candidates: AdaptiveCandidate[] = [
      { itemId: "mastered", chapter: 1, section: "reading" },
      { itemId: "due-weak", chapter: 2, section: "listening" },
      { itemId: "unseen", chapter: 3, section: "reading" },
    ];
    const ranked = rankAdaptiveCandidates(candidates, {
      mastered: evidence({ itemId: "mastered", mastery: 95, dueDate: "2026-09-01", lastAttemptedAt: "2026-08-22T00:00:00.000Z" }),
      "due-weak": evidence({ itemId: "due-weak", chapter: 2, section: "listening", mastery: 35, dueDate: "2026-08-22" }),
    }, { limit: 3, now: new Date("2026-08-23T12:00:00.000Z") });
    expect(ranked.map(item => item.itemId)).toEqual(["due-weak", "unseen", "mastered"]);
  });

  it("measures confidence calibration from prediction versus observed accuracy", () => {
    const summary = summarizeItemEvidence({
      a: evidence({ attempts: 2, correct: 1, confidenceSum: 2, sureCount: 2, confidentCorrect: 1 }),
    });
    expect(summary.confidenceCalibration).toBe(50);
  });

  it("prioritizes due vocabulary reviews before new exam-transfer terms", () => {
    const word = (ko: string) => ({ ko, romanization: ko, bn: ko, en: ko, pos: "noun", example: { ko, bn: ko, en: ko }, pronunciationTipBn: "" });
    const candidates: DailyVocabularyCandidate[] = [
      { itemId: "vocabulary:1:due-a", chapter: 1, word: word("due-a"), layer: "core" },
      { itemId: "vocabulary:1:due-b", chapter: 1, word: word("due-b"), layer: "core" },
      { itemId: "vocabulary:2:extra-a", chapter: 2, word: word("extra-a"), layer: "exam-transfer" },
      { itemId: "vocabulary:2:extra-b", chapter: 2, word: word("extra-b"), layer: "exam-transfer" },
      { itemId: "vocabulary:3:core-a", chapter: 3, word: word("core-a"), layer: "core" },
    ];
    const selected = buildDailyVocabularySelection(candidates, {
      "vocabulary:1:due-a": evidence({ itemId: "vocabulary:1:due-a", kind: "vocabulary", dueDate: "2026-08-22", mastery: 20 }),
      "vocabulary:1:due-b": evidence({ itemId: "vocabulary:1:due-b", kind: "vocabulary", dueDate: "2026-08-22", mastery: 30 }),
    }, { limit: 4, date: "2026-08-23" });
    expect(selected.slice(0, 2).map(item => item.itemId).sort()).toEqual(["vocabulary:1:due-a", "vocabulary:1:due-b"]);
    expect(selected.slice(2).every(item => item.practiceLayer === "extra")).toBe(true);
  });

  it("keeps daily vocabulary selection deterministic for a fixed date", () => {
    const word = (ko: string) => ({ ko, romanization: ko, bn: ko, en: ko, pos: "noun", example: { ko, bn: ko, en: ko }, pronunciationTipBn: "" });
    const candidates: DailyVocabularyCandidate[] = Array.from({ length: 10 }, (_, index) => ({ itemId: `vocabulary:${index + 1}:term`, chapter: index + 1, word: word(`term-${index}`), layer: index % 2 ? "core" : "exam-transfer" }));
    const first = buildDailyVocabularySelection(candidates, {}, { limit: 8, date: "2026-08-23" }).map(item => item.itemId);
    const second = buildDailyVocabularySelection(candidates, {}, { limit: 8, date: "2026-08-23" }).map(item => item.itemId);
    expect(second).toEqual(first);
  });

  it("chooses listening when listening is materially weaker", () => {
    expect(diagnosticRecommendation({ score: 12, total: 20, listeningScore: 1, listeningTotal: 6, readingScore: 11, readingTotal: 14 })).toEqual({ recommendedChapter: 12, recommendedFocus: "listening" });
  });

  it("awards learning milestones only when evidence thresholds are met", () => {
    const milestones = evaluateMilestones({
      current: [],
      completedLessons: 10,
      itemCount: 12,
      retainedItems: 10,
      diagnosticCompleted: true,
      listeningItems: 10,
      streak: 7,
      totalAttempts: 25,
      now: "2026-08-23T12:00:00.000Z",
    });
    expect(milestones.map(item => item.id)).toEqual([
      "diagnostic",
      "first-10-items",
      "retention-10",
      "listening-10",
      "first-lesson",
      "ten-lessons",
      "seven-day-streak",
      "practice-25",
    ]);
  });
});
