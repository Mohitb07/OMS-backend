/*
  Warnings:

  - The primary key for the `cart` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `cart_id` on the `cart` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `customer_id` on the `cart` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - The primary key for the `cartitems` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `cart_item_id` on the `cartitems` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `cart_id` on the `cartitems` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `product_id` on the `cartitems` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - The primary key for the `customers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `customer_id` on the `customers` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - The primary key for the `orderitems` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `order_item_id` on the `orderitems` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `order_id` on the `orderitems` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `product_id` on the `orderitems` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - The primary key for the `orders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `order_id` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - You are about to alter the column `customer_id` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - The primary key for the `products` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `product_id` on the `products` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(191)`.
  - Added the required column `updatedAt` to the `Customers` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `cart` DROP FOREIGN KEY `Cart_ibfk_1`;

-- DropForeignKey
ALTER TABLE `cartitems` DROP FOREIGN KEY `CartItems_ibfk_1`;

-- DropForeignKey
ALTER TABLE `cartitems` DROP FOREIGN KEY `CartItems_ibfk_2`;

-- DropForeignKey
ALTER TABLE `orderitems` DROP FOREIGN KEY `OrderItems_ibfk_1`;

-- DropForeignKey
ALTER TABLE `orderitems` DROP FOREIGN KEY `OrderItems_ibfk_2`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `Orders_ibfk_1`;

-- AlterTable
ALTER TABLE `cart` DROP PRIMARY KEY,
    MODIFY `cart_id` VARCHAR(191) NOT NULL,
    MODIFY `customer_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`cart_id`);

-- AlterTable
ALTER TABLE `cartitems` DROP PRIMARY KEY,
    MODIFY `cart_item_id` VARCHAR(191) NOT NULL,
    MODIFY `cart_id` VARCHAR(191) NOT NULL,
    MODIFY `product_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`cart_item_id`);

-- AlterTable
ALTER TABLE `customers` DROP PRIMARY KEY,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL,
    MODIFY `customer_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`customer_id`);

-- AlterTable
ALTER TABLE `orderitems` DROP PRIMARY KEY,
    MODIFY `order_item_id` VARCHAR(191) NOT NULL,
    MODIFY `order_id` VARCHAR(191) NOT NULL,
    MODIFY `product_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`order_item_id`);

-- AlterTable
ALTER TABLE `orders` DROP PRIMARY KEY,
    MODIFY `order_id` VARCHAR(191) NOT NULL,
    MODIFY `customer_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`order_id`);

-- AlterTable
ALTER TABLE `products` DROP PRIMARY KEY,
    MODIFY `product_id` VARCHAR(191) NOT NULL,
    ADD PRIMARY KEY (`product_id`);

-- AddForeignKey
ALTER TABLE `CartItems` ADD CONSTRAINT `CartItems_ibfk_1` FOREIGN KEY (`cart_id`) REFERENCES `Cart`(`cart_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `CartItems` ADD CONSTRAINT `CartItems_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products`(`product_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Cart` ADD CONSTRAINT `Cart_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `Customers`(`customer_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `OrderItems` ADD CONSTRAINT `OrderItems_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `Orders`(`order_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `OrderItems` ADD CONSTRAINT `OrderItems_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `Products`(`product_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Orders` ADD CONSTRAINT `Orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `Customers`(`customer_id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
