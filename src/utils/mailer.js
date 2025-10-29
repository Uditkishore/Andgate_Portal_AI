// mailer.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com", // or your SMTP provider
  port: 587,
  secure: false, // true for port 465, false for 587
  auth: {
    user: process.env.SMTP_USER, // Your email (env recommended)
    pass: process.env.SMTP_PASS  // Your password or App Password
  }
});

// Verify connection
transporter.verify(function (error, success) {
  if (error) {
    console.log("SMTP Error:", error);
  } else {
    console.log("SMTP Server is ready to send emails");
  }
});

module.exports = transporter;
