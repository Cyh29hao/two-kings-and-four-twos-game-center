ALTER TABLE `room_messages` ADD `kind` text DEFAULT 'text' NOT NULL;--> statement-breakpoint
ALTER TABLE `room_messages` ADD `emote_id` text;--> statement-breakpoint
CREATE INDEX `idx_room_messages_author_kind_created` ON `room_messages` (`author_id`,`kind`,`created`);