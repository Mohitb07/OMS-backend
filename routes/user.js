const express = require("express");
const auth = require("../middleware/auth");
const Customers = require("../models/index").Customers;
const Orders = require("../models/index").Orders;
const OrderItems = require("../models/index").OrderItems;

const router = new express.Router();

// get user info
router.get("/me", auth, async (req, res) => {
  return res.status(200).json(req.user);
});

router.get("/orders", auth, async (req, res) => {
  // get all the order of a user
  const { customer_id } = req.user;
  console.log('cus', customer_id)
  // SELECT * FROM orders WHERE userId = id;
  Customers.findByPk(customer_id, {
    include: {
      model: Orders,
      include: {
        model: OrderItems,
        as: 'orders_items',
      },
      as: 'orders'
    },
  })
    .then((customer) => {
      console.log("customer", customer);
      if(customer){
          const orders = customer.orders;
          console.log(orders);
          return res.status(200).send({ orders });
      }
      return res.status(404).send({message: "Not found "})
    })
    .catch((error) => {
      console.error(error);
    });
});

router.get("/cart", auth, async (req, res) => {
  // get all the order of a user
  const { id } = req.user;
  try {
    // SELECT * FROM cart WHERE userId = id;
  } catch (error) {
    W;
  }
});

module.exports = router;
