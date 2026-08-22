/**
 * Aggregate kinds ("chapter", "basics", "mock") schedule a whole unit and are kept for the
 * dashboard, planner and readiness surfaces. Item kinds ("vocab", "practice", "eps") schedule a
 * single word or question, which is what spaced repetition is actually for: a learner who misses
 * 3 words out of 30 should review those 3, not re-read the chapter.
 */
export type ReviewKind = "chapter" | "basics" | "mock" | "vocab" | "practice" | "eps";
export type ReviewRating = "again" | "hard" | "good" | "easy";

/** Item kinds the review drill can quiz directly. */
export const DRILLABLE_KINDS = ["vocab", "practice", "eps"] as const;
export type DrillableKind = (typeof DRILLABLE_KINDS)[number];

export function isDrillableKind(kind: ReviewKind): kind is DrillableKind {
  return (DRILLABLE_KINDS as readonly string[]).includes(kind);
}

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
  /** Item kinds only: the vocabulary key (`ko`) or question id this entry tracks. */
  itemId?: string;
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
 * The curriculum holds 1922 vocabulary entries and ~2400 questions, so the old cap of 120 could
 * not hold even one entry per word. Items are stored most-recently-touched first and evicted from
 * the tail, keeping the active working set rather than the whole curriculum.
 */
const MAX_ITEMS = 2500;
/** Trimmed from 12 to keep 2500 items inside the ~5 MB localStorage budget. */
const HISTORY_LIMIT = 8;
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
    itemId: item.itemId,
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
    history: Array.isArray(item.history) ? item.history.slice(-HISTORY_LIMIT) : [],
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
 * Writes are best-effort: a learner deep into the curriculum can hold thousands of items, and
 * mobile Safari throws QuotaExceededError rather than silently dropping data. Rather than losing
 * the whole schedule, progressively drop the coldest items (the list is most-recent-first) until
 * the payload fits.
 */
function save(items: ReviewItem[]) {
  if (!isBrowser()) return;
  let capped = items.slice(0, MAX_ITEMS);
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      localStorage.setItem(KEY, JSON.stringify(capped));
      return;
    } catch {
      if (capped.length <= 50) break;
      capped = capped.slice(0, Math.floor(capped.length / 2));
    }
  }
}

function reviewId(input: { kind: ReviewKind; chapter?: number; moduleId?: string; itemId?: string }) {
  if (input.kind === "chapter") return `chapter-${input.chapter ?? "unknown"}`;
  if (input.kind === "basics") return `basics-${input.moduleId ?? "checkpoint"}`;
  if (input.kind === "mock") return "mock-test";
  // Item kinds are scoped by chapter so the same word appearing in two chapters is one entry per
  // chapter, matching how the lessons actually teach it.
  return `${input.kind}-${input.chapter ?? 0}-${input.itemId ?? "unknown"}`;
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
    history: [...item.history, { reviewedAt, rating, scoreRatio, intervalDays }].slice(-HISTORY_LIMIT),
  };
}

