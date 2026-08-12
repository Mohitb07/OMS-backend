const express = require("express");
const router = new express.Router();

const addressController = require("../controllers/addressController");
const { validateAddress } = require("../middleware/addressValidation");
const auth = require("../middleware/auth");
const { param } = require("express-validator");

// create address
router.post(
  "/create_address",
  auth,
  validateAddress,
  addressController.createAddress
);

// get addresses
router.get("/addresses", auth, addressController.getAddresses);

// update address
router.patch(
  "/update_address/:addressId",
  auth,
  [
    ...validateAddress,
    param("addressId").isString().withMessage("Address ID must be a string"),
  ],
  addressController.updateAddress
);

router.get(
  "/address/:addressId",
  [param("addressId").isString().withMessage("Address ID must be a string")],
  auth,
  addressController.getAddressById
);

router.delete(
  "/delete_address/:addressId",
  [param("addressId").isString().withMessage("Address ID must be a string")],
  auth,
  addressController.deleteAddress
);

// set default address
router.patch(
  "/set_default_address/:addressId",
  [param("addressId").isString().withMessage("Address ID must be a string")],
  auth,
  addressController.setDefaultAddress
);

module.exports = router;
