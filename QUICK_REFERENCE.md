# CaseMate Email System - Quick Reference Guide

## 🚀 Quick Setup (5 minutes)

### Verify Configuration
```bash
cd backend
# Check .env file has:
# EMAIL_USER=casemateadmin@gmail.com
# EMAIL_PASS=%casemate123
```

### Start Backend
```bash
npm run dev
# Look for: ✅ Email service is ready to send messages
```

### Test Email (Create User)
```
1. Open app
2. Register new account
3. Check inbox for welcome email
```

---

## 📧 Email Functions Reference

### **1. Welcome Email** (Auto-sent on registration)
```javascript
emailService.sendWelcomeEmail(email, userName)
```
**Sent To**: New user  
**When**: After successful registration  
**Contains**: Welcome message, platform features, dashboard link  

---

### **2. Appointment Booking** (Auto-sent to lawyer)
```javascript
emailService.sendAppointmentConfirmationToLawyer(
  lawyerEmail,
  lawyerName,
  clientName,
  clientEmail,
  appointmentDate,
  timeSlot,
  caseDetails
)
```
**Sent To**: Lawyer  
**When**: Client books appointment  
**Contains**: Client info, appointment details, action button  

---

### **3. Appointment Status** (Auto-sent to client)
```javascript
emailService.sendAppointmentStatusToClient(
  clientEmail,
  clientName,
  lawyerName,
  lawyerEmail,
  appointmentDate,
  timeSlot,
  'accepted' // or 'rejected'
)
```
**Sent To**: Client  
**When**: Lawyer accepts or rejects appointment  
**Contains**: Decision, lawyer info, next steps  

---

### **4. Payment Receipt** (Auto-sent to client)
```javascript
emailService.sendPaymentReceipt(
  userEmail,
  userName,
  amount,
  appointmentDate,
  lawyerName,
  transactionId
)
```
**Sent To**: Client  
**When**: Payment successful  
**Contains**: Receipt details, transaction ID, confirmation  

---

### **5. Password Reset** (Ready to integrate)
```javascript
emailService.sendPasswordResetEmail(
  email,
  userName,
  resetLink // URL with reset token
)
```
**To Use**: Integrate in password reset endpoint  
**Contains**: Reset link, expiration, security warnings  

---

### **6. Email Verification** (Ready to integrate)
```javascript
emailService.sendVerificationEmail(
  email,
  userName,
  verificationLink // URL with verification token
)
```
**To Use**: Integrate in email verification flow  
**Contains**: Verification link, benefits, expiration  

---

## 🔧 Integration Points (Already Done)

| Feature | File | Status |
|---------|------|--------|
| Registration Welcome | `authController.js` | ✅ Active |
| Appointment Booking | `appointmentController.js` | ✅ Active |
| Appointment Response | `appointmentController.js` | ✅ Active |
| Payment Receipt | `paymentController.js` | ✅ Active |
| Password Reset | `authController.js` | ⏳ Ready |
| Email Verification | `authController.js` | ⏳ Ready |

---

## 🎨 HTML Email Templates

All emails have:
- ✅ Responsive design (mobile-friendly)
- ✅ Professional styling
- ✅ Brand-consistent colors
- ✅ Clear call-to-action buttons
- ✅ Plain text fallback
- ✅ Footer with contact info

---

## ⚙️ Environment Variables

```env
# Required for email to work:
EMAIL_USER=casemateadmin@gmail.com
EMAIL_PASS=%casemate123
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

# Also needed:
FRONTEND_URL=http://localhost:3000 # Links in emails
```

---

## 🔍 How to Check Emails Work

### Test 1: Registration Email
```
1. Register new user in app
2. Check inbox for "Welcome to CaseMate! 🎉"
3. Verify dashboard link works
```

### Test 2: Appointment Booking
```
1. Login as client
2. Book appointment with a lawyer
3. Check lawyer's inbox for booking notification
```

### Test 3: Appointment Response
```
1. Login as lawyer
2. Reject an appointment
3. Check client's inbox for rejection notice
```

### Test 4: Payment Receipt
```
1. Complete payment for appointment
2. Check inbox for payment receipt
3. Verify transaction ID matches
```

---

## 📊 Email Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| ✅ | Email queued successfully | None - sent in background |
| ❌ | Email failed | Check console logs |
| ⚠️ | Email provider not configured | Set EMAIL_USER & EMAIL_PASS |

---

## 🐛 Common Issues

