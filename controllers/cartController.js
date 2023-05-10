const prisma = require("../prismaClient");
const { products } = prisma;

const getCart = async (req, res) => {
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
      return res.status(200).send({ cart });
    }
    return res.status(404).send({ message: "No active cart found" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error try again" });
  }
};

const getCartItemsCount = async (req, res) => {
  const { customer_id } = req.user;
  try {
    const count = await prisma.cartItems.count({
      where: {
        carts: {
          customer_id: customer_id,
        },
      },
    });
    return res.status(200).send(count.toString());
  } catch (error) {
    console.log(error);
    return res.status(500).send({ message: "Internal server error try again" });
  }
};

const addToCart = async (req, res) => {
  const { customer_id } = req.user;
  const { product_id, product_price } = req.body;

  try {
    const user = await prisma.customers.findUnique({
      where: {
        customer_id,
      },
    });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
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

    // Find the item in the cart or create a new one
    // let cartItem = await CartItems.findOne({
    //   where: { cartId: cart.id, itemId: itemId },
    // });
    // if (cartItem) {
    //   // Update the quantity of the existing cart item
    //   cartItem.quantity += quantity;
    //   await cartItem.save();
    // } else {
    //   // Create a new cart item
    //   cartItem = await CartItems.create({
    //     cartId: cart.id,
    //     itemId: itemId,
    //     quantity: quantity,
    //   });
    // }

    const cartItem = await prisma.cartItems.create({
      data: {
        quantity: 1,
        total_amount: product_price,
        cart_id: cart.cart_id,
        product_id,
      },
    });

    return res.status(201).send({ cartItem });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

const updateCartQuantity = async (req, res) => {
  try {
    const { quantity, product_id, cart_id, product_price } = req.body;

    const cartItem = await prisma.cartItems.findFirst({
      where: {
        cart_id,
        product_id,
      },
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    if (Number(quantity) === 0) {
      await prisma.cartItems.delete({
        where: {
          cart_item_id: cartItem.cart_item_id,
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
      return res.status(200).json({message: "Cart item removed successfully"});
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

    return res.status(201).json(updatedCartItem);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const { cart_item_id, cart_id } = req.body;
    const cartItem = await prisma.cartItems.findUnique({
      where: {
        cart_item_id,
      },
    });
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
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
    return res.status(201).json({ message: "Cart item removed" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

module.exports = {
  getCart,
  getCartItemsCount,
  addToCart,
  updateCartQuantity,
  deleteCartItem,
};
