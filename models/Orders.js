const Sequelize = require("sequelize");
const uuid = require("uuid");
const Customer = require("./Customer");

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    dialect: "mysql",
  }
);

const Orders = sequelize.define(
  "orders",
  {
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    totalAmount: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);
Customer.hasMany(Orders, {foreignKey: 'user_id'})
Orders.belongsTo(Customer, {foreignKey: 'user_id'})

sequelize
  .sync()
  .then(() => console.log("Order table created"))
  .catch((err) => console.log("error creating table", err));

module.exports = Orders;
