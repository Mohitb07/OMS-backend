require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");

const connection = require("./config/database");
const prisma = require("./prismaClient");
const auth = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 3000;

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

connection.connect(function (err) {
  if (err) {
    console.error(
      "Error connecting to MySQL database: " + process.env.MYSQLPORT + err
    );
    return;
  }
  console.log("Connected to MySQL database.");
});

app.get("/config", (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  });
});

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

app.use(authRoutes);
app.use(userRoutes);
app.use(productRoutes);
app.use(cartRoutes);
app.use(orderRoutes);

app.post("/webhook", async (req, res) => {
  const event = req.body;
  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      console.log("PaymentIntent was successful!");
      console.log(paymentIntent);
      const total_order_amount = paymentIntent.amount;
      const { customer_id } = paymentIntent.metadata;
      const { user } = await calculateOrderAmount(customer_id);
      const cartItems = user.carts[0].cart_items;

      const order = await prisma.orders.create({
        data: {
          customer_id,
          total_amount: total_order_amount / 100,
          status: "pending",
          address: user.address,
        },
      });

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
      // Then define and call a method to handle the successful payment intent.
      // handlePaymentIntentSucceeded(paymentIntent);
      break;
    case "payment_intent.payment_failed":
      const paymentIntentFailed = event.data.object;
      console.log("PaymentIntent was failed!");
      console.log(paymentIntentFailed);
      // Then define and call a method to handle the successful payment intent.
      // handlePaymentIntentSucceeded(paymentIntent);
      break;
    default:
      // Unexpected event type
      console.log(`Unhandled event type ${event.type}`);
  }
});

app.post("/create-payment-intent", auth, async (req, res) => {
  try {
    const { customer_id } = req.user;
    const { total_order_amount } = await calculateOrderAmount(customer_id);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total_order_amount * 100,
      currency: "inr",
      payment_method_types: ["card"],
      // automatic_payment_methods: { enabled: true },
    });

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
});

app.listen(PORT, () => {
  console.log(`listening to ${PORT}`);
});
