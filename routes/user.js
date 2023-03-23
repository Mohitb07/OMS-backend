const express = require("express");
const auth = require("../middleware/auth");
const Products = require("../models/index").Products;
const Customers = require("../models/index").Customers;
const Orders = require("../models/index").Orders;
const OrderItems = require("../models/index").OrderItems;
const Carts = require("../models/index").Carts;
const CartItems = require("../models/index").CartItems;

const router = new express.Router();

// get user info
router.get("/me", auth, async (req, res) => {
  return res.status(200).json(req.user);
});

router.get("/products", async (req, res) => {
  try {
    const products = await Products.findAll({});
    return res.status(200).json(products);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
});

router.get("/orders", auth, async (req, res) => {
  // get all the order of a user
  const { customer_id } = req.user;
  console.log("cus", customer_id);
  // SELECT * FROM orders WHERE userId = id;
  Customers.findByPk(customer_id, {
    include: {
      model: Orders,
      include: {
        model: OrderItems,
      },
    },
  })
    .then((customer) => {
      console.log("customer", customer);
      if (customer) {
        const orders = customer.orders;
        console.log(orders);
        return res.status(200).send({ orders });
      }
      return res.status(404).send({ message: "Not found " });
    })
    .catch((error) => {
      console.error(error);
    });
});

router.get("/cart", auth, async (req, res) => {
  // get all the order of a user
  const { customer_id } = req.user;
  Customers.findByPk(customer_id, {
    include: {
      model: Carts,
      include: {
        model: CartItems,
        include: {
          model: Products,
        },
      },
    },
  })
    .then((customer) => {
      console.log("customer", customer);
      if (customer) {
        const cart = customer.cart;
        console.log("cart", cart);
        return res.status(200).send({ cart });
      }
      return res.status(404).send({ message: "Not found " });
    })
    .catch((error) => {
      console.error(error);
    });
});

router.post("/product", auth, async (req, res) => {
  const { name, description, price, image_url } = req.body;
  try {
    const product = await Products.create({
      name,
      description,
      price,
      image_url,
    });
    return res.status(201).send({ message: "Product created" });
  } catch (error) {
    return res.status(500).send({ message: "Internal server error try again" });
  }
});

router.post("/carts", auth, async (req, res) => {
  const { customer_id } = req.user;
  const { product_id, product_price } = req.body;

  try {
    // Find the user by ID
    const user = await Customers.findByPk(customer_id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Find the user's active cart or create a new one
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
      unit_amount: product_price,
      cart_id: cart.cart_id,
      product_id,
    });

    return res.status(201).send({ cartItem });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
});

router.post("/orders", auth, async (req, res) => {
  const { customer_id } = req.user;
  try {
    // Find the user by ID
    const user = await Customers.findByPk(customer_id, {
      include: {
        model: Carts,
        include: {
          model: CartItems,
        },
        where: { status: "active" },
      },
    });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    // Create the order
    const order = await Orders.create({
      customer_id,
      total_amount: 0,
      status: "pending",
    });

    // Create the order items from the cart items
    const cartItems = user.cart.cart_items;
    for (const cartItem of cartItems) {
      await OrderItems.create({
        order_id: order.order_id,
        product_id: cartItem.product_id,
        quantity: cartItem.quantity,
        unit_amount: cartItem.unit_amount * cartItem.quantity,
      });

      // Remove the cart item
      await cartItem.destroy();
    }
    const total_amount = cartItems.reduce(
      (acc, curr) => acc + curr.quantity * curr.unit_amount,
      0
    );

    // Update the cart status to 'completed'
    const cart = user.cart;
    cart.status = "completed";
    order.total_amount = total_amount;
    await cart.save();
    await order.save();

    return res.status(201).send({ order });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
});

router.patch("/carts", auth, async (req, res) => {
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
    cartItem.unit_amount = product_price * quantity;
    await cartItem.save();
    return res.status(201).json(cartItem);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
});

router.delete("/carts", auth, async (req, res) => {
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
});

// TO DESTROY CART IF CART ITEMS = 0 OR QUATITY = 0
// if (quantity === 0) {
//   // Find the cart item by product ID and remove it
//   await CartItems.destroy({
//     where: {
//       cartId: cart.id,
//       productId: productId
//     }
//   });

//   // Check if there are any items left in the cart
//   const remainingItems = await CartItems.count({
//     where: {
//       cartId: cart.id
//     }
//   });

//   // If there are no items left in the cart, delete the cart
//   if (remainingItems === 0) {
//     await Carts.destroy({
//       where: {
//         id: cart.id
//       }
//     });
//   }

//   return res.status(200).send({ message: 'Item removed from cart' });
// }

module.exports = router;
