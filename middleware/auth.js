const Customer = require("../models/Customer");
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  // Extract the access token from the Authorization header
  const authHeader = req.headers.authorization;
  const accessToken = authHeader && authHeader.split(" ")[1];

  // Check if the access token is present
  if (!accessToken) {
    return res.status(401).json({ message: "Access token is missing" });
  }

  // Verify the access token
  jwt.verify(accessToken, 'my_secret', async (err, payload) => {
    if (err) {
      return res
        .status(401)
        .json({ message: "Access token is invalid or expired" });
    }

    // Check if the user still exists in the database
    const user = await Customer.findByPk(payload.userId);
    if (!user) {
      return res
        .status(401)
        .json({ message: "Access token is invalid or expired" });
    }

    // Store the user object in the request object for future use
    req.user = user;

    // Call the next middleware function
    next();
  });
};
