const { getUser } = require("../controllers/orderController");
const { inngest } = require("./inngest");

const handleOrder = inngest.createFunction(
  { name: "Create order" },
  { event: "shop/order.created" },
  async ({ event, step, prisma }) => {
    console.log('triggering handleOrder')
    const customer_id = event.data.customer_id;
    await prisma.$transaction(async (transaction) => {
      const { user } = await getUser(customer_id);
      const cartItems = user.carts[0].cart_items;

      const order = await transaction.orders.create({
        data: {
          customer_id,
          total_amount: event.data.total_amount / 100,
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
    });
    console.log("order created successfully");
  }
);

module.exports = {
  handleOrder,
};
