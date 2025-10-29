const htmlTemplate = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8" />
            <title>Application Accepted</title>
            <style>
            body {
                font-family: Arial, sans-serif;
                background-color: #f4f4f4;
                margin: 0;
                padding: 0;
            }

            .container {
                max-width: 700px;
                margin: 30px auto;
                background-color: #ffffff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }

            .header {
                text-align: center;
                margin-bottom: 20px;
            }

            .header h2 {
                color: #333;
            }

            .content {
                color: #444;
                font-size: 16px;
                line-height: 1.6;
            }

            .footer {
                margin-top: 30px;
                font-size: 13px;
                color: #999;
                text-align: center;
            }

            .button {
                display: inline-block;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #007bff;
                color: #fff !important;
                text-decoration: none;
                border-radius: 5px;
            }
            </style>
        </head>
        <body>
            <div class="container">
            <div class="header">
                <h2>Application Accepted - Andgate Informatics Pvt. Ltd.</h2>
            </div>

            <div class="content">
                <p>Dear {{candidateName}},</p>

                <p>
                We are pleased to inform you that your application for a position at
                <strong>Andgate Informatics Pvt. Ltd.</strong> has been successfully accepted.
                </p>

                <p>
                Our recruitment team was impressed with your qualifications and experience.
                We look forward to moving ahead with the next steps in the selection process.
                </p>

                <p>
                You will be contacted shortly with further instructions regarding the interview
                schedule and any additional requirements.
                </p>

                <p>
                If you have any questions, feel free to reply to this email or contact our HR
                department at <a href="mailto:hr@andgate.com">hr@andgate.com</a>.
                </p>

                <p>We appreciate your interest in joining our team!</p>

                <p>Best regards,<br /><strong>Andgate HR Team</strong></p>
            </div>

            <div class="footer">
                &copy; 2025 Andgate Informatics Pvt. Ltd. All rights reserved.
            </div>
            </div>
        </body>
        </html>
`;

const candidateHtml = `
 <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Interview Invitation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: Arial, sans-serif;
      color: #333;
    }
    .container {
      width: 600px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .content {
      padding: 30px 40px;
    }
    h2 {
      margin-top: 0;
      font-size: 24px;
      color: #2c3e50;
    }
    p {
      font-size: 16px;
      line-height: 1.5;
    }
    .footer {
      padding: 20px 40px;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table class="container" cellpadding="0" cellspacing="0">
          <tr>
            <td class="content">
              <h2>Interview Invitation</h2>
              <p>Dear <strong>{{candidate.name}}</strong>,</p>
              <p>
                You have been invited for an interview with
                <strong>{{organization.name}}</strong> for the
                <strong>{{eventName}}</strong> round with <strong>{{interviewer.name}}<strong>.
              </p>
              <p style="margin-top: 20px;">
                <strong>Interview Date:</strong> {{interviewDate}}<br/>
                <strong>Meeting Link:</strong>
                <a href="{{meetingLink}}" target="_blank">Click to Join</a>
              </p>
              <p style="margin-top: 40px;">
                Best regards,<br/>
                <strong>Andgate HR Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              &copy; {{currentYear}} Andgate Informatics Pvt. Ltd. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const candidateHtmlWithoutLink = `
 <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Interview Invitation</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: Arial, sans-serif;
      color: #333;
    }
    .container {
      width: 600px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .content {
      padding: 30px 40px;
    }
    h2 {
      margin-top: 0;
      font-size: 24px;
      color: #2c3e50;
    }
    p {
      font-size: 16px;
      line-height: 1.5;
    }
    .footer {
      padding: 20px 40px;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table class="container" cellpadding="0" cellspacing="0">
          <tr>
            <td class="content">
              <h2>Interview Invitation</h2>
              <p>Dear <strong>{{candidate.name}}</strong>,</p>
              <p>
                You have been invited for an interview with
                <strong>{{organization.name}}</strong> for the
                <strong>{{eventName}}</strong> round with <strong>{{interviewer.name}}<strong>.
              </p>
              <p style="margin-top: 40px;">
                Best regards,<br/>
                <strong>Andgate HR Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              &copy; {{currentYear}} Andgate Informatics Pvt. Ltd. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
const interviewerHtml = `
 <!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Interview Assignment</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: Arial, sans-serif;
      color: #333;
    }
    .container {
      width: 600px;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
    .content {
      padding: 30px 40px;
    }
    h2 {
      margin-top: 0;
      font-size: 24px;
      color: #2c3e50;
    }
    p {
      font-size: 16px;
      line-height: 1.5;
    }
    .footer {
      padding: 20px 40px;
      text-align: center;
      font-size: 12px;
      color: #999;
    }
    a {
      color: #1a73e8;
      text-decoration: none;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table class="container" cellpadding="0" cellspacing="0">
          <tr>
            <td class="content">
              <h2>Interview Assignment</h2>
              <p>Dear <strong>{{interviewer.name}}</strong>,</p>
              <p>
                You have been assigned to conduct an interview with
                <strong>{{candidate.name}}</strong> for the
                <strong>{{eventName}}</strong> round.
              </p>
              <p style="margin-top: 20px;">
                <strong>Interview Date:</strong> {{interviewDate}}<br/>
                <strong>Meeting Link:</strong>
                <a href="{{meetingLink}}" target="_blank" style="color: #1a73e8; text-decoration: underline;">Click to Join</a>
              </p>

              <p>
                After the interview, please submit your feedback:<br />
                <a
                  href="{{feedbackLink}}"
                  target="_blank"
                  style="
                    display: inline-block;
                    padding: 10px 20px;
                    margin-top: 10px;
                    background-color: #1a73e8;
                    color: #ffffff;
                    border-radius: 5px;
                    font-size: 14px;
                    text-align: center;
                    text-decoration: none;
                    font-weight: 500;
                  "
                >
                  Submit Feedback
                </a>
              </p>
              
              <p style="margin-top: 40px;">
                Best regards,<br/>
                <strong>Andgate HR Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              &copy; {{currentYear}} Andgate Informatics Pvt. Ltd. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const interviewerHtmlWithoutLink = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Interview Assignment</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333333;
    }

    .container {
      width: 100%;
      max-width: 600px;
      background-color: #ffffff;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      margin: 0 auto;
    }

    .content {
      padding: 30px 40px;
    }

    h2 {
      margin-top: 0;
      font-size: 26px;
      color: #2c3e50;
      font-weight: 600;
    }

    p {
      font-size: 15px;
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .footer {
      padding: 20px 40px;
      text-align: center;
      font-size: 12px;
      color: #999999;
      background-color: #f9f9f9;
      border-top: 1px solid #eee;
      border-radius: 0 0 10px 10px;
    }

    a {
      color: #1a73e8;
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .btn-link:hover {
      background-color: #1558b0;
    }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table class="container" cellpadding="0" cellspacing="0">
          <tr>
            <td class="content">
              <h2>Interview Assignment</h2>

              <p>Dear <strong>{{interviewer.name}}</strong>,</p>

              <p>
                You have been assigned to conduct an interview with
                <strong>{{candidate.name}}</strong> for the
                <strong>{{eventName}}</strong> round.
              </p>

              <p>
                <strong>Candidate Details:</strong><br />
                Email: <strong>{{candidate.email}}</strong><br />
                Mobile <strong>{{candidate.mobile}}</strong>
              </p>

              <p>
                After the interview, please submit your feedback:<br />
                <a
                  href="{{feedbackLink}}"
                  target="_blank"
                  style="
                    display: inline-block;
                    padding: 10px 20px;
                    margin-top: 10px;
                    background-color: #1a73e8;
                    color: #ffffff;
                    border-radius: 5px;
                    font-size: 14px;
                    text-align: center;
                    text-decoration: none;
                    font-weight: 500;
                  "
                >
                  Submit Feedback
                </a>
              </p>

              <p style="margin-top: 40px;">
                Best regards,<br />
                <strong>Andgate HR Team</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td class="footer">
              &copy; {{currentYear}} Andgate Informatics Pvt. Ltd. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const newUserTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Account Created - {{organization}}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 0;
    }
    .container {
      background-color: #ffffff;
      max-width: 600px;
      margin: 40px auto;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    h2 {
      color: #333333;
    }
    p {
      color: #555555;
      line-height: 1.6;
    }
    .credentials {
      background-color: #f1f1f1;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      font-family: monospace;
    }
    .footer {
      margin-top: 30px;
      font-size: 0.9em;
      color: #888888;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Welcome {{firstName}},</h2>
    <p>You have been successfully registered with <strong>{{organization}}</strong>.</p>
    
    <p>Here are your login credentials:</p>
    <div class="credentials">
      <p><strong>Email:</strong> {{email}}</p>
      <p><strong>Password:</strong> {{password}}</p>
       <p>
               
                <a
                  href="{{loginLink}}"
                  target="_blank"
                  style="
                    display: inline-block;
                    padding: 10px 20px;
                    margin-top: 10px;
                    background-color: #1a73e8;
                    color: #ffffff;
                    border-radius: 5px;
                    font-size: 14px;
                    text-align: center;
                    text-decoration: none;
                    font-weight: 500;
                  "
                >
                  Visit the page
                </a>
              </p>

    </div>

    <p>Please keep this information confidential. You can now log in to your account and start using our services.</p>

    <div class="footer">
      <p>&copy; {{organization}}, {{year}}</p>
    </div>
  </div>
</body>
</html>
`;

const ForgetPass = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Password Reset OTP - {{organization}}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 0;
    }
    .container {
      background-color: #ffffff;
      max-width: 600px;
      margin: 40px auto;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    h2 {
      color: #333333;
    }
    p {
      color: #555555;
      line-height: 1.6;
    }
    .credentials {
      background-color: #f1f1f1;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
      font-family: monospace;
    }
    .footer {
      margin-top: 30px;
      font-size: 0.9em;
      color: #888888;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Welcome {{firstName}},</h2>
    <p>You have requested for password reset on AndGate HRMS MyPortal.</p>
    
    <p>Here is your OTP:</p>
    <div class="credentials">
      <p><strong>OTP:</strong> {{otp}}</p>

    </div>

    <p>Please keep this information confidential.</p>

    <div class="footer">
      <p>&copy; {{organization}}, {{year}}</p>
    </div>
  </div>
</body>
</html>`;

// Other templates (candidateHtml, interviewerHtml, etc.)

const eventRejectionHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Application Status - {{organization}}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 0;
    }
    .container {
      background-color: #ffffff;
      max-width: 600px;
      margin: 40px auto;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    h2 {
      color: #d9534f;
    }
    p {
      color: #555555;
      line-height: 1.6;
    }
    .footer {
      margin-top: 30px;
      font-size: 0.9em;
      color: #888888;
    }
  </style>
</head>
<body>
  <div class="container" style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; line-height: 1.6; background: #f9f9f9; border-radius: 8px;">
    <h2 style="color: #333;">Dear {{candidateName}},</h2>
    
    <p>
      Thank you for taking the time to apply and attend the interview for
      <strong>{{eventName}}</strong> with us.
    </p>

    <p>
      After careful consideration, we regret to inform you that you have not been selected
      to move forward in the hiring process.
    </p>

    <p>
      We truly value your interest in joining our team and encourage you to reapply
      for future opportunities that match your skills and experience.
    </p>

    <p>We wish you success in your career journey ahead.</p>

    <p style="margin-top: 20px;">
      Best regards,<br />
      <strong>{{organization}} HR Team</strong>
    </p>

    <div class="footer" style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">
      &copy; {{year}} {{organization}}. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

const eventApprovalHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Congratulations - {{organization}}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f6f8;
      margin: 0;
      padding: 0;
    }
    .container {
      background-color: #ffffff;
      max-width: 600px;
      margin: 40px auto;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    h2 {
      color: #28a745;
    }
    p {
      color: #555555;
      line-height: 1.6;
    }
    .cta-button {
      display: inline-block;
      background-color: #28a745;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 20px;
      border-radius: 6px;
      font-weight: bold;
      margin-top: 20px;
      text-align: center;
    }
    .footer {
      margin-top: 30px;
      font-size: 0.9em;
      color: #888888;
    }
  </style>
</head>
<body>
  <div class="container">
    <h2>Congratulations, {{candidateName}}!</h2>

    <p>
      We are pleased to inform you that you have been selected for
      <strong>{{eventName}}</strong> with our organization.
    </p>

    <p>
      Our team will share the next steps with you shortly, including
      documentation requirements and timelines.
    </p>

    <p style="margin-top: 20px;">
      Best regards,<br />
      <strong>{{organization}} HR Team</strong>
    </p>

    <div class="footer" style="text-align: center;">
      &copy; {{year}} {{organization}}. All rights reserved.
    </div>
  </div>
</body>
</html>
`;

const invoiceEmailHtml = (invoice, recipientEmail) => {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333;">
      <h2 style="color:#4F46E5; margin-top:0;">
        Invoice #${invoice.invoiceNo} - ${
    invoice.seller?.name || "AndGate Informatics"
  }
      </h2>
      <p>Dear ${invoice.buyer?.name || "Customer"},</p>
      <p>Please find attached your invoice <strong>#${
        invoice.invoiceNo
      }</strong> 
      dated <strong>${
        invoice.invoiceDate?.toLocaleDateString() || "N/A"
      }</strong>.</p>
      
      <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="border:1px solid #ddd; padding: 8px;">Description</th>
            <th style="border:1px solid #ddd; padding: 8px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${
            invoice.items
              ?.map(
                (item) => `
                <tr>
                  <td style="border:1px solid #ddd; padding: 8px;">${
                    item.description
                  }</td>
                  <td style="border:1px solid #ddd; padding: 8px;">₹${item.amount.toFixed(
                    2
                  )}</td>
                </tr>`
              )
              .join("") || "<tr><td colspan='2'>No items</td></tr>"
          }
        </tbody>
      </table>

      <p><strong>Total: ₹${invoice.totals?.total || 0}</strong></p>

      <p>Regards,<br>${invoice.seller?.name || "AndGate Informatics"}</p>
    </div>
  `;
};

module.exports = {
  htmlTemplate,
  candidateHtml,
  interviewerHtml,
  candidateHtmlWithoutLink,
  interviewerHtmlWithoutLink,
  newUserTemplate,
  ForgetPass,
  eventRejectionHtml,
  eventApprovalHtml,
  invoiceEmailHtml,
};
