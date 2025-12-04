const { validationResult } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const ValidationError = require("../errors/ValidationError");
const prisma = require("../prismaClient");
const NotFoundError = require("../errors/NotFoundError");

const userInfo = async (req, res) => res.status(StatusCodes.OK).json(req.user);

const getUserById = async (req, res, next) => {
  const { userId } = req.params;
  console.log("user id getting", userId)
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return {
        message: msg,
        porperty: param,
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
