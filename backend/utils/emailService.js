/**
 * Comprehensive Email Service for CaseMate
 * Handles all email notifications with HTML templates
 * Uses Nodemailer with Gmail SMTP
 */

const nodemailer = require('nodemailer');

// Initialize SMTP transporter with Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Verify SMTP connection on startup
 */
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service configuration error:', error.message);
  } else {
    console.log('✅ Email service is ready to send messages');
  }
});

/**
 * Send email helper function
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML email body
 * @param {string} text - Plain text fallback
 * @returns {Promise<boolean>}
 */
async function sendEmail(to, subject, html, text = '') {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ Email credentials not configured. Skipping email to:', to);
      return false;
    }

    const mailOptions = {
      from: `CaseMate <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent successfully to ${to}. Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return false;
  }
}

/**
 * Welcome Email Template
 */
function getWelcomeEmailTemplate(userName, userEmail) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: white; padding: 30px; }
        .content p { margin: 15px 0; }
        .highlight { color: #667eea; font-weight: 600; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
        .features { list-style: none; padding: 0; }
        .features li { padding: 10px 0; border-bottom: 1px solid #eee; }
        .features li:before { content: "✓ "; color: #667eea; font-weight: bold; margin-right: 10px; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        .footer a { color: #667eea; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to CaseMate! 🎉</h1>
          <p>Your AI-Powered Legal Companion</p>
        </div>
        <div class="content">
          <p>Hello <span class="highlight">${userName}</span>,</p>
          <p>Welcome to CaseMate, the revolutionary platform connecting you with experienced lawyers and intelligent legal assistance!</p>
          
          <h3>What You Can Do on CaseMate:</h3>
          <ul class="features">
            <li>Get instant answers to legal questions from our AI chatbot</li>
            <li>Connect directly with verified lawyers in your jurisdiction</li>
            <li>Book and manage appointments seamlessly</li>
            <li>Track your cases with our comprehensive case tracker</li>
            <li>Receive professional legal guidance and support</li>
          </ul>

          <p><strong>Getting Started:</strong></p>
          <p>Complete your profile and start exploring legal solutions immediately. Our AI chatbot is available 24/7 to help you.</p>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="cta-button">Go to Dashboard</a>
          </p>

          <p><strong>Need Help?</strong><br>
          Contact our support team at <a href="mailto:${process.env.EMAIL_USER}">support@casemate.com</a></p>

          <p>Best regards,<br>
          <strong>The CaseMate Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2026 CaseMate. All rights reserved.</p>
          <p>You received this email because you registered with us.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Appointment Booking Confirmation - For Lawyer
 */
function getAppointmentBookingLawyerTemplate(lawyerName, clientName, clientEmail, appointmentDate, timeSlot, caseDetails) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: white; padding: 30px; }
        .appointment-box { background: #f0f5ff; padding: 20px; border-left: 4px solid #f5576c; margin: 20px 0; border-radius: 4px; }
        .appointment-box p { margin: 10px 0; }
        .label { font-weight: 600; color: #666; }
        .value { color: #333; font-size: 16px; }
        .action-button { display: inline-block; background: #f5576c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Appointment Request 📅</h1>
        </div>
        <div class="content">
          <p>Hello <span style="color: #f5576c; font-weight: 600;">${lawyerName}</span>,</p>
          <p>A client has requested an appointment with you. Please review the details below:</p>

          <div class="appointment-box">
            <p><span class="label">Client Name:</span> <span class="value">${clientName}</span></p>
            <p><span class="label">Client Email:</span> <span class="value">${clientEmail}</span></p>
            <p><span class="label">Appointment Date:</span> <span class="value">${appointmentDate}</span></p>
            <p><span class="label">Time Slot:</span> <span class="value">${timeSlot}</span></p>
            <p><span class="label">Case Details:</span> <span class="value">${caseDetails || 'Not provided'}</span></p>
          </div>

          <p><strong>What's Next?</strong></p>
          <p>1. Review the case details and documents provided by the client<br>
          2. Accept or decline the appointment from your dashboard<br>
          3. Once accepted, you can communicate with the client via our secure chat</p>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/lawyer/appointments" class="action-button">Review Appointment</a>
          </p>

          <p><strong>Need Support?</strong><br>
          Contact us at <a href="mailto:${process.env.EMAIL_USER}">support@casemate.com</a></p>

          <p>Best regards,<br>
          <strong>The CaseMate Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2026 CaseMate. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Appointment Status Update - For Client
 */
function getAppointmentStatusTemplate(clientName, lawyerName, lawyerEmail, appointmentDate, timeSlot, status) {
  const isAccepted = status === 'accepted';
  const headerGradient = isAccepted ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  const headerText = isAccepted ? 'Appointment Accepted! ✅' : 'Appointment Update ❌';
  const statusMessage = isAccepted 
    ? `Great news! <strong>${lawyerName}</strong> has <strong style="color: #667eea;">accepted</strong> your appointment request.`
    : `Unfortunately, <strong>${lawyerName}</strong> has <strong style="color: #f5576c;">declined</strong> your appointment request.`;
  const nextSteps = isAccepted
    ? `
      <p><strong>What's Next?</strong></p>
      <p>1. Payment is due before the appointment<br>
      2. Complete the payment to secure your slot<br>
      3. Open the chat with your lawyer to discuss case details<br>
      4. Prepare any documents needed for the consultation</p>
    `
    : `
      <p><strong>What's Next?</strong></p>
      <p>1. Try booking with another lawyer<br>
      2. Review your case details and refine them<br>
      3. Our AI chatbot can help you prepare better</p>
    `;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .header { background: ${headerGradient}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: white; padding: 30px; }
        .appointment-box { background: #f0f5ff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
        .appointment-box p { margin: 10px 0; }
        .label { font-weight: 600; color: #666; }
        .value { color: #333; font-size: 16px; }
        .action-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${headerText}</h1>
        </div>
        <div class="content">
          <p>Hello <span style="color: #667eea; font-weight: 600;">${clientName}</span>,</p>
          <p>${statusMessage}</p>

          <div class="appointment-box">
            <p><span class="label">Lawyer Name:</span> <span class="value">${lawyerName}</span></p>
            <p><span class="label">Lawyer Email:</span> <span class="value">${lawyerEmail}</span></p>
            <p><span class="label">Appointment Date:</span> <span class="value">${appointmentDate}</span></p>
            <p><span class="label">Time Slot:</span> <span class="value">${timeSlot}</span></p>
          </div>

          ${nextSteps}

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="action-button">View Dashboard</a>
          </p>

          <p><strong>Questions?</strong><br>
          Contact us at <a href="mailto:${process.env.EMAIL_USER}">support@casemate.com</a></p>

          <p>Best regards,<br>
          <strong>The CaseMate Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2026 CaseMate. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Payment Receipt Email
 */
function getPaymentReceiptTemplate(userName, userEmail, amount, appointmentDate, lawyerName, transactionId) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: white; padding: 30px; }
        .receipt-box { background: #f0fff4; padding: 20px; border: 2px solid #38ef7d; margin: 20px 0; border-radius: 4px; }
        .receipt-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
        .receipt-row.total { border: none; border-top: 2px solid #38ef7d; padding-top: 15px; font-weight: 700; font-size: 18px; color: #11998e; }
        .label { color: #666; }
        .value { font-weight: 600; color: #333; }
        .action-button { display: inline-block; background: #38ef7d; color: #333; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Received ✓</h1>
          <p>Your appointment is secured!</p>
        </div>
        <div class="content">
          <p>Hello <span style="color: #11998e; font-weight: 600;">${userName}</span>,</p>
          <p>Thank you for your payment! Your appointment with <strong>${lawyerName}</strong> is now confirmed.</p>

          <div class="receipt-box">
            <div class="receipt-row">
              <span class="label">Appointment Date:</span>
              <span class="value">${appointmentDate}</span>
            </div>
            <div class="receipt-row">
              <span class="label">Lawyer:</span>
              <span class="value">${lawyerName}</span>
            </div>
            <div class="receipt-row">
              <span class="label">Amount Paid:</span>
              <span class="value">${formattedAmount}</span>
            </div>
            <div class="receipt-row">
              <span class="label">Transaction ID:</span>
              <span class="value">${transactionId}</span>
            </div>
            <div class="receipt-row total">
              <span class="label">Status:</span>
              <span class="value" style="color: #38ef7d;">PAID</span>
            </div>
          </div>

          <p><strong>Important Information:</strong></p>
          <p>✓ Your payment is secure and encrypted<br>
          ✓ You can access your appointment details from your dashboard<br>
          ✓ Open the chat to communicate with your lawyer<br>
          ✓ A receipt has been saved to your account</p>

          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard" class="action-button">View My Appointment</a>
          </p>

          <p><strong>Need a Copy?</strong><br>
          You can always download your receipt from your account dashboard or contact us at <a href="mailto:${process.env.EMAIL_USER}">support@casemate.com</a></p>

          <p>Best regards,<br>
          <strong>The CaseMate Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2026 CaseMate. All rights reserved.</p>
          <p>This is an automated message, please do not reply directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Password Reset Email
 */
function getPasswordResetTemplate(userName, resetLink, expiryTime = '24 hours') {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #333; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: white; padding: 30px; }
        .warning-box { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; border-radius: 4px; color: #856404; }
        .reset-button { display: inline-block; background: #fa709a; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; font-size: 16px; }
        .code-box { background: #f5f5f5; padding: 15px; border-radius: 4px; font-family: monospace; text-align: center; word-break: break-all; margin: 15px 0; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Reset Your Password 🔐</h1>
        </div>
        <div class="content">
          <p>Hello <span style="color: #fa709a; font-weight: 600;">${userName}</span>,</p>
          <p>We received a request to reset your CaseMate password. Click the link below to create a new password:</p>

          <div style="text-align: center;">
            <a href="${resetLink}" class="reset-button">Reset Password</a>
          </div>

          <p style="text-align: center; color: #666; font-size: 14px;">Or copy this link:<br>
          <div class="code-box">${resetLink}</div></p>

          <div class="warning-box">
            <strong>⚠️ Security Notice:</strong><br>
            This link will expire in ${expiryTime}. If you didn't request a password reset, please ignore this email or contact us immediately.
          </div>

          <p><strong>Safety Tips:</strong></p>
          <p>• Never share this link with anyone<br>
          • We will never ask for your password via email<br>
          • Use a strong password with numbers and special characters<br>
          • Enable two-factor authentication for extra security</p>

          <p><strong>Still Need Help?</strong><br>
          Contact our support team at <a href="mailto:${process.env.EMAIL_USER}">support@casemate.com</a></p>

          <p>Best regards,<br>
          <strong>The CaseMate Security Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2026 CaseMate. All rights reserved.</p>
          <p>This is a security-related email. Please do not forward it.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Account Verification Email
 */
function getVerificationEmailTemplate(userName, verificationLink) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: white; padding: 30px; }
        .verify-button { display: inline-block; background: #667eea; color: white; padding: 14px 40px; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: 600; font-size: 16px; }
        .info-box { background: #f0f5ff; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px; }
        .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Verify Your Email Address</h1>
        </div>
        <div class="content">
          <p>Hello <span style="color: #667eea; font-weight: 600;">${userName}</span>,</p>
          <p>Welcome to CaseMate! Please verify your email address to complete your registration and unlock all features.</p>

          <div style="text-align: center;">
            <a href="${verificationLink}" class="verify-button">Verify Email Address</a>
          </div>

          <div class="info-box">
            <p><strong>Why verify?</strong></p>
            <p>✓ Secure your account<br>
            ✓ Receive appointment notifications<br>
            ✓ Enable password recovery<br>
            ✓ Access all CaseMate features</p>
          </div>

          <p>This link will expire in 24 hours. If you didn't create a CaseMate account, please delete this email.</p>

          <p>Best regards,<br>
          <strong>The CaseMate Team</strong></p>
        </div>
        <div class="footer">
          <p>&copy; 2026 CaseMate. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Export all email functions
 */
module.exports = {
  sendEmail,
  getWelcomeEmailTemplate,
  getAppointmentBookingLawyerTemplate,
  getAppointmentStatusTemplate,
  getPaymentReceiptTemplate,
  getPasswordResetTemplate,
  getVerificationEmailTemplate,
  
  /**
   * Wrapper functions for common use cases
   */
  sendWelcomeEmail: async (email, userName) => {
    const html = getWelcomeEmailTemplate(userName, email);
    return sendEmail(email, '🎉 Welcome to CaseMate!', html);
  },

  sendAppointmentConfirmationToLawyer: async (lawyerEmail, lawyerName, clientName, clientEmail, appointmentDate, timeSlot, caseDetails) => {
    const html = getAppointmentBookingLawyerTemplate(lawyerName, clientName, clientEmail, appointmentDate, timeSlot, caseDetails);
    return sendEmail(lawyerEmail, `New Appointment Request from ${clientName}`, html);
  },

  sendAppointmentStatusToClient: async (clientEmail, clientName, lawyerName, lawyerEmail, appointmentDate, timeSlot, status) => {
    const html = getAppointmentStatusTemplate(clientName, lawyerName, lawyerEmail, appointmentDate, timeSlot, status);
    const subject = status === 'accepted' ? '✅ Your Appointment Has Been Accepted!' : '❌ Appointment Update';
    return sendEmail(clientEmail, subject, html);
  },

  sendPaymentReceipt: async (userEmail, userName, amount, appointmentDate, lawyerName, transactionId) => {
    const html = getPaymentReceiptTemplate(userName, userEmail, amount, appointmentDate, lawyerName, transactionId);
    return sendEmail(userEmail, '💳 Payment Receipt - CaseMate Appointment', html);
  },

  sendPasswordResetEmail: async (email, userName, resetLink) => {
    const html = getPasswordResetTemplate(userName, resetLink);
    return sendEmail(email, '🔐 Reset Your CaseMate Password', html);
  },

  sendVerificationEmail: async (email, userName, verificationLink) => {
    const html = getVerificationEmailTemplate(userName, verificationLink);
    return sendEmail(email, '📧 Verify Your CaseMate Email', html);
  },
};
