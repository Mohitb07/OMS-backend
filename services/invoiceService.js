const PDFDocument = require("pdfkit");

/**
 * Formats a currency amount (INR format by default).
 * @param {number|string} amount
 * @returns {string}
 */
const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `Rs. ${num.toFixed(2)}`;
};

/**
 * Formats a date string into a readable format (e.g., Oct 24, 2026).
 * @param {Date|string} date
 * @returns {string}
 */
const formatDate = (date) => {
  if (!date) return "N/A";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/**
 * Generates an Order PDF invoice and streams it to the provided writable stream (e.g., Express `res`).
 *
 * @param {Object} order - Full order details with customer, address, and order_items.product.
 * @param {import("stream").Writable} outputStream - Express response object or file stream.
 * @returns {Promise<void>}
 */
const generateOrderInvoicePDF = (order, outputStream) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 40,
      size: "A4",
      bufferPages: true,
    });

    doc.on("error", reject);
    outputStream.on("finish", resolve);
    outputStream.on("error", reject);

    doc.pipe(outputStream);

    const primaryColor = "#0f172a"; // Slate 900
    const secondaryColor = "#475569"; // Slate 600
    const accentColor = "#2563eb"; // Blue 600
    const borderColor = "#e2e8f0"; // Slate 200
    const tableHeaderBg = "#f8fafc"; // Slate 50

    // ==========================================
    // 1. HEADER SECTION
    // ==========================================
    doc
      .fillColor(accentColor)
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("WONDRMART", 40, 45);

    doc
      .fillColor(secondaryColor)
      .fontSize(9)
      .font("Helvetica")
      .text("Online Shopping & Order Management", 40, 72)
      .text("support@wondrmart.com", 40, 84);

    // Invoice Title & Meta on the Right
    doc
      .fillColor(primaryColor)
      .fontSize(18)
      .font("Helvetica-Bold")
      .text("TAX INVOICE", 380, 45, { align: "right" });

    doc
      .fillColor(secondaryColor)
      .fontSize(9)
      .font("Helvetica")
      .text(`Invoice ID: INV-${order.order_id.slice(-8).toUpperCase()}`, 380, 70, { align: "right" })
      .text(`Order ID: ${order.order_id}`, 380, 82, { align: "right" })
      .text(`Order Date: ${formatDate(order.createdAt)}`, 380, 94, { align: "right" });

    // Divider
    doc
      .moveTo(40, 115)
      .lineTo(555, 115)
      .strokeColor(borderColor)
      .lineWidth(1)
      .stroke();

    // ==========================================
    // 2. BILLING & ORDER DETAILS SECTION
    // ==========================================
    const infoTop = 130;

    // Left Column: Customer & Shipping Details
    doc
      .fillColor(accentColor)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text("BILLED & SHIPPED TO", 40, infoTop);

    const customerName =
      order.address?.full_name || order.customer?.username || "Valued Customer";
    const customerEmail = order.customer?.email || "N/A";
    const customerPhone = order.address?.phone || "N/A";

    doc
      .fillColor(primaryColor)
      .fontSize(10)
      .font("Helvetica-Bold")
      .text(customerName, 40, infoTop + 16);

    let addressY = infoTop + 30;
    doc
      .fillColor(secondaryColor)
      .fontSize(9)
      .font("Helvetica");

    if (order.address) {
      const addressLine1 = [order.address.flat_no, order.address.street]
        .filter(Boolean)
        .join(", ");
      const addressLine2 = [
        order.address.city,
        order.address.state,
        order.address.pincode,
      ]
        .filter(Boolean)
        .join(", ");
      const country = order.address.country || "India";

      if (addressLine1) {
        doc.text(addressLine1, 40, addressY);
        addressY += 13;
      }
      if (addressLine2) {
        doc.text(addressLine2, 40, addressY);
        addressY += 13;
      }
      doc.text(country, 40, addressY);
      addressY += 13;
    }

    doc.text(`Phone: ${customerPhone}`, 40, addressY);
    addressY += 13;
    doc.text(`Email: ${customerEmail}`, 40, addressY);

    // Right Column: Order & Payment Info Box
    const boxX = 350;
    const boxWidth = 205;
    const boxHeight = 90;

    doc
      .rect(boxX, infoTop, boxWidth, boxHeight)
      .fillAndStroke("#f8fafc", borderColor);

    doc
      .fillColor(primaryColor)
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("Order Status:", boxX + 12, infoTop + 12)
      .text("Payment Method:", boxX + 12, infoTop + 32)
      .text("Payment Status:", boxX + 12, infoTop + 52)
      .text("Currency:", boxX + 12, infoTop + 70);

    const paymentStatus =
      order.payment_method === "card"
        ? order.status === "cancelled"
          ? "Failed / Refunded"
          : "Paid Online"
        : "Cash on Delivery";

    doc
      .font("Helvetica")
      .fillColor(secondaryColor)
      .text(
        (order.status || "pending").toUpperCase(),
        boxX + 105,
        infoTop + 12
      )
      .text(
        (order.payment_method || "N/A").toUpperCase(),
        boxX + 105,
        infoTop + 32
      )
      .text(paymentStatus, boxX + 105, infoTop + 52)
      .text("INR (Rs.)", boxX + 105, infoTop + 70);

    // ==========================================
    // 3. ITEMS TABLE
    // ==========================================
    const drawTableHeader = (y) => {
      doc
        .rect(40, y, 515, 24)
        .fillAndStroke(tableHeaderBg, borderColor);

      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text("#", 45, y + 7, { width: 20 })
        .text("Item Description", 70, y + 7, { width: 235 })
        .text("Unit Price", 310, y + 7, { width: 75, align: "right" })
        .text("Qty", 390, y + 7, { width: 45, align: "center" })
        .text("Amount", 440, y + 7, { width: 105, align: "right" });
    };

    let tableTop = Math.max(addressY + 25, infoTop + boxHeight + 25);
    drawTableHeader(tableTop);

    let currentY = tableTop + 24;
    const items = order.order_items || [];
    const itemColWidth = 235;

    items.forEach((item, index) => {
      const productName = item.product?.name || "Product Item";
      const unitPrice =
        item.product?.price ||
        (item.quantity ? Number(item.total_amount) / item.quantity : 0);
      const totalAmount = item.total_amount || Number(unitPrice) * item.quantity;

      // Measure dynamic text height to accommodate multi-line wrapped product names
      doc.font("Helvetica").fontSize(9);
      const nameHeight = doc.heightOfString(productName, {
        width: itemColWidth,
        lineGap: 2,
      });
      const rowHeight = Math.max(28, nameHeight + 14);

      // Check if row exceeds printable page boundary
      if (currentY + rowHeight > 720) {
        doc.addPage();
        currentY = 40;
        drawTableHeader(currentY);
        currentY += 24;
      }

      const rowBg = index % 2 === 1 ? "#fafafa" : "#ffffff";
      doc
        .rect(40, currentY, 515, rowHeight)
        .fillAndStroke(rowBg, borderColor);

      const textY = currentY + 7;

      // Row Index
      doc
        .fillColor(secondaryColor)
        .fontSize(9)
        .font("Helvetica")
        .text(String(index + 1), 45, textY, { width: 20 });

      // Product Description (multi-line wrapped without clipping)
      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font("Helvetica")
        .text(productName, 70, textY, {
          width: itemColWidth,
          lineGap: 2,
        });

      // Unit Price
      doc
        .fillColor(secondaryColor)
        .fontSize(9)
        .font("Helvetica")
        .text(formatCurrency(unitPrice), 310, textY, {
          width: 75,
          align: "right",
        });

      // Quantity
      doc
        .fillColor(secondaryColor)
        .fontSize(9)
        .font("Helvetica")
        .text(String(item.quantity || 1), 390, textY, {
          width: 45,
          align: "center",
        });

      // Total Amount
      doc
        .fillColor(primaryColor)
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(formatCurrency(totalAmount), 440, textY, {
          width: 105,
          align: "right",
        });

      currentY += rowHeight;
    });

    // ==========================================
    // 4. TOTALS SECTION
    // ==========================================
    currentY += 15;
    if (currentY + 80 > 720) {
      doc.addPage();
      currentY = 40;
    }

    const totalsStartX = 340;
    const totalsWidth = 215;

    // Subtotal
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(secondaryColor)
      .text("Subtotal:", totalsStartX, currentY, { width: 100 })
      .text(formatCurrency(order.order_amount), totalsStartX + 100, currentY, {
        width: 115,
        align: "right",
      });

    currentY += 18;

    // Shipping & Handling
    doc
      .text("Shipping & Handling:", totalsStartX, currentY, { width: 115 })
      .fillColor("#16a34a") // Green
      .text("FREE", totalsStartX + 115, currentY, {
        width: 100,
        align: "right",
      });

    currentY += 18;

    // Grand Total Bar
    doc
      .rect(totalsStartX - 10, currentY, totalsWidth + 10, 30)
      .fillAndStroke("#f1f5f9", accentColor);

    doc
      .fillColor(accentColor)
      .fontSize(11)
      .font("Helvetica-Bold")
      .text("Total Amount:", totalsStartX, currentY + 9, { width: 100 })
      .text(formatCurrency(order.order_amount), totalsStartX + 100, currentY + 9, {
        width: 115,
        align: "right",
      });

    // ==========================================
    // 5. FOOTER & NOTES
    // ==========================================
    const pageRange = doc.bufferedPageRange();
    const totalPages = pageRange.count;
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // Prevent automatic page break while rendering footer

      // Bottom divider
      doc
        .moveTo(40, 765)
        .lineTo(555, 765)
        .strokeColor(borderColor)
        .lineWidth(1)
        .stroke();

      doc
        .fillColor(secondaryColor)
        .fontSize(8)
        .font("Helvetica")
        .text(
          "Thank you for shopping with Wondrmart! This is a computer-generated invoice and requires no physical signature.",
          40,
          773,
          { align: "center", width: 515, lineBreak: false }
        )
        .text(
          `Page ${i + 1} of ${totalPages} • Generated on ${formatDate(new Date())}`,
          40,
          785,
          { align: "center", width: 515, lineBreak: false }
        );
    }

    doc.end();
  });
};

module.exports = {
  generateOrderInvoicePDF,
};
