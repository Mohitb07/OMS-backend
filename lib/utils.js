const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../prismaClient");

const ACCESS_TOKEN_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_EXPIRES_IN_DAYS = parseInt(
  process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || "14",
  10,
);

function generateAccessToken(user) {
  const payload = {
    sub: user.customer_id,
    email: user.email,
    username: user.username,
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  });
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString("hex"); // 128-char random string
}

function hashRefreshToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function setRefreshTokenCookie(res, token) {
  const maxAgeMs = REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000;
  const isProduction = process.env.NODE_ENV === "production";

  // sameSite: "lax" works in all browsers including Safari (ITP).
  // "none" is only needed for true cross-origin cookie flows, but since the
  // browser always hits the Next.js /api proxy (same origin), "lax" is correct.
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeMs,
  });
}

function clearRefreshTokenCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";

  // Must exactly match the attributes used in setRefreshTokenCookie.
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
  });
}

async function issueTokensForCustomers(user, req, res) {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashRefreshToken(refreshToken);

  const now = new Date();

  const refreshExpiresAt = new Date(
    now.getTime() + REFRESH_TOKEN_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  );

  const familyId = crypto.randomUUID();
  await prisma.customerSession.create({
    data: {
      customer_id: user.customer_id,
      refresh_token_hash: refreshTokenHash,
      family_id: familyId,
      user_agent: req.headers["user-agent"] || null,
      ip_address_hash: req.ip ? hashRefreshToken(req.ip) : null,
      expiresAt: refreshExpiresAt,
    },
  });
  setRefreshTokenCookie(res, refreshToken);

  return {
    accessToken,
    user: {
      id: user.customer_id,
      email: user.email,
      username: user.username,
      avatar: user.avatar,
    },
  };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  issueTokensForCustomers,
  REFRESH_TOKEN_EXPIRES_IN_DAYS,
};
