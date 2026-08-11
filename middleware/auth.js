// const Customers = require("../models/index").Customers;
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");
const { StatusCodes } = require("http-status-codes");
const UnauthorizedError = require("../errors/UnauthorizedError");

module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log("Auth middleware - authHeader:", authHeader);
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing Authorization header" });
  }

  const token = authHeader.substring("Bearer ".length);

  // console.log("Auth middleware - token:", token);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // attach to req
    req.user = {
      id: decoded.sub,
      customer_id: decoded.sub,
      email: decoded.email,
      username: decoded.username,
    };
    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "ACCESS_TOKEN_EXPIRED" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
};
