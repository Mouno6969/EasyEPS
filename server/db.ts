import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import type { CertificateRecipient } from "../shared/certificate";
import { buildCertificateRecipient, certificateRecipientSchema } from "../shared/certificate";
import type { ProfileSetupData } from "../shared/profile";
import type { BasicsModuleProgress, BasicsProgress } from "../shared/basics";
import {
  applyBasicsModulePatch,
  emptyBasicsProgress,
  isCheckpointPassing,
  isModuleComplete,
  mergeBasicsProgress,
  scoreBasicsQuiz,
  stripBasicsUnlockFields,
} from "../shared/basics";
import {
  attempts,
  badges,
  basicsProgress,
  certificates,
  InsertUser,
  lessonProgress,
  plannerItems,
  plannerSettings,
  studyDays,
  userProfiles,
  users,
  type BasicsProgressRow,
  type UserProfileRow,
} from "../drizzle/schema";
import { getBasicsManifest, getBasicsModule } from "./basicsContent";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database persistence is unavailable in this environment");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] === undefined) continue;
    const normalized = user[field] ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listProgress(userId: number) {
  const db = await requireDb();
  return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId));
}

export async function saveProgress(
  userId: number,
  chapter: number,
  patch: Partial<{
    vocabDone: boolean;
    grammarDone: boolean;
    dialogueDone: boolean;
    practiceScore: number | null;
    practiceTotal: number | null;
    examScore: number | null;
    examTotal: number | null;
    completed: boolean;
  }>,
) {
  const db = await requireDb();
  const [existing] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.chapter, chapter)))
    .limit(1);

  if (existing) {
    await db.update(lessonProgress).set(patch).where(eq(lessonProgress.id, existing.id));
  } else {
    try {
      await db.insert(lessonProgress).values({ userId, chapter, ...patch });
    } catch {
      // Unique (userId, chapter) race: fall back to update
      await db
        .update(lessonProgress)
        .set(patch)
        .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.chapter, chapter)));
    }
  }
  const [saved] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.chapter, chapter)))
    .limit(1);
  return saved;
}

export async function createAttempt(input: {
  userId: number;
  kind: "practice" | "chapter-exam" | "mock-test";
  chapter?: number | null;
  score: number;
  total: number;
  durationSec?: number | null;
  detail?: unknown;
}) {
  const db = await requireDb();
  const result = await db.insert(attempts).values(input);
  return { id: Number(result[0].insertId), ...input };
}

export async function listAttempts(userId: number, limit = 30) {
  const db = await requireDb();
  return db.select().from(attempts).where(eq(attempts.userId, userId)).orderBy(desc(attempts.createdAt)).limit(limit);
}

export async function recordStudyDay(userId: number, date: string, minutes: number, activityCount = 1) {
  const db = await requireDb();
  const [existing] = await db
    .select()
    .from(studyDays)
    .where(and(eq(studyDays.userId, userId), eq(studyDays.date, date)))
    .limit(1);
  if (existing) {
    await db
      .update(studyDays)
      .set({ minutes: existing.minutes + minutes, activities: existing.activities + activityCount })
      .where(eq(studyDays.id, existing.id));
  } else {
    try {
      await db.insert(studyDays).values({ userId, date, minutes, activities: activityCount });
    } catch {
      const [race] = await db
        .select()
        .from(studyDays)
        .where(and(eq(studyDays.userId, userId), eq(studyDays.date, date)))
        .limit(1);
      if (race) {
        await db
          .update(studyDays)
          .set({ minutes: race.minutes + minutes, activities: race.activities + activityCount })
          .where(eq(studyDays.id, race.id));
      }
    }
  }
}

export async function listStudyDays(userId: number, from?: string, to?: string) {
  const db = await requireDb();
  const predicates = [eq(studyDays.userId, userId)];
  if (from) predicates.push(gte(studyDays.date, from));
  if (to) predicates.push(lte(studyDays.date, to));
  return db.select().from(studyDays).where(and(...predicates)).orderBy(studyDays.date);
}

export async function getPlannerSettings(userId: number) {
  const db = await requireDb();
  const [settings] = await db.select().from(plannerSettings).where(eq(plannerSettings.userId, userId)).limit(1);
  return settings;
}

