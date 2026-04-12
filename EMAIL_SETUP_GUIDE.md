
# CaseMate Email Notification System - Complete Setup Guide

## 📧 Overview

The CaseMate email notification system is built with **Node.js**, **Express**, and **Nodemailer** to handle all user communications including:

- ✅ Welcome emails for new users
- ✅ Appointment booking confirmations (to lawyer)
- ✅ Appointment status updates (acceptance/rejection to client)
- ✅ Payment receipts
- ✅ Password reset links
- ✅ Email verification

## 🔧 Prerequisites

Before setting up the email system, you need:

1. **Gmail Account** with 2-Factor Authentication enabled
2. **App Password** generated from Google Account

### Generate Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** (if not already enabled)
3. Go to **App passwords** section
4. Select "Mail" and "Windows Computer" (or your device)
5. Google will generate a **16-character app password**
6. Copy this password and save it securely

⚠️ **Important**: 
- Use the **app password**, NOT your actual Gmail password
- For CaseMate: We're using `casemateadmin@gmail.com` with app password `%casemate123`
- Never commit credentials to version control

## 📁 File Structure

```
backend/
├── utils/
│   ├── emailService.js          # Main email utility with templates
│   └── notify.js                # (Keep for backward compatibility)
├── controllers/
│   ├── authController.js        # Updated: Send welcome emails
│   ├── appointmentController.js # Updated: Send appointment emails
│   └── paymentController.js     # Updated: Send payment receipts
├── .env                         # Environment variables (GITIGNORE)
└── .env.example                 # Template with documentation
```

## ⚙️ Configuration

### 1. Setup Environment Variables

Update your `.env` file in the `backend/` directory:

```env
# Email Configuration - Gmail SMTP
EMAIL_USER=casemateadmin@gmail.com
EMAIL_PASS=%casemate123
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Other configurations...
FRONTEND_URL=http://localhost:3000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=...
```

### 2. Update .env.example

The `.env.example` file has been updated with instructions for future developers:

```env
# Email Configuration - Gmail SMTP with App Password
# Get App Password: https://myaccount.google.com/apppasswords
# Note: 2FA must be enabled on your Gmail account
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password-16-chars
```

### 3. Verify SMTP Connection

The email service automatically verifies the SMTP connection on startup. Check your backend logs for:

```
✅ Email service is ready to send messages
```

If you see an error, verify your credentials and make sure 2FA is enabled on your Gmail account.

## 🚀 Usage Examples

### In Auth Controller (User Registration)

```javascript
// Send welcome email when user registers
emailService.sendWelcomeEmail(user.email, user.name)
  .catch((err) => {
    console.error('Failed to send welcome email:', err.message);
  });
```

### In Appointment Controller (Booking)

```javascript
// Send confirmation to lawyer
emailService.sendAppointmentConfirmationToLawyer(
  lawyerEmail,
  lawyerName,
  clientName,
  clientEmail,
  appointmentDate,
  timeSlot,
  caseDetails
).catch(err => console.error('Email error:', err.message));
```

### In Appointment Controller (Status Update)

```javascript
// Send status update to client
emailService.sendAppointmentStatusToClient(
  clientEmail,
  clientName,
  lawyerName,
  lawyerEmail,
  appointmentDate,
  timeSlot,
  'accepted' // or 'rejected'
).catch(err => console.error('Email error:', err.message));
```

### In Payment Controller (Receipt)

```javascript
// Send payment receipt
emailService.sendPaymentReceipt(
  userEmail,
  userName,
  amount,
  appointmentDate,
  lawyerName,
  transactionId
).catch(err => console.error('Email error:', err.message));
```

### Password Reset (Optional Integration)

```javascript
// Send password reset email
emailService.sendPasswordResetEmail(
  userEmail,
  userName,
  resetLink // e.g., https://frontend.com/reset-password?token=xyz
).catch(err => console.error('Email error:', err.message));
```

### Email Verification (Optional Integration)

```javascript
// Send email verification
emailService.sendVerificationEmail(
  userEmail,
  userName,
  verificationLink // e.g., https://frontend.com/verify?token=xyz
).catch(err => console.error('Email error:', err.message));
```

## 📧 Email Templates

All email templates are professional HTML with:

- **Responsive Design**: Works on desktop and mobile
- **Brand Colors**: Purple gradients for CaseMate branding
- **Clear CTAs**: Call-to-action buttons for user engagement
- **Fallback Text**: Plain text version for email clients that don't support HTML

### Template List

1. **Welcome Email** - Sent to new users after registration
   - Explains CaseMate features
   - Encourages dashboard exploration
   - Professional branding

