import { useSyncExternalStore } from "react";
import {
  applyBasicsModulePatch,
  emptyBasicsProgress,
  isBasicsComplete,
  type BasicsModule,
  type BasicsModuleProgress,
  type BasicsProgress,
  type BasicsProgressPatch,
} from "@shared/basics";
import {
  evaluateMilestones,
  LEARNING_CONTENT_VERSION,
  summarizeItemEvidence,
  updateItemEvidence,
  type ConfidenceLevel,
  type DiagnosticResult,
  type ItemEvidence,
  type LearningItemKind,
  type ListeningEvidence,
  type Milestone,
  type PracticeFormat,
} from "@shared/learning";

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
  /** Hangul Basics track progress (optional for parse tolerance of older saves). */
  basics?: BasicsProgress;
  contentVersion: string;
  itemEvidence: Record<string, ItemEvidence>;
  listening: Record<string, ListeningEvidence>;
  diagnostic?: DiagnosticResult;
  milestones: Milestone[];
};

const KEY = "easyeps-learning-v5";
const LEGACY_KEYS = ["easyeps-learning-v4", "easyeps-learning-v3", "easyeps-learning-v2"];
const emptyState: LocalLearningState = {
  progress: {},
  attempts: [],
  studyDays: {},
  planner: { dailyGoalMinutes: 30, dailyGoalLessons: 1, reminderTime: "20:00", targetExamDate: "", items: [] },
  basics: emptyBasicsProgress(),
  contentVersion: LEARNING_CONTENT_VERSION,
  itemEvidence: {},
  listening: {},
  milestones: [],
};

let cachedRaw = "";
let cachedState = emptyState;
const listeners = new Set<() => void>();

function parseBasics(raw: unknown): BasicsProgress {
  if (!raw || typeof raw !== "object") return emptyBasicsProgress();
  const value = raw as Partial<BasicsProgress>;
  return {
    version: 1,
    modules: (value.modules ?? {}) as Record<string, BasicsModuleProgress>,
    checkpointPassedAt: value.checkpointPassedAt,
    unlockSource: value.unlockSource,
  };
}

function parseState(raw: string | null): LocalLearningState {
  if (!raw) return emptyState;
  try {
    const parsed = JSON.parse(raw) as Partial<LocalLearningState>;
    return {
      progress: parsed.progress ?? {},
      attempts: parsed.attempts ?? [],
      studyDays: parsed.studyDays ?? {},
      planner: { ...emptyState.planner, ...(parsed.planner ?? {}), items: parsed.planner?.items ?? [] },
      basics: parseBasics(parsed.basics),
      contentVersion: parsed.contentVersion ?? LEARNING_CONTENT_VERSION,
      itemEvidence: parsed.itemEvidence ?? {},
      listening: parsed.listening ?? {},
      diagnostic: parsed.diagnostic,
      milestones: parsed.milestones ?? [],
    };
  } catch {
    return emptyState;
  }
}

