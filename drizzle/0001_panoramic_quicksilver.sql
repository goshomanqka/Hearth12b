CREATE TABLE `enquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`ownerId` int NOT NULL,
	`senderId` int NOT NULL,
	`message` text NOT NULL,
	`phone` varchar(40),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `enquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `favourites` (
	`userId` int NOT NULL,
	`propertyId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `favourites_userId_propertyId_pk` PRIMARY KEY(`userId`,`propertyId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`read` boolean NOT NULL DEFAULT false,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int,
	`title` varchar(200) NOT NULL,
	`location` varchar(255) NOT NULL,
	`address` varchar(500) NOT NULL,
	`city` varchar(120) NOT NULL,
	`price` double NOT NULL,
	`kind` enum('sale','rent') NOT NULL,
	`type` enum('Apartment','House','Loft') NOT NULL,
	`beds` int NOT NULL,
	`baths` double NOT NULL,
	`size` int NOT NULL,
	`description` text NOT NULL,
	`images` json NOT NULL,
	`amenities` json NOT NULL,
	`tourKind` enum('demo','model','embed','none') NOT NULL,
	`tourUrl` varchar(2048),
	`status` enum('draft','published','removed') NOT NULL DEFAULT 'draft',
	`featured` boolean NOT NULL DEFAULT false,
	`isDemo` boolean NOT NULL DEFAULT false,
	`latitude` double,
	`longitude` double,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `properties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `properties` AUTO_INCREMENT = 1000;
--> statement-breakpoint
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `enquiries` ADD CONSTRAINT `enquiries_senderId_users_id_fk` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `favourites` ADD CONSTRAINT `favourites_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_ownerId_users_id_fk` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `enquiries_owner_idx` ON `enquiries` (`ownerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `enquiries_property_idx` ON `enquiries` (`propertyId`);--> statement-breakpoint
CREATE INDEX `favourites_property_idx` ON `favourites` (`propertyId`);--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `properties_owner_idx` ON `properties` (`ownerId`);--> statement-breakpoint
CREATE INDEX `properties_public_idx` ON `properties` (`status`,`createdAt`);
