const express = require("express");

const auth = require("../middleware/auth");
const orderController = require("../controllers/orderController");
const { param, body } = require("express-validator");

const router = new express.Router();

router.get("/orders/:userId", auth, orderController.getOrders);

router.get(
  "/order/:orderId",
  [param("orderId").isString().withMessage("Order ID must be a string")],
  auth,
  orderController.getOrder
);
router.get(
  "/verify_order/:orderId",
  [param("orderId").isString().withMessage("Order ID must be a string")],
  auth,
  orderController.validateUserOrder
);

router.get("/order_count", auth, orderController.getOrdersCount);

router.post(
  "/initiate_payment",
  [
    body("cart_id")
      .notEmpty()
      .withMessage("Cart ID is required")
      .isString()
      .withMessage("Cart ID must be a string"),
    body("address_id")
      .notEmpty()
      .withMessage("Address ID is required")
      .isString()
      .withMessage("Address ID must be a string"),
    body("payment_method")
      .notEmpty()
      .withMessage("Payment method is required")
      .isString()
      .withMessage("Payment method must be a string"),
    body("shipping_name")
      .notEmpty()
      .withMessage("Shipping name is required")
      .isString()
      .withMessage("Shipping name must be a string"),
    body("shipping_phone")
      .notEmpty()
      .withMessage("Shipping phone is required")
      .isString()
      .withMessage("Shipping phone must be a string"),
    body("shipping_email")
      .notEmpty()
      .withMessage("Shipping email is required")
      .isEmail()
      .withMessage("Invalid email address"),
  ],
  auth,
  orderController.initiatePayment
);

router.post(
  "/cash_transaction",
  [
    body("cart_id")
      .notEmpty()
      .withMessage("Cart ID is required")
      .isString()
      .withMessage("Cart ID must be a string"),
    body("address_id")
      .notEmpty()
      .withMessage("Address ID is required")
      .isString()
      .withMessage("Address ID must be a string"),
    body("payment_method")
      .notEmpty()
      .withMessage("Payment method is required")
      .isString()
      .withMessage("Payment method must be a string"),
  ],
  auth,
  orderController.cashTransaction
);

router.post("/payu/success", orderController.handlePaymentResponse);
router.post("/payu/failure", orderController.handlePaymentResponse);

module.exports = router;
