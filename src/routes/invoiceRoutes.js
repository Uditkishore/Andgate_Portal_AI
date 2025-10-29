const express = require("express");
const multer = require("multer");
const {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoiceStatus,
  sendInvoiceEmail,
  getNewInvoiceNumber,
} = require("../controllers/invoiceController");

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/create", upload.single("file"), createInvoice);
router.get("/all", getInvoices);
router.get("/getNewInvoiceNumber", getNewInvoiceNumber);
router.get("/:id", getInvoiceById);
router.patch("/:id/status", updateInvoiceStatus);
router.post("/send-email", sendInvoiceEmail);

module.exports = router;
