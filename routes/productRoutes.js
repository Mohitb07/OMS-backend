const express = require("express");
const auth = require("../middleware/auth");
const productController = require('../controllers/productController')

const router = new express.Router();

router.get("/products", productController.getAllProducts);

router.get("/products/:productId", productController.getProduct);

router.post("/product", auth, productController.createProduct);

module.exports = router