import { beforeEach, describe, expect, it } from "vitest";

class MemoryStorage {
  private store = new Map<string, string>();
  /** Set to make `setItem` throw like Safari's quota error. */
  quotaBytes = Number.POSITIVE_INFINITY;

  getItem(key: string) {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    if (value.length > this.quotaBytes) {
      throw new DOMException("QuotaExceededError", "QuotaExceededError");
    }
    this.store.set(key, value);
  }

  removeItem(key: string) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const storage = new MemoryStorage();

Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage } });

const {
  countDueDrillItems,
  hrefForReview,
  isDrillableKind,
  itemReviewId,
  listDueDrillItems,
  markReviewed,
  recordItemReviews,
  recordWeakAttempt,
  seedVocabReviews,
} = await import("./srs");

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

beforeEach(() => {
  storage.clear();
  storage.quotaBytes = Number.POSITIVE_INFINITY;
});

describe("item-level review ids", () => {
  it("scopes item entries by kind, chapter and item so the same word in two chapters is tracked twice", () => {
    expect(itemReviewId({ kind: "vocab", chapter: 3, itemId: "사람" })).toBe("vocab-3-사람");
    expect(itemReviewId({ kind: "vocab", chapter: 7, itemId: "사람" })).not.toBe(
      itemReviewId({ kind: "vocab", chapter: 3, itemId: "사람" }),
    );
    expect(itemReviewId({ kind: "eps", chapter: 3, itemId: "q1" })).toBe("eps-3-q1");
  });

  it("keeps aggregate ids unchanged so existing stored schedules still match", () => {
    recordWeakAttempt({ kind: "chapter", chapter: 4, labelBn: "অধ্যায় ৪", score: 5, total: 10 });
    recordWeakAttempt({ kind: "mock", labelBn: "মক", score: 20, total: 40 });
    const stored = JSON.parse(storage.getItem("easyeps-srs-v2") ?? "[]") as Array<{ id: string }>;
    expect(stored.map(item => item.id).sort()).toEqual(["chapter-4", "mock-test"]);
  });
});

describe("recordItemReviews", () => {
  it("schedules a missed item for tomorrow and a correct one further out", () => {
    recordItemReviews({
      kind: "vocab",
      chapter: 2,
      results: [
        { itemId: "missed", labelBn: "missed", correct: false },
        { itemId: "known", labelBn: "known", correct: true },
      ],
    });

    const stored = JSON.parse(storage.getItem("easyeps-srs-v2") ?? "[]") as Array<{
      itemId?: string;
      intervalDays: number;
      lapses: number;
      dueDate: string;
      mastery: number;
    }>;
    const missed = stored.find(item => item.itemId === "missed");
    const known = stored.find(item => item.itemId === "known");

    // A freshly answered item is never due again the same day — the shortest interval is one day.
    expect(missed?.intervalDays).toBe(1);
    expect(missed?.lapses).toBe(1);
    expect(missed?.dueDate).not.toBe(todayKey());
    expect(countDueDrillItems()).toBe(0);

    expect(known?.lapses).toBe(0);
    expect(known?.mastery).toBeGreaterThan(missed?.mastery ?? 0);
  });

  it("never awards the 'easy' bonus for a binary correct answer", () => {
    recordItemReviews({ kind: "practice", chapter: 1, results: [{ itemId: "p1", labelBn: "p1", correct: true }] });
    const stored = JSON.parse(storage.getItem("easyeps-srs-v2") ?? "[]") as Array<{ intervalDays: number }>;
    // "easy" would set a 4-day first interval; "good" sets 1.
    expect(stored[0]?.intervalDays).toBe(1);
  });

  it("honours a per-result chapter so one mock test writes a single batch", () => {
    recordItemReviews({
      kind: "eps",
      results: [
        { itemId: "q1", labelBn: "q1", chapter: 5, correct: false },
        { itemId: "q1", labelBn: "q1", chapter: 9, correct: false },
      ],
    });
    const stored = JSON.parse(storage.getItem("easyeps-srs-v2") ?? "[]") as Array<{ id: string }>;
    expect(stored.map(item => item.id).sort()).toEqual(["eps-5-q1", "eps-9-q1"]);
  });

  it("keeps the first outcome when an attempt repeats the same item", () => {
    recordItemReviews({
      kind: "vocab",
      chapter: 1,
      results: [
        { itemId: "dup", labelBn: "dup", correct: false },
        { itemId: "dup", labelBn: "dup", correct: true },
      ],
    });
    const stored = JSON.parse(storage.getItem("easyeps-srs-v2") ?? "[]") as Array<{ lapses: number }>;
    expect(stored).toHaveLength(1);
    expect(stored[0]?.lapses).toBe(1);
  });

  it("shares one schedule between a chapter exam and a mock test question", () => {
    recordItemReviews({ kind: "eps", chapter: 6, results: [{ itemId: "q7", labelBn: "q7", correct: false }] });
    recordItemReviews({ kind: "eps", results: [{ itemId: "q7", labelBn: "q7", chapter: 6, correct: false }] });
    const stored = JSON.parse(storage.getItem("easyeps-srs-v2") ?? "[]") as Array<{ lapses: number }>;
    expect(stored).toHaveLength(1);
    expect(stored[0]?.lapses).toBe(2);
  });
});

