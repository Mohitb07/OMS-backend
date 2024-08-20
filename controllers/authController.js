const {
  Prisma: { PrismaClientKnownRequestError },
} = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");

const login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Please provide valid username or password" });
  }
  try {
    const user = await prisma.customer.findUnique({
      where: {
        email,
      },
      select: {
        password: true,
        username: true,
        email: true,
        customer_id: true,
      },
    });
    if (!user) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid username or password" });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid username or password" });
    }
    const accessToken = jwt.sign(
      { userId: user.customer_id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    delete user["password"];
    return res.status(StatusCodes.OK).json({ user, accessToken });
  } catch (error) {
    next(error);
  }
};

const register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(StatusCodes.BAD_REQUEST).json({ errors: errors.array() });
  }
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(req.body.password, salt);
  try {
    const user = await prisma.customer.create({
      data: {
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
      },
    });
    const accessToken = jwt.sign(
      { userId: user.customer_id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      }
    );
    return res.status(StatusCodes.CREATED).json({ user, accessToken });
  } catch (error) {
    console.log("new error", error.meta.target);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.meta.target === "email") {
        return res.status(StatusCodes.CONFLICT).json({
          message: {
            email: "Email already exists",
          },
        });
      }
    }
    next(error);
  }
};

module.exports = {
  login,
  register,
};
