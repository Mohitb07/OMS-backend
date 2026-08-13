const {
  Prisma: { PrismaClientKnownRequestError },
} = require("@prisma/client");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const ValidationError = require("../errors/ValidationError");
const UnauthorizedError = require("../errors/UnauthorizedError");
const { getRandomAvatar } = require("../services/getRandomAvatar");
const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  issueTokensForCustomers,
} = require("../lib/utils");

const REFRESH_REUSE_GRACE_MS = parseInt(
  process.env.REFRESH_REUSE_GRACE_MS || "10000",
  10,
);

function getRequestIpHash(req) {
  return req.ip ? hashRefreshToken(req.ip) : null;
}

function isSameRefreshClient(req, session) {
  const requestUserAgent = req.headers["user-agent"] || null;
  const requestIpHash = getRequestIpHash(req);

  return (
    (session.user_agent || null) === requestUserAgent &&
    (session.ip_address_hash || null) === requestIpHash
  );
}

function isRecentRefreshUse(session, now) {
  if (!session.lastUsedAt) return false;
  return now.getTime() - session.lastUsedAt.getTime() <= REFRESH_REUSE_GRACE_MS;
}

function sendRefreshAccessToken(res, customer, status = StatusCodes.OK) {
  const accessToken = generateAccessToken(customer);

  return res.status(status).json({
    accessToken,
    user: {
      id: customer.customer_id,
      email: customer.email,
      username: customer.username,
      avatar: customer.avatar,
    },
  });
}

async function rotateRefreshSession(req, res, session, customer, now, status) {
  const newRefreshTokenValue = generateRefreshToken();
  const newRefreshTokenHash = hashRefreshToken(newRefreshTokenValue);
  const newExpiresAt = new Date(
    now.getTime() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.customerSession.create({
    data: {
      customer_id: customer.customer_id,
      refresh_token_hash: newRefreshTokenHash,
      family_id: session.family_id,
      user_agent: req.headers["user-agent"] || session.user_agent,
      ip_address_hash: getRequestIpHash(req) || session.ip_address_hash,
      expiresAt: newExpiresAt,
      lastUsedAt: now,
    },
  });

  setRefreshTokenCookie(res, newRefreshTokenValue);

  return sendRefreshAccessToken(res, customer, status);
}

const login = async (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });

    throw new ValidationError("Missing required fields", result.array());
  }

  try {
    const user = await prisma.customer.findUnique({
      where: {
        email,
      },
      select: {
        password: true,
        username: true,
        email: true,
        customer_id: true,
        avatar: true,
      },
    });
    if (!user) {
      throw new UnauthorizedError("Invalid username or password");
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedError("Invalid username or password");
    }

    const { accessToken, user: customer } = await issueTokensForCustomers(
      user,
      req,
      res,
    );

    return res.status(StatusCodes.OK).json({
      accessToken,
      user: {
        id: customer.id,
        email: customer.email,
        username: customer.username,
        avatar: customer.avatar,
      },
    });
  } catch (error) {
    console.log("login error", error);
    next(error);
  }
};

const register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });

    throw new ValidationError("Missing required fields", result.array());
  }
  const salt = bcrypt.genSaltSync(10);
  const hashedPassword = bcrypt.hashSync(req.body.password, salt);
  const avatar = await getRandomAvatar();
  try {
    const user = await prisma.customer.create({
      data: {
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        avatar,
      },
    });
    const { accessToken, user: customer } = await issueTokensForCustomers(
      user,
      req,
      res,
    );

    return res.status(StatusCodes.CREATED).json({
      accessToken,
      user: {
        id: customer.id,
        email: customer.email,
        username: customer.username,
        avatar: customer.avatar,
      },
    });
  } catch (error) {
    console.log("new error", error.meta.target);
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.meta.target === "email") {
        throw new ValidationError("Email already exists", [
          { message: "Email already exists", property: "email" },
        ]);
      }
    }
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const refreshTokenValue = req.cookies?.refresh_token;
    if (!refreshTokenValue) {
      console.log("No refresh token cookie found");
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Not authenticated" });
    }

    const refreshTokenHash = hashRefreshToken(refreshTokenValue);
    const session = await prisma.customerSession.findUnique({
      where: {
        refresh_token_hash: refreshTokenHash,
      },
      include: {
        customer: true,
      },
    });

    if (!session) {
      console.log("No session found for this refresh token");
      clearRefreshTokenCookie(res);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Invalid refresh token" });
    }

    const now = new Date();

    if (session.expiresAt < now) {
      console.log("Refresh token expired");
      clearRefreshTokenCookie(res);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Refresh token expired" });
    }

    // A tiny same-client grace window prevents normal concurrent refreshes
    // from revoking the whole session family.
    if (session.revoked) {
      if (isSameRefreshClient(req, session) && isRecentRefreshUse(session, now)) {
        return rotateRefreshSession(
          req,
          res,
          session,
          session.customer,
          now,
          StatusCodes.OK,
        );
      }

      if (session.family_id) {
        await prisma.customerSession.updateMany({
          where: {
            family_id: session.family_id,
            revoked: false,
          },
          data: {
            revoked: true,
          },
        });
      }

      clearRefreshTokenCookie(res);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Refresh token reused / revoked" });
    }

    const claim = await prisma.customerSession.updateMany({
      where: {
        session_id: session.session_id,
        revoked: false,
      },
      data: {
        revoked: true,
        lastUsedAt: now,
      },
    });

    if (claim.count === 0) {
      const claimedSession = await prisma.customerSession.findUnique({
        where: {
          session_id: session.session_id,
        },
        include: {
          customer: true,
        },
      });

      if (
        claimedSession &&
        isSameRefreshClient(req, claimedSession) &&
        isRecentRefreshUse(claimedSession, now)
      ) {
        return rotateRefreshSession(
          req,
          res,
          claimedSession,
          claimedSession.customer,
          now,
          StatusCodes.OK,
        );
      }

      console.log(
        "Refresh token race detected - session already rotated:",
        session.session_id,
      );

      if (session.family_id) {
        await prisma.customerSession.updateMany({
          where: {
            family_id: session.family_id,
            revoked: false,
          },
          data: {
            revoked: true,
          },
        });
      }

      clearRefreshTokenCookie(res);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Refresh token reused / revoked" });
    }

    const customer = session.customer;

    return rotateRefreshSession(
      req,
      res,
      session,
      customer,
      now,
      StatusCodes.CREATED,
    );
  } catch (error) {
    console.log("refresh token error", error);
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshTokenValue = req.cookies?.refresh_token;

    if (refreshTokenValue) {
      const refreshTokenHash = hashRefreshToken(refreshTokenValue);

      await prisma.customerSession.updateMany({
        where: { refresh_token_hash: refreshTokenHash, revoked: false },
        data: {
          revoked: true,
          lastUsedAt: new Date(),
        },
      });
    }

    clearRefreshTokenCookie(res);

    return res.status(StatusCodes.OK).json({ message: "Logged out" });
  } catch (error) {
    console.log("logout error", error);
    next(error);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    const userId = req.user?.customer_id ?? req.user?.id; // set by auth middleware
    console.log("req.user", req.user);
    console.log("logout all for userId", userId);
    if (!userId) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Not authenticated" });
    }

    await prisma.customerSession.updateMany({
      where: { customer_id: userId, revoked: false },
      data: {
        revoked: true,
        lastUsedAt: new Date(),
      },
    });

    clearRefreshTokenCookie(res);

    return res.json({ message: "Logged out from all devices" });
  } catch (error) {
    console.log("logout all error", error);
    next(error);
  }
};

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  logoutAll,
};
