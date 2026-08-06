import { describe, expect, it } from "vitest";
import { getLesson } from "./content";
import { harvestVocabResults, wordsInQuestion } from "../shared/vocabReview";

/**
 * These guard the signal that feeds word-level review. Before this existed, lesson
 * progress stored a single `vocabDone` boolean for a 35-word section, so nothing
 * could tell which words a learner actually knew.
 */
describe("vocab harvest from graded answers", () => {
  it("credits a word only when its question was answered correctly", () => {
    const lesson = getLesson(1)!;
    const q = lesson.practice.find(p => p.type !== "matching" && p.options?.length)!;
    const words = wordsInQuestion(lesson, q);
    // Pick a question that actually exercises listed vocabulary.
    if (words.length === 0) return;

    const right = harvestVocabResults(lesson, { [q.id]: q.answer as number });
    const wrong = harvestVocabResults(lesson, { [q.id]: (((q.answer as number) + 1) % 4) });

    for (const w of words) {
      expect(right.find(h => h.word === w)?.correct).toBe(true);
      expect(wrong.find(h => h.word === w)?.correct).toBe(false);
    }
  });

  it("treats a word as shaky if it was missed anywhere in the attempt", () => {
    const lesson = getLesson(1)!;
    const graded = lesson.practice.filter(p => p.type !== "matching" && p.options?.length);
    // Find one word exercised by two different questions.
    const seen = new Map<string, string[]>();
    for (const q of graded) {
      for (const w of wordsInQuestion(lesson, q)) {
        seen.set(w, [...(seen.get(w) ?? []), q.id]);
      }
    }
    const shared = [...seen.entries()].find(([, ids]) => ids.length >= 2);
    if (!shared) return;
    const [word, [firstId, secondId]] = shared;

    const first = graded.find(q => q.id === firstId)!;
    const second = graded.find(q => q.id === secondId)!;
    const hits = harvestVocabResults(lesson, {
      [first.id]: first.answer as number, // right
      [second.id]: (((second.answer as number) + 1) % 4), // wrong
    });
    expect(hits.find(h => h.word === word)?.correct).toBe(false);
  });

  it("ignores unanswered questions and matching grids", () => {
    const lesson = getLesson(1)!;
    expect(harvestVocabResults(lesson, {})).toEqual([]);
    const matching = lesson.practice.find(p => p.type === "matching");
    if (matching) {
      expect(harvestVocabResults(lesson, { [matching.id]: 0 })).toEqual([]);
    }
  });

  it("carries the Bangla gloss so a review card needs no lesson fetch", () => {
    const lesson = getLesson(1)!;
    const q = lesson.practice.find(p => p.type !== "matching" && wordsInQuestion(lesson, p).length > 0);
    if (!q) return;
    for (const hit of harvestVocabResults(lesson, { [q.id]: q.answer as number })) {
      expect(hit.glossBn.length).toBeGreaterThan(0);
    }
  });

  it("does not match single-syllable headwords on a bare substring", () => {
    const lesson = getLesson(1)!;
    const short = lesson.vocabulary.find(v => v.ko.trim().length === 1);
    if (!short) return;
    // A one-character headword must not be credited just because the glyph appears
    // inside some longer word elsewhere in the question.
    for (const q of lesson.practice) {
      const cells = [...(q.options ?? []), ...(q.pairs ?? []).flatMap(p => [p.left, p.right])];
      const exact = cells.some(c => String(c).trim() === short.ko.trim());
      if (!exact && wordsInQuestion(lesson, q).includes(short.ko.trim())) {
        throw new Error(`single-syllable ${short.ko} matched by substring in ${q.id}`);
      }
    }
  });

  it("harvests real words across the whole authored corpus", () => {
    // Sanity: the mapping must actually fire, otherwise the queue stays empty.
    let totalWords = 0;
    for (const ch of [1, 15, 30, 45, 60]) {
      const lesson = getLesson(ch)!;
      const answers: Record<string, number> = {};
      for (const q of lesson.practice) if (q.type !== "matching") answers[q.id] = 99; // all wrong
      for (const q of lesson.epsQuestions) answers[q.id] = 99;
      const hits = harvestVocabResults(lesson, answers);
      expect(hits.every(h => !h.correct)).toBe(true);
      totalWords += hits.length;
    }
    expect(totalWords).toBeGreaterThan(20);
  });
});
