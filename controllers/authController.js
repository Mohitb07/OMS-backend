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

    // expired?
    if (session.expiresAt < new Date()) {
      console.log("Refresh token expired");
      clearRefreshTokenCookie(res);
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ message: "Refresh token expired" });
    }

    // Token reuse detection – token already revoked but still used
    if (session.revoked) {
      // Revoke entire session family to lock out potential attacker
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
    const now = new Date();

    // Atomically claim this refresh token: only succeeds if it's still
    // unrevoked at the moment this runs. If two concurrent requests race
    // here, only one of them will get count === 1 — the other gets 0 and
    // is treated as reuse instead of both proceeding to create sessions.
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
      // Lost the race — someone/something else already rotated this
      // token a moment ago. Treat as reuse and lock the family.
      console.log(
        "Refresh token race detected — session already rotated:",
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

    // Only the request that actually claimed the token gets here —
    // safe to rotate: create new refresh token + session
    const newRefreshTokenValue = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshTokenValue);

    const newExpiresAt = new Date(
      now.getTime() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
    );

    // Create new rotated session
    await prisma.customerSession.create({
      data: {
        customer_id: customer.customer_id,
        refresh_token_hash: newRefreshTokenHash,
        family_id: session.family_id,
        user_agent: req.headers["user-agent"] || session.user_agent,
        ip_address_hash: req.ip
          ? hashRefreshToken(req.ip)
          : session.ip_address_hash,
        expiresAt: newExpiresAt,
        lastUsedAt: now,
      },
    });

    const newAccessToken = generateAccessToken(customer);
    setRefreshTokenCookie(res, newRefreshTokenValue);

    return res.status(StatusCodes.CREATED).json({
      accessToken: newAccessToken,
      user: {
        id: customer.customer_id,
        email: customer.email,
        username: customer.username,
        avatar: customer.avatar,
      },
    });
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
