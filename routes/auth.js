const express = require("express");
const router = new express.Router();
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const { StatusCodes } = require("http-status-codes");

const authController = require("../controllers/authController");
const auth = require("../middleware/auth");

// Rate limiter for OTP verification (max 5 failed attempts per 10 minutes per IP to prevent brute forcing)
const verifyOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes (matches OTP validity window)
  max: 5, // 5 failed attempts
  skipSuccessfulRequests: true, // successful verifications do not count toward limit
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      message:
        "Too many failed verification attempts. Please wait 10 minutes before trying again or request a new code.",
      errors: [
        {
          message:
            "Too many failed verification attempts. Please wait 10 minutes before trying again or request a new code.",
        },
      ],
    });
  },
});

// Rate limiter for OTP resend (max 5 resend requests per 15 minutes per IP to prevent email flooding)
const resendOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      message:
        "Too many OTP requests from this IP. Please wait 15 minutes before requesting again.",
      errors: [
        {
          message:
            "Too many OTP requests from this IP. Please wait 15 minutes before requesting again.",
        },
      ],
    });
  },
});

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

// Verify email with OTP (rate limited to prevent brute forcing)
router.post(
  "/verify-otp",
  verifyOtpLimiter,
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

// Resend verification OTP (rate limited + 60-second cooldown enforced server-side)
router.post(
  "/resend-otp",
  resendOtpLimiter,
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
