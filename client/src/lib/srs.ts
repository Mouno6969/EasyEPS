export type ReviewKind = "chapter" | "basics" | "mock" | "vocab";
export type ReviewRating = "again" | "hard" | "good" | "easy";

export type ReviewHistoryEntry = {
  reviewedAt: string;
  rating: ReviewRating;
  scoreRatio?: number;
  intervalDays: number;
};

export type ReviewItem = {
  id: string;
  version: 2;
  kind: ReviewKind;
  chapter?: number;
  moduleId?: string;
  /** Korean headword — set only for `vocab` items. This is the per-word state. */
  word?: string;
  /** Bangla gloss shown on the review card, so recall does not need a lesson fetch. */
  glossBn?: string;
  labelBn: string;
  misses: number;
  lapses: number;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  mastery: number;
  lastScoreRatio?: number;
  lastMissedAt: string;
  lastReviewedAt: string;
  /** ISO date when the item is due for review (yyyy-mm-dd). */
  dueDate: string;
  history: ReviewHistoryEntry[];
};

type LegacyReviewItem = Partial<ReviewItem> & {
  id: string;
  kind: ReviewKind;
  labelBn: string;
  misses?: number;
  lastMissedAt?: string;
  dueDate?: string;
};

const KEY = "easyeps-srs-v2";
const LEGACY_KEY = "easyeps-srs-v1";
/**
 * Capacity is budgeted per kind. Vocabulary is far more numerous than chapters
 * (1,900+ headwords vs 60 chapters), so a single shared cap would let words evict
 * every chapter/basics review — or the reverse. Budgeting separately keeps both
 * queues useful.
 */
const MAX_ITEMS = 120;
const MAX_VOCAB_ITEMS = 400;
const MIN_EASE = 1.3;
const MAX_EASE = 2.8;

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(0, Math.round(days)));
  return d.toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isBrowser() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function ratingFromRatio(ratio: number): ReviewRating {
  if (ratio < 0.5) return "again";
  if (ratio < 0.75) return "hard";
  if (ratio < 0.9) return "good";
  return "easy";
}

function migrateItem(item: LegacyReviewItem): ReviewItem {
  const now = new Date().toISOString();
  const misses = Math.max(0, Number(item.misses ?? 0));
  const intervalDays = Math.max(1, Number(item.intervalDays ?? Math.min(14, 1 + misses)));
  const lastReviewedAt = item.lastReviewedAt ?? item.lastMissedAt ?? now;
  return {
    id: item.id,
    version: 2,
    kind: item.kind,
    chapter: item.chapter,
    moduleId: item.moduleId,
    word: item.word,
    glossBn: item.glossBn,
    labelBn: item.labelBn,
    misses,
    lapses: Math.max(0, Number(item.lapses ?? misses)),
    repetitions: Math.max(0, Number(item.repetitions ?? 0)),
    intervalDays,
    easeFactor: clamp(Number(item.easeFactor ?? 2.3), MIN_EASE, MAX_EASE),
    mastery: clamp(Number(item.mastery ?? Math.max(15, 65 - misses * 8)), 0, 100),
    lastScoreRatio: typeof item.lastScoreRatio === "number" ? clamp(item.lastScoreRatio, 0, 1) : undefined,
    lastMissedAt: item.lastMissedAt ?? lastReviewedAt,
    lastReviewedAt,
    dueDate: item.dueDate ?? addDays(todayKey(), intervalDays),
    history: Array.isArray(item.history) ? item.history.slice(-12) : [],
  };
}

function load(): ReviewItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LegacyReviewItem[];
    if (!Array.isArray(parsed)) return [];
    const items = parsed
      .filter(item => item && typeof item.id === "string" && typeof item.labelBn === "string")
      .map(migrateItem);
    if (!localStorage.getItem(KEY)) save(items);
    return items;
  } catch {
    return [];
  }
}

/**
 * Trim to the per-kind budget. When over capacity the best-known items are dropped
 * first: a word at high mastery with a distant due date has the least to lose from
 * falling out of the queue.
 */
function withinBudget(items: ReviewItem[]): ReviewItem[] {
  const keepFirst = (pool: ReviewItem[], limit: number) =>
    pool.length <= limit
      ? pool
      : [...pool]
          .sort((a, b) => a.mastery - b.mastery || a.dueDate.localeCompare(b.dueDate))
          .slice(0, limit);
  const vocab = keepFirst(items.filter(i => i.kind === "vocab"), MAX_VOCAB_ITEMS);
  const rest = keepFirst(items.filter(i => i.kind !== "vocab"), MAX_ITEMS);
  const kept = new Set([...vocab, ...rest].map(i => i.id));
  // Preserve caller ordering (most-recently-touched first) for whatever survived.
  return items.filter(i => kept.has(i.id));
}

function save(items: ReviewItem[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(withinBudget(items)));
}

