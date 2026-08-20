const crypto = require("crypto");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const { StatusCodes } = require("http-status-codes");
const prisma = require("../prismaClient");
const ValidationError = require("../errors/ValidationError");
const UnauthorizedError = require("../errors/UnauthorizedError");
const ForbiddenError = require("../errors/ForbiddenError");
const BadRequestError = require("../errors/BadRequestError");
const {
  sendAdminPasswordResetEmail,
  sendAdminVerificationEmail,
} = require("../services/emailService");

const register = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { username, email, password, role } = req.body;

  const existingAdmin = await prisma.admin.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    throw new BadRequestError("Admin with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const adminRole = role === "SUPERADMIN" ? "SUPERADMIN" : "ADMIN";

  // Generate verification token (24-hour expiration)
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const admin = await prisma.admin.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role: adminRole,
      isVerified: false,
      verificationToken: hashedToken,
      verificationExpires: expiresAt,
      lastVerificationSentAt: new Date(),
    },
  });

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const verificationUrl = `${clientUrl}/admin/verify-email?token=${rawToken}&email=${encodeURIComponent(admin.email)}`;

  // Send verification email via Nodemailer
  await sendAdminVerificationEmail({
    toEmail: admin.email,
    verificationUrl,
    adminName: admin.username,
  });

  return res.status(StatusCodes.CREATED).json({
    message: "Registration successful! Please check your email to verify and activate your account.",
    admin: {
      id: admin.admin_id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      isVerified: admin.isVerified,
    },
  });
};

const verifyEmail = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { token, email } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const admin = await prisma.admin.findFirst({
    where: {
      email,
      verificationToken: hashedToken,
      verificationExpires: {
        gt: new Date(),
      },
    },
  });

  if (!admin) {
    throw new BadRequestError("Invalid or expired email verification link.");
  }

  await prisma.admin.update({
    where: { admin_id: admin.admin_id },
    data: {
      isVerified: true,
      verificationToken: null,
      verificationExpires: null,
    },
  });

  return res.status(StatusCodes.OK).json({
    message: "Email verified successfully! Your account is now active. You can log in.",
  });
};

const resendVerificationEmail = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { email } = req.body;

  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  // If admin doesn't exist or is already verified, return generic response to prevent email enumeration
  if (!admin || admin.isVerified) {
    return res.status(StatusCodes.OK).json({
      message: "If an unverified account with that email exists, a verification link has been sent.",
    });
  }

  // Anti-spam security: Enforce a 2-minute cooldown between resend requests
  const COOLDOWN_SECONDS = 120;
  if (admin.lastVerificationSentAt) {
    const elapsedSeconds = (Date.now() - new Date(admin.lastVerificationSentAt).getTime()) / 1000;
    if (elapsedSeconds < COOLDOWN_SECONDS) {
      const waitTime = Math.ceil(COOLDOWN_SECONDS - elapsedSeconds);
      throw new BadRequestError(`Please wait ${waitTime} seconds before requesting another verification email.`);
    }
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.admin.update({
    where: { admin_id: admin.admin_id },
    data: {
      verificationToken: hashedToken,
      verificationExpires: expiresAt,
      lastVerificationSentAt: new Date(),
    },
  });

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const verificationUrl = `${clientUrl}/admin/verify-email?token=${rawToken}&email=${encodeURIComponent(admin.email)}`;

  await sendAdminVerificationEmail({
    toEmail: admin.email,
    verificationUrl,
    adminName: admin.username,
  });

  return res.status(StatusCodes.OK).json({
    message: "If an unverified account with that email exists, a verification link has been sent.",
  });
};

const login = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { email, password } = req.body;

  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (!admin) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  // Account verification guard
  if (!admin.isVerified) {
    throw new ForbiddenError(
      "Please verify your email before logging in. Check your inbox for the activation link or request a new one."
    );
  }

  const token = jwt.sign(
    {
      sub: admin.admin_id,
      email: admin.email,
      username: admin.username,
      role: admin.role,
      type: "admin",
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ADMIN_TOKEN_EXPIRES_IN || "8h" }
  );

  return res.status(StatusCodes.OK).json({
    message: "Admin logged in successfully",
    token,
    admin: {
      id: admin.admin_id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
    },
  });
};

const getProfile = async (req, res, next) => {
  const admin = await prisma.admin.findUnique({
    where: { admin_id: req.admin.id },
    select: {
      admin_id: true,
      username: true,
      email: true,
      role: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!admin) {
    throw new UnauthorizedError("Admin not found");
  }

  return res.status(StatusCodes.OK).json({ admin });
};

const forgotPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { email } = req.body;

  const admin = await prisma.admin.findUnique({
    where: { email },
  });

  // Always return success message even if admin does not exist to prevent enumeration attacks
  if (!admin) {
    return res.status(StatusCodes.OK).json({
      message: "If an account with that email exists, a password reset link has been sent.",
    });
  }

  // Generate a random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes TTL

  await prisma.admin.update({
    where: { admin_id: admin.admin_id },
    data: {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    },
  });

  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  const resetUrl = `${clientUrl}/admin/reset-password?token=${rawToken}&email=${encodeURIComponent(admin.email)}`;

  await sendAdminPasswordResetEmail({
    toEmail: admin.email,
    resetUrl,
    adminName: admin.username,
  });

  return res.status(StatusCodes.OK).json({
    message: "If an account with that email exists, a password reset link has been sent.",
  });
};

const resetPassword = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const result = errors.formatWith(({ msg, param }) => {
      return { message: msg, property: param };
    });
    throw new ValidationError("Incorrect data", result.array());
  }

  const { token, email, password } = req.body;

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const admin = await prisma.admin.findFirst({
    where: {
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: {
        gt: new Date(),
      },
    },
  });

  if (!admin) {
    throw new BadRequestError("Invalid or expired password reset token");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.admin.update({
    where: { admin_id: admin.admin_id },
    data: {
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    },
  });

  return res.status(StatusCodes.OK).json({
    message: "Password reset successful. You can now log in with your new password.",
  });
};

module.exports = {
  register,
  verifyEmail,
  resendVerificationEmail,
  login,
  getProfile,
  forgotPassword,
  resetPassword,
};
