const express = require("express");

const auth = require("../middleware/auth");
const orderController = require("../controllers/orderController");

const router = new express.Router();

router.get("/orders", auth, orderController.getOrders);

router.get("/orders/:orderId", auth, orderController.getOrder);

router.get("/order_count", auth, orderController.getOrdersCount);

router.post("/orders", auth, orderController.placeOrder);

router.post("/webhook", orderController.webhook);

// router.post("/create-payment-intent", orderController.createPaymentIntent);

router.post('/create-checkout-session', orderController.createCheckoutSession)

// router.get("/config", orderController.getConfig);

module.exports = router;
