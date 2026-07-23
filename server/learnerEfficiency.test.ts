import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildDailyPlan } from "../client/src/lib/dailyPlan";
import type { LocalLearningState } from "../client/src/lib/localProgress";
import { buildReadinessReport } from "../client/src/lib/readiness";
import {
  listUpcomingReviews,
  markReviewed,
  recordReviewAttempt,
  type ReviewItem,
} from "../client/src/lib/srs";
import { pronunciationSimilarity } from "../client/src/components/PronunciationCoach";
import {
  buildSmartMockQuestions,
  type MockQuestionCandidate,
} from "../shared/smartMock";

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  get length() { return this.values.size; }
}

function emptyLearningState(): LocalLearningState {
  return {
    progress: {},
    attempts: [],
    studyDays: {},
    planner: {
      dailyGoalMinutes: 30,
      dailyGoalLessons: 1,
      reminderTime: "20:00",
      targetExamDate: "",
      items: [],
    },
  };
}

function reviewFixture(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    id: "chapter-1",
    version: 2,
    kind: "chapter",
    chapter: 1,
    labelBn: "অধ্যায় ১ রিভিউ",
    misses: 0,
    lapses: 0,
    repetitions: 2,
    intervalDays: 3,
    easeFactor: 2.3,
    mastery: 80,
    lastScoreRatio: 0.8,
    lastMissedAt: "2026-07-01T12:00:00.000Z",
    lastReviewedAt: "2026-07-20T12:00:00.000Z",
    dueDate: "2026-07-23",
    history: [],
    ...overrides,
  };
}

function candidate(chapter: number, section: "reading" | "listening", index: number) {
  return {
    id: `${section}-${chapter}-${index}`,
    chapter,
    section,
    lessonTitle: { bn: `অধ্যায় ${chapter}`, ko: `제${chapter}과`, en: `Chapter ${chapter}` },
  } as unknown as MockQuestionCandidate;
}

