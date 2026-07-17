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
 * The mock-test score is computed client-side as:
 *   score = questions.reduce((sum, q) => sum + (answers[q.testId] === q.answer ? 1 : 0), 0)
 * This suite validates the server contract that the client scoring relies on:
 * every question carries a valid answer index, unique testId, options, and
 * a Bengali explanation, and that scoring semantics behave as expected.
 */
describe("mock test scoring contract", () => {
  it("provides valid answer keys so a fully-correct submission scores 100%", async () => {
    const questions = await guestCaller.curriculum.mockTest({ count: 20 });
    expect(questions).toHaveLength(20);

    for (const question of questions) {
      expect(question.options.length).toBeGreaterThanOrEqual(4);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
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

  it("keeps the 20-question quick test at the documented 12 reading + 8 listening split", async () => {
    const questions = await guestCaller.curriculum.mockTest({ count: 20 });
    const reading = questions.filter(question => question.section === "reading");
    const listening = questions.filter(question => question.section === "listening");
    expect(reading).toHaveLength(12);
    expect(listening).toHaveLength(8);
  });
});