2. **Appointment Booking (Lawyer)** - Sent to lawyer when client books
   - Client name and email
   - Appointment date and time
   - Case details summary
   - Action button to review

3. **Appointment Status (Client)** - Sent to client when lawyer accepts/rejects
   - Lawyer name and email
   - Clear acceptance or rejection message
   - Next steps guidance
   - Dashboard link

4. **Payment Receipt** - Sent after successful payment
   - Transaction ID and amount
   - Appointment details
   - Professional receipt format
   - Security information

5. **Password Reset** - Sent for password recovery
   - Secure reset link
   - Expiration time (24 hours)
   - Security warnings
   - Support contact

6. **Email Verification** - Sent for email confirmation
   - Verification link
   - Benefits of verification
   - Expiration time (24 hours)

## 🔒 Security Best Practices

✅ **Implemented:**
- App passwords used instead of actual Gmail password
- Environment variables for all credentials
- Non-blocking email sending (doesn't block API responses)
- Error handling and logging
- Graceful fallback if email provider is down

✅ **To Add (Optional):**
- Email rate limiting to prevent spam
- Email signature verification
- Bounce handling and unsubscribe management
- Email retry queue for failed sends
- Detailed email delivery logs

## 🐛 Troubleshooting

### Issue: "Email service configuration error"

**Solution**: Check your Gmail credentials and ensure 2FA is enabled.

```bash
# Verify in .env:
EMAIL_USER=casemateadmin@gmail.com
EMAIL_PASS=%casemate123  # (This should be app password, not Gmail password)
```

### Issue: "Less secure app access" error

**Solution**: Gmail now requires app passwords. Generate one from:
https://myaccount.google.com/apppasswords

### Issue: Emails not sending in development

**Solution**: Check the backend logs for errors. Make sure SMTP credentials are correct:

```javascript
// Debug: Check transporter status
// In emailService.js - verify runs on startup
```

### Issue: Timeout errors during email send

**Solution**: This usually indicates SMTP server unreachability. Verify:
- Internet connection is active
- SMTP_HOST and SMTP_PORT are correct
- Gmail account hasn't blocked suspicious activity
- Check Gmail's recent activity log

## 📊 Email Sending Flow

```
User Action (Registration/Booking/Payment)
    ↓
API Endpoint (authController/appointmentController/paymentController)
    ↓
emailService.send*() function
    ↓
Verify credentials from .env
    ↓
Generate HTML email template
    ↓
Send via Nodemailer SMTP
    ↓
Log success/failure
    ↓
Return to API (non-blocking)
    ↓
API responds immediately to client
```

## 🔄 Integration Checklist

- [x] ✅ emailService.js created with all templates
- [x] ✅ authController.js - Welcome email on registration
- [x] ✅ appointmentController.js - Booking & status emails
- [x] ✅ paymentController.js - Payment receipts
- [x] ✅ .env configured with Gmail credentials
- [x] ✅ .env.example documented for team
- [ ] ☐ (Optional) Password reset endpoint
- [ ] ☐ (Optional) Email verification flow
- [ ] ☐ (Optional) Email queue system (Bull/RabbitMQ)
- [ ] ☐ (Optional) Webhook for delivery tracking

## 🚀 Production Deployment

### For Production Gmail Account:

1. Create a dedicated Gmail account for CaseMate emails
2. Enable 2-Factor Authentication
3. Generate app password from Google Account settings
4. Store app password in production environment variables
5. Use a custom domain email (optional) with Gmail forwarding

### For Scale (Optional Email Services):

When you grow, consider:

1. **SendGrid** - Professional email delivery
   - Higher reliability
   - Better deliverability
   - Analytics and logs
   - Warm-up sequences

2. **AWS SES** - AWS integration
   - Low cost at scale
   - Excellent for high volume
   - DKIM/SPF support

3. **Mailgun** - Developer-friendly
   - Excellent documentation
   - Event webhooks
   - Template engine

## 📈 Monitoring & Logging

Check your backend logs for:

```
✅ Email sent successfully to user@email.com. Message ID: ...
❌ Failed to send email to user@email.com: [error details]
⚠️ Email credentials not configured. Skipping email to: ...
```

## 🆘 Support

For issues with the email system:

1. Check backend logs for error messages
2. Verify .env file has correct credentials
3. Test SMTP connection with: [https://mailtrap.io/](https://mailtrap.io/)
4. Check Gmail account's Recent security activity
5. Ensure 2FA is enabled on Gmail account
6. Verify app password was generated correctly

---

**Last Updated**: April 12, 2026  
**Email Service Version**: 1.0.0  
**Nodemailer Version**: 6.10.1  
**Status**: ✅ Production Ready
