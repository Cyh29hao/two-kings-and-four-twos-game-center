CREATE TABLE `room_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_code` text NOT NULL,
	`author_id` text NOT NULL,
	`client_id` text NOT NULL,
	`display` text NOT NULL,
	`text` text NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_room_messages_room_id` ON `room_messages` (`room_code`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_room_messages_retry` ON `room_messages` (`room_code`,`author_id`,`client_id`);