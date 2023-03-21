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

const Customers = sequelize.define(
  "customers",
  {
    customer_id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    username: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Please provide username",
        },
        notEmpty: {
          msg: "Please provide username",
        },
      },
    },
    phone: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    address: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Please provide address",
        },
        notEmpty: {
          msg: "Please provide address",
        },
      },
    },
    email: {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notNull: {
          msg: "Please provide email",
        },
        notEmpty: {
          msg: "Please provide email",
        },
        isEmail: {
          msg: "Please enter a valid email address",
        },
      },
    },
    password: {
      type: Sequelize.STRING,
      allowNull: false,
      validate: {
        notNull: {
          msg: "Please enter a password",
        },
        notEmpty: {
          msg: "Please enter a password",
        },
        len: {
          args: [8, Infinity],
          msg: "Password must be between 8 and 20 characters",
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Customers.hasMany(Orders, { as: 'orders' });

sequelize
  .sync()
  .then(() => console.log("customer table created"))
  .catch((err) => console.log("error creating table", err));

module.exports = Customers;
