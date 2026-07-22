import { z } from "zod";

export const localizedTextSchema = z.object({
  ko: z.string().min(1),
  bn: z.string().min(1),
  en: z.string().min(1),
});

const vocabularyItemSchema = z.object({
  ko: z.string().min(1),
  romanization: z.string().min(1),
  bn: z.string().min(1),
  en: z.string().min(1),
  pos: z.string().min(1),
  example: localizedTextSchema,
  pronunciationTipBn: z.string().optional().default(""),
});

const grammarItemSchema = z.object({
  pattern: z.string().min(1),
  titleBn: z.string().min(1),
  explanationBn: z.string().min(1),
  explanationEn: z.string().min(1),
  examples: z.array(localizedTextSchema).min(2),
  commonMistakeBn: z.string().optional().default(""),
});

const dialogueSchema = z.object({
  titleBn: z.string().min(1),
  titleEn: z.string().min(1),
  lines: z
    .array(
      z.object({
        speaker: z.string().min(1),
        ko: z.string().min(1),
        bn: z.string().min(1),
        en: z.string().min(1),
      }),
    )
    .min(4)
    .max(8),
});

const practiceQuestionSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum(["multiple-choice", "fill-blank", "matching"]),
    questionBn: z.string().min(1),
    questionKo: z.string().optional().default(""),
    options: z.array(z.string()).optional().default([]),
    pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).optional().default([]),
    answer: z.number().int().optional().default(0),
    explanationBn: z.string().min(1),
  })
  .superRefine((question, ctx) => {
    if (question.type === "matching") {
      if (question.pairs.length < 2) {
        ctx.addIssue({ code: "custom", message: "Matching questions need at least 2 pairs", path: ["pairs"] });
      }
      return;
    }
    if (question.options.length < 2) {
      ctx.addIssue({ code: "custom", message: "Non-matching questions need options", path: ["options"] });
    }
    if (question.answer < 0 || question.answer >= question.options.length) {
      ctx.addIssue({ code: "custom", message: "answer index out of range", path: ["answer"] });
    }
  });

const epsQuestionSchema = z
  .object({
    id: z.string().min(1),
    section: z.enum(["reading", "listening"]),
    questionBn: z.string().min(1),
    questionKo: z.string().min(1),
    passage: z.string().optional().default(""),
    options: z.array(z.string().min(1)).min(4).max(4),
    answer: z.number().int().min(0).max(3),
    explanationBn: z.string().min(1),
  })
  .superRefine((question, ctx) => {
    if (question.answer >= question.options.length) {
      ctx.addIssue({ code: "custom", message: "answer index out of range", path: ["answer"] });
    }
  });

export const lessonSchema = z
  .object({
    chapter: z.number().int().min(1).max(60),
    slug: z.string().min(1),
    title: localizedTextSchema,
    category: z.enum(["daily-life", "culture", "workplace", "safety", "laws"]),
    level: z.literal("beginner"),
    objectives: z.object({
      bn: z.array(z.string().min(1)).min(1),
      en: z.array(z.string().min(1)).min(1),
    }),
    vocabulary: z.array(vocabularyItemSchema).min(16).max(40),
    grammar: z.array(grammarItemSchema).min(2).max(6),
    dialogues: z.array(dialogueSchema).min(2).max(4),
    practice: z.array(practiceQuestionSchema).min(10).max(24),
    epsQuestions: z.array(epsQuestionSchema).min(8).max(20),
  })
  .superRefine((lesson, ctx) => {
    const practiceIds = new Set<string>();
    for (const item of lesson.practice) {
      if (practiceIds.has(item.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate practice id ${item.id}`, path: ["practice"] });
      }
      practiceIds.add(item.id);
    }

    const epsIds = new Set<string>();
    for (const item of lesson.epsQuestions) {
      if (epsIds.has(item.id)) {
        ctx.addIssue({ code: "custom", message: `Duplicate eps id ${item.id}`, path: ["epsQuestions"] });
      }
      epsIds.add(item.id);
    }

    const mc = lesson.practice.filter(item => item.type === "multiple-choice").length;
    const fill = lesson.practice.filter(item => item.type === "fill-blank").length;
    const matching = lesson.practice.filter(item => item.type === "matching").length;
    if (mc < 4) ctx.addIssue({ code: "custom", message: "Need ≥4 multiple-choice practice items", path: ["practice"] });
    if (fill < 3) ctx.addIssue({ code: "custom", message: "Need ≥3 fill-blank practice items", path: ["practice"] });
    if (matching < 2) ctx.addIssue({ code: "custom", message: "Need ≥2 matching practice items", path: ["practice"] });

    const reading = lesson.epsQuestions.filter(item => item.section === "reading").length;
    const listening = lesson.epsQuestions.filter(item => item.section === "listening").length;
    if (reading < 5) ctx.addIssue({ code: "custom", message: "Need at least 5 reading EPS questions", path: ["epsQuestions"] });
    if (listening < 3) ctx.addIssue({ code: "custom", message: "Need at least 3 listening EPS questions", path: ["epsQuestions"] });

    const expectedCategory =
      lesson.chapter <= 24
        ? "daily-life"
        : lesson.chapter <= 30
          ? "culture"
          : lesson.chapter <= 52
            ? "workplace"
            : lesson.chapter <= 56
              ? "safety"
              : "laws";
    if (lesson.category !== expectedCategory) {
      ctx.addIssue({
        code: "custom",
        message: `Chapter ${lesson.chapter} should be category ${expectedCategory}`,
        path: ["category"],
      });
    }
  });

export type Lesson = z.infer<typeof lessonSchema>;
export type VocabularyItem = Lesson["vocabulary"][number];
export type PracticeQuestion = Lesson["practice"][number];
export type EpsQuestion = Lesson["epsQuestions"][number];

export type LessonSummary = Pick<Lesson, "chapter" | "slug" | "title" | "category" | "level"> & {
  vocabularyCount: number;
  practiceCount: number;
  epsQuestionCount: number;
};

export const attemptDetailSchema = z.object({
  answers: z.record(z.string(), z.number().int()),
  matching: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  questionIds: z.array(z.string()).optional(),
  correctIds: z.array(z.string()).optional(),
  mockQuestions: z
    .array(
      z.object({
        chapter: z.number().int().min(1).max(60),
        id: z.string().min(1),
        testId: z.string().min(1),
      }),
    )
    .optional(),
  serverGraded: z.boolean().optional(),
});

export type AttemptDetail = z.infer<typeof attemptDetailSchema>;
