import { useSyncExternalStore } from "react";

export type ChapterProgress = {
  chapter: number;
  vocabDone?: boolean;
  grammarDone?: boolean;
  dialogueDone?: boolean;
  practiceScore?: number;
  practiceTotal?: number;
  examScore?: number;
  examTotal?: number;
  completed?: boolean;
  updatedAt: string;
};

export type LocalAttempt = {
  id: string;
  kind: "practice" | "chapter-exam" | "mock-test";
  chapter?: number;
  score: number;
  total: number;
  durationSec: number;
  createdAt: string;
};

export type LocalPlannerItem = {
  id: string;
  date: string;
  chapter: number;
  kind: "lesson" | "practice" | "exam" | "review";
  done: boolean;
};

export type LocalLearningState = {
  progress: Record<number, ChapterProgress>;
  attempts: LocalAttempt[];
  studyDays: Record<string, { minutes: number; activities: number }>;
  planner: {
    dailyGoalMinutes: number;
    dailyGoalLessons: number;
    reminderTime: string;
    targetExamDate: string;
    items: LocalPlannerItem[];
  };
};

const KEY = "easyeps-learning-v2";
const emptyState: LocalLearningState = {
  progress: {},
  attempts: [],
  studyDays: {},
  planner: { dailyGoalMinutes: 30, dailyGoalLessons: 1, reminderTime: "20:00", targetExamDate: "", items: [] },
};

let cachedRaw = "";
let cachedState = emptyState;
const listeners = new Set<() => void>();

function parseState(raw: string | null): LocalLearningState {
  if (!raw) return emptyState;
  try {
    const parsed = JSON.parse(raw) as Partial<LocalLearningState>;
    return {
      progress: parsed.progress ?? {},
      attempts: parsed.attempts ?? [],
      studyDays: parsed.studyDays ?? {},
      planner: { ...emptyState.planner, ...(parsed.planner ?? {}), items: parsed.planner?.items ?? [] },
    };
  } catch {
    return emptyState;
  }
}

function getSnapshot() {
  const raw = localStorage.getItem(KEY) ?? "";
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedState = parseState(raw);
  }
  return cachedState;
}

function save(next: LocalLearningState) {
  cachedState = next;
  cachedRaw = JSON.stringify(next);
  localStorage.setItem(KEY, cachedRaw);
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) {
      cachedRaw = "";
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLocalLearning() {
  return useSyncExternalStore(subscribe, getSnapshot, () => emptyState);
}

export function updateChapterProgress(chapter: number, patch: Omit<Partial<ChapterProgress>, "chapter" | "updatedAt">, minutes = 5) {
  const current = getSnapshot();
  const previous = current.progress[chapter] ?? { chapter, updatedAt: new Date().toISOString() };
  const nextProgress = { ...previous, ...patch, chapter, updatedAt: new Date().toISOString() };
  const day = new Date().toISOString().slice(0, 10);
  const previousDay = current.studyDays[day] ?? { minutes: 0, activities: 0 };
  save({
    ...current,
    progress: { ...current.progress, [chapter]: nextProgress },
    studyDays: { ...current.studyDays, [day]: { minutes: previousDay.minutes + minutes, activities: previousDay.activities + 1 } },
  });
  return nextProgress;
}

export function addLocalAttempt(attempt: Omit<LocalAttempt, "id" | "createdAt">) {
  const current = getSnapshot();
  const record: LocalAttempt = { ...attempt, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  const day = record.createdAt.slice(0, 10);
  const previousDay = current.studyDays[day] ?? { minutes: 0, activities: 0 };
  save({
    ...current,
    attempts: [record, ...current.attempts].slice(0, 200),
    studyDays: {
      ...current.studyDays,
      [day]: { minutes: previousDay.minutes + Math.max(1, Math.round(record.durationSec / 60)), activities: previousDay.activities + 1 },
    },
  });
  return record;
}

export function savePlannerSettings(patch: Partial<Omit<LocalLearningState["planner"], "items">>) {
  const current = getSnapshot();
  save({ ...current, planner: { ...current.planner, ...patch } });
}

export function addPlannerItem(item: Omit<LocalPlannerItem, "id" | "done">) {
  const current = getSnapshot();
  save({ ...current, planner: { ...current.planner, items: [...current.planner.items, { ...item, id: crypto.randomUUID(), done: false }] } });
}

export function setPlannerItemDone(id: string, done: boolean) {
  const current = getSnapshot();
  save({ ...current, planner: { ...current.planner, items: current.planner.items.map(item => item.id === id ? { ...item, done } : item) } });
}

export function removePlannerItem(id: string) {
  const current = getSnapshot();
  save({ ...current, planner: { ...current.planner, items: current.planner.items.filter(item => item.id !== id) } });
}

export function learningOverview(state: LocalLearningState) {
  const completedLessons = Object.values(state.progress).filter(item => item.completed).length;
  const scored = state.attempts.filter(item => item.total > 0);
  const averageScore = scored.length ? Math.round(scored.reduce((sum, item) => sum + item.score / item.total * 100, 0) / scored.length) : 0;
  const dates = new Set(Object.keys(state.studyDays));
  let cursor = new Date();
  if (!dates.has(cursor.toISOString().slice(0, 10))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (dates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return {
    completedLessons,
    averageScore,
    streak,
    studyMinutes: Object.values(state.studyDays).reduce((sum, day) => sum + day.minutes, 0),
  };
}
