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

/**
 * Sends an order confirmation email to the customer
 * @param {Object} params
 * @param {string} params.toEmail - Customer recipient email
 * @param {string} [params.customerName] - Customer name
 * @param {Object} params.order - The order object
 * @param {Array} params.orderItems - List of order items with product details
 * @param {Object} [params.address] - Shipping address object
 * @param {string} [params.paymentMethod] - Payment method ('cash' or 'card')
 * @param {string} [params.orderUrl] - URL to view order on the storefront
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
const sendOrderConfirmationEmail = async ({
  toEmail,
  customerName,
  order,
  orderItems = [],
  address,
  paymentMethod,
  orderUrl,
}) => {
  const transporter = createTransporter();
  const fromEmail = process.env.EMAIL_FROM || `"OMS Orders" <${process.env.EMAIL_USER}>`;
  const name = customerName || "Valued Customer";
  const formattedDate = new Date(order.createdAt || Date.now()).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const paymentLabel =
    paymentMethod === "cash" || order.payment_method === "cash"
      ? "Cash on Delivery (COD)"
      : "Credit / Debit Card (Paid Online)";

  const formattedAmount = Number(order.order_amount || 0).toFixed(2);

  // Generate table rows for items
  const itemsHtml = orderItems
    .map((item) => {
      const productName = item.product?.name || item.name || "Product Item";
      const quantity = item.quantity || 1;
      const unitPrice = item.product?.price ? Number(item.product.price).toFixed(2) : null;
      const itemTotal = Number(item.total_amount || 0).toFixed(2);

      return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 8px; font-size: 14px; color: #1e293b; font-weight: 500;">
            ${productName}
          </td>
          <td style="padding: 12px 8px; font-size: 14px; color: #64748b; text-align: center;">
            ${quantity}
          </td>
          <td style="padding: 12px 8px; font-size: 14px; color: #64748b; text-align: right;">
            ${unitPrice ? `₹${unitPrice}` : "-"}
          </td>
          <td style="padding: 12px 8px; font-size: 14px; color: #0f172a; font-weight: 600; text-align: right;">
            ₹${itemTotal}
          </td>
        </tr>
      `;
    })
    .join("");

  const addressHtml = address
    ? `
      <p style="margin: 0; line-height: 1.5; color: #334155; font-size: 14px;">
        <strong>${address.full_name || name}</strong><br/>
        ${address.flat_no ? `${address.flat_no}, ` : ""}${address.street || ""}<br/>
        ${address.city || ""}, ${address.state || ""} - ${address.pincode || ""}<br/>
        ${address.country || ""}<br/>
        ${address.phone ? `Phone: ${address.phone}` : ""}
      </p>
    `
    : `<p style="margin: 0; color: #64748b; font-size: 14px;">Address on file</p>`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - #${order.order_id}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 0;
          color: #1e293b;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
        }
        .header {
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 32px 28px;
          text-align: center;
        }
        .header h1 {
          color: #ffffff;
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header p {
          color: #94a3b8;
          margin: 0;
          font-size: 14px;
        }
        .badge {
          display: inline-block;
          background-color: #10b981;
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 12px;
          border-radius: 9999px;
          margin-top: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 28px;
        }
        .section-title {
          font-size: 15px;
          font-weight: 700;
          color: #0f172a;
          margin: 24px 0 12px 0;
          padding-bottom: 6px;
          border-bottom: 2px solid #f1f5f9;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .items-table th {
          text-align: left;
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          text-transform: uppercase;
          padding: 8px;
          border-bottom: 1px solid #e2e8f0;
        }
        .btn {
          display: block;
          width: fit-content;
          margin: 28px auto 8px auto;
          background-color: #2563eb;
          color: #ffffff !important;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 15px;
          text-align: center;
        }
        .footer {
          background-color: #f8fafc;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thank You for Your Order!</h1>
          <p>Hi ${name}, we have received your order and are processing it.</p>
          <div class="badge">Order Confirmed</div>
        </div>

        <div class="content">
          <!-- Order Metadata -->
          <table style="width: 100%; margin-bottom: 24px; background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0;">
            <tr>
              <td style="padding: 6px 12px; vertical-align: top;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Order ID</div>
                <div style="font-family: monospace; font-size: 13px; font-weight: 600; color: #0f172a;">${order.order_id}</div>
              </td>
              <td style="padding: 6px 12px; vertical-align: top;">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Order Date</div>
                <div style="font-size: 14px; font-weight: 600; color: #0f172a;">${formattedDate}</div>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 12px; vertical-align: top;" colspan="2">
                <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; margin-bottom: 4px;">Payment Method</div>
                <div style="font-size: 14px; font-weight: 600; color: #2563eb;">${paymentLabel}</div>
              </td>
            </tr>
          </table>

          <!-- Items Table -->
          <div class="section-title">Order Items</div>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Total Amount -->
          <div style="background-color: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
            <table style="width: 100%;">
              <tr>
                <td style="font-size: 16px; font-weight: 700; color: #0f172a;">Total Amount</td>
                <td style="font-size: 18px; font-weight: 800; color: #10b981; text-align: right;">₹${formattedAmount}</td>
              </tr>
            </table>
          </div>

          <!-- Shipping Address -->
          <div class="section-title">Delivery Address</div>
          <div style="background-color: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0;">
            ${addressHtml}
          </div>

          <!-- View Order CTA Button -->
          ${
            orderUrl
              ? `<a href="${orderUrl}" class="btn" target="_blank">View Your Order</a>`
              : ""
          }
        </div>

        <div class="footer">
          &copy; ${new Date().getFullYear()} OMS. If you have questions about your order, please contact our support team.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: toEmail,
      subject: `Order Confirmed - #${order.order_id}`,
      html: htmlContent,
    });

    console.log("Order confirmation email sent successfully:", info.messageId);
    return { success: true, data: info };
  } catch (err) {
    console.error("Nodemailer order confirmation email error:", err);
    return { success: false, error: err };
  }
};

module.exports = {
  createTransporter,
  sendAdminPasswordResetEmail,
  sendAdminVerificationEmail,
  sendOrderConfirmationEmail,
};
