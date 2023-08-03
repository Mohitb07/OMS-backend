const prisma = require("../prismaClient");
const Pusher = require("pusher");

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  useTLS: true,
});

const { cartItems } = prisma;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const calculateOrderAmount = async (customer_id) => {
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
          cart_items: {
            include: {
              products: true,
            },
          },
        },
      },
    },
  });
  if (user.carts.length === 0) {
    return res.status(404).send({ message: "User active cart not found" });
  }
  const cartItems = user.carts[0].cart_items;
  let total_order_amount = 0;
  if (cartItems) {
    total_order_amount = cartItems.reduce(
      (acc, currItem) => acc + Number(currItem.total_amount),
      0
    );
  }
  return {
    user,
    total_order_amount,
  };
};

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
                products: true,
              },
            },
          },
        },
      },
    });
    if (customer.orders.length > 0) {
      const orders = customer.orders;
      return res.status(200).send(orders);
    }
    return res.status(200).send([]);
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error try again" });
  }
};

const getOrder = async (req, res) => {
  const { orderId } = req.params;
  try {
    const orderDetail = await prisma.orders.findUnique({
      where: {
        order_id: orderId,
      },
      include: {
        order_items: {
          include: {
            products: true,
          },
        },
      },
    });
    if (orderDetail) {
      return res.status(200).send(orderDetail);
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
            cart_items: {
              include: {
                products: true,
              },
            },
          },
        },
      },
    });
    if (user.carts.length === 0) {
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

    const cartItems = user.carts[0].cart_items;
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
        cart_id: user.carts[0].cart_id,
      },
      data: {
        status: "completed",
      },
    });
    const updatedOrder = await prisma.orders.update({
      where: {
        order_id: order.order_id,
      },
      data: {
        total_amount: total_order_amount,
      },
    });
    return res.status(201).send({ updatedOrder });
  } catch (error) {
    console.error(error);
    return res.status(500).send({ message: "Internal server error" });
  }
};

const webhook = async (req, res) => {
  const event = req.body;
  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      console.log("PaymentIntent was successful!", paymentIntent);
      const total_order_amount = paymentIntent.amount;
      const { customer_id } = paymentIntent.metadata;

      try {
        await prisma.$transaction(async (transaction) => {
          const { user } = await calculateOrderAmount(customer_id);
          const cartItems = user.carts[0].cart_items;

          const order = await transaction.orders.create({
            data: {
              customer_id,
              total_amount: total_order_amount / 100,
              status: "pending",
              address: user.address,
            },
          });

          await transaction.orderItems.createMany({
            data: cartItems.map((cartItem) => ({
              order_id: order.order_id,
              product_id: cartItem.product_id,
              quantity: cartItem.quantity,
              total_amount: cartItem.total_amount,
            })),
          });
          await transaction.cartItems.deleteMany({
            where: {
              cart_item_id: {
                in: cartItems.map((cartItem) => cartItem.cart_item_id),
              },
            },
          });
          await transaction.cart.update({
            where: {
              cart_id: user.carts[0].cart_id,
            },
            data: {
              status: "completed",
            },
          });
          pusher.trigger(customer_id, "order", {
            message: "success",
          });
          return res.status(201).send({ order });
        });
      } catch (error) {
        pusher.trigger(customer_id, "order", {
          message: "error",
        });
        console.error(error);
        return res.status(500).send({ message: "Internal server error" });
      }
    case "payment_itent.payment_failed":
      const paymentIntentFailed = event.data.object;
      const { cust_id } = paymentIntentFailed.metadata;
      console.log("PaymentIntent was failed!", paymentIntentFailed);
      pusher.trigger(cust_id, "order", {
        message: "error",
      });
      return res.status(400).end();
    // ... handle other event types
    default:
      // Unexpected event type
      return res.status(400).end();
  }
};

const createPaymentIntent = async (req, res) => {
  try {
    const { customer_id } = req.body;
    const { total_order_amount } = await calculateOrderAmount(customer_id);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total_order_amount * 100,
      currency: "inr",
      payment_method_types: ["card"],
      metadata: {
        customer_id,
      },
      // automatic_payment_methods: { enabled: true },
    });
    console.log("payment intent secret", paymentIntent.client_secret);
    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.log(error);
    return res.status(400).send({
      error: {
        message: error.message,
      },
    });
  }
};

const getConfig = (req, res) => {
  return res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
};

module.exports = {
  getOrder,
  getOrders,
  getOrdersCount,
  placeOrder,
  webhook,
  createPaymentIntent,
  getConfig,
};