export async function savePlannerSettings(userId: number, patch: {
  dailyGoalMinutes: number;
  dailyGoalLessons: number;
  reminderTime?: string | null;
  targetExamDate?: string | null;
}) {
  const db = await requireDb();
  const existing = await getPlannerSettings(userId);
  if (existing) {
    await db.update(plannerSettings).set(patch).where(eq(plannerSettings.id, existing.id));
  } else {
    await db.insert(plannerSettings).values({ userId, ...patch });
  }
  return getPlannerSettings(userId);
}

export async function listPlannerItems(userId: number, from?: string, to?: string) {
  const db = await requireDb();
  const predicates = [eq(plannerItems.userId, userId)];
  if (from) predicates.push(gte(plannerItems.date, from));
  if (to) predicates.push(lte(plannerItems.date, to));
  return db.select().from(plannerItems).where(and(...predicates)).orderBy(plannerItems.date);
}

export async function addPlannerItem(input: {
  userId: number;
  date: string;
  chapter: number;
  kind: "lesson" | "practice" | "exam" | "review";
}) {
  const db = await requireDb();
  const result = await db.insert(plannerItems).values(input);
  return { id: Number(result[0].insertId), done: false, ...input };
}

export async function setPlannerItemDone(userId: number, id: number, done: boolean) {
  const db = await requireDb();
  await db.update(plannerItems).set({ done }).where(and(eq(plannerItems.id, id), eq(plannerItems.userId, userId)));
  return { id, done };
}

export async function removePlannerItem(userId: number, id: number) {
  const db = await requireDb();
  await db.delete(plannerItems).where(and(eq(plannerItems.id, id), eq(plannerItems.userId, userId)));
  return { success: true } as const;
}

export async function listBadges(userId: number) {
  const db = await requireDb();
  return db.select().from(badges).where(eq(badges.userId, userId)).orderBy(desc(badges.earnedAt));
}

export async function awardBadge(userId: number, badgeId: string) {
  const db = await requireDb();
  const [existing] = await db
    .select()
    .from(badges)
    .where(and(eq(badges.userId, userId), eq(badges.badgeId, badgeId)))
    .limit(1);
  if (existing) return existing;
  try {
    const result = await db.insert(badges).values({ userId, badgeId });
    return { id: Number(result[0].insertId), userId, badgeId, earnedAt: new Date() };
  } catch {
    const [race] = await db
      .select()
      .from(badges)
      .where(and(eq(badges.userId, userId), eq(badges.badgeId, badgeId)))
      .limit(1);
    if (race) return race;
    throw new Error(`Failed to award badge ${badgeId}`);
  }
}

export async function issueCertificate(input: {
  userId: number;
  code: string;
  kind: "course-completion" | "mock-test";
  scorePercent?: number | null;
  recipientSnapshot: CertificateRecipient;
}) {
  const db = await requireDb();
  const snapshot = certificateRecipientSchema.parse(input.recipientSnapshot);
  const result = await db.insert(certificates).values({
    userId: input.userId,
    code: input.code,
    kind: input.kind,
    scorePercent: input.scorePercent ?? null,
    recipientSnapshot: snapshot,
  });
  return {
    id: Number(result[0].insertId),
    issuedAt: new Date(),
    userId: input.userId,
    code: input.code,
    kind: input.kind,
    scorePercent: input.scorePercent ?? null,
    recipientSnapshot: snapshot,
  };
}

export async function listCertificates(userId: number) {
  const db = await requireDb();
  return db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.issuedAt));
}

function resolveRecipient(
  snapshot: unknown,
  fallback: { name?: string | null; email?: string | null; profile?: UserProfileRow | null },
): CertificateRecipient {
  if (snapshot && typeof snapshot === "object") {
    const parsed = certificateRecipientSchema.safeParse(snapshot);
    if (parsed.success) return parsed.data;
  }
  if (fallback.profile) {
    try {
      return buildCertificateRecipient(fallback.profile);
    } catch {
      // fall through
    }
  }
  return {
    fullName: fallback.name?.trim() || "EasyEPS Learner",
    email: fallback.email?.trim().toLowerCase() || "",
    phone: "",
    nationality: "",
    city: "",
    targetIndustry: "",
    avatarUrl: "",
  };
}

