// const { Sequelize } = require("sequelize");
// const uuid = require("uuid");
// const Customers = require("./Customer");
// const CartItems = require("./CartItem");

// const sequelize = new Sequelize(
//   process.env.MYSQL_DATABASE,
//   process.env.MYSQL_USER,
//   process.env.MYSQL_PASSWORD,
//   {
//     host: process.env.MYSQL_HOST,
//     dialect: "mysql",
//   }
// );

// const Carts = sequelize.define("carts", {
//   cart_id: {
//     type: Sequelize.INTEGER,
//     primaryKey: true,
//     defaultValue: uuid.v4,
//   },
//   // status: Sequelize.ENUM("active", "abandoned", "completed"),
//   // customer_id: {
//   //   type: Sequelize.STRING,
//   //   allowNull: false,
//   //   references: {
//   //     model: Customers,
//   //     key: "customer_id",
//   //   },
//   // },
//   // cart_item_id: {
//   //   type: Sequelize.STRING,
//   //   allowNull: false,
//   //   references: {
//   //     model: CartItems,
//   //     key: "cart_item_id",
//   //   },
//   // },
// }, {
//   timestamps: true,
// });

// Carts.hasMany(CartItems, {as: 'cart_items'})
// Carts.associate = (models) => {
//   Carts.belongsTo(Customers);
// };

// // Carts.associate = (models) => {
// //   Carts.belongsTo(models.customers, {
// //     as: "Customer",
// //     foreignKey: "customer_id",
// //   });
// //   Carts.hasMany(models.cart_items, {
// //     as: "CartItem",
// //     foreignKey: "cart_item_id",
// //   });
// // };

// sequelize
//   .sync()
//   .then(() => console.log("Carts table created"))
//   .catch((err) => console.log("error creating table", err));

// module.exports = Carts;
