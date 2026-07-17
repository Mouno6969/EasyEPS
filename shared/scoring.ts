import type { EpsQuestion, Lesson, PracticeQuestion } from "./lesson";

/** Fisher–Yates shuffle (unbiased). Mutates and returns the same array. */
export function shuffleInPlace<T>(items: T[], random: () => number = Math.random): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i]!;
    items[i] = items[j]!;
    items[j] = tmp;
  }
  return items;
}

export function shuffleCopy<T>(items: readonly T[], random: () => number = Math.random): T[] {
  return shuffleInPlace([...items], random);
}

export function isMatchingCorrect(
  question: PracticeQuestion,
  selections: Record<number, string> | undefined,
): boolean {
  if (question.type !== "matching") return false;
  if (!selections) return false;
  return question.pairs.every((pair, index) => selections[index] === pair.right);
}

export function scorePractice(
  questions: PracticeQuestion[],
  answers: Record<string, number>,
  matching: Record<string, Record<number, string>> = {},
): { score: number; total: number; correctIds: string[] } {
  const correctIds: string[] = [];
  for (const question of questions) {
    const ok =
      question.type === "matching"
        ? isMatchingCorrect(question, matching[question.id])
        : answers[question.id] === question.answer;
    if (ok) correctIds.push(question.id);
  }
  return { score: correctIds.length, total: questions.length, correctIds };
}

export function scoreEps(
  questions: EpsQuestion[],
  answers: Record<string, number>,
  idKey: (question: EpsQuestion) => string = question => question.id,
): { score: number; total: number; correctIds: string[] } {
  const correctIds: string[] = [];
  for (const question of questions) {
    const key = idKey(question);
    if (answers[key] === question.answer) correctIds.push(key);
  }
  return { score: correctIds.length, total: questions.length, correctIds };
}

export function scoreLessonExam(
  lesson: Lesson,
  kind: "practice" | "chapter-exam",
  answers: Record<string, number>,
  matching: Record<string, Record<number, string>> = {},
): { score: number; total: number; correctIds: string[] } {
  if (kind === "practice") return scorePractice(lesson.practice, answers, matching);
  return scoreEps(lesson.epsQuestions, answers);
}

export type MockQuestionRef = {
  chapter: number;
  id: string;
  testId: string;
};

export function scoreMockFromLessons(
  refs: MockQuestionRef[],
  answers: Record<string, number>,
  resolveQuestion: (chapter: number, id: string) => EpsQuestion | undefined,
): { score: number; total: number; correctIds: string[] } {
  const correctIds: string[] = [];
  for (const ref of refs) {
    const question = resolveQuestion(ref.chapter, ref.id);
    if (!question) continue;
    if (answers[ref.testId] === question.answer) correctIds.push(ref.testId);
  }
  return { score: correctIds.length, total: refs.length, correctIds };
}
