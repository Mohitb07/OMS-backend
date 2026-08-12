const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const NotFoundError = require("../errors/NotFoundError");
const { validationResult } = require("express-validator");
const ValidationError = require("../errors/ValidationError");

const getAddresses = async (req, res, next) => {
  try {
    const addresses = await prisma.customerAddress.findMany({
      where: {
        customer_id: req.user.id,
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
    let address;
    if (isDefault) {
      const [_, createdAddress] = await prisma.$transaction([
        prisma.customerAddress.updateMany({
          where: {
            customer_id: user.id,
          },
          data: {
            default: false,
          },
        }),
        prisma.customerAddress.create({
          data: {
            country,
            full_name: name,
            phone: mobile,
            pincode: pinCode,
            flat_no: apartment,
            street: area,
            default: true,
            city,
            state,
            customer_id: user.id,
          },
        }),
      ]);
      address = createdAddress;
    } else {
      address = await prisma.customerAddress.create({
        data: {
          country,
          full_name: name,
          phone: mobile,
          pincode: pinCode,
          flat_no: apartment,
          street: area,
          default: Boolean(isDefault),
          city,
          state,
          customer_id: user.id,
        },
      });
    }

    return res.status(StatusCodes.CREATED).json(address);
  } catch (error) {
    console.log("ERROR", error);
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  console.log("UPDATE ADDRESS REQ BODY", req.body);
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

    let updatedAddress;

    if (isDefault) {
      const [_, resultAddress] = await prisma.$transaction([
        prisma.customerAddress.updateMany({
          where: {
            customer_id: req.user.id,
          },
          data: {
            default: false,
          },
        }),
        prisma.customerAddress.update({
          where: {
            address_id: addressId,
          },
          data: {
            country,
            full_name: name,
            phone: mobile,
            pincode: pinCode,
            flat_no: apartment,
            street: area,
            city,
            state,
            default: true,
          },
        }),
      ]);
      updatedAddress = resultAddress;
    } else {
      updatedAddress = await prisma.customerAddress.update({
        where: {
          address_id: addressId,
        },
        data: {
          country,
          full_name: name,
          phone: mobile,
          pincode: pinCode,
          flat_no: apartment,
          street: area,
          city,
          state,
          ...(isDefault !== undefined && { default: Boolean(isDefault) }),
        },
      });
    }

    return res.status(StatusCodes.OK).json(updatedAddress);
  } catch (error) {
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const { addressId } = req.params;
    console.log("DELETE ADDRESS ID", addressId);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const result = errors.formatWith(({ msg, param }) => {
        return { message: msg, property: param };
      });
      throw new ValidationError("Incorrect data", result.array());
    }

    await prisma.customerAddress.delete({
      where: {
        address_id: addressId,
      },
    });

    return res
      .status(StatusCodes.OK)
      .json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("DELETE ADDRESS ERROR", error);
    next(error);
  }
};

const setDefaultAddress = async (req, res, next) => {
  const { addressId } = req.params;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  try {
    const address = await prisma.customerAddress.findFirst({
      where: {
        address_id: addressId,
        customer_id: req.user.id,
      },
    });

    if (!address) {
      throw new NotFoundError(`Address with id ${addressId} not found`);
    }

    const [_, updatedAddress] = await prisma.$transaction([
      prisma.customerAddress.updateMany({
        where: {
          customer_id: req.user.id,
        },
        data: {
          default: false,
        },
      }),
      prisma.customerAddress.update({
        where: {
          address_id: addressId,
        },
        data: {
          default: true,
        },
      }),
    ]);

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
  deleteAddress,
  setDefaultAddress,
};

