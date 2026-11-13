const {
  Prisma: { PrismaClientKnownRequestError },
} = require("@prisma/client");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const ValidationError = require("../errors/ValidationError");
const UnauthorizedError = require("../errors/UnauthorizedError");
const ForbiddenError = require("../errors/ForbiddenError");
const BadRequestError = require("../errors/BadRequestError");
const { getRandomAvatar } = require("../services/getRandomAvatar");
const { sendCustomerOtpEmail } = require("../services/emailService");
const {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  issueTokensForCustomers,
} = require("../lib/utils");

/** Generates a cryptographically random 6-digit numeric OTP string. */
function generateOtp() {
  // Use crypto for randomness rather than Math.random()
  const buf = crypto.randomInt(100000, 999999);
  return buf.toString();
}


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

  // Atomically revoke the current session and create the new rotated session.
  // Without a transaction, a crash between these two ops would permanently
  // log the user out (old token revoked, new token never issued).
  await prisma.$transaction(async (tx) => {
    await tx.customerSession.updateMany({
      where: {
        session_id: session.session_id,
        revoked: false,
      },
      data: {
        revoked: true,
        lastUsedAt: now,
      },
    });

    await tx.customerSession.create({
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
      where: { email },
      select: {
        password: true,
        username: true,
        email: true,
        customer_id: true,
        avatar: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid username or password");
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      throw new UnauthorizedError("Invalid username or password");
    }

    // Block login until the customer has verified their email.
    if (!user.isVerified) {
      throw new ForbiddenError(
        "Please verify your email before logging in. Check your inbox for the OTP or request a new one."
      );
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
    // Generate a cryptographically random 6-digit OTP and hash it.
    // Only the hash is stored in the DB; the plaintext OTP is emailed.
    const otp = generateOtp();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create the customer with isVerified=false and the OTP fields.
    // No session is created here — tokens are only issued after OTP verification.
    // NOTE: customer.create + OTP fields are one atomic write (single DB call),
    // so there is no gap where a customer exists without an OTP hash.
    let newUser;
    try {
      newUser = await prisma.customer.create({
        data: {
          email: req.body.email,
          username: req.body.username,
          password: hashedPassword,
          avatar,
          isVerified: false,
          verificationOtpHash: otpHash,
          verificationOtpExpires: otpExpires,
          lastVerificationOtpSentAt: new Date(),
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.meta?.target === "email") {
        throw new ValidationError("Email already exists", [
          { message: "Email already exists", property: "email" },
        ]);
      }
      throw error;
    }

    // Send the OTP email after the DB commit. Failures are logged but do NOT
    // roll back the registration — the user can use /resend-otp if needed.
    try {
      await sendCustomerOtpEmail({
        toEmail: newUser.email,
        otp,
        username: newUser.username,
      });
    } catch (emailErr) {
      console.error("[auth] Failed to send OTP email on register:", emailErr);
    }

    return res.status(StatusCodes.CREATED).json({
      requiresVerification: true,
      email: newUser.email,
      message:
        "Registration successful! We've sent a 6-digit verification code to your email. Please enter it to activate your account.",
    });
  } catch (error) {
    console.log("register error:", error);
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

    // Note: rotateRefreshSession now handles the atomic revoke+create internally.
    // The pre-claim updateMany below is kept as a "first writer wins" optimistic
    // lock to detect concurrent refresh races before calling rotate.
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

/**
 * POST /auth/verify-otp
 * Verifies the 6-digit OTP sent to the customer's email on registration.
 * On success: marks customer as verified and issues access + refresh tokens.
 */
const verifyOtp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { email, otp } = req.body;

  try {
    // Hash the incoming OTP before DB lookup — we never store plaintext OTPs.
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const customer = await prisma.customer.findFirst({
      where: {
        email,
        verificationOtpHash: otpHash,
        verificationOtpExpires: { gt: new Date() }, // must not be expired
      },
    });

    if (!customer) {
      throw new BadRequestError("Invalid or expired OTP. Please check the code and try again.");
    }

    if (customer.isVerified) {
      throw new BadRequestError("This account is already verified. You can log in.");
    }

    // Atomically mark verified + clear OTP fields (single-use enforcement)
    const verifiedCustomer = await prisma.customer.update({
      where: { customer_id: customer.customer_id },
      data: {
        isVerified: true,
        verificationOtpHash: null,
        verificationOtpExpires: null,
        lastVerificationOtpSentAt: null,
      },
    });

    // First token issuance — only happens after successful verification
    const { accessToken, user } = await issueTokensForCustomers(
      verifiedCustomer,
      req,
      res,
    );

    return res.status(StatusCodes.OK).json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.log("verifyOtp error:", error);
    next(error);
  }
};

/**
 * POST /auth/resend-otp
 * Resends the verification OTP with a 60-second cooldown.
 * Always returns a generic response to prevent email enumeration.
 */
const resendOtp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { email } = req.body;

  try {
    const customer = await prisma.customer.findUnique({ where: { email } });

    // Return generic response if customer doesn't exist or is already verified
    // to prevent email enumeration attacks.
    if (!customer || customer.isVerified) {
      return res.status(StatusCodes.OK).json({
        message: "If an unverified account with that email exists, a new OTP has been sent.",
      });
    }

    // Enforce 60-second resend cooldown
    const COOLDOWN_SECONDS = 60;
    if (customer.lastVerificationOtpSentAt) {
      const elapsed =
        (Date.now() - new Date(customer.lastVerificationOtpSentAt).getTime()) / 1000;
      if (elapsed < COOLDOWN_SECONDS) {
        const waitTime = Math.ceil(COOLDOWN_SECONDS - elapsed);
        throw new BadRequestError(
          `Please wait ${waitTime} second${waitTime !== 1 ? "s" : ""} before requesting a new OTP.`
        );
      }
    }

    // Generate fresh OTP — this invalidates the previous one (new hash replaces old)
    const otp = generateOtp();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.customer.update({
      where: { customer_id: customer.customer_id },
      data: {
        verificationOtpHash: otpHash,
        verificationOtpExpires: otpExpires,
        lastVerificationOtpSentAt: new Date(),
      },
    });

    // Send the new OTP — failures are logged, not surfaced as errors
    try {
      await sendCustomerOtpEmail({
        toEmail: customer.email,
        otp,
        username: customer.username,
      });
    } catch (emailErr) {
      console.error("[auth] Failed to send OTP email on resend:", emailErr);
    }

    return res.status(StatusCodes.OK).json({
      message: "If an unverified account with that email exists, a new OTP has been sent.",
    });
  } catch (error) {
    console.log("resendOtp error:", error);
    next(error);
  }
};

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  logoutAll,
  verifyOtp,
  resendOtp,
};
