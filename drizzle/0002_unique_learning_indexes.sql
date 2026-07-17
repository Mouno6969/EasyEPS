CREATE UNIQUE INDEX `lessonProgress_user_chapter_unique` ON `lessonProgress` (`userId`,`chapter`);
--> statement-breakpoint
CREATE UNIQUE INDEX `studyDays_user_date_unique` ON `studyDays` (`userId`,`date`);
--> statement-breakpoint
CREATE UNIQUE INDEX `badges_user_badge_unique` ON `badges` (`userId`,`badgeId`);
--> statement-breakpoint
CREATE INDEX `attempts_user_created_idx` ON `attempts` (`userId`,`createdAt`);
--> statement-breakpoint
CREATE INDEX `plannerItems_user_date_idx` ON `plannerItems` (`userId`,`date`);
