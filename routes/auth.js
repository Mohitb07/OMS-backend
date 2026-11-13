const express = require("express");
const router = new express.Router();
const { body } = require("express-validator");

const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

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

router.post("/refresh", authController.refreshToken);

router.post("/logout", authController.logout);

router.post("/logout_all", auth, authController.logoutAll);

// Verify email with OTP (sent on registration)
router.post(
  "/verify-otp",
  [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
    body("otp")
      .notEmpty()
      .withMessage("OTP is required")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be exactly 6 digits")
      .isNumeric()
      .withMessage("OTP must contain digits only"),
  ],
  authController.verifyOtp
);

// Resend verification OTP (60-second cooldown enforced server-side)
router.post(
  "/resend-otp",
  [
    body("email")
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
  ],
  authController.resendOtp
);

module.exports = router;
