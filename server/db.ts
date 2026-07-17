import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  attempts,
  badges,
  certificates,
  InsertUser,
  lessonProgress,
  plannerItems,
  plannerSettings,
  studyDays,
  users,
} from "../drizzle/schema";
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
}) {
  const db = await requireDb();
  const result = await db.insert(certificates).values(input);
  return { id: Number(result[0].insertId), issuedAt: new Date(), ...input };
}

export async function listCertificates(userId: number) {
  const db = await requireDb();
  return db.select().from(certificates).where(eq(certificates.userId, userId)).orderBy(desc(certificates.issuedAt));
}

export async function getCertificate(code: string) {
  const db = await requireDb();
  const [certificate] = await db.select().from(certificates).where(eq(certificates.code, code)).limit(1);
  if (!certificate) return undefined;
  const [user] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, certificate.userId)).limit(1);
  return { ...certificate, learnerName: user?.name ?? "EasyEPS Learner" };
}

export async function adminStats() {
  const db = await requireDb();
  const [[userCount], [attemptCount], [completionCount]] = await Promise.all([
    db.select({ value: count() }).from(users),
    db.select({ value: count() }).from(attempts),
    db.select({ value: count() }).from(lessonProgress).where(eq(lessonProgress.completed, true)),
  ]);
  return {
    users: userCount?.value ?? 0,
    attempts: attemptCount?.value ?? 0,
    completedLessons: completionCount?.value ?? 0,
  };
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
