const express = require("express");

const auth = require("../middleware/auth");
const userController = require('../controllers/userController')

const router = new express.Router();

router.get("/me", auth, userController.userInfo);

module.exports = router