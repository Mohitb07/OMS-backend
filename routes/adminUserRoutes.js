const express = require("express");
const { param } = require("express-validator");
const adminAuth = require("../middleware/adminAuth");
const adminUserController = require("../controllers/adminUserController");

const router = new express.Router();

// Protect all storefront user management routes with adminAuth
router.use(adminAuth);

// Get all storefront customers (with search, pagination, order counts)
router.get("/users", adminUserController.getAllUsers);

// Get customer details by ID
router.get(
  "/users/:userId",
  [param("userId").isString().withMessage("User ID must be a string")],
  adminUserController.getUserById
);

module.exports = router;
