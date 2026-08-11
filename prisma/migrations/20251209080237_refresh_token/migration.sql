-- CreateTable
CREATE TABLE `customersession` (
    `session_id` VARCHAR(191) NOT NULL,
    `customer_id` VARCHAR(191) NOT NULL,
    `refresh_token_hash` VARCHAR(255) NOT NULL,
    `family_id` VARCHAR(255) NULL,
    `user_agent` VARCHAR(1000) NULL,
    `ip_address_hash` VARCHAR(255) NULL,
    `revoked` BOOLEAN NOT NULL DEFAULT false,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,

    INDEX `customer_id`(`customer_id`),
    INDEX `customersession_refresh_token_hash_idx`(`refresh_token_hash`),
    INDEX `customersession_family_id_idx`(`family_id`),
    PRIMARY KEY (`session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `customersession` ADD CONSTRAINT `CustomerSession_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`customer_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
