-- CreateIndex
CREATE FULLTEXT INDEX `Products_name_idx` ON `Products`(`name`);

-- CreateIndex
CREATE FULLTEXT INDEX `Products_name_description_idx` ON `Products`(`name`, `description`);
