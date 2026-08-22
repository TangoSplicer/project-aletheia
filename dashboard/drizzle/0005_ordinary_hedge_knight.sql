ALTER TABLE `verification_profile_approvals` ADD CONSTRAINT `vpapp_key_fk` FOREIGN KEY (`profileKeyId`) REFERENCES `verification_profile_keys`(`id`) ON DELETE cascade ON UPDATE no action;
