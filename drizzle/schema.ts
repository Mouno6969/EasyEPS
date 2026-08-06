import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = sqliteTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: integer("id").primaryKey({ autoIncrement: true }),
  /**
   * Internal stable user identifier, generated locally as `usr_<random>`.
   * Sessions are signed against this rather than the email, so changing an
   * email never invalidates a session or breaks progress rows.
   */
  openId: text("openId").notNull().unique(),
  name: text("name"),
  /** Login identifier. Unique so a second account cannot claim the same address. */
  email: text("email").unique(),
  /**
   * scrypt password digest, format `scrypt$N$salt$hash`. Nullable so an
   * externally-authenticated account (future OAuth provider) can exist without one.
   * NEVER serialize this to a client — project rows through `toSafeUser` first.
   */
  passwordHash: text("passwordHash"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).default("user").notNull(),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
  lastSignedIn: integer("lastSignedIn", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Extended learner profile (1:1 with users).
 * Populated via the profile setup form; required fields gate isComplete.
 */
export const userProfiles = sqliteTable("userProfiles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  fullName: text("fullName").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  preferredLocale: text("preferredLocale", { enum: ["bn", "ko", "en"] }).default("bn").notNull(),
  nationality: text("nationality").notNull(),
  city: text("city"),
  learningLevel: text("learningLevel", { enum: ["beginner", "elementary", "intermediate"] })
    .default("beginner")
    .notNull(),
  targetIndustry: text("targetIndustry"),
  targetExamDate: text("targetExamDate"),
  bio: text("bio"),
  /** Profile picture: /manus-storage/... path, https URL, or compressed data URL fallback. */
  avatarUrl: text("avatarUrl"),
  isComplete: integer("isComplete", { mode: "boolean" }).default(false).notNull(),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});
export type UserProfileRow = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/** Lesson content: one row per chapter, content stored as JSON authored offline. */
export const lessons = sqliteTable("lessons", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chapter: integer("chapter").notNull().unique(),
  slug: text("slug").notNull(),
  titleKo: text("titleKo").notNull(),
  titleBn: text("titleBn").notNull(),
  titleEn: text("titleEn").notNull(),
  category: text("category", { enum: ["daily-life", "culture", "workplace", "safety", "laws"] }).notNull(),
  level: text("level").default("beginner").notNull(),
  content: text("content", { mode: "json" }).notNull(),
  published: integer("published", { mode: "boolean" }).default(true).notNull(),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});
export type Lesson = typeof lessons.$inferSelect;

/** Per-user per-lesson progress. */
export const lessonProgress = sqliteTable(
  "lessonProgress",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull(),
    chapter: integer("chapter").notNull(),
    vocabDone: integer("vocabDone", { mode: "boolean" }).default(false).notNull(),
    grammarDone: integer("grammarDone", { mode: "boolean" }).default(false).notNull(),
    dialogueDone: integer("dialogueDone", { mode: "boolean" }).default(false).notNull(),
    practiceScore: integer("practiceScore"),
    practiceTotal: integer("practiceTotal"),
    examScore: integer("examScore"),
    examTotal: integer("examTotal"),
    completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
    updatedAt: integer("updatedAt", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date())
      .notNull(),
  },
  table => [uniqueIndex("lessonProgress_user_chapter_unique").on(table.userId, table.chapter)],
);
export type LessonProgress = typeof lessonProgress.$inferSelect;

/** Quiz / exam attempts (chapter practice, chapter exam, full mock). */
export const attempts = sqliteTable(
  "attempts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull(),
    kind: text("kind", { enum: ["practice", "chapter-exam", "mock-test"] }).notNull(),
    chapter: integer("chapter"),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    durationSec: integer("durationSec"),
    detail: text("detail", { mode: "json" }),
    createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  table => [index("attempts_user_created_idx").on(table.userId, table.createdAt)],
);
export type Attempt = typeof attempts.$inferSelect;

/** Daily study activity for streaks. One row per user per date (yyyy-mm-dd). */
export const studyDays = sqliteTable(
  "studyDays",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull(),
    date: text("date").notNull(),
    minutes: integer("minutes").default(0).notNull(),
    activities: integer("activities").default(0).notNull(),
  },
  table => [uniqueIndex("studyDays_user_date_unique").on(table.userId, table.date)],
);

/** Study planner settings and scheduled items. */
export const plannerSettings = sqliteTable("plannerSettings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  dailyGoalMinutes: integer("dailyGoalMinutes").default(30).notNull(),
  dailyGoalLessons: integer("dailyGoalLessons").default(1).notNull(),
  reminderTime: text("reminderTime"),
  targetExamDate: text("targetExamDate"),
});

export const plannerItems = sqliteTable(
  "plannerItems",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull(),
    date: text("date").notNull(),
    chapter: integer("chapter").notNull(),
    kind: text("kind", { enum: ["lesson", "practice", "exam", "review"] }).default("lesson").notNull(),
    done: integer("done", { mode: "boolean" }).default(false).notNull(),
    createdAt: integer("createdAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  table => [index("plannerItems_user_date_idx").on(table.userId, table.date)],
);
export type PlannerItem = typeof plannerItems.$inferSelect;

/** Earned badges. */
export const badges = sqliteTable(
  "badges",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("userId").notNull(),
    badgeId: text("badgeId").notNull(),
    earnedAt: integer("earnedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
  },
  table => [uniqueIndex("badges_user_badge_unique").on(table.userId, table.badgeId)],
);
export type Badge = typeof badges.$inferSelect;

/** Issued certificates. Recipient identity is snapshotted at issue time. */
export const certificates = sqliteTable("certificates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull(),
  code: text("code").notNull().unique(),
  kind: text("kind", { enum: ["course-completion", "mock-test"] }).notNull(),
  scorePercent: integer("scorePercent"),
  /**
   * Frozen learner profile used on the printed certificate:
   * fullName, email, phone, nationality, city, learningLevel,
   * targetIndustry, preferredLocale, avatarUrl.
   */
  recipientSnapshot: text("recipientSnapshot", { mode: "json" }),
  issuedAt: integer("issuedAt", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});
export type Certificate = typeof certificates.$inferSelect;

/**
 * Hangul Basics track progress (one row per user).
 * `modules` is Record<string, BasicsModuleProgress>; curriculum unlock is
 * denormalized on `completed` and set only by submitCheckpoint / legacy / admin.
 */
export const basicsProgress = sqliteTable("basicsProgress", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("userId").notNull().unique(),
  /** Map of moduleId → BasicsModuleProgress (JSON). */
  modules: text("modules", { mode: "json" }).notNull(),
  /** Trusted unlock flag — never set from client save/import patches. */
  completed: integer("completed", { mode: "boolean" }).default(false).notNull(),
  checkpointScore: integer("checkpointScore"),
  checkpointTotal: integer("checkpointTotal"),
  completedAt: integer("completedAt", { mode: "timestamp" }),
  unlockSource: text("unlockSource", { enum: ["checkpoint", "legacy-migration", "admin", "flag-off"] }),
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});
export type BasicsProgressRow = typeof basicsProgress.$inferSelect;
export type InsertBasicsProgress = typeof basicsProgress.$inferInsert;
