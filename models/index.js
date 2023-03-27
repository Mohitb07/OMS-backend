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

const Orders = sequelize.define(
  "orders",
  {
    order_id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    address: {
      type: Sequelize.STRING,
    },
    total_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    status: Sequelize.ENUM("pending", "processing", "shipped", "delivered"),
    customer_id: {
      type: Sequelize.STRING,
      references: {
        model: "customers",
        key: "customer_id",
      },
      allowNull: false,
    },
  },
  {
    timestamps: true,
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
    total_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    order_id: {
      type: Sequelize.STRING,
      references: {
        model: "orders",
        key: "order_id",
      },
      allowNull: false,
    },
    product_id: {
      type: Sequelize.STRING,
      references: {
        model: "products",
        key: "product_id",
      },
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

const Carts = sequelize.define(
  "carts",
  {
    cart_id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    status: Sequelize.ENUM("active", "completed"),
    customer_id: {
      type: Sequelize.STRING,
      references: {
        model: "customers",
        key: "customer_id",
      },
      allowNull: false,
    },
  },
  {
    timestamps: true,
  }
);

const CartItems = sequelize.define(
  "cart_items",
  {
    cart_item_id: {
      type: Sequelize.STRING,
      primaryKey: true,
      defaultValue: uuid.v4,
    },
    quantity: Sequelize.INTEGER,
    total_amount: Sequelize.DECIMAL(10, 2),
    cart_id: {
      type: Sequelize.STRING,
      allowNull: false,
      references: {
        model: "carts",
        key: "cart_id",
      },
    },
    product_id: {
      type: Sequelize.STRING,
      allowNull: false,
      references: {
        model: "products",
        key: "product_id",
      },
    },
  },
  {
    timestamps: true,
  }
);

const associate = () => {
  Customers.hasMany(Orders, { foreignKey: "customer_id" });
  Orders.belongsTo(Customers, { foreignKey: "customer_id" });

  Orders.hasMany(OrderItems, { foreignKey: "order_id" });
  OrderItems.belongsTo(Orders, { foreignKey: "order_id" });

  Products.hasMany(OrderItems, { foreignKey: "product_id" });
  OrderItems.belongsTo(Products, { foreignKey: "product_id" });

  Customers.hasOne(Carts, { foreignKey: "customer_id" });
  Carts.belongsTo(Customers, { foreignKey: "customer_id" });

  Carts.hasMany(CartItems, { foreignKey: "cart_id" });
  CartItems.belongsTo(Carts, { foreignKey: "cart_id" });

  Products.hasMany(CartItems, { foreignKey: "product_id" });
  CartItems.belongsTo(Products, { foreignKey: "product_id" });
};

sequelize
  .sync()
  .then(() => associate())
  .catch((error) => console.log(error));

module.exports = {
  Customers,
  Products,
  Orders,
  OrderItems,
  Carts,
  CartItems,
};
