// const { Model, DataTypes, Sequelize } = require("sequelize");

// import Carts from "./Cart";
// import Products from "./Product";

// const sequelize = new Sequelize(
//   process.env.MYSQL_DATABASE,
//   process.env.MYSQL_USER,
//   process.env.MYSQL_PASSWORD,
//   {
//     host: process.env.MYSQL_HOST,
//     dialect: "mysql",
//   }
// );

// const CartItems = sequelize.define("cart_items", {
//   cart_item_id: {
//     type: Sequelize.INTEGER,
//     primaryKey: true,
//   },
//   quantity: Sequelize.INTEGER,
//   unit_amount: Sequelize.DECIMAL(10, 2),
//   // cart_id: {
//   //   type: Sequelize.STRING,
//   //   allowNull: false,
//   //   references: {
//   //     model: Carts,
//   //     key: "cart_id",
//   //   },
//   // },
//   // product_id: {
//   //   type: Sequelize.STRING,
//   //   allowNull: false,
//   //   references: {
//   //     model: Products,
//   //     key: "product_id",
//   //   },
//   // },
// }, {
//   timestamps: true
// });

// CartItems.associate = (models) => {
//   CartItems.belongsTo(Carts)
//   CartItems.belongsTo(Products)
// };

// // Carts.associate = (models) => {
// //   Carts.belongsTo(models.cart, {
// //     as: "Cart",
// //     foreignKey: "cart_id",
// //   });
// //   Carts.belongsTo(models.products, {
// //     as: "Products",
// //     foreignKey: "product_id",
// //   });
// // };
// sequelize
//   .sync()
//   .then(() => console.log("Cart Item table created"))
//   .catch((err) => console.log("error creating table", err));

// module.exports = CartItems;