export async function getCertificate(code: string) {
  const db = await requireDb();
  const [certificate] = await db.select().from(certificates).where(eq(certificates.code, code)).limit(1);
  if (!certificate) return undefined;

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, certificate.userId))
    .limit(1);

  let profile: UserProfileRow | null = null;
  try {
    profile = await getUserProfile(certificate.userId);
  } catch {
    profile = null;
  }

  const recipient = resolveRecipient(certificate.recipientSnapshot, {
    name: user?.name,
    email: user?.email,
    profile,
  });

  return {
    id: certificate.id,
    code: certificate.code,
    kind: certificate.kind,
    scorePercent: certificate.scorePercent,
    issuedAt: certificate.issuedAt,
    userId: certificate.userId,
    learnerName: recipient.fullName,
    recipient,
  };
}

/** Load profile fields needed to mint a certificate. */
export async function getCertificateEligibleProfile(userId: number) {
  const profile = await getUserProfile(userId);
  const [user] = await (await requireDb())
    .select({ name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!profile || !profile.isComplete) {
    return { ok: false as const, reason: "incomplete-profile" as const, profile, user };
  }
  if (!profile.avatarUrl) {
    return { ok: false as const, reason: "missing-avatar" as const, profile, user };
  }
  try {
    const recipient = buildCertificateRecipient(profile);
    return { ok: true as const, recipient, profile, user };
  } catch {
    return { ok: false as const, reason: "invalid-profile" as const, profile, user };
  }
}

export async function adminStats() {
  const db = await requireDb();
  const [[userCount], [attemptCount], [completionCount], [basicsCompletedCount]] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(attempts),
    db.select({ value: count() }).from(lessonProgress).where(eq(lessonProgress.completed, true)),
    db.select({ value: count() }).from(basicsProgress).where(eq(basicsProgress.completed, true)),
  ]);
  return {
    users: userCount?.value ?? 0,
    attempts: attemptCount?.value ?? 0,
    completedLessons: completionCount?.value ?? 0,
    /** Users with basicsProgress.completed = true (checkpoint, legacy, or admin). */
    basicsCompleted: basicsCompletedCount?.value ?? 0,
  };
}

/**
 * True when the user has any chapter progress or any attempt row (including mock-test).
 * Used for legacy grandfather eligibility.
 */
export async function userHasCurriculumActivity(userId: number): Promise<boolean> {
  const db = await requireDb();
  const [[progressHit], [attemptHit]] = await Promise.all([
    db
      .select({ id: lessonProgress.id })
      .from(lessonProgress)
      .where(eq(lessonProgress.userId, userId))
      .limit(1),
    db
      .select({ id: attempts.id })
      .from(attempts)
      .where(eq(attempts.userId, userId))
      .limit(1),
  ]);
  return Boolean(progressHit) || Boolean(attemptHit);
}

export async function adminListUsers(limit = 100) {
  const db = await requireDb();
  return db
    .select({ id: users.id, openId: users.openId, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn })
    .from(users)
    .orderBy(desc(users.lastSignedIn))
    .limit(limit);
}

export async function setUserRole(userId: number, role: "user" | "admin") {
  const db = await requireDb();
  await db.update(users).set({ role }).where(eq(users.id, userId));
  return { userId, role };
}

export async function getUserProfile(userId: number) {
  const db = await requireDb();
  const [row] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return row ?? null;
}

export async function upsertUserProfile(userId: number, data: ProfileSetupData) {
  const db = await requireDb();
  const now = new Date();
  const values = {
    userId,
    fullName: data.fullName,
    email: data.email,
    phone: data.phone || null,
    preferredLocale: data.preferredLocale,
    nationality: data.nationality,
    city: data.city || null,
    learningLevel: data.learningLevel,
    targetIndustry: data.targetIndustry || null,
    targetExamDate: data.targetExamDate || null,
    bio: data.bio || null,
    // Preserve existing avatar unless the client explicitly sends a new one
    ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
    isComplete: true as const,
    completedAt: now,
    updatedAt: now,
  };

  const existing = await getUserProfile(userId);
  if (existing) {
    await db
      .update(userProfiles)
      .set({
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        preferredLocale: values.preferredLocale,
        nationality: values.nationality,
        city: values.city,
        learningLevel: values.learningLevel,
        targetIndustry: values.targetIndustry,
        targetExamDate: values.targetExamDate,
        bio: values.bio,
        // Only overwrite avatar when provided (empty string clears)
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
        isComplete: true,
        completedAt: existing.completedAt ?? now,
        updatedAt: now,
      })
      .where(eq(userProfiles.userId, userId));
  } else {
    await db.insert(userProfiles).values({
      ...values,
      avatarUrl: data.avatarUrl || null,
    });
  }

  // Keep core user name/email in sync for certificates & admin lists
  await db
    .update(users)
    .set({ name: data.fullName, email: data.email, updatedAt: now })
    .where(eq(users.id, userId));

  return getUserProfile(userId);
}

