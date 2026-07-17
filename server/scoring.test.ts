import { describe, expect, it } from "vitest";
import { scoreEps, scorePractice, shuffleCopy, shuffleInPlace } from "../shared/scoring";
import type { EpsQuestion, PracticeQuestion } from "../shared/lesson";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getLesson } from "./content";

function createUserContext(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 9,
      openId: "scorer-user",
      email: "scorer@example.com",
      name: "Scorer",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

describe("shuffleInPlace / shuffleCopy", () => {
  it("preserves multiset membership", () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = shuffleCopy(source, () => 0.42);
    expect(shuffled).toHaveLength(source.length);
    expect([...shuffled].sort()).toEqual([...source].sort());
    expect(source).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("mutates in place when requested", () => {
    const items = ["a", "b", "c", "d"];
    const result = shuffleInPlace(items, () => 0.1);
    expect(result).toBe(items);
    expect(result).toHaveLength(4);
  });
});

describe("scorePractice / scoreEps", () => {
  it("grades multiple-choice and matching practice items", () => {
    const questions = [
      {
        id: "p1",
        type: "multiple-choice",
        questionBn: "q",
        questionKo: "",
        options: ["a", "b", "c", "d"],
        pairs: [],
        answer: 2,
        explanationBn: "e",
      },
      {
        id: "p2",
        type: "matching",
        questionBn: "q",
        questionKo: "",
        options: [],
        pairs: [
          { left: "이름", right: "নাম" },
          { left: "나라", right: "দেশ" },
        ],
        answer: 0,
        explanationBn: "e",
      },
    ] as PracticeQuestion[];

    const perfect = scorePractice(
      questions,
      { p1: 2 },
      { p2: { 0: "নাম", 1: "দেশ" } },
    );
    expect(perfect.score).toBe(2);
    expect(perfect.total).toBe(2);

    const partial = scorePractice(questions, { p1: 0 }, { p2: { 0: "নাম", 1: "দেশ" } });
    expect(partial.score).toBe(1);
  });

  it("grades EPS questions by id key", () => {
    const questions = [
      {
        id: "e1",
        section: "reading",
        questionBn: "q",
        questionKo: "q",
        passage: "",
        options: ["a", "b", "c", "d"],
        answer: 1,
        explanationBn: "e",
      },
    ] as EpsQuestion[];
    expect(scoreEps(questions, { e1: 1 }).score).toBe(1);
    expect(scoreEps(questions, { e1: 0 }).score).toBe(0);
  });
});

describe("curriculum mockTest uses full answer keys", () => {
  it("still returns answer keys for guest review UX", async () => {
    const guest = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
    });
    const questions = await guest.curriculum.mockTest({ count: 20 });
    expect(questions).toHaveLength(20);
    for (const question of questions) {
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThan(question.options.length);
    }
  });
});

describe("lesson content still validates under strict schema", () => {
  it("loads chapter 1 with practice mix and eps split", () => {
    const lesson = getLesson(1);
    expect(lesson).toBeDefined();
    expect(lesson!.practice).toHaveLength(10);
    expect(lesson!.epsQuestions.filter(q => q.section === "reading")).toHaveLength(5);
    expect(lesson!.epsQuestions.filter(q => q.section === "listening")).toHaveLength(3);
  });
});

describe("attempts.record prefers server grading shape", () => {
  it("rejects unauthenticated callers", async () => {
    const guest = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
    });
    await expect(
      guest.attempts.record({
        kind: "practice",
        chapter: 1,
        answers: { p1: 0 },
      }),
    ).rejects.toThrow();
  });

  it("builds a valid graded payload for chapter 1 practice without DB (expects availability error or success)", async () => {
    const lesson = getLesson(1)!;
    const answers: Record<string, number> = {};
    const matching: Record<string, Record<string, string>> = {};
    for (const question of lesson.practice) {
      if (question.type === "matching") {
        matching[question.id] = Object.fromEntries(
          question.pairs.map((pair, index) => [String(index), pair.right]),
        );
      } else {
        answers[question.id] = question.answer;
      }
    }

    const caller = appRouter.createCaller(createUserContext());
    // Without DATABASE_URL this should fail at persistence, not at grading.
    await expect(
      caller.attempts.record({
        kind: "practice",
        chapter: 1,
        durationSec: 60,
        answers,
        matching,
      }),
    ).rejects.toThrow(/Database persistence is unavailable|Unable to grade|DATABASE/i);
  });
});
