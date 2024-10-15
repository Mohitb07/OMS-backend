const axios = require("axios");
const prisma = require("../prismaClient");
const crypto = require("crypto");
const { StatusCodes } = require("http-status-codes");
const { calculateCartPrice } = require("../services/calculateCartPrice");
const BadRequestError = require("../errors/BadRequestError");
const NotFoundError = require("../errors/NotFoundError");
const ValidationError = require("../errors/ValidationError");
const ForbiddenError = require("../errors/ForbiddenError");
const { validationResult } = require("express-validator");

const PAYU_BASE_URL = process.env.PAYU_BASE_URL; // Use 'https://secure.payu.in' for production
const MERCHANT_KEY = process.env.MERCHANT_KEY;
const MERCHANT_SALT = process.env.MERCHANT_SALT;

const { cartItems } = prisma;

const createPaymentHash = (params) => {
  // const hashString = `${MERCHANT_KEY}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|${params.udf1}|${params.udf2}|${params.udf3}|${params.udf4}|${params.udf5}|${MERCHANT_SALT}`;
  const hashString = `${MERCHANT_KEY}|${params.txnid}|${params.amount}|${params.productinfo}|${params.firstname}|${params.email}|||||||||||${MERCHANT_SALT}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
};

const verifyPaymentHash = (params, status) => {
  // const hashString = `${MERCHANT_SALT}|${status}|${params.udf5}|${params.udf4}|${params.udf3}|${params.udf2}|${params.udf1}|${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${MERCHANT_KEY}`;
  const hashString = `${MERCHANT_SALT}|${status}|||||||||||${params.email}|${params.firstname}|${params.productinfo}|${params.amount}|${params.txnid}|${MERCHANT_KEY}`;
  return crypto.createHash("sha512").update(hashString).digest("hex");
};

const getUserCart = async (customer_id) => {
  try {
    const userCart = await prisma.cart.findFirst({
      where: {
        customer_id,
        status: "active",
      },
      include: {
        cart_items: {
          include: {
            product: true,
          },
        },
      },
    });
    return userCart || {};
  } catch (error) {
    console.error("Error while getting user cart", error);
  }
};

const createUserOrder = async (
  payment_method,
  address_id,
  customer_id,
  cart_id
) => {
  let order;
  let userCart;
  try {
    await prisma.$transaction(async (transaction) => {
      userCart = await getUserCart(customer_id);
      const cartItems = userCart.cart_items;
      order = await transaction.order.create({
        data: {
          payment_method,
          address_id,
          customer_id,
          order_amount: calculateCartPrice(cartItems),
          status: "pending",
        },
      });

      await transaction.orderItem.createMany({
        data: cartItems.map((cartItem) => ({
          order_id: order.order_id,
          product_id: cartItem.product_id,
          quantity: cartItem.quantity,
          total_amount: cartItem.total_amount,
        })),
      });
    });
    return {
      order,
      userCart,
    };
  } catch (error) {
    console.error("Order creation transaction failed:", error);
    throw error;
  }
};

const cashTransaction = async (req, res, next) => {
  const { cart_id, address_id, payment_method } = req.body;
  const { customer_id } = req.user;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  if (!payment_method === "cash") {
    throw new BadRequestError("Invalid payment method");
  }
  let orderId = null;
  try {
    const { order, userCart } = await createUserOrder(
      payment_method,
      address_id,
      customer_id,
      cart_id
    );
    orderId = order.order_id;
    const cartItems = userCart.cart_items;
    await prisma.$transaction(async (transaction) => {
      await transaction.order.update({
        data: {
          status: "processing",
        },
        where: {
          order_id: orderId,
        },
      });
      await transaction.cartItem.deleteMany({
        where: {
          cart_item_id: {
            in: cartItems.map((cartItem) => cartItem.cart_item_id),
          },
        },
      });
      await transaction.cart.delete({
        where: {
          cart_id,
        },
      });
    });
    console.log("order placed successfully");
    return res.status(StatusCodes.OK).json({
      message: "Order placed successfully",
      sendTo: `order/${orderId}`,
    });
  } catch (error) {
    console.log("error while placing order", error);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Error while placing order",
      sendTo: `order/${orderId}`,
    });
  }
};

const initiatePayment = async (req, res, next) => {
  const {
    cart_id,
    address_id,
    shipping_name,
    shipping_phone,
    shipping_email,
    payment_method,
  } = req.body;
  try {
    const { customer_id } = req.user;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const result = errors.formatWith(({ msg, param }) => {
        return { message: msg, property: param };
      });
      throw new ValidationError("Incorrect data", result.array());
    }

    if (!payment_method === "card") {
      throw new BadRequestError("Invalid payment method");
    }

    const { order, userCart } = await createUserOrder(
      payment_method,
      address_id,
      customer_id,
      cart_id
    );
    const txnid = new Date().getTime(); // Unique transaction ID
    const cartItems = userCart.cart_items;
    const amount = calculateCartPrice(cartItems);
    const params = {
      key: MERCHANT_KEY,
      txnid: txnid,
      amount: `${amount}` + ".00",
      productinfo: `${order.order_id},${cart_id}`,
      firstname: shipping_name,
      email: shipping_email,
      phone: shipping_phone,
      surl: process.env.SURL, // Success URL
      furl: process.env.FURL, // Failure URL
      hash: "",
    };
    params.hash = createPaymentHash(params);
    try {
      const response = await axios.post(`${PAYU_BASE_URL}/_payment`, params, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      res
        .status(StatusCodes.OK)
        .json({ redirectUrl: response.request.res.responseUrl });
    } catch (error) {
      throw new Error("Error while processing payment", error);
    }
  } catch (error) {
    next(error);
  }
};

const handlePaymentResponse = async (req, res) => {
  const { txnid, amount, productinfo, firstname, email, status, hash } =
    req.body;
  const params = { txnid, amount, productinfo, firstname, email };
  const generatedHash = verifyPaymentHash(params, status);
  const orderId = productinfo.split(" ")[0];
  const cartId = productinfo.split(" ")[1];

  if (generatedHash === hash) {
    if (status === "success") {
      prisma
        .$transaction(async (transaction) => {
          const order = await transaction.order.findUnique({
            where: {
              order_id: orderId,
            },
          });
          if (!order) {
            throw new NotFoundError(`Order with id ${orderId} not found`);
          }
          await transaction.order.update({
            data: {
              status: "processing",
            },
            where: {
              order_id: orderId,
            },
          });
          await transaction.cartItem.deleteMany({
            where: {
              cart_id: cartId,
            },
          });
        })
        .then(() => {
          console.log("order placed successfully");
          res.redirect(`${process.env.CLIENT_URL}/order/${orderId}`);
        })
        .catch((error) => {
          console.error("Error while updating order status", error);
          res.redirect(`${process.env.CLIENT_URL}/order/${orderId}`);
        });
    } else {
      try {
        await prisma.order.delete({
          where: {
            order_id: orderId,
          },
        });
        res.redirect(`${process.env.CLIENT_URL}/order/${orderId}`);
      } catch (error) {
        console.error("Error while updating order status", error);
        res.redirect(`${process.env.CLIENT_URL}/order/${orderId}`);
      }
    }
  } else {
    throw new ValidationError("Invalid payment hash");
  }
};

const validateUserOrder = async (req, res, next) => {
  const { orderId } = req.params;
  const { customer_id } = req.user;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  try {
    const order = await prisma.order.findUnique({
      where: {
        order_id: orderId,
      },
    });

    if (!order) {
      return res.status(StatusCodes.OK).json({ status: "cancelled" });
    }

    if (order.customer_id !== customer_id) {
      throw new ForbiddenError("You are not authorized to view this order");
    }
    return res.status(StatusCodes.OK).send({
      status: order.status,
    });
  } catch (error) {
    next(error);
  }
};

const processRefund = async (txnId, amount) => {
  // Refund the amount using the payu payment gateway API

  const params = {
    key: MERCHANT_KEY,
    command: "refund",
    var1: txnId,
    var2: amount,
    hash: "",
  };
  params.hash = createPaymentHash(params);

  try {
    const response = await axios.post(`${PAYU_BASE_URL}/_payment`, params, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  } catch (error) {
    console.error("Error while processing refund", error);
  }
};

const getOrders = async (req, res, next) => {
  const { customer_id } = req.user;
  const { userId } = req.params;
  try {
    if (userId !== customer_id) {
      throw new ForbiddenError("You are not authorized to continue");
    }
    const customer = await prisma.customer.findUnique({
      where: {
        customer_id,
      },
      include: {
        orders: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            order_items: {
              include: {
                product: true,
              },
            },
            address: {
              include: {
                customer: true,
              },
            },
          },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError(`Customer with id ${customer_id} not found`);
    }

    return res.status(StatusCodes.OK).send(customer.orders || []);
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  const { orderId } = req.params;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  try {
    const orderDetail = await prisma.order.findUnique({
      where: {
        order_id: orderId,
      },
      include: {
        order_items: {
          include: {
            product: true,
          },
        },
        address: {
          include: {
            customer: true,
          },
        },
      },
    });
    if (!orderDetail) {
      throw new NotFoundError(`Order with id ${orderId} not found`);
    }
    return res.status(StatusCodes.OK).send(orderDetail);
  } catch (error) {
    next(error);
  }
};

const getOrdersCount = async (req, res, next) => {
  const { customer_id } = req.user;

  try {
    const count = await prisma.order.count({
      where: {
        customer_id,
      },
    });
    return res.status(StatusCodes.OK).send(count.toString());
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrder,
  getOrders,
  getOrdersCount,
  initiatePayment,
  handlePaymentResponse,
  cashTransaction,
  validateUserOrder,
};
