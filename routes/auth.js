const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");
const router = new express.Router();
const { body, validationResult } = require("express-validator");

// login user
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide valid username or password" });
  }
  try {
    const user = await Customer.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const accessToken = jwt.sign({ userId: user.id }, "my_secret", {
      expiresIn: "1h",
    });
    return res.json({ user, accessToken });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

// register user
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Invalid email address"),
    body("username").notEmpty().withMessage("username is required"),
    body("password")
      .isLength({ min: 8, max: 20 })
      .withMessage("Password must be between 8 and 20 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(req.body.password, salt);
    try {
      const user = await Customer.create({
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        phone: req.body.phone,
        address: req.body.address,
      });
      const accessToken = jwt.sign({ userId: user.id }, "my_secret", {
        expiresIn: "1h",
      });
      return res.status(201).json({ user, accessToken });
    } catch (error) {
      console.log(error);
      return res.status(500).json({ error: "Something went wrong" });
    }
  }
);

module.exports = router;