export async function setUserAvatarUrl(userId: number, avatarUrl: string | null) {
  const db = await requireDb();
  const now = new Date();
  const existing = await getUserProfile(userId);
  if (existing) {
    await db
      .update(userProfiles)
      .set({ avatarUrl, updatedAt: now })
      .where(eq(userProfiles.userId, userId));
  } else {
    // Create a minimal incomplete profile row so avatar can be set before full setup
    await db.insert(userProfiles).values({
      userId,
      fullName: "Learner",
      email: `user-${userId}@easyeps.local`,
      nationality: "Bangladesh",
      preferredLocale: "bn",
      learningLevel: "beginner",
      avatarUrl,
      isComplete: false,
      updatedAt: now,
    });
  }
  return getUserProfile(userId);
}


// ---------------------------------------------------------------------------
// Hangul Basics progress
// ---------------------------------------------------------------------------

type UnlockSource = "checkpoint" | "legacy-migration" | "admin" | "flag-off";

function parseModulesJson(raw: unknown): Record<string, BasicsModuleProgress> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, BasicsModuleProgress>;
}

/** Reconstruct client BasicsProgress from a DB row. */
export function basicsRowToProgress(row: BasicsProgressRow): BasicsProgress {
  const modules = parseModulesJson(row.modules);
  const progress: BasicsProgress = { version: 1, modules };
  if (row.completed) {
    progress.checkpointPassedAt =
      row.completedAt instanceof Date
        ? row.completedAt.toISOString()
        : row.completedAt
          ? String(row.completedAt)
          : row.updatedAt instanceof Date
            ? row.updatedAt.toISOString()
            : new Date().toISOString();
  }
  if (row.unlockSource) {
    progress.unlockSource = row.unlockSource;
  }
  return progress;
}

export async function getBasicsProgress(userId: number): Promise<BasicsProgressRow | null> {
  const db = await requireDb();
  const [row] = await db.select().from(basicsProgress).where(eq(basicsProgress.userId, userId)).limit(1);
  return row ?? null;
}

async function upsertBasicsModules(
  userId: number,
  modules: Record<string, BasicsModuleProgress>,
  trusted?: {
    completed?: boolean;
    checkpointScore?: number | null;
    checkpointTotal?: number | null;
    completedAt?: Date | null;
    unlockSource?: UnlockSource | null;
  },
): Promise<BasicsProgressRow> {
  const db = await requireDb();
  const existing = await getBasicsProgress(userId);
  const now = new Date();

  if (existing) {
    const set: Record<string, unknown> = {
      modules,
      updatedAt: now,
    };
    // Only trusted paths may change unlock columns. Once completed, stay sticky
    // unless an explicit reset (future) clears them.
    if (trusted) {
      if (trusted.completed === true && !existing.completed) {
        set.completed = true;
        set.completedAt = trusted.completedAt ?? now;
        set.unlockSource = trusted.unlockSource ?? "checkpoint";
      }
      if (trusted.checkpointScore !== undefined) set.checkpointScore = trusted.checkpointScore;
      if (trusted.checkpointTotal !== undefined) set.checkpointTotal = trusted.checkpointTotal;
      // legacy/admin may set completed when already incomplete via markBasicsCompleteLegacy
      if (trusted.completed === true && existing.completed && trusted.unlockSource && !existing.unlockSource) {
        set.unlockSource = trusted.unlockSource;
      }
    }
    await db.update(basicsProgress).set(set).where(eq(basicsProgress.userId, userId));
  } else {
    const values = {
      userId,
      modules,
      completed: trusted?.completed === true,
      checkpointScore: trusted?.checkpointScore ?? null,
      checkpointTotal: trusted?.checkpointTotal ?? null,
      completedAt: trusted?.completed === true ? (trusted.completedAt ?? now) : null,
      unlockSource: trusted?.completed === true ? (trusted.unlockSource ?? null) : null,
      updatedAt: now,
    };
    try {
      await db.insert(basicsProgress).values(values);
    } catch {
      // race on unique userId — fall through to update modules only
      await db
        .update(basicsProgress)
        .set({ modules, updatedAt: now })
        .where(eq(basicsProgress.userId, userId));
      if (trusted?.completed === true) {
        const [race] = await db
          .select()
          .from(basicsProgress)
          .where(eq(basicsProgress.userId, userId))
          .limit(1);
        if (race && !race.completed) {
          await db
            .update(basicsProgress)
            .set({
              completed: true,
              completedAt: trusted.completedAt ?? now,
              unlockSource: trusted.unlockSource ?? "checkpoint",
              checkpointScore: trusted.checkpointScore ?? race.checkpointScore,
              checkpointTotal: trusted.checkpointTotal ?? race.checkpointTotal,
              updatedAt: now,
            })
            .where(eq(basicsProgress.userId, userId));
        }
      }
    }
  }

  const saved = await getBasicsProgress(userId);
  if (!saved) throw new Error("Failed to persist basics progress");
  return saved;
}

