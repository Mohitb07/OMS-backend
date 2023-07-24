require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const corsConfig = require("./config/corsConfig");
const connection = require("./config/database");

const app = express();
const PORT = process.env.PORT || 3000;
const env = process.env.NODE_ENV || "development";
const corsOptions = corsConfig[env];

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

connection.connect(function (err) {
  if (err) {
    console.error(
      "Error connecting to MySQL database: " + process.env.MYSQLPORT + err
    );
    return;
  }
  console.log("Connected to MySQL database.");
});

app.use(authRoutes);
app.use(userRoutes);
app.use(productRoutes);
app.use(cartRoutes);
app.use(orderRoutes);

app.listen(PORT, () => {
  console.log(`listening to ${PORT}`);
});
