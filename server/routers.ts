import { COOKIE_NAME, ONE_YEAR_MS, PASSWORD_MIN_LENGTH } from "@shared/const";
import {
  basicsImportProgressSchema,
  basicsProgressPatchSchema,
  basicsSubmitCheckpointSchema,
  emptyBasicsProgress,
  type BasicsProgress,
} from "@shared/basics";
import { attemptDetailSchema, lessonSchema } from "@shared/lesson";
import {
  avatarUploadSchema,
  emptyProfile,
  extensionForMime,
  isProfileComplete,
  looksLikeImage,
  profileSetupSchema,
} from "@shared/profile";
import { publicRecipient } from "@shared/certificate";
import { scoreLessonExam, scoreMockFromLessons, type MockQuestionRef } from "@shared/scoring";
import { buildSmartMockQuestions } from "@shared/smartMock";
import {
  calculateStreakFrom,
  isPlausibleStudyDay,
  isRealDayKey,
  KST_OFFSET_MINUTES,
  localDayKey,
  MAX_TZ_OFFSET_MINUTES,
  MIN_TZ_OFFSET_MINUTES,
} from "@shared/time";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { getAllLessons, getLesson, getLessonSummaries, replaceLesson } from "./content";
import {
  getBasicsManifest,
  getBasicsModule,
  getBasicsModuleSummaries,
  getStrokeFile,
} from "./basicsContent";
import { hashPassword, verifyPassword, generateOpenId } from "./_core/password";
import type { User } from "../drizzle/schema";
import type { Request } from "express";
import type { TrpcContext } from "./_core/context";
import { sdk } from "./_core/sdk";
import * as db from "./db";
import { ENV } from "./_core/env";
import { assertBasicsComplete } from "./basicsGate";
import { getSessionCookieOptions } from "./_core/cookies";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { storagePut } from "./storage";
import { basicsModuleIdSchema } from "@shared/basics";

const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .max(200, "Password is too long"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/**
 * Shape sent to the browser. `passwordHash` must never appear here: `auth.me`
 * is mirrored into localStorage by useAuth, so returning the raw row would
 * publish every account's digest to the client.
 */
function toSafeUser(user: User | null) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    loginMethod: user.loginMethod,
    createdAt: user.createdAt,
    lastSignedIn: user.lastSignedIn,
  };
}

async function setSessionCookie(ctx: TrpcContext, user: User) {
  const token = await sdk.createSessionToken(user.openId, {
    name: user.name ?? "",
    expiresInMs: ONE_YEAR_MS,
  });
  ctx.res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(ctx.req),
    maxAge: ONE_YEAR_MS,
  });
}

/**
 * Per-IP throttle on the credential endpoints. Password verification is
 * deliberately slow (~100ms), so without a cap an attacker still gets thousands
 * of guesses an hour against a known email. In-memory is enough for a
 * single-process deploy; a multi-process one would need a shared store.
 */
const AUTH_RATE_WINDOW_MS = 60_000;
const AUTH_RATE_MAX = 10;
const authAttempts = new Map<string, { count: number; resetAt: number }>();

function enforceAuthRateLimit(req: Request) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0]?.trim()) ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  const entry = authAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS });
    // Opportunistic sweep so the map cannot grow without bound.
    if (authAttempts.size > 5000) {
      for (const [key, value] of authAttempts) {
        if (now > value.resetAt) authAttempts.delete(key);
      }
    }
    return;
  }

  entry.count += 1;
  if (entry.count > AUTH_RATE_MAX) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many attempts. Please wait a minute and try again.",
    });
  }
}


function rowToProfile(
  row: Awaited<ReturnType<typeof db.getUserProfile>> | null | undefined,
  fallback?: { name?: string | null; email?: string | null },
) {
  if (!row) {
    return {
      ...emptyProfile,
      fullName: fallback?.name?.trim() || "",
      email: fallback?.email?.trim().toLowerCase() || "",
      isComplete: false,
      completedAt: null as string | null,
      updatedAt: null as string | null,
    };
  }
  return {
    fullName: row.fullName,
    email: row.email,
    phone: row.phone ?? "",
    preferredLocale: row.preferredLocale,
    nationality: row.nationality,
    city: row.city ?? "",
    learningLevel: row.learningLevel,
    targetIndustry: row.targetIndustry ?? "",
    targetExamDate: row.targetExamDate ?? "",
    bio: row.bio ?? "",
    avatarUrl: row.avatarUrl ?? "",
    isComplete: row.isComplete,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

const chapterInput = z.object({ chapter: z.number().int().min(1).max(60) });
/**
 * A bare /^\d{4}-\d{2}-\d{2}$/ accepts 2026-13-45 and 0000-00-00, which then reach the
 * database as unusable rows. Validate that the string is a real calendar date.
 */
const dayKeySchema = z.string().refine(isRealDayKey, "Expected a real yyyy-mm-dd date");

/**
 * Optional client timezone offset (minutes east of UTC). Absent on older clients,
 * which fall back to KST — the product's primary zone — rather than UTC, whose day
 * boundary lands mid-morning for every learner this app serves.
 */
const tzOffsetInput = z
  .number()
  .int()
  .min(MIN_TZ_OFFSET_MINUTES)
  .max(MAX_TZ_OFFSET_MINUTES)
  .optional();

function today(tzOffsetMinutes?: number) {
  return localDayKey(new Date(), tzOffsetMinutes ?? KST_OFFSET_MINUTES);
}

function calculateStreak(dates: string[], tzOffsetMinutes?: number) {
  return calculateStreakFrom(dates, today(tzOffsetMinutes));
}

function notFound(message: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message });
}

