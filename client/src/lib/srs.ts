export type ReviewKind = "chapter" | "basics" | "mock";
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
const MAX_ITEMS = 120;
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

function save(items: ReviewItem[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
}

function reviewId(input: { kind: ReviewKind; chapter?: number; moduleId?: string }) {
  if (input.kind === "chapter") return `chapter-${input.chapter ?? "unknown"}`;
  if (input.kind === "basics") return `basics-${input.moduleId ?? "checkpoint"}`;
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
    dueDate: addDays(reviewDate, intervalDays),
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
    { ...base, chapter: input.chapter, moduleId: input.moduleId, labelBn: input.labelBn },
    ratingFromRatio(ratio),
    now,
    ratio,
  );
  save([scheduled, ...items.filter(item => item.id !== id)]);
  return scheduled;
}

/** @deprecated Kept for compatibility with existing attempt flows. */
export const recordWeakAttempt = recordReviewAttempt;

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
  if (item.kind === "chapter" && item.chapter) return `/lesson/${item.chapter}`;
  if (item.kind === "basics") return item.moduleId ? `/basics/${item.moduleId}` : "/basics";
  return "/mock-test";
}
