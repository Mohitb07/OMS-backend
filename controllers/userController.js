const { validationResult } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const ValidationError = require("../errors/ValidationError");
const prisma = require("../prismaClient");
const NotFoundError = require("../errors/NotFoundError");

const userInfo = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { customer_id: req.user.id },
      select: {
        customer_id: true,
        email: true,
        username: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found" });
    }

    return res.status(StatusCodes.OK).json({
      id: customer.customer_id,
      email: customer.email,
      username: customer.username,
      avatar: customer.avatar,
      createdAt: customer.createdAt,
    });
  } catch (err) {
    console.error("/me error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getUserById = async (req, res, next) => {
  const { userId } = req.params;
  console.log("user id getting", userId);
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return {
        message: msg,
        property: param,
      };
    });
    console.log("errors", result.array());
    throw new ValidationError("Incorrect data", result.array());
  }

  try {
    const user = await prisma.customer.findUnique({
      where: {
        customer_id: userId,
      },
      select: {
        customer_id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });
    if (!user) {
      console.log("user not found");
      throw new NotFoundError(`User with id ${userId} not found`);
    }
    return res.status(StatusCodes.OK).send(user);
  } catch (error) {
    console.log("error", error);
    next(error);
  }
};

module.exports = {
  userInfo,
  getUserById,
};
