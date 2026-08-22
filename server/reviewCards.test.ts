import { describe, expect, it } from "vitest";
import { buildReviewCards } from "@shared/reviewCards";
import { getAllLessons, getLesson } from "./content";

/** Deterministic "random" so option order is stable inside a test. */
const noShuffle = () => 0;

describe("buildReviewCards", () => {
  it("turns a vocabulary entry into a four-option recognition card", () => {
    const lesson = getLesson(1);
    expect(lesson).toBeDefined();
    const word = lesson!.vocabulary[0]!;

    const [card] = buildReviewCards([{ kind: "vocab", chapter: 1, itemId: word.ko }], getLesson, noShuffle);

    expect(card).toBeDefined();
    expect(card!.promptKo).toBe(word.ko);
    expect(card!.options).toHaveLength(4);
    expect(card!.options[card!.answer]).toBe(word.bn);
    expect(new Set(card!.options).size).toBe(4);
    expect(card!.explanationBn).toContain(word.bn);
  });

  it("draws vocabulary distractors from the same chapter", () => {
    const lesson = getLesson(12)!;
    const word = lesson.vocabulary[3]!;
    const meanings = new Set(lesson.vocabulary.map(item => item.bn));

    const [card] = buildReviewCards([{ kind: "vocab", chapter: 12, itemId: word.ko }], getLesson, noShuffle);

    expect(card!.options.every(option => meanings.has(option))).toBe(true);
  });

  it("carries the graded answer through for practice and EPS questions", () => {
    const lesson = getLesson(5)!;
    const practice = lesson.practice.find(item => item.type !== "matching")!;
    const eps = lesson.epsQuestions[0]!;

    const cards = buildReviewCards(
      [
        { kind: "practice", chapter: 5, itemId: practice.id },
        { kind: "eps", chapter: 5, itemId: eps.id },
      ],
      getLesson,
    );

    expect(cards).toHaveLength(2);
    expect(cards[0]!.options[cards[0]!.answer]).toBe(practice.options[practice.answer]);
    expect(cards[1]!.options[cards[1]!.answer]).toBe(eps.options[eps.answer]);
    expect(cards[1]!.section).toBe(eps.section);
  });

  it("skips matching questions, which the drill has no UI for", () => {
    const lesson = getLesson(5)!;
    const matching = lesson.practice.find(item => item.type === "matching");
    expect(matching).toBeDefined();

    expect(buildReviewCards([{ kind: "practice", chapter: 5, itemId: matching!.id }], getLesson)).toEqual([]);
  });

  it("drops entries whose content no longer exists rather than failing the session", () => {
    const cards = buildReviewCards(
      [
        { kind: "vocab", chapter: 1, itemId: "이단어는없습니다" },
        { kind: "eps", chapter: 1, itemId: "missing-question" },
      ],
      getLesson,
    );

    expect(cards).toEqual([]);
  });

  it("resolves every vocabulary entry in the curriculum into a valid four-option card", () => {
    const refs = getAllLessons().flatMap(lesson =>
      lesson.vocabulary.map(word => ({ kind: "vocab" as const, chapter: lesson.chapter, itemId: word.ko })),
    );

    const cards = buildReviewCards(refs, getLesson);

    expect(cards).toHaveLength(refs.length);
    expect(cards.every(card => card.options.length === 4)).toBe(true);
    expect(cards.every(card => new Set(card.options).size === 4)).toBe(true);
    expect(cards.every(card => card.answer >= 0 && card.answer < 4)).toBe(true);
  });
});
