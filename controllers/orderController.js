// const {
//   Customers,
//   Orders,
//   OrderItems,
//   Products,
//   Carts,
//   CartItems,
// } = require("../models");

const prisma = require("../prisma");

const getOrders = async (req, res) => {
  const { customer_id } = req.user;
  try {
    const customer = await prisma.customers.findUnique({
      where: {
        customer_id,
      },
      include: {
        orders: {
          include: {
            order_items: {
              include: {
                products,
              },
            },
          },
        },
      },
    });
    if (customer.orders.length > 0) {
      const orders = customer.orders;
      console.log(orders);
      return res.status(200).send(orders);
    }
    return res.status(404).send({ message: "No orders found for you" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error try again" });
  }
};

const getOrder = async (req, res) => {
  const { orderId } = req.params;
  try {
    const customer = await prisma.orders.findUnique({
      where: {
        order_id: orderId,
      },
      include: {
        order_items: {
          include: {
            products,
          },
        },
      },
    });
    if (customer.order_items.length > 0) {
      const orders = customer.order_items;
      return res.status(200).send(orders);
    }
    return res.status(404).send({ message: "No order items found" });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error try again" });
  }
};

const getOrdersCount = async (req, res) => {
  const { customer_id } = req.user;
  try {
    const count = await prisma.orders.count({
      where: {
        customer_id,
      },
    });
    return res.status(200).send(count.toString());
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error try again" });
  }
};

const placeOrder = async (req, res) => {
  const { customer_id } = req.user;
  try {
    const user = await prisma.customers.findUnique({
      where: {
        customer_id,
      },
      include: {
        carts: {
          where: {
            status: "active",
          },
          include: {
            cart_items,
          },
        },
      },
    });
    if (!user) {
      return res.status(404).send({ message: "User active cart not found" });
    }

    const order = await prisma.orders.create({
      data: {
        customer_id,
        total_amount: 0,
        status: "pending",
        address: user.address,
      },
    });

    const cartItems = user.carts.cart_items;
    let total_order_amount = 0;
    if (cartItems) {
      total_order_amount = cartItems.reduce(
        (acc, currItem) => acc + Number(currItem.total_amount),
        0
      );
    }

    for (const cartItem of cartItems) {
      await prisma.orderItems.create({
        data: {
          order_id: order.order_id,
          product_id: cartItem.product_id,
          quantity: cartItem.quantity,
          total_amount: cartItem.total_amount,
        },
      });
      await prisma.cartItems.delete({
        where: {
          cart_item_id: cartItem.cart_item_id,
        },
      });
    }
    await prisma.cart.update({
      where: {
        cart_id: user.carts.cart_id,
      },
      data: {
        status: "completed",
      },
    });
    await prisma.orders.update({
      where: {
        order_id: order.order_id,
      },
      data: {
        total_amount: total_order_amount,
      },
    });
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
