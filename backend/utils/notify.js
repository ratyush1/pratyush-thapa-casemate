// Simple placeholder notification utilities. Integrate real email/push providers in production.
let sendgrid = null;
let fcm = null;
let smtpTransport = null;

try {
  if (process.env.SENDGRID_API_KEY) {
    sendgrid = require('@sendgrid/mail');
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
  }
} catch (e) {
  console.warn('SendGrid not installed or configured. To enable email notifications install @sendgrid/mail and set SENDGRID_API_KEY.');
}

try {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const nodemailer = require('nodemailer');
    smtpTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
} catch (e) {
  console.warn('SMTP not installed or configured. To enable SMTP install nodemailer and set SMTP_HOST/SMTP_USER/SMTP_PASS.');
}

try {
  if (process.env.FCM_SERVICE_ACCOUNT_JSON) {
    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    fcm = admin.messaging();
  }
} catch (e) {
  console.warn('Firebase Admin SDK not installed or configured. To enable push notifications install firebase-admin and set FCM_SERVICE_ACCOUNT_JSON.');
}

async function sendEmailNotification(toEmail, subject, message) {
  if (!toEmail) return;
  if (sendgrid) {
    try {
      await sendgrid.send({ to: toEmail, from: process.env.NOTIFY_FROM_EMAIL || 'no-reply@casemate.app', subject, text: message });
      return true;
    } catch (e) { console.error('sendgrid error', e); }
  }
  if (smtpTransport) {
    try {
      await smtpTransport.sendMail({
        from: process.env.NOTIFY_FROM_EMAIL || process.env.SMTP_USER,
        to: toEmail,
        subject,
        text: message,
      });
      return true;
    } catch (e) {
      console.error('smtp error', e);
    }
  }
  if (!sendgrid && !smtpTransport) {
    console.warn('[notify] Email provider not configured. Set SENDGRID_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS.');
  }
  console.info(`[notify] (stub) sendEmailNotification -> to=${toEmail} subject=${subject}`);
  return false;
}

async function sendPushNotification(userId, payload) {
  if (fcm) {
    try {
      // In production map userId -> device tokens and send; here we log the payload
      console.info('[notify] fcm.send payload', payload);
      return;
    } catch (e) { console.error('fcm error', e); }
  }
  console.info(`[notify] (stub) sendPushNotification -> user=${userId} payload=${JSON.stringify(payload)}`);
}

module.exports = { sendEmailNotification, sendPushNotification };
