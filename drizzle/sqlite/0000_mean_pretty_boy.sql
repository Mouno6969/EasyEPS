CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`kind` text NOT NULL,
	`chapter` integer,
	`score` integer NOT NULL,
	`total` integer NOT NULL,
	`durationSec` integer,
	`detail` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `attempts_user_created_idx` ON `attempts` (`userId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `badges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`badgeId` text NOT NULL,
	`earnedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `badges_user_badge_unique` ON `badges` (`userId`,`badgeId`);--> statement-breakpoint
CREATE TABLE `basicsProgress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`modules` text NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`checkpointScore` integer,
	`checkpointTotal` integer,
	`completedAt` integer,
	`unlockSource` text,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `basicsProgress_userId_unique` ON `basicsProgress` (`userId`);--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`code` text NOT NULL,
	`kind` text NOT NULL,
	`scorePercent` integer,
	`recipientSnapshot` text,
	`issuedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `certificates_code_unique` ON `certificates` (`code`);--> statement-breakpoint
CREATE TABLE `lessonProgress` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`chapter` integer NOT NULL,
	`vocabDone` integer DEFAULT false NOT NULL,
	`grammarDone` integer DEFAULT false NOT NULL,
	`dialogueDone` integer DEFAULT false NOT NULL,
	`practiceScore` integer,
	`practiceTotal` integer,
	`examScore` integer,
	`examTotal` integer,
	`completed` integer DEFAULT false NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessonProgress_user_chapter_unique` ON `lessonProgress` (`userId`,`chapter`);--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`chapter` integer NOT NULL,
	`slug` text NOT NULL,
	`titleKo` text NOT NULL,
	`titleBn` text NOT NULL,
	`titleEn` text NOT NULL,
	`category` text NOT NULL,
	`level` text DEFAULT 'beginner' NOT NULL,
	`content` text NOT NULL,
	`published` integer DEFAULT true NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `lessons_chapter_unique` ON `lessons` (`chapter`);--> statement-breakpoint
CREATE TABLE `plannerItems` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`date` text NOT NULL,
	`chapter` integer NOT NULL,
	`kind` text DEFAULT 'lesson' NOT NULL,
	`done` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `plannerItems_user_date_idx` ON `plannerItems` (`userId`,`date`);--> statement-breakpoint
CREATE TABLE `plannerSettings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`dailyGoalMinutes` integer DEFAULT 30 NOT NULL,
	`dailyGoalLessons` integer DEFAULT 1 NOT NULL,
	`reminderTime` text,
	`targetExamDate` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `plannerSettings_userId_unique` ON `plannerSettings` (`userId`);--> statement-breakpoint
CREATE TABLE `studyDays` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`date` text NOT NULL,
	`minutes` integer DEFAULT 0 NOT NULL,
	`activities` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `studyDays_user_date_unique` ON `studyDays` (`userId`,`date`);--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` integer NOT NULL,
	`fullName` text NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`preferredLocale` text DEFAULT 'bn' NOT NULL,
	`nationality` text NOT NULL,
	`city` text,
	`learningLevel` text DEFAULT 'beginner' NOT NULL,
	`targetIndustry` text,
	`targetExamDate` text,
	`bio` text,
	`avatarUrl` text,
	`isComplete` integer DEFAULT false NOT NULL,
	`completedAt` integer,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `userProfiles_userId_unique` ON `userProfiles` (`userId`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`openId` text NOT NULL,
	`name` text,
	`email` text,
	`passwordHash` text,
	`loginMethod` text,
	`role` text DEFAULT 'user' NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastSignedIn` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_openId_unique` ON `users` (`openId`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);