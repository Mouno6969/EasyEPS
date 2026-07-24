import { describe, expect, it } from "vitest";
import { epsQuestionImageSchema, lessonSchema } from "../shared/lesson";
import { scoreEps } from "../shared/scoring";
import type { EpsQuestion } from "../shared/lesson";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getAllLessons, getLesson, getLessonSummaries } from "./content";

function createGuestContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  };
}

const guestCaller = appRouter.createCaller(createGuestContext());

describe("epsQuestionImageSchema", () => {
  it("accepts a valid image with site-relative src and Bangla alt text", () => {
    const parsed = epsQuestionImageSchema.parse({
      src: "/eps-images/sign-no-entry.svg",
      altBn: "প্রবেশ নিষেধ চিহ্ন",
    });
    expect(parsed.altKo).toBe("");
    expect(parsed.captionBn).toBe("");
    expect(parsed.kind).toBe("illustration");
  });

  it("accepts absolute URLs and data URIs", () => {
    expect(() =>
      epsQuestionImageSchema.parse({ src: "https://cdn.example.com/sign.png", altBn: "চিহ্ন" }),
    ).not.toThrow();
    expect(() =>
      epsQuestionImageSchema.parse({ src: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=", altBn: "চিহ্ন" }),
    ).not.toThrow();
  });

  it("rejects non-URL sources and missing alt text", () => {
    expect(() => epsQuestionImageSchema.parse({ src: "not-a-url", altBn: "x" })).toThrow();
    expect(() => epsQuestionImageSchema.parse({ src: "/eps-images/a.svg", altBn: "" })).toThrow();
    expect(() => epsQuestionImageSchema.parse({ src: "/eps-images/a.svg" })).toThrow();
  });
});

describe("lessonSchema image-question rules", () => {
  const baseQuestion = {
    id: "e-test",
    section: "reading" as const,
    questionBn: "ছবিটি দেখে উত্তর দিন।",
    questionKo: "그림을 보고 고르십시오.",
    passage: "",
    options: ["하나", "둘", "셋", "넷"],
    answer: 0,
    explanationBn: "ব্যাখ্যা",
  };

  it("keeps legacy questions without an image valid (backward compatibility)", () => {
    const lesson = getLesson(1);
    expect(lesson).toBeDefined();
    expect(() => lessonSchema.parse(lesson)).not.toThrow();
  });

  it("requires a passage when a listening question carries an image", () => {
    const lesson = structuredClone(getLesson(53));
    expect(lesson).toBeDefined();
    if (!lesson) return;
    lesson.epsQuestions = lesson.epsQuestions.filter(question => question.id !== "e-test");
    lesson.epsQuestions = [
      ...lesson.epsQuestions.slice(0, 19),
    ];
    const invalidListening = {
      ...baseQuestion,
      id: "e-test-listen",
      section: "listening" as const,
      passage: "",
      image: { src: "/eps-images/sign-no-entry.svg", altBn: "চিহ্ন", altKo: "", captionBn: "", kind: "safety-sign" as const },
    };
    const candidate = { ...lesson, epsQuestions: [...lesson.epsQuestions.slice(0, 19), invalidListening] };
    expect(() => lessonSchema.parse(candidate)).toThrow(/passage/);
  });
});

describe("image questions in authored content", () => {
  it("ships representative image-based questions in safety chapters", () => {
    const lessons = getAllLessons();
    const imageQuestions = lessons.flatMap(lesson =>
      lesson.epsQuestions.filter(question => question.image).map(question => ({ chapter: lesson.chapter, question })),
    );
    expect(imageQuestions.length).toBeGreaterThanOrEqual(10);
    const safetyChapters = new Set(imageQuestions.map(item => item.chapter));
    for (const chapter of [53, 54, 55, 56]) {
      expect(safetyChapters.has(chapter)).toBe(true);
    }
    for (const { question } of imageQuestions) {
      expect(question.image?.src).toMatch(/^(https?:\/\/|\/|data:image\/)/);
      expect(question.image?.altBn.length).toBeGreaterThan(0);
      if (question.section === "listening") {
        expect(question.passage.length).toBeGreaterThan(0);
      }
    }
  });

  it("exposes imageQuestionCount in lesson summaries", () => {
    const summaries = getLessonSummaries();
    const chapter53 = summaries.find(summary => summary.chapter === 53);
    expect(chapter53?.imageQuestionCount).toBeGreaterThanOrEqual(4);
    const chapter1 = summaries.find(summary => summary.chapter === 1);
    expect(chapter1?.imageQuestionCount).toBe(0);
  });
});

describe("APIs propagate the image field", () => {
  it("curriculum.get returns the image field on image questions", async () => {
    const lesson = await guestCaller.curriculum.get({ chapter: 53 });
    const withImage = lesson.epsQuestions.filter(question => question.image);
    expect(withImage.length).toBeGreaterThanOrEqual(4);
    for (const question of withImage) {
      expect(question.image?.altBn.length).toBeGreaterThan(0);
    }
  });

  it("curriculum.mockTest can include image questions and keeps them answerable", async () => {
    const questions = await guestCaller.curriculum.mockTest({
      count: 40,
      mode: "balanced",
      focusChapters: [53, 54, 55, 56],
      focusSection: "auto",
    });
    expect(questions).toHaveLength(40);
    // Image field must survive the mock-test mapping when present.
    for (const question of questions) {
      if (question.image) {
        expect(question.image.src.length).toBeGreaterThan(0);
        expect(question.image.altBn.length).toBeGreaterThan(0);
      }
      expect(question.options).toHaveLength(4);
      expect(question.testId).toContain(String(question.chapter));
    }
  });
});

describe("scoring is unaffected by the image field", () => {
  it("scores image questions identically to text questions", () => {
    const questions: EpsQuestion[] = [
      {
        id: "e1",
        section: "reading",
        questionBn: "ছবি দেখে উত্তর দিন।",
        questionKo: "그림을 보고 고르십시오.",
        passage: "",
        image: { src: "/eps-images/sign-no-entry.svg", altBn: "প্রবেশ নিষেধ", altKo: "", captionBn: "", kind: "safety-sign" },
        options: ["가", "나", "다", "라"],
        answer: 1,
        explanationBn: "ব্যাখ্যা",
      },
      {
        id: "e2",
        section: "reading",
        questionBn: "পড়ে উত্তর দিন।",
        questionKo: "읽고 고르십시오.",
        passage: "지문",
        options: ["가", "나", "다", "라"],
        answer: 2,
        explanationBn: "ব্যাখ্যা",
      },
    ];
    const graded = scoreEps(questions, { e1: 1, e2: 0 });
    expect(graded.score).toBe(1);
    expect(graded.total).toBe(2);
    expect(graded.correctIds).toEqual(["e1"]);
  });
});
