const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const NotFoundError = require("../errors/NotFoundError");
const { validationResult } = require("express-validator");
const ValidationError = require("../errors/ValidationError");

const getAddresses = async (req, res, next) => {
  try {
    const addresses = await prisma.customerAddress.findMany({
      where: {
        customer_id: req.user.customer_id,
      },
    });
    return res.status(StatusCodes.OK).json(addresses);
  } catch (error) {
    next(error);
  }
};

const getAddressById = async (req, res, next) => {
  const { addressId } = req.params;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  try {
    const address = await prisma.customerAddress.findUnique({
      where: {
        address_id: addressId,
      },
    });

    if (!address) {
      throw new NotFoundError(`Address with id ${addressId} not found`);
    }

    return res.status(StatusCodes.OK).json(address);
  } catch (error) {
    next(error);
  }
};

const createAddress = async (req, res, next) => {
  const user = req.user;
  const {
    country,
    state,
    pinCode,
    mobile,
    name,
    city,
    apartment,
    area,
    isDefault,
  } = req.body;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  try {
    const address = await prisma.customerAddress.create({
      data: {
        country,
        full_name: name,
        phone: mobile,
        pincode: pinCode,
        flat_no: apartment,
        street: area,
        default: isDefault,
        city,
        state,
        customer_id: user.customer_id,
        // customer_id: req.user.customer_id,
        // customers: {
        //   connect: {
        //     customer_id: req.user.customer_id,
        //   },
        // },
      },
    });
    return res.status(StatusCodes.CREATED).json(address);
  } catch (error) {
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  const { country, state, pinCode, mobile, name, city, apartment, area } =
    req.body;

  const { addressId } = req.params;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  try {
    const address = await prisma.customerAddress.findUnique({
      where: {
        address_id: addressId,
      },
    });

    if (!address) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Address not found" });
    }

    const updatedAddress = await prisma.customerAddress.update({
      where: {
        address_id: addressId,
      },
      data: {
        ...address[0],
        country,
        full_name: name,
        phone: mobile,
        pincode: pinCode,
        flat_no: apartment,
        street: area,
        city,
        state,
      },
    });

    return res.status(StatusCodes.OK).json(updatedAddress);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAddress,
  getAddresses,
  updateAddress,
  getAddressById,
};
