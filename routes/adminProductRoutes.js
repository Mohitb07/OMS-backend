const express = require("express");
const { body, param } = require("express-validator");
const adminAuth = require("../middleware/adminAuth");
const adminProductController = require("../controllers/adminProductController");

const router = new express.Router();

// Apply adminAuth middleware to all product management routes
router.use(adminAuth);

// Create product
router.post(
  "/products",
  [
    body("name").trim().notEmpty().withMessage("Product name is required"),
    body("description").trim().notEmpty().withMessage("Description is required"),
    body("price")
      .notEmpty()
      .withMessage("Price is required")
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("image_url").trim().notEmpty().withMessage("Image URL is required"),
  ],
  adminProductController.createProduct
);

// Get all products (Admin view with pagination and filter support)
router.get("/products", adminProductController.getAllProducts);

// Get single product details
router.get(
  "/products/:productId",
  [param("productId").isString().withMessage("Product ID must be a string")],
  adminProductController.getProductById
);

// Update product
router.put(
  "/products/:productId",
  [
    param("productId").isString().withMessage("Product ID must be a string"),
    body("name").optional().trim().notEmpty().withMessage("Product name cannot be empty"),
    body("description").optional().trim().notEmpty().withMessage("Description cannot be empty"),
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price must be a positive number"),
    body("image_url").optional().trim().notEmpty().withMessage("Image URL cannot be empty"),
  ],
  adminProductController.updateProduct
);

// Delete product
router.delete(
  "/products/:productId",
  [param("productId").isString().withMessage("Product ID must be a string")],
  adminProductController.deleteProduct
);

module.exports = router;
