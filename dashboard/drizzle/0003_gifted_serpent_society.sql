CREATE TABLE `verification_profile_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileId` int NOT NULL,
	`practitionerId` varchar(160) NOT NULL,
	`practitionerName` varchar(160),
	`algorithm` enum('Ed25519') NOT NULL DEFAULT 'Ed25519',
	`publicKey` varchar(128) NOT NULL,
	`publicKeyDigest` varchar(64) NOT NULL,
	`validFrom` bigint,
	`validUntil` bigint,
	`status` enum('active','revoked') NOT NULL DEFAULT 'active',
	`revocationReason` varchar(255),
	`revokedAt` bigint,
	`approvalReference` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verification_profile_keys_id` PRIMARY KEY(`id`),
	CONSTRAINT `verification_profile_keys_profile_digest_unique` UNIQUE(`profileId`,`publicKeyDigest`)
);
--> statement-breakpoint
CREATE TABLE `verification_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`jurisdiction` varchar(120) NOT NULL,
	`policyVersion` varchar(64) NOT NULL,
	`status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
	`reviewedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `verification_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `verification_profile_keys` ADD CONSTRAINT `verification_profile_keys_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_profile_keys` ADD CONSTRAINT `verification_profile_keys_profileId_verification_profiles_id_fk` FOREIGN KEY (`profileId`) REFERENCES `verification_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `verification_profiles` ADD CONSTRAINT `verification_profiles_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `verification_profile_keys_owner_profile_idx` ON `verification_profile_keys` (`userId`,`profileId`,`status`);--> statement-breakpoint
CREATE INDEX `verification_profiles_owner_status_idx` ON `verification_profiles` (`userId`,`status`,`updatedAt`);