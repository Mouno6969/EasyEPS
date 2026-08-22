import type { EpsQuestionImage, Lesson } from "./lesson";
import { shuffleInPlace } from "./scoring";

/** A spaced-repetition entry the review drill wants to render. */
export type ReviewCardRef = {
  kind: "vocab" | "practice" | "eps";
  chapter: number;
  itemId: string;
};

/**
 * Everything the drill needs to ask one question and grade it, and nothing else. Deliberately not
 * the whole `Lesson`: a twenty-item queue can span twenty chapters, and shipping twenty lessons to
 * quiz twenty words is a few hundred KB on a connection this audience pays for by the megabyte.
 */
export type ReviewCard = {
  kind: ReviewCardRef["kind"];
  chapter: number;
  itemId: string;
  /** Prompt in Bangla — the instruction or question stem. */
  promptBn: string;
  /** Korean text being tested (the word, or the question in Korean). */
  promptKo: string;
  /** Reading passage or listening script, when the source question has one. */
  passage: string;
  options: string[];
  answer: number;
  explanationBn: string;
  section?: "reading" | "listening";
  image?: EpsQuestionImage;
  /** Short Bangla label reused for progress lists and toasts. */
  labelBn: string;
};

/** Bangla instruction for a vocabulary recognition card. */
const VOCAB_PROMPT_BN = "শব্দটির অর্থ কোনটি?";

function vocabCard(lesson: Lesson, itemId: string, random: () => number): ReviewCard | undefined {
  const entry = lesson.vocabulary.find(item => item.ko === itemId);
  if (!entry) return undefined;

  // Distractors come from the same chapter: words a learner studied together are the ones they
  // actually confuse, so a same-chapter choice tests recall rather than topic guessing. Meanings are
  // de-duplicated because two chapter words can share a Bangla gloss, which would otherwise show the
  // learner the same option twice.
  const distractors = [
    ...new Set(lesson.vocabulary.filter(item => item.ko !== entry.ko && item.bn !== entry.bn).map(item => item.bn)),
  ];
  shuffleInPlace(distractors, random);
  const options = shuffleInPlace([entry.bn, ...distractors.slice(0, 3)], random);

  return {
    kind: "vocab",
    chapter: lesson.chapter,
    itemId,
    promptBn: VOCAB_PROMPT_BN,
    promptKo: entry.ko,
    passage: entry.example.ko,
    options,
    answer: options.indexOf(entry.bn),
    explanationBn: `${entry.ko} (${entry.romanization}) — ${entry.bn}। উদাহরণ: ${entry.example.ko} — ${entry.example.bn}`,
    labelBn: `${entry.ko} · ${entry.bn}`,
  };
}

function practiceCard(lesson: Lesson, itemId: string): ReviewCard | undefined {
  const question = lesson.practice.find(item => item.id === itemId);
  // Matching questions need a pairing UI the drill does not have; they are never scheduled as
  // drillable items, so reaching one here means stale storage rather than a missing feature.
  if (!question || question.type === "matching") return undefined;

  return {
    kind: "practice",
    chapter: lesson.chapter,
    itemId,
    promptBn: question.questionBn,
    promptKo: question.questionKo,
    passage: "",
    options: question.options,
    answer: question.answer,
    explanationBn: question.explanationBn,
    image: question.image,
    labelBn: question.questionBn,
  };
}

function epsCard(lesson: Lesson, itemId: string): ReviewCard | undefined {
  const question = lesson.epsQuestions.find(item => item.id === itemId);
  if (!question) return undefined;

  return {
    kind: "eps",
    chapter: lesson.chapter,
    itemId,
    promptBn: question.questionBn,
    promptKo: question.questionKo,
    passage: question.passage,
    options: question.options,
    answer: question.answer,
    explanationBn: question.explanationBn,
    section: question.section,
    image: question.image,
    labelBn: question.questionBn,
  };
}

/**
 * Resolve review entries into drill cards, dropping any that no longer exist in the curriculum.
 * Entries can outlive content edits — a learner's schedule is months long — so a missing item is
 * expected and simply skipped rather than treated as an error.
 */
export function buildReviewCards(
  refs: ReviewCardRef[],
  resolveLesson: (chapter: number) => Lesson | undefined,
  random: () => number = Math.random,
): ReviewCard[] {
  const cards: ReviewCard[] = [];
  const lessons = new Map<number, Lesson | undefined>();

  for (const ref of refs) {
    if (!lessons.has(ref.chapter)) lessons.set(ref.chapter, resolveLesson(ref.chapter));
    const lesson = lessons.get(ref.chapter);
    if (!lesson) continue;

    const card =
      ref.kind === "vocab"
        ? vocabCard(lesson, ref.itemId, random)
        : ref.kind === "practice"
          ? practiceCard(lesson, ref.itemId)
          : epsCard(lesson, ref.itemId);
    if (card) cards.push(card);
  }

  return cards;
}
