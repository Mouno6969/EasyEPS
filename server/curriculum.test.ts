import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as unknown as TrpcContext["res"],
  };
}

const guestCaller = appRouter.createCaller(createGuestContext());

describe("curriculum.list", () => {
  it("returns all 60 chapter summaries with trilingual titles", async () => {
    const summaries = await guestCaller.curriculum.list();
    expect(summaries).toHaveLength(60);
    const chapters = summaries.map(summary => summary.chapter).sort((a, b) => a - b);
    expect(chapters[0]).toBe(1);
    expect(chapters[59]).toBe(60);
    for (const summary of summaries) {
      expect(summary.title.ko.length).toBeGreaterThan(0);
      expect(summary.title.bn.length).toBeGreaterThan(0);
      expect(summary.title.en.length).toBeGreaterThan(0);
      expect(summary.vocabularyCount).toBeGreaterThanOrEqual(16);
      expect(summary.practiceCount).toBe(10);
      expect(summary.epsQuestionCount).toBe(8);
    }
  });
});

describe("curriculum.get", () => {
  it("returns a full lesson with vocabulary, grammar, dialogues, practice, and exam questions", async () => {
    const lesson = await guestCaller.curriculum.get({ chapter: 1 });
    expect(lesson.chapter).toBe(1);
    expect(lesson.vocabulary.length).toBeGreaterThanOrEqual(16);
    expect(lesson.grammar.length).toBeGreaterThanOrEqual(2);
    expect(lesson.dialogues).toHaveLength(2);
    expect(lesson.practice).toHaveLength(10);
    expect(lesson.epsQuestions).toHaveLength(8);
    const reading = lesson.epsQuestions.filter(question => question.section === "reading");
    const listening = lesson.epsQuestions.filter(question => question.section === "listening");
    expect(reading).toHaveLength(5);
    expect(listening).toHaveLength(3);
  });

  it("rejects out-of-range chapters", async () => {
    await expect(guestCaller.curriculum.get({ chapter: 61 })).rejects.toThrow();
  });
});

describe("curriculum.mockTest", () => {
  it("builds a 40-question mock test mixing reading and listening from many chapters", async () => {
    const questions = await guestCaller.curriculum.mockTest({ count: 40 });
    expect(questions).toHaveLength(40);
    const listening = questions.filter(question => question.section === "listening");
    expect(listening.length).toBe(16);
    const distinctChapters = new Set(questions.map(question => question.chapter));
    expect(distinctChapters.size).toBeGreaterThan(5);
    const ids = new Set(questions.map(question => question.testId));
    expect(ids.size).toBe(40);
  });
});

describe("protected procedures gate guests", () => {
  it("rejects unauthenticated progress reads", async () => {
    await expect(guestCaller.progress.list()).rejects.toThrow();
  });

  it("rejects unauthenticated planner reads", async () => {
    await expect(guestCaller.planner.get()).rejects.toThrow();
  });

  it("rejects unauthenticated admin stats", async () => {
    await expect(guestCaller.admin.stats()).rejects.toThrow();
  });
});

describe("admin role gating", () => {
  it("rejects a signed-in non-admin user from admin procedures", async () => {
    const ctx = createGuestContext();
    ctx.user = {
      id: 2,
      openId: "regular-user",
      email: "user@example.com",
      name: "Regular User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });
});
