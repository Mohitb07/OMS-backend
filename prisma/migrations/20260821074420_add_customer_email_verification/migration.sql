-- AlterTable
ALTER TABLE `customer` ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `lastVerificationOtpSentAt` DATETIME(3) NULL,
    ADD COLUMN `verificationOtpExpires` DATETIME(3) NULL,
    ADD COLUMN `verificationOtpHash` VARCHAR(255) NULL;

-- Backfill: mark all pre-existing customers as verified so they are not locked out.
-- Only newly registered customers (after this migration) will go through OTP verification.
UPDATE `customer` SET `isVerified` = true WHERE `isVerified` = false;
