const prisma = require("../prismaClient");
const Pusher = require("pusher");
const { getCloudinaryImageURL } = require("../services/cloudinary");
const { sanitizeHTMl, sanitizeHTML } = require("../services/sanitizeHTML");

const pusher = new Pusher({
  appId: "1645752",
  key: "bbb9c8ebe14b830b3a36",
  secret: "085c0087e9c7862c849f",
  cluster: "ap2",
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
    case "checkout.session.completed":
      const data = event.data.object;
      console.log("Checkout session completed!", data);

      stripe.customers.retrieve(data.customer, async (err, customer) => {
        if (err) {
          console.log("stripe error :>> ", err);
        } else {
          try {
            const { customer_id } = customer.metadata;
            await prisma.$transaction(async (transaction) => {
              const { user } = await calculateOrderAmount(customer_id);
              const cartItems = user.carts[0].cart_items;

              const order = await transaction.orders.create({
                data: {
                  customer_id,
                  total_amount: data.amount_total / 100,
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
              console.log("order created successfully");
            });
            return res.status(200).end();
          } catch (error) {
            console.error("error while creating order", error);
            return res.status(500).send({ message: "Internal server error" });
          }
        }
      });
    case "checkout.session.failed":
      const paymentIntentFailed = event.data.object;
      const { customer_id: cust_id } = paymentIntentFailed.metadata;
      console.log("PaymentIntent was failed!", paymentIntentFailed);
      return res.status(400).end();
  }
};

// const createPaymentIntent = async (req, res) => {
//   try {
//     const { customer_id } = req.body;
//     const { total_order_amount } = await calculateOrderAmount(customer_id);
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: total_order_amount * 100,
//       currency: "inr",
//       payment_method_types: ["card"],
//       metadata: {
//         customer_id,
//       },
//       // automatic_payment_methods: { enabled: true },
//     });
//     console.log("payment intent secret", paymentIntent.client_secret);
//     res.send({
//       clientSecret: paymentIntent.client_secret,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(400).send({
//       error: {
//         message: error.message,
//       },
//     });
//   }
// };

// const getConfig = (req, res) => {
//   return res.send({
//     publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
//   });
// };

const createCheckoutSession = async (req, res) => {
  const { customer_id } = req.body;
  const { user } = await calculateOrderAmount(customer_id);
  const customer = await stripe.customers.create({
    metadata: {
      customer_id,
      // cart: JSON.stringify(user.carts[0].cart_items),
    },
  });

  const productImagesPromises = user.carts[0].cart_items.map((item) =>
    getCloudinaryImageURL(item.products.image_url)
  );

  const productImages = await Promise.all(productImagesPromises);

  const lineItems = user.carts[0].cart_items.map((cartItem, idx) => ({
    price_data: {
      currency: "inr",
      product_data: {
        name: cartItem.products.name,
        images: [productImages[idx]],
        description: sanitizeHTML(cartItem.products.description),
        metadata: {
          product_id: cartItem.product_id,
        },
      },
      unit_amount: cartItem.products.price * 100,
    },
    quantity: cartItem.quantity,
  }));

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: lineItems,
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: {
            amount: 0,
            currency: "inr",
          },
          display_name: "Free shipping",
          // Delivers between 5-7 business days
          delivery_estimate: {
            minimum: {
              unit: "business_day",
              value: 2,
            },
            maximum: {
              unit: "business_day",
              value: 3,
            },
          },
        },
      },
      // {
      //   shipping_rate_data: {
      //     type: "fixed_amount",
      //     fixed_amount: {
      //       amount: 1500,
      //       currency: "usd",
      //     },
      //     display_name: "Next day air",
      //     // Delivers in exactly 1 business day
      //     delivery_estimate: {
      //       minimum: {
      //         unit: "business_day",
      //         value: 1,
      //       },
      //       maximum: {
      //         unit: "business_day",
      //         value: 1,
      //       },
      //     },
      //   },
      // },
    ],
    phone_number_collection: {
      enabled: true,
    },
    mode: "payment",
    customer: customer.id,
    success_url: `${process.env.CLIENT_URL}/complete`,
    cancel_url: `${process.env.CLIENT_URL}/cancel`,
  });

  return res.send({
    url: session.url,
  });
};

module.exports = {
  getOrder,
  getOrders,
  getOrdersCount,
  placeOrder,
  webhook,
  // createPaymentIntent,
  // getConfig,
  createCheckoutSession,
};
