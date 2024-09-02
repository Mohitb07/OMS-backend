const express = require("express");

const auth = require("../middleware/auth");
const orderController = require("../controllers/orderController");

const router = new express.Router();

router.get("/orders", auth, orderController.getOrders);

router.get("/orders/:orderId", auth, orderController.getOrder);
router.get("/verify_order/:orderId", auth, orderController.validateUserOrder);

router.get("/order_count", auth, orderController.getOrdersCount);

router.post("/initiate_payment", auth, orderController.initiatePayment);
router.post("/cash_transaction", auth, orderController.cashTransaction);

router.post("/payu/success", orderController.handlePaymentResponse);
router.post("/payu/failure", orderController.handlePaymentResponse);

module.exports = router;
