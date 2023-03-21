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
const Products = sequelize.define(
  "products",
  {
    product_id: {
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
    description: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Please provide product description",
        },
        notEmpty: {
          msg: "Please provide product description",
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
    image_url: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Please provide product image url",
        },
        notEmpty: {
          msg: "Please provide product image url",
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

module.exports = Products;
