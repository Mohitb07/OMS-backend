const { Model, DataTypes, Sequelize } = require("sequelize");
const uuid = require("uuid");
const Customer = require('./Customer')
const CartItem = require('./CartItem')

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    dialect: "mysql",
  }
);

class Cart extends Model {}

Cart.init(
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
  },
  {
    sequelize,
    modelName: "cart",
  }
);

Cart.belongsTo(Customer);
Customer.hasMany(Cart);

Cart.hasMany(CartItem);
CartItem.belongsTo(Cart);
