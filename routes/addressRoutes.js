const express = require("express");
const router = new express.Router();

const addressController = require("../controllers/addressController");
const { validateAddress } = require("../middleware/addressValidation");
const auth = require("../middleware/auth");

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
  validateAddress,
  addressController.updateAddress
);

router.get("/address/:addressId", auth, addressController.getAddressById);

module.exports = router;
