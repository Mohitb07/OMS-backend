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
const Product = sequelize.define(
  "product",
  {
    id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Please provide product name",
        },
        notEmpty: {
          msg: "Please provide product name",
        },
      },
    },
    detail: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Please provide product name",
        },
        notEmpty: {
          msg: "Please provide product name",
        },
      },
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        notNull: {
          msg: "Please provide product price",
        },
        notEmpty: {
          msg: "Please provide product price",
        },
      },
    },
    imageURL: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Please provide product price",
        },
        notEmpty: {
          msg: "Please provide product price",
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

sequelize
  .sync()
  .then(() => console.log("product table created"))
  .catch((err) => console.log("error creating table", err));

module.exports = Product;
