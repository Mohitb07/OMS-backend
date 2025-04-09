const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const NotFoundError = require("../errors/NotFoundError");
const ValidationError = require("../errors/ValidationError");
const { validationResult } = require("express-validator");
const { products } = prisma;

const getCart = async (req, res, next) => {
  const { customer_id } = req.user;
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
    const cart = userCart;
    return res.status(StatusCodes.OK).send(cart || {});
  } catch (error) {
    next(error);
  }
};

const getCartItemsCount = async (req, res, next) => {
  const { customer_id } = req.user;

  try {
    // FIND BETTER WAY
    const count = await prisma.cartItem.count({
      where: {
        cart: {
          customer_id: customer_id,
        },
      },
    });
    return res.status(StatusCodes.OK).send(count.toString());
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  const { customer_id } = req.user;
  const { product_id } = req.body;

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
        customer_id,
      },
    });
    if (!user) {
      throw new NotFoundError("User does not exist");
    }
    const product = await prisma.product.findUnique({
      where: {
        product_id,
      },
    });
    if (!product) {
      throw new NotFoundError(`Product with id ${product_id} not found`);
    }

    let cart = await prisma.cart.findFirst({
      where: {
        customer_id,
        status: "active",
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          customer_id,
          status: "active",
        },
      });
    }

    const productInCart = await prisma.cartItem.findFirst({
      where: {
        product_id,
      },
    });
    let cartItem;
    if (!productInCart) {
      cartItem = await prisma.cartItem.create({
        data: {
          quantity: 1,
          total_amount: product.price,
          cart_id: cart.cart_id,
          product_id,
        },
      });
    } else {
      cartItem = await prisma.cartItem.update({
        where: {
          cart_item_id: productInCart.cart_item_id,
        },
        data: {
          quantity: productInCart.quantity + 1,
        },
      });
    }
    return res.status(StatusCodes.CREATED).send({ cartItem });
  } catch (error) {
    console.log("ERROR ON ADD TO CART", error);
    next(error);
  }
};

const updateCartQuantity = async (req, res, next) => {
  const { quantity, product_id, cart_id } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Missing required fields", result.array());
  }

  try {
    const cartItem = await prisma.cartItem.findFirst({
      where: {
        cart_id,
        product_id,
      },
      include: {
        product: true,
      },
    });

    cartItem.product.price;

    if (!cartItem) {
      throw new NotFoundError("Cart item not found");
    }

    if (Number(quantity) === 0) {
      await prisma.cartItem.delete({
        where: {
          cart_item_id: cartItem.cart_item_id,
        },
      });
      const remainingItemsCount = await prisma.cartItem.count({
        where: {
          cart_id,
        },
      });
      if (remainingItemsCount === 0) {
        await prisma.cart.delete({
          where: {
            cart_id,
          },
        });
      }
      return res
        .status(StatusCodes.OK)
        .json({ message: "Cart item removed successfully" });
    }
    const updatedCartItem = await prisma.cartItem.update({
      where: {
        cart_item_id: cartItem.cart_item_id,
      },
      data: {
        quantity: Number(quantity),
        total_amount: Number(cartItem.product.price) * Number(quantity),
      },
    });

    return res.status(StatusCodes.OK).json(updatedCartItem);
  } catch (error) {
    console.log("ERROR ON ADD TO CART", error);
    next(error);
  }
};

const deleteCartItem = async (req, res, next) => {
  try {
    const { cart_item_id, cart_id } = req.body;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const result = errors.formatWith(({ msg, param }) => {
        return { message: msg, property: param };
      });
      throw new ValidationError("Missing required fields", result.array());
    }

    const cartItem = await prisma.cartItem.findUnique({
      where: {
        cart_item_id,
      },
    });
    if (!cartItem) {
      throw new NotFoundError("Cart item not found");
    }
    await prisma.cartItem.delete({
      where: {
        cart_item_id,
      },
    });
    const remainingItems = await prisma.cartItem.count({
      where: {
        cart_id,
      },
    });
    if (remainingItems === 0) {
      await prisma.cart.delete({
        where: {
          cart_id,
        },
      });
    }
    return res.status(StatusCodes.OK).json({ message: "Cart item removed" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  getCartItemsCount,
  addToCart,
  updateCartQuantity,
  deleteCartItem,
};