describe("expanding-interval review scheduling", () => {
  const storage = new MemoryStorage();

  beforeEach(() => {
    storage.clear();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", storage);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T09:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("expands successful reviews and resets the interval after a lapse", () => {
    const first = recordReviewAttempt({ kind: "chapter", chapter: 4, labelBn: "অধ্যায় ৪", score: 8, total: 10 });
    expect(first).toMatchObject({ repetitions: 1, intervalDays: 1, dueDate: "2026-07-24" });

    vi.setSystemTime(new Date("2026-07-24T09:00:00.000Z"));
    const second = markReviewed("chapter-4", "good");
    expect(second).toMatchObject({ repetitions: 2, intervalDays: 3, dueDate: "2026-07-27" });

    vi.setSystemTime(new Date("2026-07-27T09:00:00.000Z"));
    const third = markReviewed("chapter-4", "easy");
    expect(third?.intervalDays).toBeGreaterThan(3);

    const lapsed = markReviewed("chapter-4", "again");
    expect(lapsed).toMatchObject({ repetitions: 0, intervalDays: 1, lapses: 1 });
    expect(lapsed?.mastery).toBeLessThan(third?.mastery ?? 100);
  });

  it("migrates legacy weak-item records to version 2", () => {
    storage.setItem("easyeps-srs-v1", JSON.stringify([{ id: "chapter-2", kind: "chapter", chapter: 2, labelBn: "অধ্যায় ২", misses: 2, lastMissedAt: "2026-07-20T00:00:00.000Z", dueDate: "2026-07-23" }]));
    const [item] = listUpcomingReviews(5);
    expect(item).toMatchObject({ version: 2, id: "chapter-2", lapses: 2 });
    expect(item.easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(storage.getItem("easyeps-srs-v2")).not.toBeNull();
  });
});

describe("adaptive smart mock selection", () => {
  const pool = Array.from({ length: 8 }, (_, chapterIndex) => chapterIndex + 1).flatMap(chapter =>
    (["reading", "listening"] as const).flatMap(section =>
      Array.from({ length: 4 }, (_, index) => candidate(chapter, section, index)),
    ),
  );

  it("preserves the EPS section ratio while prioritizing but not isolating weak chapters", () => {
    const questions = buildSmartMockQuestions(pool, { count: 20, mode: "smart", focusChapters: [1, 2] });
    expect(questions).toHaveLength(20);
    expect(questions.filter(question => question.section === "reading")).toHaveLength(12);
    expect(questions.filter(question => question.section === "listening")).toHaveLength(8);
    const focused = questions.filter(question => question.chapter === 1 || question.chapter === 2).length;
    expect(focused).toBeGreaterThanOrEqual(10);
    expect(focused).toBeLessThan(20);
    expect(new Set(questions.map(question => question.chapter)).size).toBeGreaterThan(2);
  });

  it("supports reading-focused micro tests and clamps undersized requests", () => {
    const questions = buildSmartMockQuestions(pool, { count: 4, mode: "balanced", focusSection: "reading" });
    expect(questions).toHaveLength(10);
    expect(questions.filter(question => question.section === "reading")).toHaveLength(7);
    expect(questions.filter(question => question.section === "listening")).toHaveLength(3);
  });
});

describe("goal-aware daily plans", () => {
  it("puts a due review before a recommended next lesson", () => {
    const plan = buildDailyPlan({
      state: emptyLearningState(),
      dueReviews: [reviewFixture()],
      hangulReady: true,
      nextChapter: 7,
      date: "2026-07-23",
    });
    expect(plan.tasks.map(task => task.source)).toEqual(["review", "recommended"]);
    expect(plan.tasks[1]).toMatchObject({ href: "/lesson/7", kind: "lesson" });
    expect(plan.plannedMinutes).toBe(27);
  });

  it("recommends Hangul basics until the foundation gate is complete", () => {
    const plan = buildDailyPlan({ state: emptyLearningState(), dueReviews: [], hangulReady: false, nextChapter: 1, date: "2026-07-23" });
    expect(plan.tasks[0]).toMatchObject({ id: "recommended-basics", href: "/basics" });
  });
});

describe("readiness analytics", () => {
  it("produces a transparent high readiness score from strong real progress signals", () => {
    const state = emptyLearningState();
    state.progress = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [index + 1, { chapter: index + 1, completed: true, updatedAt: "2026-06-01T00:00:00.000Z" }]));
    state.attempts = Array.from({ length: 6 }, (_, index) => ({ id: `a-${index}`, kind: index % 2 ? "mock-test" : "chapter-exam", score: 18, total: 20, durationSec: 600, createdAt: `2026-07-${String(17 + index).padStart(2, "0")}T12:00:00.000Z` }));
    state.studyDays = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`2026-07-${String(14 + index).padStart(2, "0")}`, { minutes: 30, activities: 1 }]));
    state.planner.targetExamDate = "2026-08-22";
    const reviews = Array.from({ length: 5 }, (_, index) => reviewFixture({ id: `chapter-${index + 1}`, chapter: index + 1, mastery: 90 }));

    const report = buildReadinessReport(state, reviews, new Date("2026-07-23T12:00:00.000Z"));
    expect(report.score).toBeGreaterThanOrEqual(90);
    expect(report.band).toBe("ready");
    expect(report.components).toHaveLength(4);
    expect(report.trend).toHaveLength(6);
    expect(report.targetDaysRemaining).toBe(30);
  });

  it("keeps an empty learner in the foundation band without inventing evidence", () => {
    const report = buildReadinessReport(emptyLearningState(), [], new Date("2026-07-23T12:00:00.000Z"));
    expect(report.score).toBe(0);
    expect(report.band).toBe("foundation");
  });
});

describe("pronunciation similarity", () => {
  it("normalizes punctuation and distinguishes partial Korean matches", () => {
    expect(pronunciationSimilarity("안녕하세요!", "안녕하세요")).toBe(100);
    expect(pronunciationSimilarity("안녕하세요", "안녕하세여")).toBeGreaterThanOrEqual(70);
    expect(pronunciationSimilarity("안녕하세요", "")).toBe(0);
  });
});
