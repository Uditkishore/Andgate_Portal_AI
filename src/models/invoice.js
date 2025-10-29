// models/Invoice.js
const mongoose = require("mongoose");

const ItemSchema = new mongoose.Schema({
  slNo: { type: String },
  description: { type: String },
  billingDays: { type: Number },
  workingDays: { type: Number },
  rate: { type: Number },
  hsn_sac: { type: String },
  gstRate: { type: Number },
  amount: { type: Number, default: 0 },
  rawRow: { type: mongoose.Schema.Types.Mixed },
});

const InvoiceSchema = new mongoose.Schema(
  {
    logo: { type: String },
    invoiceNo: { type: Number, required: true, unique: true },
    invoiceDate: { type: Date },
    purchaseOrderNo: { type: String },

    billingMonth: { type: String }, // e.g. "Jun-25"

    seller: {
      name: { type: String },
      address: { type: String },
      gstin: { type: String },
      cin: { type: String },
      pan: { type: String },
      contact: { type: String },
      email: { type: String },
    },

    buyer: {
      name: { type: String },
      address: { type: String },
      pan: { type: String },
      gstin: { type: String },
      contact: { type: String },
      email: { type: String },
    },

    items: { type: [ItemSchema], default: [] },

    totals: {
      subTotal: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },
      cgst: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      totalInWords: { type: String },
      reverseCharges: { type: String },
    },

    bankDetails: {
      bankName: { type: String },
      accountName: { type: String },
      accountNumber: { type: String },
      ifsc: { type: String },
      branch: { type: String },
    },

    notes: { type: String },
    footer: { type: String },

    status: {
      type: String,
      enum: ["Draft", "Pending", "Paid", "Overdue", "Cancelled"],
      default: "Draft",
    },

    signature: { type: String },

    raw: { type: mongoose.Schema.Types.Mixed },
    pdfBase64: { type: String },
    source: {
      type: String,
      enum: ["Manual", "PDF"],
      required: true,
    },
    uploadedPdf: {
      filename: { type: String },
      numPages: Number,
      info: Object,
      metadata: Object,
      text: String,
      fileBase64: { type: String },
      mimeType: { type: String },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", InvoiceSchema);
