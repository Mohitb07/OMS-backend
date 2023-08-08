require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { serve } = require("inngest/express");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const corsConfig = require("./config/corsConfig");
const connection = require("./config/database");
const { inngest } = require("./services/inngest");
const { handleOrder } = require("./services/handleOrder");

const app = express();
const PORT = process.env.PORT || 3000;
const env = process.env.NODE_ENV || "development";
const corsOptions = corsConfig[env];

const options = {
  signingKey:
    "signkey-prod-d1e105562a7218bf5c6f69865e2a1c60bd46580ab974628c06bc3091fd1ffeaa",
};

app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/api/inngest", serve(inngest, [handleOrder]), options);

connection.connect(function (err) {
  if (err) {
    console.error("Error connecting to MySQL database: ");
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
