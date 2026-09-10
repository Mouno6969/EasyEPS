import type { EpsQuestion, Lesson } from "./lesson";
import { shuffleCopy } from "./scoring";

export type SmartMockMode = "balanced" | "smart";
export type SmartMockSectionFocus = "auto" | "reading" | "listening";

export type MockQuestionCandidate = EpsQuestion & {
  chapter: number;
  lessonTitle: Lesson["title"];
};

export type SmartMockOptions = {
  count: number;
  mode?: SmartMockMode;
  focusChapters?: number[];
  focusSection?: SmartMockSectionFocus;
};

function interleaveChapters(items: MockQuestionCandidate[]) {
  const grouped = new Map<number, MockQuestionCandidate[]>();
  for (const item of shuffleCopy(items)) {
    const group = grouped.get(item.chapter) ?? [];
    group.push(item);
    grouped.set(item.chapter, group);
  }
  const chapterOrder = shuffleCopy([...grouped.keys()]);
  const result: MockQuestionCandidate[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const chapter of chapterOrder) {
      const item = grouped.get(chapter)?.shift();
      if (!item) continue;
      result.push(item);
      added = true;
    }
  }
  return result;
}

function selectSection(
  pool: MockQuestionCandidate[],
  count: number,
  mode: SmartMockMode,
  focusChapters: Set<number>,
) {
  if (count <= 0) return [];
  if (mode !== "smart" || focusChapters.size === 0) return interleaveChapters(pool).slice(0, count);

  const focused = interleaveChapters(pool.filter(question => focusChapters.has(question.chapter)));
  const broad = interleaveChapters(pool.filter(question => !focusChapters.has(question.chapter)));
  const focusTarget = Math.min(focused.length, Math.ceil(count * 0.65));
  const selected = [...focused.slice(0, focusTarget), ...broad.slice(0, count - focusTarget)];

  if (selected.length < count) {
    const selectedIds = new Set(selected.map(question => `${question.chapter}:${question.id}`));
    selected.push(
      ...interleaveChapters(pool)
        .filter(question => !selectedIds.has(`${question.chapter}:${question.id}`))
        .slice(0, count - selected.length),
    );
  }
  return selected;
}

/**
 * Compose a mock paper that mirrors the real EPS-TOPIK CBT:
 * every exam has 20 listening questions FIRST (듣기, 25 min) followed by
 * 20 reading questions (읽기, 25 min) — 40 questions, 50 minutes, 100 points.
 * Sub-length tests keep the same listening→reading order and proportions.
 */
export function buildSmartMockQuestions(
  all: MockQuestionCandidate[],
  options: SmartMockOptions,
): MockQuestionCandidate[] {
  const count = Math.max(10, Math.min(40, Math.round(options.count)));
  const mode = options.mode ?? "balanced";
  const focusSection = options.focusSection ?? "auto";
  const focusChapters = new Set((options.focusChapters ?? []).filter(chapter => chapter >= 1 && chapter <= 60));
  // Real exam is an even 20 listening / 20 reading split. Section focus only
  // skews practice papers, never the default balanced one.
  const listeningRatio = focusSection === "listening" ? 0.7 : focusSection === "reading" ? 0.3 : 0.5;
  const listeningCount = Math.round(count * listeningRatio);
  const readingCount = count - listeningCount;

  const reading = selectSection(
    all.filter(question => question.section === "reading"),
    readingCount,
    mode,
    focusChapters,
  );
  const listening = selectSection(
    all.filter(question => question.section === "listening"),
    listeningCount,
    mode,
    focusChapters,
  );
  // Exam order: the listening section always comes first (1–20), then reading.
  return [...listening, ...reading];
}
