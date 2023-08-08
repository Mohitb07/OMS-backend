const express = require("express");

const auth = require("../middleware/auth");
const orderController = require("../controllers/orderController");

const router = new express.Router();

router.get("/orders", auth, orderController.getOrders);

router.get("/orders/:orderId", auth, orderController.getOrder);

router.get("/order_count", auth, orderController.getOrdersCount);

router.post(
  "/webhook",
  express.json({ type: "application/json" }),
  orderController.webhook
);

router.post("/create-checkout-session", orderController.createCheckoutSession);

module.exports = router;
