const Sequelize = require("sequelize");
const uuid = require("uuid");

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    dialect: "mysql",
  }
);

const OrderItems = sequelize.define(
  "order_items",
  {
    order_item_id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    unit_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    // order_id: {
    //   type: Sequelize.STRING,
    //   allowNull: false,
    //   references: {
    //     model: Orders,
    //     key: "order_id",
    //   },
    // },
    // product_id: {
    //   type: Sequelize.STRING,
    //   allowNull: false,
    //   references: {
    //     model: Products,
    //     key: "product_id",
    //   },
    // },
  },
  {
    timestamps: true,
  }
);


// OrderItems.associate = (models) => {
//   OrderItems.belongsTo(Orders)
//   OrderItems.belongsTo(Products)
// };
// OrderItems.associate = (models) => {
//   OrderItems.belongsTo(models.orders, {as: 'Orders', foreignKey: 'order_id'});
//   OrderItems.belongsTo(models.products, {as: 'Products', foreignKey: 'product_id'});
// };

sequelize
  .sync()
  .then(() => console.log("Order item table created"))
  .catch((err) => console.log("error creating table", err));

module.exports = OrderItems;
