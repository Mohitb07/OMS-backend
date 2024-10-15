const express = require("express");

const auth = require("../middleware/auth");
const productController = require("../controllers/productController");
const { body, param } = require("express-validator");

const router = new express.Router();

router.get(
  "/products/:productId",
  [param("productId").isString().withMessage("Product ID must be an integer")],
  productController.getProduct
);

router.post(
  "/products-count",
  [body("query").optional().isString().withMessage("Query must be a string")],
  productController.getProductsCount
);

router.post(
  "/products",
  [
    body("query").optional().isString().withMessage("Query must be a string"),
    body("page")
      .optional()
      .isString()
      .withMessage("Current page must be a string"),
  ],
  productController.getAllProducts
);

router.post(
  "/product",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("price").notEmpty().withMessage("Price is required"),
    body("image_url").notEmpty().withMessage("Image is required"),
    // body("discounted_price").notEmpty().withMessage("Discounted price is required"),
    // body("image_2").notEmpty().withMessage("Image 2 is required"),
    // body("thumbnail").notEmpty().withMessage("Thumbnail is required"),
    // body("display").notEmpty().withMessage("Display is required"),
    // body("category_id").notEmpty().withMessage("Category ID is required"),
    // body("department_id").notEmpty().withMessage("Department ID is required"),
    // body("product_id").notEmpty().withMessage("Product ID is required"),
    // body("attributes").notEmpty().withMessage("Attributes is required"),
  ],
  productController.createProduct
);

router.post("/dev-products", productController.createDevProduct);

module.exports = router;