export function getSnapshot() {
  const raw = localStorage.getItem(KEY) ?? LEGACY_KEYS.map(key => localStorage.getItem(key)).find(Boolean) ?? "";
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

export function getLocalBasicsProgress(): BasicsProgress {
  return getSnapshot().basics ?? emptyBasicsProgress();
}

export function saveLocalBasicsProgress(basics: BasicsProgress) {
  const current = getSnapshot();
  save({ ...current, basics });
  return basics;
}

export function applyLocalBasicsModulePatch(
  patch: Omit<BasicsProgressPatch, "minutes">,
  content?: BasicsModule,
  minutes = 5,
): BasicsModuleProgress {
  const current = getSnapshot();
  const basics = current.basics ?? emptyBasicsProgress();
  const nextModule = applyBasicsModulePatch(basics.modules[patch.moduleId], patch, content);
  const nextBasics: BasicsProgress = {
    ...basics,
    version: 1,
    modules: { ...basics.modules, [patch.moduleId]: nextModule },
  };
  const day = new Date().toISOString().slice(0, 10);
  const previousDay = current.studyDays[day] ?? { minutes: 0, activities: 0 };
  save({
    ...current,
    basics: nextBasics,
    studyDays: {
      ...current.studyDays,
      [day]: { minutes: previousDay.minutes + minutes, activities: previousDay.activities + 1 },
    },
  });
  return nextModule;
}

/** Mark local checkpoint pass after scoreBasicsQuiz (guest unlock only). */
export function setLocalBasicsCheckpointPass(
  score: number,
  total: number,
  opts?: { unlockSource?: BasicsProgress["unlockSource"] },
) {
  const current = getSnapshot();
  const basics = current.basics ?? emptyBasicsProgress();
  const now = new Date().toISOString();
  const checkpointModule = basics.modules.checkpoint ?? {
    moduleId: "checkpoint",
    stepsDone: ["cp-quiz"],
    speakItemsDone: [],
    writeItemsDone: [],
    builderItemsDone: [],
    readItemsDone: [],
    updatedAt: now,
  };
  const nextBasics: BasicsProgress = {
    ...basics,
    version: 1,
    modules: {
      ...basics.modules,
      checkpoint: {
        ...checkpointModule,
        moduleId: "checkpoint",
        quizScore: score,
        quizTotal: total,
        stepsDone: checkpointModule.stepsDone.includes("cp-quiz")
          ? checkpointModule.stepsDone
          : [...checkpointModule.stepsDone, "cp-quiz"],
        updatedAt: now,
        completed: true,
      },
    },
    checkpointPassedAt: basics.checkpointPassedAt ?? now,
    unlockSource: opts?.unlockSource ?? basics.unlockSource ?? "checkpoint",
  };
  const day = now.slice(0, 10);
  const previousDay = current.studyDays[day] ?? { minutes: 0, activities: 0 };
  save({
    ...current,
    basics: nextBasics,
    studyDays: {
      ...current.studyDays,
      [day]: { minutes: previousDay.minutes + 5, activities: previousDay.activities + 1 },
    },
  });
  return nextBasics;
}

/** Mirror trusted remote unlock into local storage (does not invent unlock). */
export function mirrorRemoteBasicsUnlock(remote: {
  completed: boolean;
  completedAt?: string | null;
  unlockSource?: string | null;
  progress?: BasicsProgress;
}) {
  const current = getSnapshot();
  const basics = current.basics ?? emptyBasicsProgress();
  if (!remote.completed) {
    if (remote.progress) {
      save({
        ...current,
        basics: {
          version: 1,
          modules: remote.progress.modules ?? basics.modules,
          checkpointPassedAt: basics.checkpointPassedAt,
          unlockSource: basics.unlockSource,
        },
      });
    }
    return getLocalBasicsProgress();
  }
  const next: BasicsProgress = {
    version: 1,
    modules: remote.progress?.modules ?? basics.modules,
    checkpointPassedAt:
      remote.progress?.checkpointPassedAt ??
      remote.completedAt ??
      basics.checkpointPassedAt ??
      new Date().toISOString(),
    unlockSource:
      (remote.progress?.unlockSource as BasicsProgress["unlockSource"]) ??
      (remote.unlockSource as BasicsProgress["unlockSource"]) ??
      basics.unlockSource ??
      "checkpoint",
  };
  save({ ...current, basics: next });
  return next;
}

export function useLocalBasics(): BasicsProgress {
  const state = useLocalLearning();
  return state.basics ?? emptyBasicsProgress();
}

export function localBasicsCompleted(state?: LocalLearningState): boolean {
  const basics = (state ?? getSnapshot()).basics ?? emptyBasicsProgress();
  return isBasicsComplete(basics);
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

function updateMilestones(state: LocalLearningState): LocalLearningState {
  const overview = learningOverview(state);
  const summary = summarizeItemEvidence(state.itemEvidence);
  return {
    ...state,
    milestones: evaluateMilestones({
      current: state.milestones,
      completedLessons: overview.completedLessons,
      itemCount: summary.itemCount,
      retainedItems: Object.values(state.itemEvidence).filter(item => item.retentionChecks > 0 && item.retentionCorrect / item.retentionChecks >= 0.8).length,
      transferItems: Object.values(state.itemEvidence).filter(item => item.transferChecks > 0 && item.transferCorrect / item.transferChecks >= 0.6).length,
      diagnosticCompleted: Boolean(state.diagnostic),
      listeningItems: Object.values(state.itemEvidence).filter(item => item.section === "listening" && item.attempts > 0).length,
      streak: overview.streak,
      totalAttempts: state.attempts.length,
    }),
  };
}

export function recordItemResult(input: {
  itemId: string;
  kind: LearningItemKind;
  chapter?: number;
  section?: "reading" | "listening";
  skillTags?: string[];
  correct: boolean;
  confidence: ConfidenceLevel;
  responseMs?: number;
  isRetentionCheck?: boolean;
  isTransferCheck?: boolean;
  format?: PracticeFormat;
  minutes?: number;
}) {
  const current = getSnapshot();
  const nextEvidence = updateItemEvidence(current.itemEvidence[input.itemId], input);
  const day = new Date().toISOString().slice(0, 10);
  const previousDay = current.studyDays[day] ?? { minutes: 0, activities: 0 };
  const next = updateMilestones({
    ...current,
    itemEvidence: { ...current.itemEvidence, [input.itemId]: nextEvidence },
    studyDays: { ...current.studyDays, [day]: { minutes: previousDay.minutes + (input.minutes ?? 0), activities: previousDay.activities + 1 } },
  });
  save(next);
  return nextEvidence;
}

export function saveDiagnosticResult(result: DiagnosticResult) {
  const current = getSnapshot();
  const next = updateMilestones({ ...current, diagnostic: result });
  save(next);
  return result;
}

export function recordListeningEvidence(input: Omit<ListeningEvidence, "updatedAt">) {
  const current = getSnapshot();
  const previous = current.listening[input.itemId];
  const merged: ListeningEvidence = {
    ...previous,
    ...input,
    plays: Math.max(previous?.plays ?? 0, input.plays),
    normalPlays: Math.max(previous?.normalPlays ?? 0, input.normalPlays),
    slowPlays: Math.max(previous?.slowPlays ?? 0, input.slowPlays),
    dictationAttempts: Math.max(previous?.dictationAttempts ?? 0, input.dictationAttempts),
    dictationCorrect: Math.max(previous?.dictationCorrect ?? 0, input.dictationCorrect),
    transcriptRevealed: Boolean(previous?.transcriptRevealed || input.transcriptRevealed),
    transcriptDependentCount: Math.max(previous?.transcriptDependentCount ?? 0, input.transcriptDependentCount),
    firstPlayCorrect: previous?.firstPlayCorrect ?? input.firstPlayCorrect,
    updatedAt: new Date().toISOString(),
  };
  save(updateMilestones({ ...current, listening: { ...current.listening, [input.itemId]: merged } }));
  return merged;
}

export function exportLearningState() {
  const state = getSnapshot();
  return { exportVersion: 1, exportedAt: new Date().toISOString(), ...state };
}

export function downloadLearningExport() {
  const payload = JSON.stringify(exportLearningState(), null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `easyeps-progress-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
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
