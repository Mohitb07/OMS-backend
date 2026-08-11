const dotenv = require("dotenv");

if (process.env.NODE_ENV === "production") {
  dotenv.config({ path: ".env.production" });
} else {
  dotenv.config();
}

const express = require("express");
require("express-async-errors");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const { StatusCodes } = require("http-status-codes");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/userRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const corsConfig = require("./config/corsConfig");
const errorHandler = require("./middleware/globalErrorHandler");

const prisma = require("./prismaClient");

const app = express();
const PORT = process.env.PORT || 3000;
const env = process.env.NODE_ENV || "development";
const corsOptions = corsConfig[env];

app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan("combined"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());


app.use("/auth", authRoutes);
app.use(userRoutes);
app.use(productRoutes);
app.use(cartRoutes);
app.use(orderRoutes);
app.use(addressRoutes);
app.use("/api/healthcheck", (req, res) => {
  res.status(StatusCodes.OK).json({ message: "Server is running" });
});
app.use(errorHandler);

// app.use((err, req, res, next) => {
//   console.error(err.stack); // Log the stack trace

//   const statusCode = err.status || StatusCodes.INTERNAL_SERVER_ERROR;
//   const message = err.message || "An unexpected error occurred";

//   res.status(statusCode).json({ message });
// });

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  try {
    await prisma.$connect();
    console.log("Connected to MySQL database.");
  } catch (error) {
    console.error("Error connecting to MySQL database: ", error);
  }
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
