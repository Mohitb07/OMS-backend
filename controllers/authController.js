const {
  Prisma: { PrismaClientValidationError },
} = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = require("../prisma");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(400)
      .json({ message: "Please provide valid username or password" });
  }
  try {
    const user = await prisma.customers.findUnique({
      where: {
        email,
      },
      select: {
        password: true
      }
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const accessToken = jwt.sign(
      { userId: user.customer_id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    return res.json({ user, accessToken });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Something went wrong" });
  }
};

const register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(req.body.password, salt);
  try {
    const user = await prisma.customers.create({
      data: {
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        phone: req.body.phone,
        address: req.body.address,
      },
    });
    const accessToken = jwt.sign(
      { userId: user.customer_id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    return res.status(201).json({ user, accessToken });
  } catch (error) {
    console.log(error);
    if (error instanceof PrismaClientValidationError) {
      const emailError = error.validationErrors.find(
        (err) => err.path === "email"
      );
      if (emailError) {
        console.error(`Email error: ${emailError.message}`);
      }
    }
    return res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = {
  login,
  register,
};
