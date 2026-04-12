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

async function sendEmailNotification(toEmail, subject, message, html, options = {}) {
  if (!toEmail) return;
  if (sendgrid) {
    try {
      await sendgrid.send({
        to: toEmail,
        from: process.env.NOTIFY_FROM_EMAIL || 'no-reply@casemate.app',
        subject,
        text: message,
        html,
        replyTo: options.replyTo,
      });
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
        html,
        replyTo: options.replyTo,
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

function formatAppointmentDate(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'the scheduled date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function sendAppointmentBookedEmail({ toEmail, lawyerName, lawyerEmail, clientName, clientEmail, date, timeSlot, appointmentId }) {
  const appointmentDate = formatAppointmentDate(date);
  const subject = `New appointment request from ${clientName}`;
  const message = [
    `Hi ${lawyerName},`,
    '',
    `${clientName} (${clientEmail}) has booked an appointment with you for ${appointmentDate} at ${timeSlot}.`,
    '',
    'Please review the request and accept or reject it from your dashboard.',
    lawyerEmail ? `Your registered email: ${lawyerEmail}` : null,
    appointmentId ? '' : null,
    appointmentId ? `Appointment ID: ${appointmentId}` : null,
  ].filter(Boolean).join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>Hi ${lawyerName},</p>
      <p><strong>${clientName}</strong> (<strong>${clientEmail}</strong>) has booked an appointment with you for <strong>${appointmentDate}</strong> at <strong>${timeSlot}</strong>.</p>
      <p>Please review the request and accept or reject it from your dashboard.</p>
      ${lawyerEmail ? `<p style="margin:0;">Your registered email: <strong>${lawyerEmail}</strong></p>` : ''}
      ${appointmentId ? `<p style="color:#6b7280;font-size:12px;">Appointment ID: ${appointmentId}</p>` : ''}
    </div>
  `;
  return sendEmailNotification(toEmail, subject, message, html, { replyTo: clientEmail });
}

async function sendAppointmentStatusEmail({ toEmail, clientName, clientEmail, lawyerName, lawyerEmail, status, date, timeSlot, appointmentId }) {
  const appointmentDate = formatAppointmentDate(date);
  const normalizedStatus = status === 'accepted' ? 'accepted' : 'rejected';
  const subject = `Your appointment has been ${normalizedStatus}`;
  const statusSentence = normalizedStatus === 'accepted'
    ? `${lawyerName} (${lawyerEmail}) has accepted your appointment for ${appointmentDate} at ${timeSlot}.`
    : `${lawyerName} (${lawyerEmail}) has rejected your appointment for ${appointmentDate} at ${timeSlot}.`;
  const message = [
    `Hi ${clientName},`,
    '',
    statusSentence,
    '',
    normalizedStatus === 'accepted'
      ? 'You can now open the chat in your dashboard and continue the case discussion.'
      : 'You can book another appointment if needed.',
    clientEmail ? `Your registered email: ${clientEmail}` : null,
    appointmentId ? '' : null,
    appointmentId ? `Appointment ID: ${appointmentId}` : null,
  ].filter(Boolean).join('\n');
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
      <p>Hi ${clientName},</p>
      <p><strong>${lawyerName}</strong> (<strong>${lawyerEmail}</strong>) has ${normalizedStatus} your appointment for <strong>${appointmentDate}</strong> at <strong>${timeSlot}</strong>.</p>
      <p>${normalizedStatus === 'accepted' ? 'You can now open the chat in your dashboard and continue the case discussion.' : 'You can book another appointment if needed.'}</p>
      ${clientEmail ? `<p style="margin:0;">Your registered email: <strong>${clientEmail}</strong></p>` : ''}
      ${appointmentId ? `<p style="color:#6b7280;font-size:12px;">Appointment ID: ${appointmentId}</p>` : ''}
    </div>
  `;
  return sendEmailNotification(toEmail, subject, message, html, { replyTo: lawyerEmail });
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

module.exports = {
  sendEmailNotification,
  sendAppointmentBookedEmail,
  sendAppointmentStatusEmail,
  sendPushNotification,
};
