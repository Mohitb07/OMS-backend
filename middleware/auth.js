// const Customers = require("../models/index").Customers;
const jwt = require("jsonwebtoken");

const prisma = require("../prismaClient");
const { StatusCodes } = require("http-status-codes");

module.exports = (req, res, next) => {
  // Extract the access token from the Authorization header
  const authHeader = req.headers.authorization;
  const accessToken = authHeader && authHeader.split(" ")[1];
  // Check if the access token is present
  if (!accessToken) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Access token is missing" });
  }

  // Verify the access token
  jwt.verify(accessToken, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Unauthorised please login to view the content" });
    }

    try {
      // Check if the user still exists in the database
      const user = await prisma.customer.findUnique({
        where: {
          customer_id: payload.userId,
        },
        select: {
          password: false,
          addresses: true,
          username: true,
          email: true,
          customer_id: true,
          cart: {
            select: {
              cart_id: true,
              status: false,
              customer_id: true,
              cart_items: true,
            },
          }
        },
      });
      // const user = await Customer.findByPk(payload.userId);
      if (!user) {
        return res
          .status(StatusCodes.FORBIDDEN)
          .json({ message: "Forbidden, please login to view the content" });
      }

      // Store the user object in the request object for future use
      req.user = user;

      // Call the next middleware function
      next();
    } catch (error) {
      next(error);
    }
  });
};
