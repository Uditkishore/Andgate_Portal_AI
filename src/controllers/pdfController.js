const pdfParse = require("pdf-parse");
const Pdf = require("../models/invoicePDF");

exports.uploadAndParsePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const data = await pdfParse(req.file.buffer);

    const base64File = req.file.buffer.toString("base64");

    const pdfDoc = new Pdf({
      filename: req.file.originalname,
      numPages: data.numpages,
      info: data.info,
      metadata: data.metadata,
      text: data.text,
      fileBase64: base64File,
      mimeType: req.file.mimetype,
    });

    await pdfDoc.save();

    res.status(201).json({
      message: "PDF uploaded, parsed & saved successfully",
      pdf: pdfDoc,
    });
  } catch (error) {
    console.error("Error parsing PDF:", error);
    res.status(500).json({ error: "Failed to parse & save PDF" });
  }
};
