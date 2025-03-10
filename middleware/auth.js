// const Customers = require("../models/index").Customers;
const jwt = require("jsonwebtoken");
const prisma = require("../prismaClient");
const { StatusCodes } = require("http-status-codes");
const UnauthorizedError = require("../errors/UnauthorizedError");

module.exports = (req, res, next) => {
  // Extract the access token from the Authorization header
  const authHeader = req.headers.authorization;
  const accessToken = authHeader && authHeader.split(" ")[1];
  // Check if the access token is present
  if (!accessToken) {
    throw new UnauthorizedError("Unauthorised, token missing");
  }

  // Verify the access token
  jwt.verify(accessToken, process.env.JWT_SECRET, async (err, payload) => {
    try {
      if (err) {
        throw new UnauthorizedError(
          "Token is invalid, please login to get a new token"
        );
      }
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
          },
        },
      });
      // const user = await Customer.findByPk(payload.userId);
      if (!user) {
        throw new UnauthorizedError("User does not exist");
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
