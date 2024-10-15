const express = require("express");
const { body } = require("express-validator");

const auth = require("../middleware/auth");
const cartController = require("../controllers/cartController");

const router = new express.Router();

router.get("/cart", auth, cartController.getCart);

router.get("/cart_items_count", auth, cartController.getCartItemsCount);

router.post(
  "/carts",
  [body("product_id").notEmpty().withMessage("Product ID is required")],
  auth,
  cartController.addToCart
);

router.patch(
  "/carts",
  [
    body("quantity").notEmpty().withMessage("Quantity is required"),
    body("product_id").notEmpty().withMessage("Product ID is required"),
    body("cart_id").notEmpty().withMessage("Cart ID is required"),
  ],
  auth,
  cartController.updateCartQuantity
);

router.delete(
  "/carts",
  [
    body("cart_item_id").notEmpty().withMessage("Cart Item ID is required"),
    body("cart_id").notEmpty().withMessage("Cart ID is required"),
  ],
  auth,
  cartController.deleteCartItem
);

module.exports = router;
