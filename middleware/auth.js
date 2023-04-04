// const Customers = require("../models/index").Customers;
const prisma = require('../prisma');

const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  // Extract the access token from the Authorization header
  const authHeader = req.headers.authorization;
  const accessToken = authHeader && authHeader.split(" ")[1];

  // Check if the access token is present
  if (!accessToken) {
    return res.status(401).json({ message: "Access token is missing" });
  }

  // Verify the access token
  jwt.verify(accessToken, process.env.JWT_SECRET, async (err, payload) => {
    if (err) {
      return res
        .status(401)
        .json({ message: "Unauthorised please login to view the content" });
    }

    // Check if the user still exists in the database
    const user = await prisma.customers.findUnique({
      where: {
        customer_id: payload.userId,
      },
      select: {
        password: false
      }
    });
    // const user = await Customer.findByPk(payload.userId);
    if (!user) {
      return res
        .status(401)
        .json({ message: "Unauthorised please login to view the content" });
    }

    // Store the user object in the request object for future use
    req.user = user;

    // Call the next middleware function
    next();
  });
};
