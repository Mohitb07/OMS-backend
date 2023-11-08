const prisma = require("../prismaClient");
const Pusher = require("pusher");
const { getCloudinaryImageURL } = require("../services/cloudinary");
const { sanitizeHTML } = require("../services/sanitizeHTML");
const { inngest } = require("../services/inngest");
const { StatusCodes } = require("http-status-codes");

const pusher = new Pusher({
  appId: "1645752",
  key: "bbb9c8ebe14b830b3a36",
  secret: "085c0087e9c7862c849f",
  cluster: "ap2",
  useTLS: true,
});

const { cartItems } = prisma;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const getUser = async (customer_id) => {
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
    return res
      .status(StatusCodes.NOT_FOUND)
      .send({ message: "User active cart not found" });
  }
  return {
    user,
  };
};

const getOrders = async (req, res, next) => {
  const { customer_id } = req.user;

  if (!customer_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: "Missing required fields" });
  }

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
      return res.status(StatusCodes.OK).send(orders);
    }
    return res.status(StatusCodes.OK).send([]);
  } catch (error) {
    next(error);
  }
};

const getOrder = async (req, res, next) => {
  const { orderId } = req.params;

  if (!orderId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Missing order id" });
  }

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
      return res.status(StatusCodes.OK).send(orderDetail);
    }
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "No order items found" });
  } catch (error) {
    next(error);
  }
};

const getOrdersCount = async (req, res, next) => {
  const { customer_id } = req.user;

  if (!customer_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .send({ message: "Missing required fields" });
  }

  try {
    const count = await prisma.orders.count({
      where: {
        customer_id,
      },
    });
    return res.status(StatusCodes.OK).send(count.toString());
  } catch (error) {
    next(error);
  }
};

// const webhook = async (req, res) => {
//   const event = req.body;
//   // Handle the event
//   switch (event.type) {
//     case "checkout.session.completed":
//       const data = event.data.object;
//     // await inngest.send({
//     //   name: "shop/order.created",
//     //   data: {
//     //     customer_id: data.metadata.customer_id,
//     //     total_amount: data.amount_total,
//     //   },
//     // });

//     // stripe.customers.retrieve(data.customer, async (err, customer) => {
//     //   if (err) {
//     //     console.log("stripe error :>> ", err);
//     //   } else {
//     //     try {

//     //       return res.status(200).end();
//     //       // const { customer_id } = customer.metadata;
//     //       // await prisma.$transaction(async (transaction) => {
//     //       //   const { user } = await getUser(customer_id);
//     //       //   const cartItems = user.carts[0].cart_items;

//     //       //   const order = await transaction.orders.create({
//     //       //     data: {
//     //       //       customer_id,
//     //       //       total_amount: data.amount_total / 100,
//     //       //       status: "pending",
//     //       //       address: user.address,
//     //       //     },
//     //       //   });

//     //       //   await transaction.orderItems.createMany({
//     //       //     data: cartItems.map((cartItem) => ({
//     //       //       order_id: order.order_id,
//     //       //       product_id: cartItem.product_id,
//     //       //       quantity: cartItem.quantity,
//     //       //       total_amount: cartItem.total_amount,
//     //       //     })),
//     //       //   });
//     //       //   await transaction.cartItems.deleteMany({
//     //       //     where: {
//     //       //       cart_item_id: {
//     //       //         in: cartItems.map((cartItem) => cartItem.cart_item_id),
//     //       //       },
//     //       //     },
//     //       //   });
//     //       //   await transaction.cart.update({
//     //       //     where: {
//     //       //       cart_id: user.carts[0].cart_id,
//     //       //     },
//     //       //     data: {
//     //       //       status: "completed",
//     //       //     },
//     //       //   });
//     //       //   console.log("order created successfully");
//     //       // });
//     //     } catch (error) {
//     //       console.error("error while creating order", error);
//     //       return res.status(500).send({ message: "Internal server error" });
//     //     }
//     //   }
//     // });
//     case "checkout.session.failed":
//       const paymentIntentFailed = event.data.object;
//       const { customer_id: cust_id } = paymentIntentFailed.metadata;
//       console.log("PaymentIntent was failed!", paymentIntentFailed);
//       return res.status(400).end();
//   }
// };

const webhook = async (req, res) => {
  const event = req.body;
  if (event.type === "checkout.session.completed") {
    const data = event.data.object;
    console.log("inside checkout session completed");
    stripe.customers
      .retrieve(data.customer)
      .then(async (customer) => {
        try {
          await inngest.send({
            name: "shop/order.created",
            data: {
              customer_id: customer.metadata.customer_id,
              total_amount: data.amount_total,
            },
          });
          console.log("called inngest event");
        } catch (err) {
          console.log(err);
        }
      })
      .catch((err) => console.log(err.message));
  }
  res.status(200).end();
};

const createCheckoutSession = async (req, res) => {
  const { customer_id } = req.body;

  if (!customer_id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Missing required fields" });
  }

  const { user } = await getUser(customer_id);
  const customer = await stripe.customers.create({
    metadata: {
      customer_id,
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

  return res.status(StatusCodes.OK).send({ url: session.url });
};

module.exports = {
  getOrder,
  getOrders,
  getOrdersCount,
  webhook,
  createCheckoutSession,
  getUser,
};
