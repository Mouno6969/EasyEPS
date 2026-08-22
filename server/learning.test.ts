import { describe, expect, it } from "vitest";
import {
  diagnosticRecommendation,
  evaluateMilestones,
  rankAdaptiveCandidates,
  summarizeItemEvidence,
  updateItemEvidence,
  type AdaptiveCandidate,
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