function reviewId(input: { kind: ReviewKind; chapter?: number; moduleId?: string; word?: string }) {
  if (input.kind === "chapter") return `chapter-${input.chapter ?? "unknown"}`;
  if (input.kind === "basics") return `basics-${input.moduleId ?? "checkpoint"}`;
  if (input.kind === "vocab") return `vocab-${input.chapter ?? 0}-${input.word ?? ""}`;
  return "mock-test";
}

function scheduleReview(item: ReviewItem, rating: ReviewRating, reviewedAt: string, scoreRatio?: number): ReviewItem {
  let repetitions = item.repetitions;
  let intervalDays = item.intervalDays;
  let lapses = item.lapses;
  let misses = item.misses;
  let easeFactor = item.easeFactor;

  if (rating === "again") {
    repetitions = 0;
    intervalDays = 1;
    lapses += 1;
    misses += 1;
    easeFactor = clamp(easeFactor - 0.2, MIN_EASE, MAX_EASE);
  } else if (rating === "hard") {
    repetitions = Math.max(1, repetitions);
    intervalDays = Math.max(1, Math.round(intervalDays * 1.2));
    misses += 1;
    easeFactor = clamp(easeFactor - 0.12, MIN_EASE, MAX_EASE);
  } else {
    repetitions += 1;
    misses = Math.max(0, misses - 1);
    if (repetitions === 1) intervalDays = rating === "easy" ? 4 : 1;
    else if (repetitions === 2) intervalDays = rating === "easy" ? 7 : 3;
    else intervalDays = Math.max(intervalDays + 1, Math.round(intervalDays * easeFactor * (rating === "easy" ? 1.3 : 1)));
    easeFactor = clamp(easeFactor + (rating === "easy" ? 0.12 : 0.03), MIN_EASE, MAX_EASE);
  }

  intervalDays = clamp(intervalDays, 1, 180);
  const masteryDelta = rating === "again" ? -18 : rating === "hard" ? -6 : rating === "good" ? 9 : 14;
  const scoreMastery = typeof scoreRatio === "number" ? Math.round(scoreRatio * 100) : item.mastery;
  const mastery = clamp(Math.round(item.mastery * 0.55 + scoreMastery * 0.25 + (item.mastery + masteryDelta) * 0.2), 0, 100);
  const reviewDate = reviewedAt.slice(0, 10);
  // A lapse is due again immediately, not tomorrow. `intervalDays` stays >= 1 so the
  // SM-2 ladder keeps its shape, but something just answered wrong should be
  // re-drillable in the same sitting — otherwise the review queue reads as empty at
  // exactly the moment the learner has proven they need it.
  const dueDate = rating === "again" ? reviewDate : addDays(reviewDate, intervalDays);

  return {
    ...item,
    version: 2,
    misses,
    lapses,
    repetitions,
    intervalDays,
    easeFactor,
    mastery,
    lastScoreRatio: scoreRatio ?? item.lastScoreRatio,
    lastMissedAt: rating === "again" || rating === "hard" ? reviewedAt : item.lastMissedAt,
    lastReviewedAt: reviewedAt,
    dueDate,
    history: [...item.history, { reviewedAt, rating, scoreRatio, intervalDays }].slice(-12),
  };
}

/**
 * Record a graded learning attempt and move the item through an expanding review interval.
 * Existing callers may continue using `recordWeakAttempt`; high scores now schedule
 * consolidation reviews instead of disappearing from the review system.
 */
export function recordReviewAttempt(input: {
  kind: ReviewKind;
  chapter?: number;
  moduleId?: string;
  word?: string;
  glossBn?: string;
  labelBn: string;
  score: number;
  total: number;
}) {
  if (input.total <= 0) return undefined;
  const ratio = clamp(input.score / input.total, 0, 1);
  const now = new Date().toISOString();
  const id = reviewId(input);
  const items = load();
  const existing = items.find(item => item.id === id);
  const base: ReviewItem = existing ?? {
    id,
    version: 2,
    kind: input.kind,
    chapter: input.chapter,
    moduleId: input.moduleId,
    word: input.word,
    glossBn: input.glossBn,
    labelBn: input.labelBn,
    misses: 0,
    lapses: 0,
    repetitions: 0,
    intervalDays: 1,
    easeFactor: 2.3,
    mastery: 40,
    lastScoreRatio: ratio,
    lastMissedAt: now,
    lastReviewedAt: now,
    dueDate: todayKey(),
    history: [],
  };
  const scheduled = scheduleReview(
    {
      ...base,
      chapter: input.chapter,
      moduleId: input.moduleId,
      word: input.word ?? base.word,
      glossBn: input.glossBn ?? base.glossBn,
      labelBn: input.labelBn,
    },
    ratingFromRatio(ratio),
    now,
    ratio,
  );
  save([scheduled, ...items.filter(item => item.id !== id)]);
  return scheduled;
}

