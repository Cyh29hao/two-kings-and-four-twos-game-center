CREATE TABLE `chip_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`round_id` text NOT NULL,
	`kind` text NOT NULL,
	`entry` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chip_room_round` ON `chip_entries` (`room_code`,`round_id`);--> statement-breakpoint
CREATE TABLE `mahjong_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`creator` text NOT NULL,
	`room_code` text NOT NULL,
	`scope` text NOT NULL,
	`round_id` text,
	`round_limit` integer NOT NULL,
	`snapshot` text NOT NULL,
	`created` integer NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`creator`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_mj_shares_creator` ON `mahjong_shares` (`creator`,`created`);