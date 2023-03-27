const express = require("express");
const router = new express.Router();
const { body } = require("express-validator");
const authController = require("../controllers/authController");

// login user
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Invalid email address"),
    body("password").notEmpty().withMessage("password is required"),
  ],
  authController.login
);

// register user
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid email address"),
    body("username").notEmpty().withMessage("username is required"),
    body("password")
      .isLength({ min: 8, max: Infinity })
      .withMessage("Password must be between 8 and 20 characters"),
  ],
  authController.register
);

module.exports = router;
