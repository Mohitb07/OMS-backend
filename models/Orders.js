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

const Orders = sequelize.define(
  "orders",
  {
    order_id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    total_amount: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    status: Sequelize.ENUM("pending", "processing", "shipped", "delivered"),
  },
  {
    timestamps: true,
  }
);

// Orders.hasMany(OrderItems, { as: 'orders_items' });
// Orders.associate = (models) => {
//   Orders.belongsTo(Customers);
// };

sequelize
  .sync()
  .then(() => console.log("Orders table created"))
  .catch((err) => console.log("error creating table", err));

module.exports = Orders;
