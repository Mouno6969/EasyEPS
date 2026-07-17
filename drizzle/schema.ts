import { boolean, index, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Lesson content: one row per chapter, content stored as JSON authored offline. */
export const lessons = mysqlTable("lessons", {
  id: int("id").autoincrement().primaryKey(),
  chapter: int("chapter").notNull().unique(),
  slug: varchar("slug", { length: 128 }).notNull(),
  titleKo: varchar("titleKo", { length: 255 }).notNull(),
  titleBn: varchar("titleBn", { length: 255 }).notNull(),
  titleEn: varchar("titleEn", { length: 255 }).notNull(),
  category: mysqlEnum("category", ["daily-life", "culture", "workplace", "safety", "laws"]).notNull(),
  level: varchar("level", { length: 32 }).default("beginner").notNull(),
  content: json("content").notNull(),
  published: boolean("published").default(true).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Lesson = typeof lessons.$inferSelect;

/** Per-user per-lesson progress. */
export const lessonProgress = mysqlTable(
  "lessonProgress",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    chapter: int("chapter").notNull(),
    vocabDone: boolean("vocabDone").default(false).notNull(),
    grammarDone: boolean("grammarDone").default(false).notNull(),
    dialogueDone: boolean("dialogueDone").default(false).notNull(),
    practiceScore: int("practiceScore"),
    practiceTotal: int("practiceTotal"),
    examScore: int("examScore"),
    examTotal: int("examTotal"),
    completed: boolean("completed").default(false).notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("lessonProgress_user_chapter_unique").on(table.userId, table.chapter)],
);
export type LessonProgress = typeof lessonProgress.$inferSelect;

/** Quiz / exam attempts (chapter practice, chapter exam, full mock). */
export const attempts = mysqlTable(
  "attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    kind: mysqlEnum("kind", ["practice", "chapter-exam", "mock-test"]).notNull(),
    chapter: int("chapter"),
    score: int("score").notNull(),
    total: int("total").notNull(),
    durationSec: int("durationSec"),
    detail: json("detail"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("attempts_user_created_idx").on(table.userId, table.createdAt)],
);
export type Attempt = typeof attempts.$inferSelect;

/** Daily study activity for streaks. One row per user per date (yyyy-mm-dd). */
export const studyDays = mysqlTable(
  "studyDays",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    minutes: int("minutes").default(0).notNull(),
    activities: int("activities").default(0).notNull(),
  },
  table => [uniqueIndex("studyDays_user_date_unique").on(table.userId, table.date)],
);

/** Study planner settings and scheduled items. */
export const plannerSettings = mysqlTable("plannerSettings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  dailyGoalMinutes: int("dailyGoalMinutes").default(30).notNull(),
  dailyGoalLessons: int("dailyGoalLessons").default(1).notNull(),
  reminderTime: varchar("reminderTime", { length: 5 }),
  targetExamDate: varchar("targetExamDate", { length: 10 }),
});

export const plannerItems = mysqlTable(
  "plannerItems",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    chapter: int("chapter").notNull(),
    kind: mysqlEnum("kind", ["lesson", "practice", "exam", "review"]).default("lesson").notNull(),
    done: boolean("done").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("plannerItems_user_date_idx").on(table.userId, table.date)],
);
export type PlannerItem = typeof plannerItems.$inferSelect;

/** Earned badges. */
export const badges = mysqlTable(
  "badges",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    badgeId: varchar("badgeId", { length: 64 }).notNull(),
    earnedAt: timestamp("earnedAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("badges_user_badge_unique").on(table.userId, table.badgeId)],
);
export type Badge = typeof badges.$inferSelect;

/** Issued certificates. */
export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  kind: mysqlEnum("kind", ["course-completion", "mock-test"]).notNull(),
  scorePercent: int("scorePercent"),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
});
export type Certificate = typeof certificates.$inferSelect;
