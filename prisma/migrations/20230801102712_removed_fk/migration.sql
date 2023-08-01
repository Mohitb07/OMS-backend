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
