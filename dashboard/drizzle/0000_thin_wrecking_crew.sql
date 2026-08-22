CREATE TABLE `seal_audit_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`caseId` int NOT NULL,
	`eventType` varchar(80) NOT NULL,
	`payloadDigest` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `seal_audit_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seal_cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`caseRefHash` varchar(64) NOT NULL,
	`encryptedPayload` text NOT NULL,
	`encryptionSalt` varchar(256) NOT NULL,
	`encryptionIv` varchar(256) NOT NULL,
	`contentDigest` varchar(64) NOT NULL,
	`verificationStatus` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `seal_cases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `seal_audit_events` ADD CONSTRAINT `seal_audit_events_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seal_audit_events` ADD CONSTRAINT `seal_audit_events_caseId_seal_cases_id_fk` FOREIGN KEY (`caseId`) REFERENCES `seal_cases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seal_cases` ADD CONSTRAINT `seal_cases_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `seal_audit_events_case_idx` ON `seal_audit_events` (`caseId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `seal_cases_owner_case_idx` ON `seal_cases` (`userId`,`caseRefHash`);