describe("seedVocabReviews", () => {
  it("adds new words as due today without disturbing words already scheduled", () => {
    recordItemReviews({ kind: "vocab", chapter: 1, results: [{ itemId: "old", labelBn: "old", correct: true }] });
    const before = JSON.parse(storage.getItem("easyeps-srs-v2") ?? "[]") as Array<{ itemId?: string; dueDate: string }>;
    const oldDue = before.find(item => item.itemId === "old")?.dueDate;

    const created = seedVocabReviews({
      chapter: 1,
      entries: [
        { itemId: "old", labelBn: "old" },
        { itemId: "new", labelBn: "new" },
      ],
    });

    expect(created).toBe(1);
    const after = JSON.parse(storage.getItem("easyeps-srs-v2") ?? "[]") as Array<{ itemId?: string; dueDate: string }>;
    expect(after.find(item => item.itemId === "old")?.dueDate).toBe(oldDue);
    expect(after.find(item => item.itemId === "new")?.dueDate).toBe(todayKey());
  });

  it("is idempotent across repeat visits to the same chapter", () => {
    const entries = [{ itemId: "a", labelBn: "a" }, { itemId: "b", labelBn: "b" }];
    expect(seedVocabReviews({ chapter: 2, entries })).toBe(2);
    expect(seedVocabReviews({ chapter: 2, entries })).toBe(0);
  });
});

describe("drill queue", () => {
  it("returns only drillable item entries, weakest first, and ignores aggregate reviews", () => {
    recordWeakAttempt({ kind: "chapter", chapter: 1, labelBn: "অধ্যায় ১", score: 1, total: 10 });
    seedVocabReviews({ chapter: 1, entries: [{ itemId: "weak", labelBn: "weak" }] });
    recordItemReviews({ kind: "eps", chapter: 1, results: [{ itemId: "strong", labelBn: "strong", correct: true }] });

    const queue = listDueDrillItems(10);
    expect(queue.every(item => isDrillableKind(item.kind))).toBe(true);
    expect(queue.map(item => item.itemId)).toContain("weak");
    // The seeded word has mastery 20 against the answered question's higher mastery.
    expect(queue[0]?.itemId).toBe("weak");
    expect(countDueDrillItems()).toBe(queue.length);
  });

  it("drops an item from today's queue once it is reviewed correctly", () => {
    seedVocabReviews({ chapter: 3, entries: [{ itemId: "w", labelBn: "w" }] });
    expect(countDueDrillItems()).toBe(1);
    markReviewed(itemReviewId({ kind: "vocab", chapter: 3, itemId: "w" }), "good");
    expect(countDueDrillItems()).toBe(0);
  });

  it("keeps a missed item due tomorrow rather than today", () => {
    seedVocabReviews({ chapter: 3, entries: [{ itemId: "w", labelBn: "w" }] });
    const next = markReviewed(itemReviewId({ kind: "vocab", chapter: 3, itemId: "w" }), "again");
    expect(next?.intervalDays).toBe(1);
    expect(next?.dueDate).not.toBe(todayKey());
    expect(countDueDrillItems()).toBe(0);
  });
});

describe("review destinations", () => {
  it("sends item entries to the drill and aggregates to their own surfaces", () => {
    expect(hrefForReview({ kind: "vocab", chapter: 4 } as never)).toBe("/review");
    expect(hrefForReview({ kind: "practice", chapter: 4 } as never)).toBe("/review");
    expect(hrefForReview({ kind: "eps", chapter: 4 } as never)).toBe("/review");
    expect(hrefForReview({ kind: "chapter", chapter: 4 } as never)).toBe("/lesson/4");
    expect(hrefForReview({ kind: "basics", moduleId: "jamo" } as never)).toBe("/basics/jamo");
    expect(hrefForReview({ kind: "mock" } as never)).toBe("/mock-test");
  });
});

describe("storage limits", () => {
  it("holds far more than one entry per curriculum word", () => {
    const entries = Array.from({ length: 1200 }, (_, index) => ({ itemId: `w${index}`, labelBn: `w${index}` }));
    seedVocabReviews({ chapter: 1, entries });
    expect(countDueDrillItems()).toBe(1200);
  });

  it("keeps the most recent entries instead of losing the whole schedule when quota is exceeded", () => {
    recordItemReviews({
      kind: "vocab",
      chapter: 1,
      results: Array.from({ length: 400 }, (_, index) => ({
        itemId: `w${index}`,
        labelBn: `w${index}`,
        correct: false,
      })),
    });
    const fullSize = (storage.getItem("easyeps-srs-v2") ?? "").length;

    storage.quotaBytes = Math.floor(fullSize / 3);
    recordItemReviews({ kind: "vocab", chapter: 1, results: [{ itemId: "fresh", labelBn: "fresh", correct: false }] });

    const stored = JSON.parse(storage.getItem("easyeps-srs-v2") ?? "[]") as Array<{ itemId?: string }>;
    expect(stored.length).toBeGreaterThan(0);
    expect(stored.length).toBeLessThan(400);
    expect(stored[0]?.itemId).toBe("fresh");
  });
});
