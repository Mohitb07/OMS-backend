-- AlterTable
ALTER TABLE `admin` ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `verificationToken` VARCHAR(255) NULL,
    ADD COLUMN `verificationExpires` DATETIME(3) NULL,
    ADD COLUMN `lastVerificationSentAt` DATETIME(3) NULL,
    ADD COLUMN `resetPasswordToken` VARCHAR(255) NULL,
    ADD COLUMN `resetPasswordExpires` DATETIME(3) NULL;