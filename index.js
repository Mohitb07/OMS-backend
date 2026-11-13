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
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adminProductRoutes = require("./routes/adminProductRoutes");
const adminUserRoutes = require("./routes/adminUserRoutes");
const corsConfig = require("./config/corsConfig");
const errorHandler = require("./middleware/globalErrorHandler");

const prisma = require("./prismaClient");

const app = express();
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}
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
app.use("/admin/auth", adminAuthRoutes);
app.use("/admin", adminProductRoutes);
app.use("/admin", adminUserRoutes);
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

/**
 * Cleanup Job: Delete unverified customer accounts older than 24 hours.
 *
 * Unverified accounts are created when a user registers but never completes
 * OTP verification. Left unchecked they accumulate and can be used to squat
 * on email addresses. This job runs every hour and purges stale records.
 *
 * Safe to re-register with the same email after cleanup.
 */
const UNVERIFIED_ACCOUNT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // run every 1 hour

async function cleanupUnverifiedCustomers() {
  const cutoff = new Date(Date.now() - UNVERIFIED_ACCOUNT_TTL_MS);
  try {
    const result = await prisma.customer.deleteMany({
      where: {
        isVerified: false,
        createdAt: { lt: cutoff },
      },
    });
    if (result.count > 0) {
      console.log(`[cleanup] Deleted ${result.count} unverified customer account(s) older than 24h.`);
    }
  } catch (err) {
    console.error("[cleanup] Failed to clean up unverified customers:", err);
  }
}

// Run once on startup, then every hour
cleanupUnverifiedCustomers();
setInterval(cleanupUnverifiedCustomers, CLEANUP_INTERVAL_MS);

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});