/**
 * Save a single module patch. Rejects / ignores unlock fields — only trusted
 * submitCheckpoint / markBasicsCompleteLegacy may set completed.
 */
export async function saveBasicsModuleProgress(
  userId: number,
  patch: {
    moduleId: string;
    stepsDone?: string[];
    speakItemsDone?: string[];
    writeItemsDone?: string[];
    builderItemsDone?: string[];
    quizScore?: number;
    quizTotal?: number;
    lastStepId?: string;
  },
): Promise<{ row: BasicsProgressRow; progress: BasicsProgress }> {
  // Explicitly drop any unlock-shaped keys if a caller spreads a loose object
  const safePatch = {
    moduleId: patch.moduleId,
    stepsDone: patch.stepsDone,
    speakItemsDone: patch.speakItemsDone,
    writeItemsDone: patch.writeItemsDone,
    builderItemsDone: patch.builderItemsDone,
    quizScore: patch.quizScore,
    quizTotal: patch.quizTotal,
    lastStepId: patch.lastStepId,
  };

  const existing = await getBasicsProgress(userId);
  const modules = parseModulesJson(existing?.modules);
  const content = getBasicsModule(safePatch.moduleId);
  const next = applyBasicsModulePatch(modules[safePatch.moduleId], safePatch, content);
  modules[safePatch.moduleId] = next;

  // Never pass trusted unlock — modules only
  const row = await upsertBasicsModules(userId, modules);
  return { row, progress: basicsRowToProgress(row) };
}

/**
 * Grade checkpoint answers server-side and set completed only when passing.
 * Sticky: a prior pass is preserved if a later attempt fails.
 */
