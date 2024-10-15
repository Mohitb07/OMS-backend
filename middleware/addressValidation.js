const { oneOf, body } = require("express-validator");

const validateAddress = [
  // Check if the country is India
  oneOf([body("country").equals("IN")], "Country must be India"),
  // Check if the city is not empty and sanitize it
  body("city").trim().escape().notEmpty().withMessage("City is required"),
  // Check if the state is not empty and sanitize it
  body("state").trim().escape().notEmpty().withMessage("State is required"),
  // Check if the pin code is not empty, a valid postal code in India, and belongs to the state or city
  body("pinCode")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Pin code is required")
    .isPostalCode("IN")
    .withMessage("Invalid pin code"),
  // .withMessage("Pin code does not match the state or city"),
  // Check if the mobile is not empty and a valid mobile phone number in India
  body("mobile")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Mobile is required")
    .isMobilePhone("en-IN")
    .withMessage("Invalid mobile number"),
  // Check if the name is not empty and sanitize it
  body("name").trim().escape().notEmpty().withMessage("Name is required"),
  // Check if the apartment is not empty and sanitize it
  body("apartment")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Apartment is required"),
  // Check if the area is not empty and sanitize it
  body("area").trim().escape().notEmpty().withMessage("Area is required"),
  // Check if isDefault is a boolean
  body("isDefault").isBoolean(),
  // Handle any validation errors
  // (req, res, next) => {
  //   const errors = validationResult(req);
  //   console.log('errors getting', errors.array())
  //   if (!errors.isEmpty()) {
  //     const result = errors.formatWith(({ msg, param }) => {
  //       return { message: msg, property: param };
  //     });
  //     throw new ValidationError("Missing required fields", result.array());
  //   }
  //   next();
  // },
];

module.exports = { validateAddress };
