const nodemailer = require("nodemailer");

/**
 * Creates and returns the nodemailer transporter
 */
const createTransporter = () => {
  // Support custom SMTP host/port or default to Gmail service
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true", // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Default: Gmail service with App Password
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Sends an admin password reset email using Nodemailer
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email
 * @param {string} params.resetUrl - Full URL to password reset page with token
 * @param {string} [params.adminName] - Optional admin username
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
const sendAdminPasswordResetEmail = async ({ toEmail, resetUrl, adminName }) => {
  const transporter = createTransporter();
  const fromEmail = process.env.EMAIL_FROM || `"OMS Admin" <${process.env.EMAIL_USER}>`;
  const name = adminName || "Admin";

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f4f5f7;
          margin: 0;
          padding: 0;
          color: #1a202c;
        }
        .container {
          max-width: 560px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #0f172a;
          padding: 28px 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          font-size: 20px;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .body {
          padding: 32px;
        }
        .body h2 {
          font-size: 18px;
          color: #0f172a;
          margin-top: 0;
        }
        .body p {
          font-size: 15px;
          line-height: 1.6;
          color: #475569;
          margin: 16px 0;
        }
        .btn-wrapper {
          text-align: center;
          margin: 32px 0;
        }
        .btn {
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff !important;
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
        }
        .btn:hover {
          background-color: #1d4ed8;
        }
        .note {
          background-color: #f8fafc;
          border-left: 4px solid #3b82f6;
          padding: 12px 16px;
          border-radius: 4px;
          font-size: 13px;
          color: #64748b;
          margin: 24px 0;
        }
        .url-text {
          word-break: break-all;
          font-size: 12px;
          color: #3b82f6;
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          padding: 20px 32px;
          background-color: #f8fafc;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Admin Portal</h1>
        </div>
        <div class="body">
          <h2>Hello, ${name}</h2>
          <p>We received a request to reset the password for your administrator account.</p>
          <p>Click the button below to reset your password. This link will expire in <strong>15 minutes</strong>.</p>
          
          <div class="btn-wrapper">
            <a href="${resetUrl}" class="btn" target="_blank">Reset Password</a>
          </div>

          <div class="note">
            If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </div>

          <p style="font-size: 13px; color: #94a3b8;">
            If the button above doesn't work, copy and paste this link into your browser:<br/>
            <span class="url-text">${resetUrl}</span>
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} OMS Admin. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: "Admin Password Reset Request",
      html: htmlContent,
    });

    console.log("Email sent successfully via Nodemailer:", info.messageId);
    return { success: true, data: info };
  } catch (err) {
    console.error("Nodemailer error:", err);
    return { success: false, error: err };
  }
};

/**
 * Sends an admin email verification link using Nodemailer
 * @param {Object} params
 * @param {string} params.toEmail - Recipient email
 * @param {string} params.verificationUrl - Full URL to email verification page with token
 * @param {string} [params.adminName] - Optional admin username
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
const sendAdminVerificationEmail = async ({ toEmail, verificationUrl, adminName }) => {
  const transporter = createTransporter();
  const fromEmail = process.env.EMAIL_FROM || `"OMS Admin" <${process.env.EMAIL_USER}>`;
  const name = adminName || "Admin";

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email Address</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f4f5f7;
          margin: 0;
          padding: 0;
          color: #1a202c;
        }
        .container {
          max-width: 560px;
          margin: 40px auto;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #0f172a;
          padding: 28px 32px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          font-size: 20px;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .body {
          padding: 32px;
        }
        .body h2 {
          font-size: 18px;
          color: #0f172a;
          margin-top: 0;
        }
        .body p {
          font-size: 15px;
          line-height: 1.6;
          color: #475569;
          margin: 16px 0;
        }
        .btn-wrapper {
          text-align: center;
          margin: 32px 0;
        }
        .btn {
          display: inline-block;
          background-color: #10b981;
          color: #ffffff !important;
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 600;
          text-decoration: none;
          border-radius: 6px;
          box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
        }
        .btn:hover {
          background-color: #059669;
        }
        .note {
          background-color: #f8fafc;
          border-left: 4px solid #10b981;
          padding: 12px 16px;
          border-radius: 4px;
          font-size: 13px;
          color: #64748b;
          margin: 24px 0;
        }
        .url-text {
          word-break: break-all;
          font-size: 12px;
          color: #10b981;
        }
        .footer {
          border-top: 1px solid #e2e8f0;
          padding: 20px 32px;
          background-color: #f8fafc;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Admin Portal</h1>
        </div>
        <div class="body">
          <h2>Welcome, ${name}!</h2>
          <p>Thank you for registering as an administrator. To activate your account and start managing the portal, please verify your email address.</p>
          <p>Click the button below to activate your account. This link will expire in <strong>24 hours</strong>.</p>
          
          <div class="btn-wrapper">
            <a href="${verificationUrl}" class="btn" target="_blank">Verify & Activate Account</a>
          </div>

          <div class="note">
            If you did not register for an admin account, you can safely disregard this email.
          </div>

          <p style="font-size: 13px; color: #94a3b8;">
            If the button above doesn't work, copy and paste this link into your browser:<br/>
            <span class="url-text">${verificationUrl}</span>
          </p>
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} OMS Admin. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: "Verify Your Admin Account Email",
      html: htmlContent,
    });

    console.log("Verification email sent successfully:", info.messageId);
    return { success: true, data: info };
  } catch (err) {
    console.error("Nodemailer verification email error:", err);
    return { success: false, error: err };
  }
};

module.exports = {
  createTransporter,
  sendAdminPasswordResetEmail,
  sendAdminVerificationEmail,
};
