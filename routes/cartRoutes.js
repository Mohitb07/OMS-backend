const express = require("express");

const auth = require("../middleware/auth");
const cartController = require('../controllers/cartController')

const router = new express.Router();

router.get("/cart", auth, cartController.getCart);

router.get("/cart_items_count", auth, cartController.getCartItemsCount);

router.post("/carts", auth, cartController.addToCart);

router.patch("/carts", auth, cartController.updateCartQuantity);

router.delete("/carts", auth, cartController.deleteCartItem);

module.exports = router