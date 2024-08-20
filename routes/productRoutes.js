const express = require("express");

const auth = require("../middleware/auth");
const productController = require('../controllers/productController')

const router = new express.Router();

router.get("/products/:productId", productController.getProduct);

router.post("/products-count", productController.getProductsCount);

router.post("/products", productController.getAllProducts);

router.post("/product", productController.createProduct);

router.post('/dev-products', productController.createDevProduct)

module.exports = router