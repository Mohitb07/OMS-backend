const { Customers, Orders, OrderItems, Products, Carts, CartItems } = require("../models");

const getOrders = async (req, res) => {
  const { customer_id } = req.user;
  Customers.findByPk(customer_id, {
    include: {
      model: Orders,
      include: {
        model: OrderItems,
        include: {
          model: Products,
        },
      },
    },
  })
    .then((customer) => {
      if (customer) {
        const orders = customer.orders;
        console.log(orders);
        return res.status(200).send(orders);
      }
      return res.status(404).send({ message: "No orders found for you" });
    })
    .catch((error) => {
      console.error(error);
    });
};

const getOrder = async (req, res) => {
  const { orderId } = req.params;
  Orders.findByPk(orderId, {
    include: {
      model: OrderItems,
      include: {
        model: Products,
      },
    },
  })
    .then((customer) => {
      if (customer) {
        const orders = customer.order_items;
        console.log(orders);
        return res.status(200).send(orders);
      }
      return res.status(404).send({ message: "No order items found" });
    })
    .catch((error) => {
      console.error(error);
    });
};

const getOrdersCount = async (req, res) => {
  const { customer_id } = req.user;
  Orders.count({
    where: {
      customer_id: customer_id,
    },
  })
    .then((count) => {
      return res.status(200).send(count.toString());
    })
    .catch((err) => {
      return res
        .status(500)
        .send({ message: "Internal server error try again" });
    });
};

const placeOrder = async (req, res) => {
  const { customer_id } = req.user;
  try {
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
      return res.status(404).send({ message: "User active cart not found" });
    }

    const order = await Orders.create({
      customer_id,
      total_amount: 0,
      status: "pending",
      address: user.address,
    });

    const cartItems = user.cart.cart_items;
    let total_order_amount = cartItems.reduce(
      (acc, currItem) => acc + Number(currItem.total_amount),
      0
    );

    for (const cartItem of cartItems) {
      await OrderItems.create({
        order_id: order.order_id,
        product_id: cartItem.product_id,
        quantity: cartItem.quantity,
        total_amount: cartItem.total_amount,
      });
      await cartItem.destroy();
    }

    const cart = user.cart;
    order.total_amount = total_order_amount;
    cart.status = "completed";
    await order.save();
    await cart.save();

    return res.status(201).send({ order });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

module.exports = {
  getOrder,
  getOrders,
  getOrdersCount,
  placeOrder,
};
