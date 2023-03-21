const Customers = require("./Customer");
const Products = require("./Product");
const Orders = require("./Orders");
const OrderItems = require("./OrderItems");

Customers.hasMany(Orders, { as: "orders" });

Orders.hasMany(OrderItems, { as: "orders_items" });
Orders.associate = (models) => {
  Orders.belongsTo(Customers);
};

OrderItems.associate = (models) => {
  OrderItems.belongsTo(Orders, { foreignKey: "order_id" });
  OrderItems.belongsTo(Products);
};

module.exports = {
  Customers,
  Products,
  Orders,
  OrderItems,
};
