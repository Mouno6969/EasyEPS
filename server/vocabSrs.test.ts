import { beforeEach, describe, expect, it } from "vitest";

/**
 * The SRS is a browser module (localStorage). Give it a minimal store so the
 * scheduling logic can be exercised in Node.
 */
class MemoryStorage {
  private map = new Map<string, string>();
  getItem(k: string) {
    return this.map.has(k) ? this.map.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}

const store = new MemoryStorage();
(globalThis as Record<string, unknown>).window = globalThis;
(globalThis as Record<string, unknown>).localStorage = store;

const {
  enrolVocabulary,
  listDueVocab,
  markReviewed,
  recordVocabResult,
  recordReviewAttempt,
  vocabQueueStats,
  hrefForReview,
} = await import("../client/src/lib/srs");

const KEY = "easyeps-srs-v2";
const raw = () => JSON.parse(store.getItem(KEY) ?? "[]") as Array<Record<string, unknown>>;

beforeEach(() => store.clear());

describe("word-level review scheduling", () => {
  it("enrols a lesson's words once and keeps earned schedules on re-entry", () => {
    const words = [
      { ko: "안전모", bn: "হেলমেট" },
      { ko: "장갑", bn: "গ্লাভস" },
    ];
    expect(enrolVocabulary(53, words)).toBe(2);
    // Advance one word, then re-enrol the same lesson.
    const id = "vocab-53-안전모";
    markReviewed(id, "easy");
    const advanced = raw().find(i => i.id === id)!;
    expect(enrolVocabulary(53, words)).toBe(0);
    const after = raw().find(i => i.id === id)!;
    expect(after.intervalDays).toBe(advanced.intervalDays);
    expect(after.repetitions).toBe(advanced.repetitions);
  });

  it("shortens the interval on a miss and lengthens it on recall", () => {
    recordVocabResult({ chapter: 1, word: "가족", glossBn: "পরিবার", correct: true });
    const good = raw()[0];
    recordVocabResult({ chapter: 1, word: "가족", glossBn: "পরিবার", correct: false });
    const bad = raw()[0];
    expect(Number(bad.intervalDays)).toBeLessThanOrEqual(Number(good.intervalDays));
    expect(Number(bad.lapses)).toBeGreaterThan(Number(good.lapses));
    expect(Number(bad.mastery)).toBeLessThan(Number(good.mastery));
  });

  it("keys words per chapter so a homograph in two lessons stays separate", () => {
    recordVocabResult({ chapter: 5, word: "시간", glossBn: "সময়", correct: false });
    recordVocabResult({ chapter: 40, word: "시간", glossBn: "সময়", correct: false });
    expect(raw().filter(i => i.kind === "vocab")).toHaveLength(2);
  });

  it("surfaces only words that are actually due, weakest first", () => {
    enrolVocabulary(1, [
      { ko: "학생", bn: "ছাত্র" },
      { ko: "친구", bn: "বন্ধু" },
    ]);
    // Freshly enrolled words are due tomorrow, not today.
    expect(listDueVocab()).toHaveLength(0);
    recordVocabResult({ chapter: 1, word: "학생", glossBn: "ছাত্র", correct: false });
    const due = listDueVocab();
    expect(due.map(d => d.word)).toContain("학생");
  });

  it("does not let words evict chapter reviews", () => {
    recordReviewAttempt({ kind: "chapter", chapter: 7, labelBn: "অধ্যায় ৭", score: 2, total: 10 });
    // Flood well past the vocab budget.
    for (let i = 0; i < 500; i++) {
      recordVocabResult({ chapter: 1, word: `단어${i}`, glossBn: "x", correct: false });
    }
    const items = raw();
    expect(items.find(i => i.id === "chapter-7"), "chapter review survived").toBeDefined();
    expect(items.filter(i => i.kind === "vocab").length).toBeLessThanOrEqual(400);
  });

  it("reports queue stats and routes a word back to its lesson", () => {
    enrolVocabulary(12, [{ ko: "우체국", bn: "ডাকঘর" }]);
    recordVocabResult({ chapter: 12, word: "우체국", glossBn: "ডাকঘর", correct: false });
    const stats = vocabQueueStats();
    expect(stats.total).toBe(1);
    expect(stats.due).toBe(1);
    const item = listDueVocab()[0]!;
    expect(hrefForReview(item)).toBe("/lesson/12?tab=vocabulary");
  });

  it("reads existing v2 state that has no vocab items", () => {
    store.setItem(
      KEY,
      JSON.stringify([
        {
          id: "chapter-3",
          version: 2,
          kind: "chapter",
          chapter: 3,
          labelBn: "অধ্যায় ৩",
          misses: 1,
          lapses: 1,
          repetitions: 0,
          intervalDays: 2,
          easeFactor: 2.3,
          mastery: 40,
          lastMissedAt: "2026-01-01T00:00:00.000Z",
          lastReviewedAt: "2026-01-01T00:00:00.000Z",
          dueDate: "2026-01-03",
          history: [],
        },
      ]),
    );
    expect(vocabQueueStats().total).toBe(0);
    enrolVocabulary(3, [{ ko: "은행", bn: "ব্যাংক" }]);
    expect(raw().find(i => i.id === "chapter-3"), "pre-existing review preserved").toBeDefined();
    expect(vocabQueueStats().total).toBe(1);
  });
});

describe("queue stats", () => {
  it("counts a word as weak only after a real lapse, not on initial mastery", () => {
    store.clear();
    enrolVocabulary(9, [
      { ko: "우표", bn: "ডাকটিকিট" },
      { ko: "소포", bn: "পার্সেল" },
    ]);
    // Freshly enrolled: low mastery but never tested -> not "weak".
    expect(vocabQueueStats().weak).toBe(0);
    recordVocabResult({ chapter: 9, word: "우표", glossBn: "ডাকটিকিট", correct: false });
    expect(vocabQueueStats().weak).toBe(1);
  });
});
