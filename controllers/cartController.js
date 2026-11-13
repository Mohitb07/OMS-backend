const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const NotFoundError = require("../errors/NotFoundError");
const ValidationError = require("../errors/ValidationError");
const { validationResult } = require("express-validator");
const { products } = prisma;

const getCart = async (req, res, next) => {
  const { id } = req.user;
  console.log("USER ID IN CART CONTROLLER", id);
  try {
    const userCart = await prisma.cart.findFirst({
      where: {
        customer_id: id,
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
    console.log("USER CART 🤣🤣🤣🤣", cart);
    return res.status(StatusCodes.OK).send(cart || {});
  } catch (error) {
    next(error);
  }
};

const getCartItemsCount = async (req, res, next) => {
  const { id } = req.user;

  try {
    // FIND BETTER WAY
    const count = await prisma.cartItem.count({
      where: {
        cart: {
          customer_id: id,
        },
      },
    });
    return res.status(StatusCodes.OK).send(count.toString());
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  const { id } = req.user;
  const { product_id } = req.body;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Missing required fields", result.array());
  }

  try {
    // Validate user and product exist before starting the transaction
    const user = await prisma.customer.findUnique({
      where: { customer_id: id },
    });
    if (!user) {
      throw new NotFoundError("User does not exist");
    }
    const product = await prisma.product.findUnique({
      where: { product_id },
    });
    if (!product) {
      throw new NotFoundError(`Product with id ${product_id} not found`);
    }

    // Wrap cart find/create + cartItem upsert in a single transaction.
    // Without this, two concurrent "add to cart" requests from the same user
    // could both see no active cart and both try to create one — violating
    // the @unique constraint on Cart.customer_id and causing a 500 error.
    const cartItem = await prisma.$transaction(async (tx) => {
      // Find or create the active cart
      let cart = await tx.cart.findFirst({
        where: { customer_id: id, status: "active" },
      });

      if (!cart) {
        cart = await tx.cart.create({
          data: { customer_id: id, status: "active" },
        });
      }

      // Upsert the cart item — increment if already present, create if new
      const existingItem = await tx.cartItem.findFirst({
        where: { cart_id: cart.cart_id, product_id },
      });

      if (!existingItem) {
        return tx.cartItem.create({
          data: {
            quantity: 1,
            total_amount: product.price,
            cart_id: cart.cart_id,
            product_id,
          },
        });
      } else {
        return tx.cartItem.update({
          where: { cart_item_id: existingItem.cart_item_id },
          data: { quantity: existingItem.quantity + 1 },
        });
      }
    });

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

    if (!cartItem) {
      throw new NotFoundError("Cart item not found");
    }

    if (Number(quantity) === 0) {
      // Wrap the item delete + potential cart delete in a single transaction.
      // Without this, a crash after cartItem.delete but before cart.delete
      // leaves an orphan Cart row. Since Cart.customer_id is @unique, the
      // user would be permanently blocked from creating a new cart.
      const remainingItemsCount = await prisma.cartItem.count({
        where: { cart_id, NOT: { cart_item_id: cartItem.cart_item_id } },
      });

      await prisma.$transaction(async (tx) => {
        await tx.cartItem.delete({
          where: { cart_item_id: cartItem.cart_item_id },
        });
        if (remainingItemsCount === 0) {
          await tx.cart.delete({ where: { cart_id } });
        }
      });

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
    console.log("ERROR ON UPDATE CART QUANTITY", error);
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
      where: { cart_item_id },
    });
    if (!cartItem) {
      throw new NotFoundError("Cart item not found");
    }

    // Check remaining items before entering the transaction so we can make
    // the cart-delete conditional without a nested count inside the tx.
    const remainingItems = await prisma.cartItem.count({
      where: { cart_id, NOT: { cart_item_id } },
    });

    // Atomically delete the item and — if it was the last one — the cart too.
    // Without a transaction an orphan Cart row would block the user from ever
    // creating a new cart (Cart.customer_id is @unique).
    await prisma.$transaction(async (tx) => {
      await tx.cartItem.delete({ where: { cart_item_id } });
      if (remainingItems === 0) {
        await tx.cart.delete({ where: { cart_id } });
      }
    });

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