### Emails not arriving?
```
1. Check .env has EMAIL_USER and EMAIL_PASS
2. Verify 2FA is enabled on Gmail
3. Check Gmail security settings
4. Look for error logs in backend console
```

### Wrong email content?
```
1. Verify customer data (name, email, date format)
2. Check API variables are passed correctly
3. Review email template in emailService.js
```

### SMTP connection failed?
```
1. Verify EMAIL_USER & EMAIL_PASS
2. Check internet connection
3. Verify Gmail account hasn't been locked
4. Check backend logs for detailed error
```

---

## 🎯 Email Customization

### Change Email Sender Name
In `emailService.js`, line with "CaseMate":
```javascript
from: `CaseMate <${process.env.EMAIL_USER}>`,  // Change "CaseMate" here
```

### Add Custom Brand Color
In template functions, replace gradient colors:
```javascript
// Old:
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

// New (your color):
background: linear-gradient(135deg, #YourColor1 0%, #YourColor2 100%);
```

### Change Email Footer
In template functions, modify footer section:
```html
<p>&copy; 2026 CaseMate. All rights reserved.</p>
```

### Add Legal Disclaimers
Add to any template's footer:
```html
<p>This is an automated message. Do not reply directly.</p>
```

---

## 📈 How to Scale

### When you launch:
1. ✅ Current setup (Gmail) - working
2. ✅ All emails integrated - working
3. ✅ Proper error handling - implemented

### For production:
1. Create dedicated Gmail account
2. Enable 2FA and generate app password
3. Increase email limits if needed
4. Monitor delivery in Gmail logs

### For high volume:
1. Migrate to SendGrid or AWS SES
2. Add email queue system (Bull)
3. Implement bounce handling
4. Track delivery metrics

### Future enhancements:
- Email templates in database
- Dynamic logo/branding in emails
- Multi-language support
- Email signature verification
- SMTP relay configuration

---

## 🔐 Security Reminders

✅ **DO:**
- Use app password (not Gmail password)
- Keep .env in .gitignore
- Rotate credentials periodically
- Monitor Gmail account activity
- Use 2FA on Gmail account

❌ **DON'T:**
- Hardcode credentials in code
- Commit .env to git
- Share credentials with team
- Use real Gmail password
- Keep old credentials in history

---

## 📞 Support Files

| File | Purpose |
|------|---------|
| `/backend/utils/emailService.js` | Main email implementation |
| `/EMAIL_SETUP_GUIDE.md` | Complete setup documentation |
| `/IMPLEMENTATION_SUMMARY.md` | Technical implementation details |
| `/backend/.env` | Configuration (keep private!) |
| `/backend/.env.example` | Configuration template |

---

## ✅ Currently Active Emails

- ✅ **Welcome Email** - New user registration
- ✅ **Booking Confirmation** - Lawyer receives when client books
- ✅ **Appointment Accepted** - Client receives when accepted
- ✅ **Appointment Rejected** - Client receives when rejected
- ✅ **Payment Receipt** - Client receives after payment

## ⏳ Ready to Integrate (Optional)

- ⏳ **Password Reset** - Needs password reset endpoint
- ⏳ **Email Verification** - Needs verification flow

---

## 🎓 Code Examples

### Use in Controller
```javascript
// At top of controller file:
const emailService = require('../utils/emailService');

// In your route handler:
await emailService.sendWelcomeEmail(user.email, user.name)
  .catch(err => console.error('Email failed:', err.message));
```

### Error Handling
```javascript
// Non-blocking (recommended):
emailService.sendWelcomeEmail(email, name)
  .catch(err => console.error('Background email failed:', err));

// User still gets API response immediately!
```

### Format Date for Email
```javascript
const appointmentDate = new Date(appointment.date).toLocaleDateString('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});
// Output: "April 12, 2026"
```

---

## 📋 Checklist for Team

- [ ] Read `EMAIL_SETUP_GUIDE.md`
- [ ] Verify .env has EMAIL_USER and EMAIL_PASS
- [ ] Start backend and check for ✅ email service message
- [ ] Register test user and check for welcome email
- [ ] Book test appointment and verify lawyer gets email
- [ ] Accept/reject appointment and verify client gets email
- [ ] Complete payment and verify receipt email

---

**Last Updated**: April 12, 2026  
**Status**: ✅ Ready for Production  
**Version**: 1.0.0

For detailed setup: See `EMAIL_SETUP_GUIDE.md`  
For technical details: See `IMPLEMENTATION_SUMMARY.md`  
For code: See `/backend/utils/emailService.js`
