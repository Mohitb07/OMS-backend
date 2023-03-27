const { Customers, CartItems, Carts, Products } = require("../models");

const getCart = async (req, res) => {
  const { customer_id } = req.user;
  Customers.findByPk(customer_id, {
    include: {
      model: Carts,
      where: { status: "active" },
      include: {
        model: CartItems,
        include: {
          model: Products,
        },
      },
    },
  })
    .then((customer) => {
      if (customer) {
        const cart = customer.cart;
        console.log("cart", cart);
        return res.status(200).send({ cart });
      }
      return res.status(404).send({ message: "No active cart found" });
    })
    .catch((error) => {
      console.error(error);
      return res
        .status(500)
        .send({ message: "Internal server error try again" });
    });
};

const getCartItemsCount = async (req, res) => {
  const { customer_id } = req.user;

  CartItems.count({
    include: {
      model: Carts,
      where: { customer_id },
    },
  })
    .then((count) => {
      return res.status(200).send(count.toString());
    })
    .catch((err) => {
      console.log(err);
      return res
        .status(500)
        .send({ message: "Internal server error try again" });
    });
};

const addToCart = async (req, res) => {
  const { customer_id } = req.user;
  const { product_id, product_price } = req.body;

  try {
    const user = await Customers.findByPk(customer_id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    let cart = await Carts.findOne({
      where: { customer_id, status: "active" },
    });
    if (!cart) {
      cart = await Carts.create({
        customer_id,
        status: "active",
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

    const cartItem = await CartItems.create({
      quantity: 1,
      total_amount: product_price,
      cart_id: cart.cart_id,
      product_id,
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

    const cartItem = await CartItems.findOne({
      where: {
        cart_id,
        product_id,
      },
    });

    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    cartItem.quantity = quantity;
    cartItem.total_amount = product_price * quantity;
    await cartItem.save();
    return res.status(201).json(cartItem);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

const deleteCartItem = async (req, res) => {
  try {
    const { cart_item_id, cart_id } = req.body;
    const cartItem = await CartItems.findByPk(cart_item_id);
    if (!cartItem) {
      return res.status(404).json({ message: "Cart item not found" });
    }
    await cartItem.destroy();
    const remainingItems = await CartItems.count({
      where: {
        cart_id,
      },
    });
    if (remainingItems === 0) {
      await Carts.destroy({
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
  deleteCartItem
};
