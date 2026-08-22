CREATE TABLE `verification_profile_approvals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileId` int NOT NULL,
	`profileKeyId` int,
	`approvalType` enum('profile_activation','signer_key_activation') NOT NULL,
	`status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
	`makerUserId` int NOT NULL,
	`makerNote` varchar(255),
	`reviewerUserId` int,
	`reviewerNote` varchar(255),
	`reviewedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verification_profile_approvals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `verification_profile_keys` MODIFY COLUMN `status` enum('pending','active','revoked') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `verification_profile_approvals` ADD CONSTRAINT `vpapp_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_profile_approvals` ADD CONSTRAINT `vpapp_profile_fk` FOREIGN KEY (`profileId`) REFERENCES `verification_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_profile_approvals` ADD CONSTRAINT `vpapp_maker_fk` FOREIGN KEY (`makerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_profile_approvals` ADD CONSTRAINT `vpapp_reviewer_fk` FOREIGN KEY (`reviewerUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `vpapp_owner_status_idx` ON `verification_profile_approvals` (`userId`,`status`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `vpapp_reviewer_idx` ON `verification_profile_approvals` (`reviewerUserId`,`status`);