function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function preconditionFailed(message: string): never {
  throw new TRPCError({ code: "PRECONDITION_FAILED", message });
}

/** Normalize matching maps from string keys (JSON) to numeric pair indexes. */
function normalizeMatching(
  matching: Record<string, Record<string, string>> | undefined,
): Record<string, Record<number, string>> {
  if (!matching) return {};
  const result: Record<string, Record<number, string>> = {};
  for (const [questionId, pairs] of Object.entries(matching)) {
    result[questionId] = {};
    for (const [index, value] of Object.entries(pairs)) {
      result[questionId]![Number(index)] = value;
    }
  }
  return result;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => toSafeUser(opts.ctx.user)),
    register: publicProcedure.input(registerSchema).mutation(async ({ ctx, input }) => {
      enforceAuthRateLimit(ctx.req);

      const email = input.email.trim().toLowerCase();
      const existing = await db.getUserByEmail(email);
      if (existing) {
        // Field-scoped so react-hook-form can attach it to the email input,
        // matching how zodResolver surfaces validation errors elsewhere.
        throw new TRPCError({
          code: "CONFLICT",
          message: "email: An account with this email already exists",
        });
      }

      const passwordHash = await hashPassword(input.password);
      const user = await db.createPasswordUser({
        openId: generateOpenId(),
        email,
        name: input.fullName.trim() || null,
        passwordHash,
      });

      await setSessionCookie(ctx, user);
      return toSafeUser(user);
    }),
    login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
      enforceAuthRateLimit(ctx.req);

      const user = await db.getUserByEmail(input.email);
      const ok = await verifyPassword(input.password, user?.passwordHash);

      // Identical response whether the email is unknown or the password is
      // wrong, so the endpoint cannot be used to enumerate registered emails.
      if (!user || !ok) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Wrong email or password" });
      }

      await db.touchLastSignedIn(user.id);
      await setSessionCookie(ctx, user);
      return toSafeUser(user);
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      try {
        const row = await db.getUserProfile(ctx.user.id);
        return rowToProfile(row, { name: ctx.user.name, email: ctx.user.email });
      } catch {
        // DB unavailable — return OAuth defaults so the form still works offline
        return rowToProfile(null, { name: ctx.user.name, email: ctx.user.email });
      }
    }),
    update: protectedProcedure.input(profileSetupSchema).mutation(async ({ ctx, input }) => {
      if (!isProfileComplete(input)) {
        badRequest("Profile data is incomplete or invalid");
      }
      try {
        // Do not clobber an existing avatar when the form omits a new one
        const existing = await db.getUserProfile(ctx.user.id).catch(() => null);
        const payload = {
          ...input,
          avatarUrl: input.avatarUrl || existing?.avatarUrl || "",
        };
        const saved = await db.upsertUserProfile(ctx.user.id, payload);
        return rowToProfile(saved, { name: input.fullName, email: input.email });
      } catch (error) {
        console.error("[profile.update] failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save profile. Please try again.",
        });
      }
    }),
    setAvatar: protectedProcedure.input(avatarUploadSchema).mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.dataBase64.replace(/\s/g, ""), "base64");
      if (!buffer.length || buffer.length > 320_000) {
        badRequest("Image is too large — use a smaller photo");
      }
      if (!looksLikeImage(new Uint8Array(buffer), input.contentType)) {
        badRequest("File is not a valid image of the declared type");
      }

      let avatarUrl: string;
      try {
        const ext = extensionForMime(input.contentType);
        const uploaded = await storagePut(
          `avatars/user-${ctx.user.id}.${ext}`,
          buffer,
          input.contentType,
        );
        avatarUrl = uploaded.url;
      } catch (error) {
        // Storage may be unavailable in local/dev — fall back to compressed data URL
        console.warn("[profile.setAvatar] storage unavailable, using data URL fallback", error);
        avatarUrl = `data:${input.contentType};base64,${input.dataBase64.replace(/\s/g, "")}`;
        if (avatarUrl.length > 480_000) {
          badRequest("Image is too large for offline storage");
        }
      }

      try {
        const saved = await db.setUserAvatarUrl(ctx.user.id, avatarUrl);
        return rowToProfile(saved, { name: ctx.user.name, email: ctx.user.email });
      } catch (error) {
        console.error("[profile.setAvatar] db failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not save profile picture. Please try again.",
        });
      }
    }),
    removeAvatar: protectedProcedure.mutation(async ({ ctx }) => {
      try {
        const saved = await db.setUserAvatarUrl(ctx.user.id, null);
        return rowToProfile(saved, { name: ctx.user.name, email: ctx.user.email });
      } catch (error) {
        console.error("[profile.removeAvatar] failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not remove profile picture.",
        });
      }
    }),
  }),

  curriculum: router({
    list: publicProcedure.query(() => getLessonSummaries()),
    get: publicProcedure.input(chapterInput).query(({ input }) => {
      const lesson = getLesson(input.chapter);
      if (!lesson) notFound(`Lesson ${input.chapter} was not found`);
      return lesson;
    }),
    featured: publicProcedure.query(() => {
      const chapters = [1, 9, 21, 31, 53, 57];
      return getLessonSummaries().filter(lesson => chapters.includes(lesson.chapter));
    }),
    mockTest: publicProcedure
      .input(
        z
          .object({
            count: z.number().int().min(10).max(40).default(40),
            mode: z.enum(["balanced", "smart"]).default("balanced"),
            focusChapters: z.array(z.number().int().min(1).max(60)).max(20).default([]),
            focusSection: z.enum(["auto", "reading", "listening"]).default("auto"),
          })
          .optional(),
      )
      .query(({ input }) => {
        const count = input?.count ?? 40;
        const all = getAllLessons().flatMap(lesson =>
          lesson.epsQuestions.map(question => ({
            ...question,
            chapter: lesson.chapter,
            lessonTitle: lesson.title,
          })),
        );
        const selected = buildSmartMockQuestions(all, {
          count,
          mode: input?.mode ?? "balanced",
          focusChapters: input?.focusChapters ?? [],
          focusSection: input?.focusSection ?? "auto",
        });
        return selected.map((question, index) => ({
          ...question,
          testId: `mock-${index + 1}-${question.chapter}-${question.id}`,
        }));
      }),
  }),

  progress: router({
    list: protectedProcedure.query(({ ctx }) => db.listProgress(ctx.user.id)),
    save: protectedProcedure
      .input(
        chapterInput.extend({
          vocabDone: z.boolean().optional(),
          grammarDone: z.boolean().optional(),
          dialogueDone: z.boolean().optional(),
          practiceScore: z.number().int().min(0).max(24).nullable().optional(),
          practiceTotal: z.number().int().min(0).max(24).nullable().optional(),
          examScore: z.number().int().min(0).max(20).nullable().optional(),
          examTotal: z.number().int().min(0).max(20).nullable().optional(),
          completed: z.boolean().optional(),
          minutes: z.number().int().min(0).max(240).default(5),
          tzOffsetMinutes: tzOffsetInput,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        await assertBasicsComplete(ctx.user.id, ctx.user.role);
        const { chapter, minutes, tzOffsetMinutes, ...patch } = input;
        const saved = await db.saveProgress(ctx.user.id, chapter, patch);
        await db.recordStudyDay(ctx.user.id, today(tzOffsetMinutes), minutes);
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
    /**
     * Merge guest localStorage learning into the signed-in account.
     * Prefer remote when already further ahead; never decrease completed chapters.
     */
    importGuest: protectedProcedure
      .input(
        z.object({
          progress: z
            .array(
              z.object({
                chapter: z.number().int().min(1).max(60),
                vocabDone: z.boolean().optional(),
                grammarDone: z.boolean().optional(),
                dialogueDone: z.boolean().optional(),
                practiceScore: z.number().int().min(0).max(24).nullable().optional(),
                practiceTotal: z.number().int().min(0).max(24).nullable().optional(),
                examScore: z.number().int().min(0).max(20).nullable().optional(),
                examTotal: z.number().int().min(0).max(20).nullable().optional(),
                completed: z.boolean().optional(),
              }),
            )
            .max(60)
            .default([]),
          attempts: z
            .array(
              z.object({
                kind: z.enum(["practice", "chapter-exam", "mock-test"]),
                chapter: z.number().int().min(1).max(60).nullable().optional(),
                score: z.number().int().min(0),
                total: z.number().int().min(1).max(100),
                durationSec: z.number().int().min(0).max(14400).optional(),
              }),
            )
            .max(50)
            .default([]),
          studyDays: z
            .array(
              z.object({
                date: dayKeySchema,
                minutes: z.number().int().min(0).max(1440),
                activities: z.number().int().min(0).max(500),
              }),
            )
            .max(120)
            .default([]),
          tzOffsetMinutes: tzOffsetInput,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const remote = await db.listProgress(ctx.user.id);
        const remoteByChapter = new Map(remote.map(row => [row.chapter, row]));
        let mergedChapters = 0;

        for (const local of input.progress) {
          const existing = remoteByChapter.get(local.chapter);
          const patch = {
            vocabDone: Boolean(local.vocabDone || existing?.vocabDone),
            grammarDone: Boolean(local.grammarDone || existing?.grammarDone),
            dialogueDone: Boolean(local.dialogueDone || existing?.dialogueDone),
            practiceScore: Math.max(local.practiceScore ?? 0, existing?.practiceScore ?? 0) || null,
            practiceTotal: Math.max(local.practiceTotal ?? 0, existing?.practiceTotal ?? 0) || null,
            examScore: Math.max(local.examScore ?? 0, existing?.examScore ?? 0) || null,
            examTotal: Math.max(local.examTotal ?? 0, existing?.examTotal ?? 0) || null,
            completed: Boolean(local.completed || existing?.completed),
          };
          // Only write if local adds something
          const improves =
            !existing ||
            patch.vocabDone !== existing.vocabDone ||
            patch.grammarDone !== existing.grammarDone ||
            patch.dialogueDone !== existing.dialogueDone ||
            patch.completed !== existing.completed ||
            (patch.practiceScore ?? 0) > (existing.practiceScore ?? 0) ||
            (patch.examScore ?? 0) > (existing.examScore ?? 0);
          if (!improves) continue;
          await db.saveProgress(ctx.user.id, local.chapter, patch);
          mergedChapters += 1;
        }

        let importedAttempts = 0;
        for (const attempt of input.attempts.slice(0, 30)) {
          await db.createAttempt({
            userId: ctx.user.id,
            kind: attempt.kind,
            chapter: attempt.chapter ?? null,
            score: attempt.score,
            total: attempt.total,
            durationSec: attempt.durationSec ?? null,
            detail: { importedFromGuest: true, serverGraded: false },
          });
          importedAttempts += 1;
        }

        // Client-supplied history: the regex admits 2026-13-45 and 2999-12-31, which
        // would either fail to parse or plant permanently-unreachable streak days.
        const importTodayKey = today(input.tzOffsetMinutes);
        let skippedDays = 0;
        for (const day of input.studyDays) {
          if (!isPlausibleStudyDay(day.date, importTodayKey)) {
            skippedDays += 1;
            continue;
          }
          await db.recordStudyDay(ctx.user.id, day.date, day.minutes);
        }
        if (skippedDays) {
          console.warn("[progress.importGuest] skipped implausible study days", {
            userId: ctx.user.id,
            skippedDays,
          });
        }

        const all = await db.listProgress(ctx.user.id);
        const completed = all.filter(row => row.completed).length;
        if (completed >= 1) await db.awardBadge(ctx.user.id, "first-step");
        if (completed >= 10) await db.awardBadge(ctx.user.id, "ten-lessons");
        if (completed >= 30) await db.awardBadge(ctx.user.id, "halfway-hero");
        if (completed >= 60) await db.awardBadge(ctx.user.id, "curriculum-master");

        return { mergedChapters, importedAttempts, completedLessons: completed };
      }),
  }),

  attempts: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(100).default(30) }).optional())
      .query(({ ctx, input }) => db.listAttempts(ctx.user.id, input?.limit ?? 30)),
    /**
     * Record an attempt. Prefer server grading via `answers` (+ optional matching / mockQuestions).
     * Client-supplied score/total is accepted only as a fallback for legacy clients and is marked
     * untrusted (serverGraded: false) so certificates still rely on graded attempts when present.
     */
    record: protectedProcedure
      .input(
        z
          .object({
            kind: z.enum(["practice", "chapter-exam", "mock-test"]),
            chapter: z.number().int().min(1).max(60).nullable().optional(),
            score: z.number().int().min(0).optional(),
            total: z.number().int().min(1).max(100).optional(),
            durationSec: z.number().int().min(0).max(14400).nullable().optional(),
            tzOffsetMinutes: tzOffsetInput,
            answers: z.record(z.string(), z.number().int()).optional(),
            matching: z.record(z.string(), z.record(z.string(), z.string())).optional(),
            mockQuestions: z
              .array(
                z.object({
                  chapter: z.number().int().min(1).max(60),
                  id: z.string().min(1),
                  testId: z.string().min(1),
                }),
              )
              .min(1)
              .max(40)
              .optional(),
            detail: z.unknown().optional(),
          })
          .superRefine((value, ctx) => {
            const hasAnswers = value.answers && Object.keys(value.answers).length >= 0 && value.answers !== undefined;
            if (value.kind === "mock-test" && value.answers) {
              if (!value.mockQuestions?.length) {
                ctx.addIssue({ code: "custom", message: "mockQuestions required when grading mock-test answers" });
              }
            }
            if ((value.kind === "practice" || value.kind === "chapter-exam") && value.answers) {
              if (!value.chapter) {
                ctx.addIssue({ code: "custom", message: "chapter required when grading lesson answers" });
              }
            }
            if (!value.answers && (value.score === undefined || value.total === undefined)) {
              ctx.addIssue({ code: "custom", message: "Provide answers for server grading, or score+total" });
            }
            if (value.score !== undefined && value.total !== undefined && value.score > value.total) {
              ctx.addIssue({ code: "custom", message: "Score cannot exceed total" });
            }
            void hasAnswers;
          }),
      )
      .mutation(async ({ ctx, input }) => {
        // Write-gate practice / chapter-exam only; mock-test stays open in v1
        if (input.kind === "practice" || input.kind === "chapter-exam") {
          await assertBasicsComplete(ctx.user.id, ctx.user.role);
        }

        let score = input.score ?? 0;
        let total = input.total ?? 0;
        let correctIds: string[] = [];
        let serverGraded = false;

        if (input.answers && (input.kind === "practice" || input.kind === "chapter-exam")) {
          const chapter = input.chapter;
          if (!chapter) badRequest("chapter is required");
          const lesson = getLesson(chapter);
          if (!lesson) notFound(`Lesson ${chapter} was not found`);
          const graded = scoreLessonExam(
            lesson,
            input.kind,
            input.answers,
            normalizeMatching(input.matching),
          );
          score = graded.score;
          total = graded.total;
          correctIds = graded.correctIds;
          serverGraded = true;
        } else if (input.answers && input.kind === "mock-test" && input.mockQuestions) {
          const refs = input.mockQuestions as MockQuestionRef[];
          const graded = scoreMockFromLessons(refs, input.answers, (chapter, id) => {
            const lesson = getLesson(chapter);
            return lesson?.epsQuestions.find(question => question.id === id);
          });
          score = graded.score;
          total = graded.total;
          correctIds = graded.correctIds;
          serverGraded = true;
        } else if (input.score !== undefined && input.total !== undefined) {
          score = input.score;
          total = input.total;
          serverGraded = false;
        } else {
          badRequest("Unable to grade attempt");
        }

        const detail = attemptDetailSchema.parse({
          answers: input.answers ?? {},
          matching: input.matching,
          mockQuestions: input.mockQuestions,
          correctIds,
          serverGraded,
          ...(typeof input.detail === "object" && input.detail ? input.detail : {}),
        });

        const attempt = await db.createAttempt({
          userId: ctx.user.id,
          kind: input.kind,
          chapter: input.chapter ?? null,
          score,
          total,
          durationSec: input.durationSec,
          detail,
        });
        await db.recordStudyDay(
          ctx.user.id,
          today(input.tzOffsetMinutes),
          Math.max(1, Math.round((input.durationSec ?? 300) / 60)),
        );

        if (input.chapter && input.kind === "practice") {
          await db.saveProgress(ctx.user.id, input.chapter, {
            practiceScore: score,
            practiceTotal: total,
          });
        }
        if (input.chapter && input.kind === "chapter-exam") {
          await db.saveProgress(ctx.user.id, input.chapter, {
            examScore: score,
            examTotal: total,
            completed: total > 0 && score / total >= 0.75,
          });
        }

        // Only award score-based badges for server-graded attempts
        if (serverGraded) {
          const percent = total > 0 ? Math.round((score / total) * 100) : 0;
          if (percent === 100) await db.awardBadge(ctx.user.id, "perfect-score");
          if (input.kind === "mock-test" && percent >= 80) await db.awardBadge(ctx.user.id, "mock-ready");
        }

        return { ...attempt, score, total, serverGraded };
      }),
  }),

  planner: router({
    get: protectedProcedure
      .input(
        z
          .object({
            from: dayKeySchema.optional(),
            to: dayKeySchema.optional(),
          })
          .optional(),
      )
      .query(async ({ ctx, input }) => {
        const [settings, items] = await Promise.all([
          db.getPlannerSettings(ctx.user.id),
          db.listPlannerItems(ctx.user.id, input?.from, input?.to),
        ]);
        return { settings, items };
      }),
    saveSettings: protectedProcedure
      .input(
        z.object({
          dailyGoalMinutes: z.number().int().min(5).max(240),
          dailyGoalLessons: z.number().int().min(1).max(10),
          reminderTime: z
            .string()
            .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
            .nullable()
            .optional(),
          targetExamDate: dayKeySchema.nullable().optional(),
        }),
      )
      .mutation(({ ctx, input }) => db.savePlannerSettings(ctx.user.id, input)),
    add: protectedProcedure
      .input(
        z.object({
          date: dayKeySchema,
          chapter: z.number().int().min(1).max(60),
          kind: z.enum(["lesson", "practice", "exam", "review"]),
        }),
      )
      .mutation(({ ctx, input }) => db.addPlannerItem({ userId: ctx.user.id, ...input })),
    setDone: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), done: z.boolean() }))
      .mutation(({ ctx, input }) => db.setPlannerItemDone(ctx.user.id, input.id, input.done)),
    remove: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.removePlannerItem(ctx.user.id, input.id)),
  }),

  certificates: router({
    mine: protectedProcedure.query(async ({ ctx }) => {
      const rows = await db.listCertificates(ctx.user.id);
      return rows.map(row => {
        const snap = row.recipientSnapshot as Record<string, unknown> | null;
        return {
          ...row,
          learnerName:
            (typeof snap?.fullName === "string" && snap.fullName) || ctx.user.name || "EasyEPS Learner",
          avatarUrl: typeof snap?.avatarUrl === "string" ? snap.avatarUrl : "",
        };
      });
    }),
    verify: publicProcedure
      .input(z.object({ code: z.string().min(6).max(32) }))
      .query(async ({ input, ctx }) => {
        const certificate = await db.getCertificate(input.code);
        if (!certificate) notFound("Certificate was not found");
        // Anyone with the link can reach this. Verification only needs to prove the
        // credential is genuine and name its holder — not disclose their email, phone,
        // or internal user id. The owner still sees the full record via certificates.mine.
        const isOwner = ctx.user?.id === certificate.userId;
        if (isOwner) return certificate;
        const { userId: _userId, recipient, ...publicFields } = certificate;
        return { ...publicFields, recipient: publicRecipient(recipient) };
      }),
    issue: protectedProcedure
      .input(z.object({ kind: z.enum(["course-completion", "mock-test"]) }))
      .mutation(async ({ ctx, input }) => {
        const eligible = await db.getCertificateEligibleProfile(ctx.user.id);
        if (!eligible.ok) {
          if (eligible.reason === "missing-avatar") {
            preconditionFailed(
              "Add a profile picture before issuing a certificate. Open Profile Setup to upload your photo.",
            );
          }
          preconditionFailed(
            "Complete your profile (name, email, nationality, learning level) before issuing a certificate.",
          );
        }

        if (input.kind === "course-completion") {
          const progress = await db.listProgress(ctx.user.id);
          if (progress.filter(row => row.completed).length < 60) {
            preconditionFailed("Complete all 60 lessons before issuing this certificate");
          }
          return db.issueCertificate({
            userId: ctx.user.id,
            code: `EPS-${nanoid(10).toUpperCase()}`,
            kind: input.kind,
            scorePercent: 100,
            recipientSnapshot: eligible.recipient,
          });
        }

        const attempts = await db.listAttempts(ctx.user.id, 100);
        // Prefer server-graded mock attempts for certificate eligibility
        const mockAttempts = attempts.filter(row => {
          if (row.kind !== "mock-test") return false;
          const detail = row.detail as { serverGraded?: boolean } | null;
          // Accept graded attempts, or legacy attempts until clients upgrade
          return detail?.serverGraded !== false || detail?.serverGraded === undefined;
        });
        const trusted = mockAttempts.filter(row => {
          const detail = row.detail as { serverGraded?: boolean } | null;
          return detail?.serverGraded === true;
        });
        const pool = trusted.length ? trusted : mockAttempts;
        const best = pool.sort((a, b) => b.score / b.total - a.score / a.total)[0];
        if (!best || best.score / best.total < 0.8) {
          preconditionFailed("Score at least 80% on a mock test before issuing this certificate");
        }
        return db.issueCertificate({
          userId: ctx.user.id,
          code: `EPS-${nanoid(10).toUpperCase()}`,
          kind: input.kind,
          scorePercent: Math.round((best.score / best.total) * 100),
          recipientSnapshot: eligible.recipient,
        });
      }),
  }),


  /**
   * Hangul Basics track APIs.
   * Curriculum write-gate: assertBasicsComplete on progress.save and practice/chapter-exam attempts
   * when ENV.basicsGateEnabled (see server/basicsGate.ts, docs/BASICS_RUNBOOK.md).
   */
  basics: router({
    /** Public module summaries for the Basics hub. */
    listModules: publicProcedure.query(() => {
      try {
        const manifest = getBasicsManifest();
        return {
          version: manifest.version,
          passScore: manifest.passScore,
          modules: getBasicsModuleSummaries(),
        };
      } catch (error) {
        console.error("[basics.listModules] failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load Basics modules",
        });
      }
    }),

    /** Full module content for the player. */
    getModule: publicProcedure
      .input(z.object({ id: basicsModuleIdSchema }))
      .query(({ input }) => {
        const module = getBasicsModule(input.id);
        if (!module) notFound(`Basics module ${input.id} was not found`);
        return module;
      }),

    /** Stroke practice file by id or character. */
    getStroke: publicProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(({ input }) => {
        const stroke = getStrokeFile(input.id);
        if (!stroke) notFound(`Stroke file ${input.id} was not found`);
        return stroke;
      }),

    /**
     * Gate status for client useBasicsGate.
     * When gate is off, completed is true for everyone (hub still usable voluntarily).
     * Guests get completed: null when gate is on (client uses local progress).
     */
    gateStatus: publicProcedure.query(async ({ ctx }) => {
      const gateEnabled = ENV.basicsGateEnabled;
      const authenticated = Boolean(ctx.user);
      const bypass = ctx.user?.role === "admin";

      if (!gateEnabled) {
        return {
          gateEnabled: false,
          authenticated,
          completed: true as boolean | null,
          bypass,
        };
      }

      if (!authenticated) {
        return {
          gateEnabled: true,
          authenticated: false,
          completed: null as boolean | null,
          bypass: false,
        };
      }

      if (bypass) {
        return {
          gateEnabled: true,
          authenticated: true,
          completed: true as boolean | null,
          bypass: true,
        };
      }

      try {
        const row = await db.getBasicsProgress(ctx.user!.id);
        return {
          gateEnabled: true,
          authenticated: true,
          completed: Boolean(row?.completed) as boolean | null,
          bypass: false,
        };
      } catch {
        // DB unavailable — fail open for browsing (completed unknown); client should
        // treat as not decided. Prefer null so UI does not flash false unlock.
        return {
          gateEnabled: true,
          authenticated: true,
          completed: null as boolean | null,
          bypass: false,
        };
      }
    }),

    /** Full Basics progress for the signed-in user. */
    get: protectedProcedure.query(async ({ ctx }) => {
      try {
        const row = await db.getBasicsProgress(ctx.user.id);
        if (!row) {
          return {
            progress: emptyBasicsProgress(),
            completed: false,
            checkpointScore: null as number | null,
            checkpointTotal: null as number | null,
            completedAt: null as string | null,
            unlockSource: null as string | null,
          };
        }
        return {
          progress: db.basicsRowToProgress(row),
          completed: row.completed,
          checkpointScore: row.checkpointScore,
          checkpointTotal: row.checkpointTotal,
          completedAt: row.completedAt ? row.completedAt.toISOString() : null,
          unlockSource: row.unlockSource,
        };
      } catch (error) {
        console.error("[basics.get] failed", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not load Basics progress",
        });
      }
    }),

    /**
     * Module step progress only. Unlock fields (completed / checkpointPassedAt /
     * unlockSource) are never accepted from the client.
     */
    saveProgress: protectedProcedure
      .input(basicsProgressPatchSchema)
      .mutation(async ({ ctx, input }) => {
        // Defense in depth: drop any unlock-shaped keys if the schema is widened later
        const { minutes, tzOffsetMinutes, ...modulePatch } = input;
        const unsafe = modulePatch as Record<string, unknown>;
        delete unsafe.completed;
        delete unsafe.checkpointPassedAt;
        delete unsafe.unlockSource;

        try {
          const { progress, row } = await db.saveBasicsModuleProgress(ctx.user.id, modulePatch);
          await db.recordStudyDay(ctx.user.id, today(tzOffsetMinutes), minutes);
          return {
            progress,
            completed: row.completed,
            module: progress.modules[modulePatch.moduleId] ?? null,
          };
        } catch (error) {
          console.error("[basics.saveProgress] failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not save Basics progress",
          });
        }
      }),

    /**
     * Server-grade checkpoint answers. Sets completed only when score/total ≥ passRatio.
     */
    submitCheckpoint: protectedProcedure
      .input(basicsSubmitCheckpointSchema)
      .mutation(async ({ ctx, input }) => {
        try {
          const result = await db.submitBasicsCheckpoint(ctx.user.id, {
            answers: input.answers,
            selectedOptions: input.selectedOptions,
            matching: input.matching,
            questionIds: input.questionIds,
            durationSec: input.durationSec,
          });
          await db.recordStudyDay(
            ctx.user.id,
            today(input.tzOffsetMinutes),
            Math.max(1, Math.round((input.durationSec ?? 300) / 60)),
          );
          return {
            score: result.score,
            total: result.total,
            passed: result.passed,
            passRatio: result.passRatio,
            correctIds: result.correctIds,
            progress: result.progress,
            completed: result.row.completed,
          };
        } catch (error) {
          console.error("[basics.submitCheckpoint] failed", error);
          if (error instanceof Error && /checkpoint module missing/i.test(error.message)) {
            notFound("Basics checkpoint module was not found");
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not submit Basics checkpoint",
          });
        }
      }),

    /**
     * Login merge of local module progress. Never unlocks curriculum from client
     * checkpointPassedAt / unlockSource (those are stripped before merge).
     */
    importProgress: protectedProcedure
      .input(basicsImportProgressSchema)
      .mutation(async ({ ctx, input }) => {
        const incoming: BasicsProgress = {
          version: 1,
          modules: {},
        };
        for (const [id, mod] of Object.entries(input.modules ?? {})) {
          incoming.modules[id] = {
            moduleId: mod.moduleId || id,
            stepsDone: mod.stepsDone ?? [],
            speakItemsDone: mod.speakItemsDone ?? [],
            writeItemsDone: mod.writeItemsDone ?? [],
            builderItemsDone: mod.builderItemsDone ?? [],
            readItemsDone: mod.readItemsDone ?? [],
            quizScore: mod.quizScore,
            quizTotal: mod.quizTotal,
            lastStepId: mod.lastStepId,
            updatedAt: mod.updatedAt || new Date().toISOString(),
            // strip denormalized completed — recompute server-side
          };
        }
        // Intentionally ignore input.checkpointPassedAt / input.unlockSource

        try {
          const { progress, row } = await db.importBasicsProgress(ctx.user.id, incoming);
          return {
            progress,
            completed: row.completed,
            /** True when local claimed unlock but server is still locked — client should re-take checkpoint. */
            needsCheckpointRetake: Boolean(input.checkpointPassedAt) && !row.completed,
          };
        } catch (error) {
          console.error("[basics.importProgress] failed", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not import Basics progress",
          });
        }
      }),
  }),

  tutor: router({
    chat: protectedProcedure
      .input(
        z.object({
          chapter: z.number().int().min(1).max(60).optional(),
          messages: z
            .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(3000) }))
            .min(1)
            .max(12),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        // Simple in-memory rate limit: 20 messages per user per rolling hour
        const key = `tutor:${ctx.user.id}`;
        const now = Date.now();
        const bucket = (globalThis as unknown as { __easyepsTutorBuckets?: Map<string, number[]> })
          .__easyepsTutorBuckets ??
          ((globalThis as unknown as { __easyepsTutorBuckets: Map<string, number[]> }).__easyepsTutorBuckets =
            new Map());
        const windowMs = 60 * 60 * 1000;
        const limit = 20;
        const stamps = (bucket.get(key) ?? []).filter((ts: number) => now - ts < windowMs);
        if (stamps.length >= limit) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "এআই শিক্ষক সীমা: প্রতি ঘণ্টায় সর্বোচ্চ ২০টি বার্তা। একটু পরে আবার চেষ্টা করুন।",
          });
        }
        stamps.push(now);
        bucket.set(key, stamps);

        const lesson = input.chapter ? getLesson(input.chapter) : undefined;
        const lessonContext = lesson
          ? `Current lesson: Chapter ${lesson.chapter}, ${lesson.title.ko} / ${lesson.title.bn}. Vocabulary focus: ${lesson.vocabulary
              .slice(0, 12)
              .map(item => `${item.ko} (${item.bn})`)
              .join(", ")}. Grammar: ${lesson.grammar.map(item => item.pattern).join(", ")}.`
          : "The learner has not selected a chapter.";
        const response = await invokeLLM({
          // SpaceXAI default (ENV.xaiModel / grok-4.5); override via XAI_MODEL
          model: ENV.xaiModel || "grok-4.5",
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
          content:
            typeof content === "string"
              ? content
              : Array.isArray(content)
                ? content.map(part => ("text" in part ? part.text : "")).join("\n")
                : "দুঃখিত, এখন উত্তর তৈরি করা যাচ্ছে না।",
        };
      }),
  }),

  admin: router({
    stats: adminProcedure.query(async () => ({ ...(await db.adminStats()), lessons: getAllLessons().length })),
    users: adminProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).default(100) }).optional())
      .query(({ input }) => db.adminListUsers(input?.limit ?? 100)),
    setRole: adminProcedure
      .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        try {
          return await db.setUserRole(input.userId, input.role);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Could not change role";
          if (message.includes("last administrator")) badRequest(message);
          throw error;
        }
      }),
    lesson: adminProcedure.input(chapterInput).query(({ input }) => getLesson(input.chapter)),
    saveLesson: adminProcedure
      .input(z.object({ chapter: z.number().int().min(1).max(60), content: lessonSchema }))
      .mutation(({ input }) => replaceLesson(input.chapter, input.content)),
  }),
});

export type AppRouter = typeof appRouter;
