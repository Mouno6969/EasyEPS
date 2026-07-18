/**
 * Lightweight spaced-review helpers for guest + dashboard surfaces.
 * Stores weak chapter/module references when the learner scores poorly.
 */

export type ReviewItem = {
  id: string;
  kind: "chapter" | "basics" | "mock";
  chapter?: number;
  moduleId?: string;
  labelBn: string;
  misses: number;
  lastMissedAt: string;
  /** ISO date when item is due for review (yyyy-mm-dd). */
  dueDate: string;
};

const KEY = "easyeps-srs-v1";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function load(): ReviewItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ReviewItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(items: ReviewItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 80)));
}

/** Record a weak study moment (score ratio < 0.75). */
export function recordWeakAttempt(input: {
  kind: ReviewItem["kind"];
  chapter?: number;
  moduleId?: string;
  labelBn: string;
  score: number;
  total: number;
}) {
  if (input.total <= 0) return;
  const ratio = input.score / input.total;
  if (ratio >= 0.75) return;

  const id =
    input.kind === "chapter"
      ? `chapter-${input.chapter}`
      : input.kind === "basics"
        ? `basics-${input.moduleId ?? "checkpoint"}`
        : "mock-test";

  const items = load();
  const now = new Date().toISOString();
  const existing = items.find(item => item.id === id);
  const interval = ratio < 0.4 ? 1 : ratio < 0.6 ? 2 : 3;
  const next: ReviewItem = {
    id,
    kind: input.kind,
    chapter: input.chapter,
    moduleId: input.moduleId,
    labelBn: input.labelBn,
    misses: (existing?.misses ?? 0) + 1,
    lastMissedAt: now,
    dueDate: addDays(todayKey(), interval),
  };
  const filtered = items.filter(item => item.id !== id);
  filtered.unshift(next);
  save(filtered);
}

export function listDueReviews(limit = 10): ReviewItem[] {
  const today = todayKey();
  return load()
    .filter(item => item.dueDate <= today)
    .sort((a, b) => b.misses - a.misses || b.lastMissedAt.localeCompare(a.lastMissedAt))
    .slice(0, limit);
}

export function listRecentWeak(limit = 5): ReviewItem[] {
  return load()
    .sort((a, b) => b.lastMissedAt.localeCompare(a.lastMissedAt))
    .slice(0, limit);
}

export function markReviewed(id: string) {
  const items = load();
  const next = items.map(item =>
    item.id === id
      ? { ...item, dueDate: addDays(todayKey(), Math.min(14, 2 + item.misses)), misses: Math.max(0, item.misses - 1) }
      : item,
  );
  save(next);
}

export function hrefForReview(item: ReviewItem): string {
  if (item.kind === "chapter" && item.chapter) return `/lesson/${item.chapter}`;
  if (item.kind === "basics") return item.moduleId ? `/basics/${item.moduleId}` : "/basics";
  return "/mock-test";
}
