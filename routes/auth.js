const express = require("express");
const router = new express.Router();
const { body } = require("express-validator");

const authController = require("../controllers/authController");

// login user
router.post(
  "/login",
  [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .if(body("email").trim().notEmpty())
      .isEmail()
      .withMessage("Invalid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  authController.login
);

// register user
router.post(
  "/register",
  [
    body("username").notEmpty().withMessage("Username is required"),
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .if(body("email").trim().notEmpty())
      .isEmail()
      .withMessage("Invalid email address"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .if(body("password").trim().notEmpty())
      .isLength({ min: 8, max: Infinity })
      .withMessage("Password must be between 8 and 20 characters"),
  ],
  authController.register
);

module.exports = router;
