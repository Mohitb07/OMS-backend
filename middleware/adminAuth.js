const jwt = require("jsonwebtoken");
const UnauthorizedError = require("../errors/UnauthorizedError");
const ForbiddenError = require("../errors/ForbiddenError");

module.exports = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authHeader.substring("Bearer ".length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "admin" || !["ADMIN", "SUPERADMIN"].includes(decoded.role)) {
      throw new ForbiddenError("Access denied: Admin role required");
    }

    req.admin = {
      id: decoded.sub,
      admin_id: decoded.sub,
      email: decoded.email,
      username: decoded.username,
      role: decoded.role,
    };
    req.user = req.admin;
    next();
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof UnauthorizedError) {
      throw err;
    }
    if (err.name === "TokenExpiredError") {
      throw new UnauthorizedError("Admin token expired");
    }
    throw new UnauthorizedError("Invalid admin token");
  }
};