function createItem(input: {
  id: string;
  kind: ReviewKind;
  chapter?: number;
  moduleId?: string;
  itemId?: string;
  labelBn: string;
  now: string;
  scoreRatio?: number;
  mastery?: number;
}): ReviewItem {
  return {
    id: input.id,
    version: 2,
    kind: input.kind,
    chapter: input.chapter,
    moduleId: input.moduleId,
    itemId: input.itemId,
    labelBn: input.labelBn,
    misses: 0,
    lapses: 0,
    repetitions: 0,
    intervalDays: 1,
    easeFactor: 2.3,
    mastery: input.mastery ?? 40,
    lastScoreRatio: input.scoreRatio,
    lastMissedAt: input.now,
    lastReviewedAt: input.now,
    dueDate: todayKey(),
    history: [],
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
  const base: ReviewItem =
    existing ??
    createItem({
      id,
      kind: input.kind,
      chapter: input.chapter,
      moduleId: input.moduleId,
      labelBn: input.labelBn,
      now,
      scoreRatio: ratio,
    });
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

/**
 * Record per-item outcomes from one attempt. This is what makes the schedule useful: a learner who
 * misses 3 words out of 30 gets those 3 back tomorrow instead of re-reading the whole chapter.
 *
 * Correct answers map to "good" and wrong ones to "again" rather than going through
 * `ratingFromRatio`, because a binary outcome carries no confidence signal — treating a first-try
 * correct as "easy" would push the next review out four days on no evidence.
 */
export function recordItemReviews(input: {
  kind: DrillableKind;
  chapter?: number;
  /** `chapter` per result overrides the batch chapter — a mock test draws from many chapters. */
  results: Array<{ itemId: string; labelBn: string; correct: boolean; chapter?: number }>;
}): ReviewItem[] {
  if (!input.results.length) return [];
  const now = new Date().toISOString();
  const items = load();
  const byId = new Map(items.map(item => [item.id, item] as const));
  const touched: ReviewItem[] = [];
  const seen = new Set<string>();

  for (const result of input.results) {
    if (!result.itemId || !result.labelBn) continue;
    const chapter = result.chapter ?? input.chapter;
    const id = reviewId({ kind: input.kind, chapter, itemId: result.itemId });
    // One attempt may show the same word twice; the first outcome is the honest one.
    if (seen.has(id)) continue;
    seen.add(id);
    const base =
      byId.get(id) ??
      createItem({
        id,
        kind: input.kind,
        chapter,
        itemId: result.itemId,
        labelBn: result.labelBn,
        now,
      });
    touched.push(
      scheduleReview(
        { ...base, chapter, itemId: result.itemId, labelBn: result.labelBn },
        result.correct ? "good" : "again",
        now,
        result.correct ? 1 : 0,
      ),
    );
  }

  if (!touched.length) return [];
  save([...touched, ...items.filter(item => !seen.has(item.id))]);
  return touched;
}

/**
 * Register the vocabulary of a chapter the learner has just worked through. Seeded entries are due
 * immediately with a low mastery so the next drill covers the new words. Words that already have a
 * schedule are left alone, and seeds are appended after existing items so that when the store is
 * over quota an un-drilled seed is evicted before a real review history.
 */
export function seedVocabReviews(input: {
  chapter: number;
  entries: Array<{ itemId: string; labelBn: string }>;
}): number {
  if (!input.entries.length) return 0;
  const now = new Date().toISOString();
  const items = load();
  const known = new Set(items.map(item => item.id));
  const created: ReviewItem[] = [];

  for (const entry of input.entries) {
    if (!entry.itemId || !entry.labelBn) continue;
    const id = reviewId({ kind: "vocab", chapter: input.chapter, itemId: entry.itemId });
    if (known.has(id)) continue;
    known.add(id);
    created.push(
      createItem({
        id,
        kind: "vocab",
        chapter: input.chapter,
        itemId: entry.itemId,
        labelBn: entry.labelBn,
        now,
        mastery: 20,
      }),
    );
  }

  if (!created.length) return 0;
  save([...items, ...created]);
  return created.length;
}

export function listDueReviews(limit = 10): ReviewItem[] {
  const today = todayKey();
  return load()
    .filter(item => item.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.mastery - b.mastery || b.lapses - a.lapses)
    .slice(0, limit);
}

/** Due items the review drill can quiz directly (single words/questions), weakest first. */
export function listDueDrillItems(limit = 20): ReviewItem[] {
  const today = todayKey();
  return load()
    .filter(item => isDrillableKind(item.kind) && !!item.itemId && item.dueDate <= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.mastery - b.mastery || b.lapses - a.lapses)
    .slice(0, limit);
}

/** Total drillable items due today, for badges and the daily plan. */
export function countDueDrillItems(): number {
  const today = todayKey();
  return load().filter(item => isDrillableKind(item.kind) && !!item.itemId && item.dueDate <= today).length;
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

/** Storage id for an item entry, so callers can map drill cards back to their schedule. */
export function itemReviewId(input: { kind: DrillableKind; chapter?: number; itemId: string }) {
  return reviewId(input);
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
  // Item kinds go to the drill, which quizzes the word or question itself; sending a learner back
  // to a 30-minute chapter to recover one missed word is the behaviour this replaces.
  if (isDrillableKind(item.kind)) return "/review";
  if (item.kind === "chapter" && item.chapter) return `/lesson/${item.chapter}`;
  if (item.kind === "basics") return item.moduleId ? `/basics/${item.moduleId}` : "/basics";
  return "/mock-test";
}
