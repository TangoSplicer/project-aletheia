ALTER TABLE `seal_audit_events` ADD `sequenceNumber` int NOT NULL;--> statement-breakpoint
ALTER TABLE `seal_audit_events` ADD `previousEventHash` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `seal_audit_events` ADD `eventHash` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `seal_audit_events` ADD `eventTimestamp` bigint NOT NULL;--> statement-breakpoint
ALTER TABLE `seal_audit_events` ADD CONSTRAINT `seal_audit_events_case_sequence_unique` UNIQUE(`caseId`,`sequenceNumber`);