/** @deprecated Kept for compatibility with existing attempt flows. */
export const recordWeakAttempt = recordReviewAttempt;

/**
 * Record one word's outcome. Words enter the queue from misses the learner already
 * makes in practice and exams, so there is no extra step to opt into: getting a
 * question wrong is the signal.
 *
 * `correct` maps onto the same SM-2 ladder as everything else — a wrong answer
 * resets the interval, a right one extends it.
 */
export function recordVocabResult(input: {
  chapter: number;
  word: string;
  glossBn: string;
  correct: boolean;
}) {
  if (!input.word) return undefined;
  return recordReviewAttempt({
    kind: "vocab",
    chapter: input.chapter,
    word: input.word,
    glossBn: input.glossBn,
    labelBn: input.word,
    score: input.correct ? 1 : 0,
    total: 1,
  });
}

/** Words due today, weakest first. */
export function listDueVocab(limit = 20): ReviewItem[] {
  const today = todayKey();
  return load()
    .filter(item => item.kind === "vocab" && item.dueDate <= today)
    .sort((a, b) => a.mastery - b.mastery || a.dueDate.localeCompare(b.dueDate))
    .slice(0, limit);
}

/** Queue size + how much is due, for dashboard copy. */
export function vocabQueueStats(): { total: number; due: number; weak: number } {
  const today = todayKey();
  const vocab = load().filter(item => item.kind === "vocab");
  return {
    total: vocab.length,
    due: vocab.filter(i => i.dueDate <= today).length,
    // "Weak" means the learner has actually got it wrong — a freshly enrolled word
    // starts at low mastery but has not been tested, so counting it here would show
    // every new lesson as 35 problem words.
    weak: vocab.filter(i => i.lapses > 0 && i.mastery < 60).length,
  };
}

/**
 * Enrol every headword of a lesson when the learner finishes its vocabulary section.
 *
 * Harvesting misses only reaches words that appear in a graded question — measured
 * at 66% of the corpus. The remaining third live only in the word list, examples and
 * dialogues, so without this they could never be scheduled. Enrolment is idempotent:
 * words already in the queue keep the schedule they have earned.
 */
export function enrolVocabulary(
  chapter: number,
  words: Array<{ ko: string; bn: string }>,
): number {
  if (!words.length) return 0;
  const now = new Date().toISOString();
  const items = load();
  const known = new Set(items.map(i => i.id));
  const fresh: ReviewItem[] = [];

  for (const { ko, bn } of words) {
    const word = ko.trim();
    if (!word) continue;
    const id = reviewId({ kind: "vocab", chapter, word });
    if (known.has(id)) continue;
    known.add(id);
    fresh.push({
      id,
      version: 2,
      kind: "vocab",
      chapter,
      word,
      glossBn: bn,
      labelBn: word,
      misses: 0,
      lapses: 0,
      repetitions: 0,
      // Just-taught words come back the next day, then spread out from there.
      intervalDays: 1,
      easeFactor: 2.3,
      mastery: 35,
      lastMissedAt: now,
      lastReviewedAt: now,
      dueDate: addDays(todayKey(), 1),
      history: [],
    });
  }

  if (fresh.length) save([...fresh, ...items]);
  return fresh.length;
}

export function listDueReviews(limit = 10): ReviewItem[] {
  const today = todayKey();
  return load()
    .filter(item => item.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.mastery - b.mastery || b.lapses - a.lapses)
    .slice(0, limit);
}

export function listRecentWeak(limit = 5): ReviewItem[] {
  return load()
    .filter(item => item.mastery < 75 || item.misses > 0)
    .sort((a, b) => a.mastery - b.mastery || b.lastReviewedAt.localeCompare(a.lastReviewedAt))
    .slice(0, limit);
}

export function listUpcomingReviews(limit = 10): ReviewItem[] {
  return load()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.mastery - b.mastery)
    .slice(0, limit);
}

export function markReviewed(id: string, rating: ReviewRating = "good") {
  const items = load();
  const now = new Date().toISOString();
  const current = items.find(item => item.id === id);
  if (!current) return undefined;
  const next = scheduleReview(current, rating, now);
  save([next, ...items.filter(item => item.id !== id)]);
  return next;
}

export function reviewRatingLabel(rating: ReviewRating) {
  return rating === "again" ? "আবার" : rating === "hard" ? "কঠিন" : rating === "good" ? "ভালো" : "সহজ";
}

export function hrefForReview(item: ReviewItem): string {
  if (item.kind === "vocab") return item.chapter ? `/lesson/${item.chapter}?tab=vocabulary` : "/review";
  if (item.kind === "chapter" && item.chapter) return `/lesson/${item.chapter}`;
  if (item.kind === "basics") return item.moduleId ? `/basics/${item.moduleId}` : "/basics";
  return "/mock-test";
}
