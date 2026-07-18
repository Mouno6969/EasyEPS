/**
 * Weekly mock challenge: same question count seed for all users in a given ISO week.
 * UI can show the challenge banner; scoring still uses the regular mock-test flow.
 */

export function getIsoWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export type WeeklyChallengeState = {
  week: string;
  /** Preferred mock size for this week (stable). */
  count: 20 | 40;
  bestScore: number | null;
  bestTotal: number | null;
  attempts: number;
};

const KEY = "easyeps-weekly-challenge-v1";

export function getWeeklyChallenge(): WeeklyChallengeState {
  const week = getIsoWeekKey();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WeeklyChallengeState;
      if (parsed.week === week) return parsed;
    }
  } catch {
    // ignore
  }
  // Deterministic 20 vs 40 from week string
  let h = 0;
  for (let i = 0; i < week.length; i++) h = (h * 31 + week.charCodeAt(i)) >>> 0;
  const state: WeeklyChallengeState = {
    week,
    count: h % 2 === 0 ? 40 : 20,
    bestScore: null,
    bestTotal: null,
    attempts: 0,
  };
  localStorage.setItem(KEY, JSON.stringify(state));
  return state;
}

export function recordWeeklyChallengeScore(score: number, total: number) {
  const current = getWeeklyChallenge();
  const better =
    current.bestScore == null ||
    score / total > (current.bestScore / (current.bestTotal || 1));
  const next: WeeklyChallengeState = {
    ...current,
    attempts: current.attempts + 1,
    bestScore: better ? score : current.bestScore,
    bestTotal: better ? total : current.bestTotal,
  };
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
