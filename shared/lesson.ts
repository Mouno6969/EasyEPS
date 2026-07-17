import { z } from "zod";

export const localizedTextSchema = z.object({
  ko: z.string(),
  bn: z.string(),
  en: z.string(),
});

export const lessonSchema = z.object({
  chapter: z.number().int().min(1).max(60),
  slug: z.string(),
  title: localizedTextSchema,
  category: z.enum(["daily-life", "culture", "workplace", "safety", "laws"]),
  level: z.literal("beginner"),
  objectives: z.object({ bn: z.array(z.string()), en: z.array(z.string()) }),
  vocabulary: z.array(z.object({
    ko: z.string(),
    romanization: z.string(),
    bn: z.string(),
    en: z.string(),
    pos: z.string(),
    example: localizedTextSchema,
  })),
  grammar: z.array(z.object({
    pattern: z.string(),
    titleBn: z.string(),
    explanationBn: z.string(),
    explanationEn: z.string(),
    examples: z.array(localizedTextSchema),
  })),
  dialogues: z.array(z.object({
    titleBn: z.string(),
    titleEn: z.string(),
    lines: z.array(z.object({
      speaker: z.string(),
      ko: z.string(),
      bn: z.string(),
      en: z.string(),
    })),
  })),
  practice: z.array(z.object({
    id: z.string(),
    type: z.enum(["multiple-choice", "fill-blank", "matching"]),
    questionBn: z.string(),
    questionKo: z.string().optional().default(""),
    options: z.array(z.string()).optional().default([]),
    pairs: z.array(z.object({ left: z.string(), right: z.string() })).optional().default([]),
    answer: z.number().int().optional().default(0),
    explanationBn: z.string(),
  })),
  epsQuestions: z.array(z.object({
    id: z.string(),
    section: z.enum(["reading", "listening"]),
    questionBn: z.string(),
    questionKo: z.string(),
    passage: z.string().optional().default(""),
    options: z.array(z.string()),
    answer: z.number().int().min(0).max(3),
    explanationBn: z.string(),
  })),
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
  answers: z.record(z.string(), z.number()),
  questionIds: z.array(z.string()),
  correctIds: z.array(z.string()),
});

export type AttemptDetail = z.infer<typeof attemptDetailSchema>;
