/*
  Warnings:

  - A unique constraint covering the columns `[refresh_token_hash]` on the table `customersession` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `customersession_refresh_token_hash_idx` ON `customersession`;

-- CreateIndex
CREATE UNIQUE INDEX `refresh_token_hash_unique` ON `customersession`(`refresh_token_hash`);

-- RenameIndex
ALTER TABLE `customersession` RENAME INDEX `customersession_family_id_idx` TO `family_id`;
