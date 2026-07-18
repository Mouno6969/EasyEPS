CREATE TABLE `basicsProgress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`modules` json NOT NULL,
	`completed` boolean NOT NULL DEFAULT false,
	`checkpointScore` int,
	`checkpointTotal` int,
	`completedAt` timestamp,
	`unlockSource` enum('checkpoint','legacy-migration','admin','flag-off'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `basicsProgress_id` PRIMARY KEY(`id`),
	CONSTRAINT `basicsProgress_userId_unique` UNIQUE(`userId`)
);
