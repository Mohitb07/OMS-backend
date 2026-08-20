const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const adminAuthController = require("../controllers/adminAuthController");
const adminAuth = require("../middleware/adminAuth");

const router = new express.Router();

// Rate limiter for email sending endpoints (max 5 requests per 15 minutes per IP)
const authEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    message: "Too many email requests from this IP. Please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin registration
router.post(
  "/register",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("role")
      .optional()
      .isIn(["ADMIN", "SUPERADMIN"])
      .withMessage("Role must be ADMIN or SUPERADMIN"),
  ],
  adminAuthController.register
);

// Admin email verification
router.post(
  "/verify-email",
  [
    body("token").trim().notEmpty().withMessage("Verification token is required"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
  ],
  adminAuthController.verifyEmail
);

// Admin resend verification email (rate limited + database cooldown)
router.post(
  "/resend-verification",
  authEmailLimiter,
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
  ],
  adminAuthController.resendVerificationEmail
);

// Admin login
router.post(
  "/login",
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  adminAuthController.login
);

// Admin forgot password (rate limited)
router.post(
  "/forgot-password",
  authEmailLimiter,
  [
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
  ],
  adminAuthController.forgotPassword
);

// Admin reset password
router.post(
  "/reset-password",
  [
    body("token").trim().notEmpty().withMessage("Reset token is required"),
    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email is required")
      .isEmail()
      .withMessage("Invalid email address"),
    body("password")
      .notEmpty()
      .withMessage("Password is required")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
  ],
  adminAuthController.resetPassword
);

// Get admin profile
router.get("/me", adminAuth, adminAuthController.getProfile);

module.exports = router;
