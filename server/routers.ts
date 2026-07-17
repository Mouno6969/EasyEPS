import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getAllLessons, getLesson, getLessonSummaries, replaceLesson } from "./content";
import * as db from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { lessonSchema } from "../shared/lesson";

const chapterInput = z.object({ chapter: z.number().int().min(1).max(60) });
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function calculateStreak(dates: string[]) {
  const unique = new Set(dates);
  let cursor = new Date();
  const todayKey = cursor.toISOString().slice(0, 10);
  if (!unique.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (unique.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  curriculum: router({
    list: publicProcedure.query(() => getLessonSummaries()),
    get: publicProcedure.input(chapterInput).query(({ input }) => {
      const lesson = getLesson(input.chapter);
      if (!lesson) throw new Error(`Lesson ${input.chapter} was not found`);
      return lesson;
    }),
    featured: publicProcedure.query(() => {
      const chapters = [1, 9, 21, 31, 53, 57];
      return getLessonSummaries().filter(lesson => chapters.includes(lesson.chapter));
    }),
    mockTest: publicProcedure
      .input(z.object({ count: z.number().int().min(10).max(40).default(40) }).optional())
      .query(({ input }) => {
        const count = input?.count ?? 40;
        const all = getAllLessons().flatMap(lesson => lesson.epsQuestions.map(question => ({
          ...question,
          chapter: lesson.chapter,
          lessonTitle: lesson.title,
        })));
        const reading = all.filter(question => question.section === "reading").sort(() => Math.random() - 0.5);
        const listening = all.filter(question => question.section === "listening").sort(() => Math.random() - 0.5);
        const listeningCount = Math.round(count * 0.4);
        const selected = [...reading.slice(0, count - listeningCount), ...listening.slice(0, listeningCount)];
        return selected.sort(() => Math.random() - 0.5).map((question, index) => ({ ...question, testId: `mock-${index + 1}-${question.chapter}-${question.id}` }));
      }),
  }),

  progress: router({
    list: protectedProcedure.query(({ ctx }) => db.listProgress(ctx.user.id)),
    save: protectedProcedure
      .input(chapterInput.extend({
        vocabDone: z.boolean().optional(),
        grammarDone: z.boolean().optional(),
        dialogueDone: z.boolean().optional(),
        practiceScore: z.number().int().min(0).max(10).nullable().optional(),
        practiceTotal: z.number().int().min(0).max(10).nullable().optional(),
        examScore: z.number().int().min(0).max(8).nullable().optional(),
        examTotal: z.number().int().min(0).max(8).nullable().optional(),
        completed: z.boolean().optional(),
        minutes: z.number().int().min(0).max(240).default(5),
      }))
      .mutation(async ({ ctx, input }) => {
        const { chapter, minutes, ...patch } = input;
        const saved = await db.saveProgress(ctx.user.id, chapter, patch);
        await db.recordStudyDay(ctx.user.id, today(), minutes);
        const all = await db.listProgress(ctx.user.id);
        const completed = all.filter(row => row.completed).length;
        if (completed >= 1) await db.awardBadge(ctx.user.id, "first-step");
        if (completed >= 10) await db.awardBadge(ctx.user.id, "ten-lessons");
        if (completed >= 30) await db.awardBadge(ctx.user.id, "halfway-hero");
        if (completed >= 60) await db.awardBadge(ctx.user.id, "curriculum-master");
        return saved;
      }),
    overview: protectedProcedure.query(async ({ ctx }) => {
      const [progress, attempts, days, badges, certificates] = await Promise.all([
        db.listProgress(ctx.user.id),
        db.listAttempts(ctx.user.id, 20),
        db.listStudyDays(ctx.user.id),
        db.listBadges(ctx.user.id),
        db.listCertificates(ctx.user.id),
      ]);
      const completedLessons = progress.filter(row => row.completed).length;
      const scored = attempts.filter(row => row.total > 0);
      const averageScore = scored.length
        ? Math.round(scored.reduce((sum, row) => sum + (row.score / row.total) * 100, 0) / scored.length)
        : 0;
      return {
        progress,
        attempts,
        days,
        badges,
        certificates,
        completedLessons,
        averageScore,
        streak: calculateStreak(days.map(day => day.date)),
        studyMinutes: days.reduce((sum, day) => sum + day.minutes, 0),
      };
    }),
  }),

  attempts: router({
    list: protectedProcedure.input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional()).query(({ ctx, input }) =>
      db.listAttempts(ctx.user.id, input?.limit ?? 30),
    ),
    record: protectedProcedure
      .input(z.object({
        kind: z.enum(["practice", "chapter-exam", "mock-test"]),
        chapter: z.number().int().min(1).max(60).nullable().optional(),
        score: z.number().int().min(0),
        total: z.number().int().min(1).max(100),
        durationSec: z.number().int().min(0).max(14400).nullable().optional(),
        detail: z.unknown().optional(),
      }).refine(value => value.score <= value.total, "Score cannot exceed total"))
      .mutation(async ({ ctx, input }) => {
        const attempt = await db.createAttempt({ userId: ctx.user.id, ...input });
        await db.recordStudyDay(ctx.user.id, today(), Math.max(1, Math.round((input.durationSec ?? 300) / 60)));
        if (input.chapter && input.kind === "practice") {
          await db.saveProgress(ctx.user.id, input.chapter, { practiceScore: input.score, practiceTotal: input.total });
        }
        if (input.chapter && input.kind === "chapter-exam") {
          await db.saveProgress(ctx.user.id, input.chapter, { examScore: input.score, examTotal: input.total });
        }
        const percent = Math.round((input.score / input.total) * 100);
        if (percent === 100) await db.awardBadge(ctx.user.id, "perfect-score");
        if (input.kind === "mock-test" && percent >= 80) await db.awardBadge(ctx.user.id, "mock-ready");
        return attempt;
      }),
  }),

  planner: router({
    get: protectedProcedure.input(z.object({ from: z.string().regex(datePattern).optional(), to: z.string().regex(datePattern).optional() }).optional()).query(async ({ ctx, input }) => {
      const [settings, items] = await Promise.all([
        db.getPlannerSettings(ctx.user.id),
        db.listPlannerItems(ctx.user.id, input?.from, input?.to),
      ]);
      return { settings, items };
    }),
    saveSettings: protectedProcedure
      .input(z.object({
        dailyGoalMinutes: z.number().int().min(5).max(240),
        dailyGoalLessons: z.number().int().min(1).max(10),
        reminderTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
        targetExamDate: z.string().regex(datePattern).nullable().optional(),
      }))
      .mutation(({ ctx, input }) => db.savePlannerSettings(ctx.user.id, input)),
    add: protectedProcedure
      .input(z.object({ date: z.string().regex(datePattern), chapter: z.number().int().min(1).max(60), kind: z.enum(["lesson", "practice", "exam", "review"]) }))
      .mutation(({ ctx, input }) => db.addPlannerItem({ userId: ctx.user.id, ...input })),
    setDone: protectedProcedure.input(z.object({ id: z.number().int().positive(), done: z.boolean() })).mutation(({ ctx, input }) =>
      db.setPlannerItemDone(ctx.user.id, input.id, input.done),
    ),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) =>
      db.removePlannerItem(ctx.user.id, input.id),
    ),
  }),

  certificates: router({
    mine: protectedProcedure.query(({ ctx }) => db.listCertificates(ctx.user.id)),
    verify: publicProcedure.input(z.object({ code: z.string().min(6).max(32) })).query(({ input }) => db.getCertificate(input.code)),
    issue: protectedProcedure.input(z.object({ kind: z.enum(["course-completion", "mock-test"]) })).mutation(async ({ ctx, input }) => {
      if (input.kind === "course-completion") {
        const progress = await db.listProgress(ctx.user.id);
        if (progress.filter(row => row.completed).length < 60) throw new Error("Complete all 60 lessons before issuing this certificate");
        return db.issueCertificate({ userId: ctx.user.id, code: `EPS-${nanoid(10).toUpperCase()}`, kind: input.kind, scorePercent: 100 });
      }
      const attempts = await db.listAttempts(ctx.user.id, 100);
      const best = attempts.filter(row => row.kind === "mock-test").sort((a, b) => b.score / b.total - a.score / a.total)[0];
      if (!best || best.score / best.total < 0.8) throw new Error("Score at least 80% on a mock test before issuing this certificate");
      return db.issueCertificate({ userId: ctx.user.id, code: `EPS-${nanoid(10).toUpperCase()}`, kind: input.kind, scorePercent: Math.round((best.score / best.total) * 100) });
    }),
  }),

  tutor: router({
    chat: protectedProcedure
      .input(z.object({
        chapter: z.number().int().min(1).max(60).optional(),
        messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(3000) })).min(1).max(12),
      }))
      .mutation(async ({ input }) => {
        const lesson = input.chapter ? getLesson(input.chapter) : undefined;
        const lessonContext = lesson
          ? `Current lesson: Chapter ${lesson.chapter}, ${lesson.title.ko} / ${lesson.title.bn}. Vocabulary focus: ${lesson.vocabulary.slice(0, 12).map(item => `${item.ko} (${item.bn})`).join(", ")}. Grammar: ${lesson.grammar.map(item => item.pattern).join(", ")}.`
          : "The learner has not selected a chapter.";
        const response = await invokeLLM({
          model: "gpt-5-mini",
          messages: [
            {
              role: "system",
              content: `You are EasyEPS Tutor for Bangla-speaking EPS-TOPIK beginners. Answer primarily in natural Bengali, include Korean examples with simple romanization when useful, and give concise English support only when it improves clarity. Be encouraging but precise. Never claim to provide official legal, medical, immigration, or safety advice; for high-stakes questions, explain the language and direct the learner to current official Korean authorities or workplace procedures. Do not reveal quiz answer keys unless the learner first attempts the question. ${lessonContext}`,
            },
            ...input.messages,
          ],
        });
        const content = response.choices[0]?.message?.content;
        return {
          content: typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content.map(part => "text" in part ? part.text : "").join("\n")
              : "দুঃখিত, এখন উত্তর তৈরি করা যাচ্ছে না।",
        };
      }),
  }),

  admin: router({
    stats: adminProcedure.query(async () => ({ ...(await db.adminStats()), lessons: getAllLessons().length })),
    users: adminProcedure.input(z.object({ limit: z.number().int().min(1).max(200).default(100) }).optional()).query(({ input }) => db.adminListUsers(input?.limit ?? 100)),
    setRole: adminProcedure.input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) })).mutation(({ input }) => db.setUserRole(input.userId, input.role)),
    lesson: adminProcedure.input(chapterInput).query(({ input }) => getLesson(input.chapter)),
    saveLesson: adminProcedure.input(z.object({ chapter: z.number().int().min(1).max(60), content: lessonSchema })).mutation(({ input }) => replaceLesson(input.chapter, input.content)),
  }),
});

export type AppRouter = typeof appRouter;
