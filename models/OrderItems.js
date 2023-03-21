const Sequelize = require("sequelize");
const uuid = require("uuid");
const Customer = require("./Customer");
const Orders = require("./Orders");
const Product = require("./Product");

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    dialect: "mysql",
  }
);

const OrderItem = sequelize.define(
  "orderItem",
  {
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    unitAmount: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
    }
  },
  {
    timestamps: true,
  }
);
Orders.hasMany(OrderItem)
OrderItem.belongsTo(Orders)
OrderItem.belongsTo(Product)
sequelize
  .sync()
  .then(() => console.log("Order item table created"))
  .catch((err) => console.log("error creating table", err));

module.exports = OrderItem;
