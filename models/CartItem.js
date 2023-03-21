const { Model, DataTypes, Sequelize } = require("sequelize");

import Product from "./Product";

const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE,
    process.env.MYSQL_USER,
    process.env.MYSQL_PASSWORD,
    {
      host: process.env.MYSQL_HOST,
      dialect: "mysql",
    }
  );

class CartItem extends Model {}

CartItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "CartItem",
  }
);

CartItem.belongsTo(Cart);
Cart.hasMany(CartItem);

CartItem.belongsTo(Product);
Product.hasMany(CartItem);

sequelize
  .sync()
  .then(() => console.log("Cart Item table created"))
  .catch((err) => console.log("error creating table", err));

module.exports = CartItem;