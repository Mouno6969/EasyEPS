CREATE TABLE `attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('practice','chapter-exam','mock-test') NOT NULL,
	`chapter` int,
	`score` int NOT NULL,
	`total` int NOT NULL,
	`durationSec` int,
	`detail` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `badges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`badgeId` varchar(64) NOT NULL,
	`earnedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `badges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `certificates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`code` varchar(32) NOT NULL,
	`kind` enum('course-completion','mock-test') NOT NULL,
	`scorePercent` int,
	`issuedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `certificates_id` PRIMARY KEY(`id`),
	CONSTRAINT `certificates_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `lessonProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`chapter` int NOT NULL,
	`vocabDone` boolean NOT NULL DEFAULT false,
	`grammarDone` boolean NOT NULL DEFAULT false,
	`dialogueDone` boolean NOT NULL DEFAULT false,
	`practiceScore` int,
	`practiceTotal` int,
	`examScore` int,
	`examTotal` int,
	`completed` boolean NOT NULL DEFAULT false,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessonProgress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lessons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`chapter` int NOT NULL,
	`slug` varchar(128) NOT NULL,
	`titleKo` varchar(255) NOT NULL,
	`titleBn` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`category` enum('daily-life','culture','workplace','safety','laws') NOT NULL,
	`level` varchar(32) NOT NULL DEFAULT 'beginner',
	`content` json NOT NULL,
	`published` boolean NOT NULL DEFAULT true,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `lessons_id` PRIMARY KEY(`id`),
	CONSTRAINT `lessons_chapter_unique` UNIQUE(`chapter`)
);
--> statement-breakpoint
CREATE TABLE `plannerItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`chapter` int NOT NULL,
	`kind` enum('lesson','practice','exam','review') NOT NULL DEFAULT 'lesson',
	`done` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plannerItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plannerSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dailyGoalMinutes` int NOT NULL DEFAULT 30,
	`dailyGoalLessons` int NOT NULL DEFAULT 1,
	`reminderTime` varchar(5),
	`targetExamDate` varchar(10),
	CONSTRAINT `plannerSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `plannerSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `studyDays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`minutes` int NOT NULL DEFAULT 0,
	`activities` int NOT NULL DEFAULT 0,
	CONSTRAINT `studyDays_id` PRIMARY KEY(`id`)
);