export async function submitBasicsCheckpoint(
  userId: number,
  input: {
    answers: Record<string, number>;
    matching?: Record<string, Record<string, string>>;
    durationSec?: number;
  },
): Promise<{
  score: number;
  total: number;
  passed: boolean;
  passRatio: number;
  correctIds: string[];
  progress: BasicsProgress;
  row: BasicsProgressRow;
}> {
  const module = getBasicsModule("checkpoint");
  if (!module) throw new Error("checkpoint module missing");

  // Normalize matching string keys → numeric indexes for scoreBasicsQuiz
  const matching: Record<string, Record<number, string>> = {};
  if (input.matching) {
    for (const [qid, pairs] of Object.entries(input.matching)) {
      matching[qid] = {};
      for (const [index, value] of Object.entries(pairs)) {
        matching[qid]![Number(index)] = value;
      }
    }
  }

  const { score, total, correctIds } = scoreBasicsQuiz(module, input.answers, matching);
  const passRatio = getBasicsManifest().passScore;
  const passed = isCheckpointPassing(score, total, passRatio);

  const existing = await getBasicsProgress(userId);
  const modules = parseModulesJson(existing?.modules);
  const prevCp = modules.checkpoint;
  modules.checkpoint = {
    moduleId: "checkpoint",
    stepsDone: uniqStepDone(prevCp?.stepsDone, "cp-quiz"),
    speakItemsDone: prevCp?.speakItemsDone ?? [],
    writeItemsDone: prevCp?.writeItemsDone ?? [],
    builderItemsDone: prevCp?.builderItemsDone ?? [],
    quizScore: score,
    quizTotal: total,
    lastStepId: prevCp?.lastStepId ?? "cp-quiz",
    updatedAt: new Date().toISOString(),
    // teaching isModuleComplete always false for checkpoint; keep false
    completed: false,
  };

  const alreadyComplete = Boolean(existing?.completed);

  // Sticky unlock: once completed, stay completed even if this attempt fails.
  // Only a fresh pass sets completed + unlockSource + completedAt.
  const row = await upsertBasicsModules(
    userId,
    modules,
    alreadyComplete
      ? {
          completed: true,
          checkpointScore: score,
          checkpointTotal: total,
          completedAt: existing?.completedAt ?? new Date(),
          unlockSource: (existing?.unlockSource as UnlockSource | undefined) ?? "checkpoint",
        }
      : passed
        ? {
            completed: true,
            checkpointScore: score,
            checkpointTotal: total,
            completedAt: new Date(),
            unlockSource: "checkpoint",
          }
        : {
            checkpointScore: score,
            checkpointTotal: total,
          },
  );

  // Award hangul-ready only on a fresh pass
  if (passed && !alreadyComplete) {
    try {
      await awardBadge(userId, "hangul-ready");
    } catch (error) {
      console.warn("[basics] award hangul-ready failed", error);
    }
  }

  return {
    score,
    total,
    passed, // this attempt only — sticky unlock reflected on progress/row.completed
    passRatio,
    correctIds,
    progress: basicsRowToProgress(row),
    row,
  };
}

function uniqStepDone(prev: string[] | undefined, stepId: string): string[] {
  const set = new Set(prev ?? []);
  set.add(stepId);
  return [...set];
}

/**
 * Merge guest/local module progress into the server row.
 * Never unlocks curriculum (ignores checkpointPassedAt / unlockSource from incoming).
 */
export async function importBasicsProgress(
  userId: number,
  incoming: BasicsProgress,
): Promise<{ row: BasicsProgressRow; progress: BasicsProgress; merged: boolean }> {
  const existing = await getBasicsProgress(userId);
  const remote = existing ? basicsRowToProgress(existing) : emptyBasicsProgress();
  const safeIncoming = stripBasicsUnlockFields(incoming);

  // Normalize module entries so required fields exist
  const normalized: BasicsProgress = {
    version: 1,
    modules: {},
  };
  for (const [id, mod] of Object.entries(safeIncoming.modules ?? {})) {
    normalized.modules[id] = {
      moduleId: mod.moduleId || id,
      stepsDone: mod.stepsDone ?? [],
      speakItemsDone: mod.speakItemsDone ?? [],
      writeItemsDone: mod.writeItemsDone ?? [],
      builderItemsDone: mod.builderItemsDone ?? [],
      quizScore: mod.quizScore,
      quizTotal: mod.quizTotal,
      lastStepId: mod.lastStepId,
      updatedAt: mod.updatedAt || new Date().toISOString(),
    };
  }

  const merged = mergeBasicsProgress(remote, normalized);

  // Recompute denormalized module.completed from content when available
  for (const [id, mod] of Object.entries(merged.modules)) {
    const content = getBasicsModule(id);
    if (content) {
      mod.completed = content.id === "checkpoint" ? false : isModuleComplete(content, mod);
    }
  }

  // Write modules only — preserve existing unlock columns
  const row = await upsertBasicsModules(userId, merged.modules);
  return { row, progress: basicsRowToProgress(row), merged: true };
}

/**
 * Trusted grandfather / admin unlock. Idempotent: does not downgrade or re-stamp
 * completedAt when already complete.
 */
export async function markBasicsCompleteLegacy(
  userId: number,
  source: "legacy-migration" | "admin" = "legacy-migration",
): Promise<BasicsProgressRow> {
  const existing = await getBasicsProgress(userId);
  if (existing?.completed) {
    return existing;
  }
  const modules = parseModulesJson(existing?.modules);
  const now = new Date();
  return upsertBasicsModules(userId, modules, {
    completed: true,
    completedAt: now,
    unlockSource: source,
  });
}
