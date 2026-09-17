CREATE TABLE `friendships` (
	`user_low` text NOT NULL,
	`user_high` text NOT NULL,
	`requested_by` text NOT NULL,
	`created` integer NOT NULL,
	`accepted` integer,
	PRIMARY KEY(`user_low`, `user_high`),
	FOREIGN KEY (`user_low`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_high`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_friendships_high` ON `friendships` (`user_high`);--> statement-breakpoint
CREATE TABLE `room_invites` (
	`id` text PRIMARY KEY NOT NULL,
	`room_code` text NOT NULL,
	`sender` text NOT NULL,
	`recipient` text NOT NULL,
	`created` integer NOT NULL,
	`expires` integer NOT NULL,
	`dismissed` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`room_code`) REFERENCES `rooms`(`code`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipient`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_room_invites_room_recipient` ON `room_invites` (`room_code`,`recipient`);--> statement-breakpoint
CREATE INDEX `idx_room_invites_recipient` ON `room_invites` (`recipient`,`dismissed`,`expires`);--> statement-breakpoint
CREATE TABLE `user_presence` (
	`session_hash` text PRIMARY KEY NOT NULL,
	`seen` integer NOT NULL,
	FOREIGN KEY (`session_hash`) REFERENCES `sessions`(`hash`) ON UPDATE no action ON DELETE cascade
);
