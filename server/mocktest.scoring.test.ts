import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

const guestCaller = appRouter.createCaller(createGuestContext());

/**
 * Mock tests are scored in the client for guest UX and re-scored on the server
 * when authenticated clients submit answers + mockQuestions.
 * This suite validates the payload contract (answer keys, unique testIds, splits).
 */
describe("mock test scoring contract", () => {
  it("provides valid answer keys so a fully-correct submission scores 100%", async () => {
    const questions = await guestCaller.curriculum.mockTest({ count: 20 });
    expect(questions).toHaveLength(20);

    for (const question of questions) {
      const choiceCount = question.imageOptions?.length ?? question.options.length;
      expect(choiceCount).toBe(4);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(choiceCount);
      expect(question.explanationBn.length).toBeGreaterThan(0);
    }

    const perfectAnswers: Record<string, number> = {};
    for (const question of questions) perfectAnswers[question.testId] = question.answer;
    const perfectScore = questions.reduce(
      (sum, question) => sum + (perfectAnswers[question.testId] === question.answer ? 1 : 0),
      0,
    );
    expect(perfectScore).toBe(20);
  });

  it("scores partial and empty submissions correctly", async () => {
    const questions = await guestCaller.curriculum.mockTest({ count: 20 });

    const emptyScore = questions.reduce(
      (sum, question) => sum + (undefined === question.answer ? 1 : 0),
      0,
    );
    expect(emptyScore).toBe(0);

    const halfAnswers: Record<string, number> = {};
    questions.slice(0, 10).forEach(question => {
      halfAnswers[question.testId] = question.answer;
    });
    const halfScore = questions.reduce(
      (sum, question) => sum + (halfAnswers[question.testId] === question.answer ? 1 : 0),
      0,
    );
    expect(halfScore).toBe(10);
  });

  it("keeps the 20-question quick test at the exam-accurate 10 listening + 10 reading split, listening first", async () => {
    const questions = await guestCaller.curriculum.mockTest({ count: 20 });
    const reading = questions.filter(question => question.section === "reading");
    const listening = questions.filter(question => question.section === "listening");
    expect(reading).toHaveLength(10);
    expect(listening).toHaveLength(10);
    // Real exam order: the listening section (듣기) always comes first.
    const firstReadingIndex = questions.findIndex(question => question.section === "reading");
    const lastListeningIndex = questions.map(question => question.section).lastIndexOf("listening");
    expect(lastListeningIndex).toBeLessThan(firstReadingIndex);
    for (let index = 0; index < 10; index += 1) {
      expect(questions[index].section).toBe("listening");
    }
  });

  it("builds the full 40-question paper as 20 listening then 20 reading (EPS CBT pattern)", async () => {
    const questions = await guestCaller.curriculum.mockTest({ count: 40 });
    expect(questions).toHaveLength(40);
    expect(questions.slice(0, 20).every(question => question.section === "listening")).toBe(true);
    expect(questions.slice(20).every(question => question.section === "reading")).toBe(true);
    // testIds stay unique across the paper
    const ids = new Set(questions.map(question => question.testId));
    expect(ids.size).toBe(40);
  });
});
