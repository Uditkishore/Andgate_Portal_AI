const Invoice = require("../models/invoice");
const pdfParse = require("pdf-parse");
const transporter = require("../utils/mailer");
const { invoiceEmailHtml } = require("../utils/emailTemplates");

exports.createInvoice = async (req, res) => {
  try {
    const { source, status, pdfBase64, ...invoiceData } = req.body;

    if (!source) {
      return res.status(400).json({ error: "Invoice source is required" });
    }

    // Base invoice payload
    const invoicePayload = {
      status: status?.trim() || "Draft",
      source, // <-- include source
      ...invoiceData,
    };

    // Manual invoice: attach pdfBase64
    if (source === "Manual") {
      if (!pdfBase64) {
        return res
          .status(400)
          .json({ error: "pdfBase64 is required for Manual invoices" });
      }
      invoicePayload.pdfBase64 = pdfBase64;
    }

    // PDF invoice: parse uploaded PDF
    if (source === "PDF") {
      if (!req.file) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }
      const data = await pdfParse(req.file.buffer);
      invoicePayload.uploadedPdf = {
        filename: req.file.originalname,
        numPages: data.numpages,
        info: data.info,
        metadata: data.metadata,
        text: data.text,
        fileBase64: req.file.buffer.toString("base64"),
        mimeType: req.file.mimetype,
      };
    }

    // Save invoice
    const invoice = new Invoice(invoicePayload);
    await invoice.save();

    return res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: invoice,
    });
  } catch (error) {
    console.error("Error creating invoice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create invoice",
      error: error.message,
    });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 7,
      buyer,
      seller,
      invoiceNo,
      status,
      startDate,
      endDate,
      search,
    } = req.query;

    const filter = {};

    // Field-specific filters
    if (buyer) filter["buyer.name"] = new RegExp(buyer, "i");
    if (seller) filter["seller.name"] = new RegExp(seller, "i");
    if (invoiceNo) filter.invoiceNo = new RegExp(invoiceNo, "i");
    if (status) filter.status = status;

    // Date filter
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.invoiceDate.$lte = end;
      }
    }

    // Universal regex search across all schema fields
    if (search) {
      const schemaPaths = Object.keys(Invoice.schema.paths).filter((field) => {
        const type = Invoice.schema.paths[field].instance;
        return type === "String";
      });

      filter.$or = schemaPaths.map((field) => ({
        [field]: new RegExp(search, "i"),
      }));
    }

    const invoices = await Invoice.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const count = await Invoice.countDocuments(filter);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total: count,
        page: Number(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.sendInvoiceEmail = async (req, res) => {
  try {
    const { email, invoiceId } = req.body;

    if (!email || !invoiceId) {
      return res.status(400).json({
        success: false,
        message: "Email and invoiceId are required",
      });
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return res
        .status(404)
        .json({ success: false, message: "Invoice not found" });
    }

    // Prepare attachments
    let attachments = [];
    if (invoice.pdfBase64) {
      attachments.push({
        filename: `Invoice-${invoice.invoiceNo}.pdf`,
        content: Buffer.from(invoice.pdfBase64, "base64"),
        contentType: "application/pdf",
      });
    } else if (invoice.uploadedPdf?.fileBase64) {
      attachments.push({
        filename:
          invoice.uploadedPdf.filename || `Invoice-${invoice.invoiceNo}.pdf`,
        content: Buffer.from(invoice.uploadedPdf.fileBase64, "base64"),
        contentType: invoice.uploadedPdf.mimeType || "application/pdf",
      });
    }

    // Email options
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: `Invoice #${invoice.invoiceNo}`,
      html: invoiceEmailHtml(invoice, email),
      attachments,
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: `Invoice emailed successfully to ${email}`,
    });
  } catch (error) {
    console.error("Error sending invoice email:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getNewInvoiceNumber = async (req, res) => {
  try {
    // Get latest invoice number
    const latestInvoice = await Invoice.findOne({}, { invoiceNo: 1 })
      .sort({ invoiceNo: -1 })
      .lean();
    const latestNo = Number(latestInvoice?.invoiceNo) || 0;
    const nextInvoiceNo = latestNo + 1;

    return res.status(201).json({ success: true, data: nextInvoiceNo });
  } catch (error) {
    console.log("error", error);
    return res
      .status(500)
      .json({ status: false, message: "Something went wrong." });
  }
};
