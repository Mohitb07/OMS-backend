const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const { products } = prisma;

const getCart = async (req, res, next) => {
  const { customer_id } = req.user;
  try {
    const customer = await prisma.customers.findUnique({
      where: {
        customer_id,
      },
      include: {
        carts: {
          where: {
            status: "active",
          },
          include: {
            cart_items: {
              include: {
                products: true,
              },
            },
          },
        },
      },
    });
    if (customer.carts) {
      const cart = customer.carts;
      return res.status(StatusCodes.OK).send({ cart });
    }
    return res
      .status(StatusCodes.NOT_FOUND)
      .send({ message: "No active cart found" });
  } catch (error) {
    next(error);
  }
};

const getCartItemsCount = async (req, res, next) => {
  const { customer_id } = req.user;
  try {
    const count = await prisma.cartItems.count({
      where: {
        carts: {
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
  const { product_id, product_price } = req.body;

  try {
    const user = await prisma.customers.findUnique({
      where: {
        customer_id,
      },
    });
    if (!user) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "User not found" });
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

    const cartItem = await prisma.cartItems.create({
      data: {
        quantity: 1,
        total_amount: product_price,
        cart_id: cart.cart_id,
        product_id,
      },
    });

    return res.status(StatusCodes.CREATED).send({ cartItem });
  } catch (error) {
    next(error);
  }
};

const updateCartQuantity = async (req, res, next) => {
  try {
    const { quantity, product_id, cart_id, product_price } = req.body;

    if (!quantity || !product_id || !cart_id || !product_price) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Missing required fields" });
    }

    const cartItem = await prisma.cartItems.findFirst({
      where: {
        cart_id,
        product_id,
      },
    });

    if (!cartItem) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Cart item not found" });
    }

    if (Number(quantity) === 0) {
      await prisma.cartItems.delete({
        where: {
          cart_item_id: cartItem.cart_item_id,
        },
      });
      const remainingItemsCount = await prisma.cartItems.count({
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
    const updatedCartItem = await prisma.cartItems.update({
      where: {
        cart_item_id: cartItem.cart_item_id,
      },
      data: {
        quantity: Number(quantity),
        total_amount: Number(product_price) * Number(quantity),
      },
    });

    return res.status(StatusCodes.OK).json(updatedCartItem);
  } catch (error) {
    next(error);
  }
};

const deleteCartItem = async (req, res, next) => {
  try {
    const { cart_item_id, cart_id } = req.body;

    if (!cart_item_id || !cart_id) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Missing required fields" });
    }

    const cartItem = await prisma.cartItems.findUnique({
      where: {
        cart_item_id,
      },
    });
    if (!cartItem) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "Cart item not found" });
    }
    await prisma.cartItems.delete({
      where: {
        cart_item_id,
      },
    });
    const remainingItems = await prisma.cartItems.count({
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
