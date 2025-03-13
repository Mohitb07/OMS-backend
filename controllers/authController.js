const {
  Prisma: { PrismaClientKnownRequestError },
} = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const ValidationError = require("../errors/ValidationError");
const UnauthorizedError = require("../errors/UnauthorizedError");
const { getRandomAvatar } = require("../services/getRandomAvatar");

const login = async (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });

    throw new ValidationError("Missing required fields", result.array());
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
      throw new UnauthorizedError("Invalid username or password");
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedError("Invalid username or password");
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
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });

    throw new ValidationError("Missing required fields", result.array());
  }
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(req.body.password, salt);
  const avatar = await getRandomAvatar();
  try {
    const user = await prisma.customer.create({
      data: {
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        avatar,
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
        throw new ValidationError("Email already exists", [
          { message: "Email already exists", property: "email" },
        ]);
      }
    }
    next(error);
  }
};

module.exports = {
  login,
  register,
};
