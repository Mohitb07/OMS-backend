const {
  Prisma: { PrismaClientKnownRequestError },
} = require("@prisma/client");
const argon2 = require("argon2");
const prisma = require("../prismaClient");
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
        password: true,
        address: true,
        username: true,
        phone: true,
        email: true,
        customer_id: true,
      },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    const match = await argon2.verify(password, user.password);
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
    delete user["password"];
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
  const hashedPassword = await argon2.hash(req.body.password);
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
    console.log('new error', error.meta.target)
    if (error instanceof PrismaClientKnownRequestError) {
      console.log('msg', error.message)
      if(error.meta.target === 'email'){
        return res.status(409).send({message: 'Email already exists'})
      }
    }
    return res.status(500).json({ message: "Something went wrong" });
  }
};

module.exports = {
  login,
  register,
};
