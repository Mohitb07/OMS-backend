const express = require("express");
const { param } = require("express-validator");
const auth = require("../middleware/auth");
const userController = require("../controllers/userController");

const router = new express.Router();

router.get("/me", auth, userController.userInfo);
router.get(
  "/get_user_by_id/:userId",
  auth,
  [
    param("userId")
      .notEmpty()
      .withMessage("User Id is required")
      .isString()
      .withMessage("User ID must be a string"),
  ],
  userController.getUserById
);

module.exports = router;
