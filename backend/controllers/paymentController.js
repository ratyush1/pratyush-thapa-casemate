const Payment = require('../models/Payment');
const Appointment = require('../models/Appointment');
const { getIO } = require('../utils/socket');
const { getUserSocketIds } = require('../utils/socket');
const crypto = require('crypto');

const isLocalDevOrigin = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

const resolveFrontendUrl = (req) => {
  const configuredFrontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
  const requestOrigin = String(req.get('origin') || '').trim();

  if (!requestOrigin) {
    return configuredFrontendUrl;
  }

  if (requestOrigin === configuredFrontendUrl) {
    return requestOrigin;
  }

  if (process.env.NODE_ENV !== 'production' && isLocalDevOrigin(requestOrigin)) {
    return requestOrigin;
  }

  return configuredFrontendUrl;
};

const getEsewaConfig = (req) => {
  const frontendUrl = resolveFrontendUrl(req);
  const successUrl = process.env.ESEWA_SUCCESS_URL || `${frontendUrl}/dashboard`;
  const failureUrl = process.env.ESEWA_FAILURE_URL || `${frontendUrl}/dashboard?tab=appointments&esewa=failed`;
  const rawMerchantCode = String(process.env.ESEWA_MERCHANT_CODE || 'EPAYTEST').trim();
  const merchantCode = /^YOUR_/i.test(rawMerchantCode) ? 'EPAYTEST' : rawMerchantCode;
  const rawSecretKey = String(process.env.ESEWA_SECRET_KEY || '').trim();
  // Use eSewa's public sandbox secret when running with EPAYTEST and no real secret is provided.
  const secretKey = /^YOUR_/i.test(rawSecretKey)
    ? (merchantCode === 'EPAYTEST' ? '8gBm/:&EnhH.1/q' : '')
    : (rawSecretKey || (merchantCode === 'EPAYTEST' ? '8gBm/:&EnhH.1/q' : ''));

  return {
    merchantCode,
    secretKey,
    baseUrl: process.env.ESEWA_BASE_URL || 'https://rc-epay.esewa.com.np',
    successUrl,
    failureUrl,
  };
};

const buildSignature = ({ totalAmount, transactionUuid, productCode, secretKey }) => {
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const signature = crypto.createHmac('sha256', secretKey).update(message).digest('base64');
  return { signature, signedFieldNames };
};

const normalizeBase64 = (value) => {
  return String(value || '')
    .trim()
    .replace(/\s/g, '+')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
};

const emitPaymentUpdates = (paymentId, appointmentId) => {
  try {
    const io = getIO();
    io.emit('payment_updated', {
      paymentId: paymentId.toString(),
      appointmentId: appointmentId.toString(),
      action: 'completed',
    });
    io.emit('appointment_updated', {
      appointmentId: appointmentId.toString(),
      action: 'payment_updated',
    });
    io.emit('stats_updated', { reason: 'payment_completed' });
  } catch (e) {
    // ignore socket errors
  }
};

const markPaymentCompleted = async ({ payment, appointment, amount, verifyResponse, callbackStatus }) => {
  const existingMetadata = payment.metadata || {};
  const receiptId = existingMetadata.receiptId || `RCPT-${Date.now()}-${String(payment._id).slice(-6).toUpperCase()}`;
  payment.status = 'completed';
  payment.method = 'esewa';
  payment.amount = Number(amount);
  payment.metadata = {
    ...existingMetadata,
    receiptId,
    paidAt: new Date().toISOString(),
    verifyResponse,
    callbackStatus,
  };
  await payment.save();

  appointment.paymentStatus = 'paid';
  if (!appointment.timeline) appointment.timeline = [];
  appointment.timeline.push({ event: 'paid', note: 'Payment completed successfully', actorRole: 'client', timestamp: new Date() });
  await appointment.save();

  // emit timeline update to client
  try {
    const io = getIO();
    const tlEntry = (appointment.timeline || []).slice(-1)[0];
    if (tlEntry) {
      const tlPayload = { appointmentId: appointment._id.toString(), entry: tlEntry };
      io.to(`appointment_${appointment._id}`).emit('case_timeline_update', tlPayload);
      const cId = appointment.client?.toString?.() || (appointment.client?._id?.toString?.());
      if (cId) (getUserSocketIds(cId) || []).forEach((sid) => io.to(sid).emit('case_timeline_update', tlPayload));
    }
  } catch (e) {}

  emitPaymentUpdates(payment._id, appointment._id);
};

exports.initiateEsewaPayment = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const config = getEsewaConfig(req);
    const useDevBypass = String(process.env.ESEWA_DEV_BYPASS || '').toLowerCase() === 'true';
    if (!config.secretKey) {
      return res.status(500).json({ success: false, message: 'ESEWA_SECRET_KEY is not configured' });
    }

    const appointment = await Appointment.findById(appointmentId).populate('lawyer client');
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appointment.client._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your appointment' });
    }
    if (appointment.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Already paid' });
    }
    const transactionUuid = `ESW-${appointment._id}-${Date.now()}`;
    const totalAmount = Number(appointment.amount || 0).toFixed(2);
    const { signature, signedFieldNames } = buildSignature({
      totalAmount,
      transactionUuid,
      productCode: config.merchantCode,
      secretKey: config.secretKey,
    });

    const payment = await Payment.findOneAndUpdate(
      { user: req.user.id, appointment: appointmentId, status: 'pending' },
      {
        user: req.user.id,
        appointment: appointmentId,
        amount: appointment.amount,
        currency: 'NPR',
        method: 'esewa',
        status: 'pending',
        transactionId: transactionUuid,
        metadata: {
          provider: 'esewa',
          merchantCode: config.merchantCode,
          signedFieldNames,
        },
      },
      { upsert: true, new: true }
    );

    if (useDevBypass) {
      await markPaymentCompleted({
        payment,
        appointment,
        amount: totalAmount,
        verifyResponse: { mode: 'dev_bypass' },
        callbackStatus: 'BYPASSED',
      });
      return res.status(201).json({
        success: true,
        message: 'Payment completed in sandbox bypass mode',
        payment,
        bypass: true,
      });
    }

    const paymentPayload = {
      amount: totalAmount,
      tax_amount: '0',
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: config.merchantCode,
      product_service_charge: '0',
      product_delivery_charge: '0',
      success_url: config.successUrl,
      failure_url: config.failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    };

    res.status(201).json({
      success: true,
      message: 'eSewa payment initiated',
      payment,
      esewa: {
        action: `${config.baseUrl}/api/epay/main/v2/form`,
        fields: paymentPayload,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.verifyEsewaPayment = async (req, res) => {
  try {
    const { data } = req.body || {};
    if (!data) {
      return res.status(400).json({ success: false, message: 'Missing eSewa data payload' });
    }

    const config = getEsewaConfig(req);

    let parsed;
    try {
      const decoded = Buffer.from(normalizeBase64(data), 'base64').toString('utf-8');
      parsed = JSON.parse(decoded);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid eSewa response payload' });
    }

    const {
      status,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: productCode,
      signature,
    } = parsed;

    if (!transactionUuid) {
      return res.status(400).json({ success: false, message: 'Missing transaction reference from eSewa response' });
    }

    const payment = await Payment.findOne({ transactionId: transactionUuid, user: req.user.id }).populate('appointment');
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment transaction not found' });
    }

    const appointment = await Appointment.findById(payment.appointment?._id || payment.appointment);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found for this payment' });
    }
    if (appointment.client.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your appointment payment' });
    }

    // Signature mismatch should not block genuine payments; final trust comes from eSewa status API.
    let signatureValid = null;
    if (config.secretKey && totalAmount && productCode && signature) {
      const signaturePayload = buildSignature({
        totalAmount: String(totalAmount).trim(),
        transactionUuid,
        productCode,
        secretKey: config.secretKey,
      });
      const incomingSignature = normalizeBase64(signature);
      const expectedSignature = normalizeBase64(signaturePayload.signature);
      signatureValid = incomingSignature === expectedSignature;
    }

    const statusProductCode = String(payment?.metadata?.merchantCode || productCode || config.merchantCode).trim();
    const statusAmount = Number(payment.amount || totalAmount || 0).toFixed(2);
    const statusUrl = `${config.baseUrl}/api/epay/transaction/status/?product_code=${encodeURIComponent(statusProductCode)}&total_amount=${encodeURIComponent(statusAmount)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`;
    const esewaStatusResponse = await fetch(statusUrl, { method: 'GET' });
    if (!esewaStatusResponse.ok) {
      return res.status(502).json({ success: false, message: 'Could not verify payment with eSewa' });
    }
    const esewaStatus = await esewaStatusResponse.json();

    const isCompleted = ['COMPLETE', 'SUCCESS'].includes(String(esewaStatus?.status || status || '').toUpperCase());
    if (!isCompleted) {
      payment.status = 'failed';
      payment.metadata = {
        ...(payment.metadata || {}),
        verifyResponse: esewaStatus,
        callbackStatus: status,
        callbackSignatureValid: signatureValid,
      };
      await payment.save();
      return res.status(400).json({ success: false, message: 'Payment not completed', payment });
    }

    payment.metadata = {
      ...(payment.metadata || {}),
      callbackSignatureValid: signatureValid,
    };
    await payment.save();

    await markPaymentCompleted({
      payment,
      appointment,
      amount: statusAmount,
      verifyResponse: esewaStatus,
      callbackStatus: status,
    });

    res.json({ success: true, message: 'Payment verified successfully', payment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.simulatePayment = async (req, res) => {
  try {
    const { appointmentId, method } = req.body;
    const appointment = await Appointment.findById(appointmentId).populate('lawyer client');
    if (!appointment) return res.status(404).json({ success: false, message: 'Appointment not found' });
    if (appointment.client._id.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your appointment' });
    }
    if (appointment.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Already paid' });
    }
    const payment = await Payment.create({
      user: req.user.id,
      appointment: appointmentId,
      amount: appointment.amount,
      currency: 'NPR',
      method: method || 'card',
      status: 'completed',
      transactionId: 'SIM-' + Date.now(),
    });
    appointment.paymentStatus = 'paid';
    await appointment.save();

    emitPaymentUpdates(payment._id, appointment._id);

    res.status(201).json({ success: true, payment, message: 'Payment simulated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getPaymentsByUser = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .populate({
        path: 'appointment',
        populate: [
          { path: 'lawyer', select: 'name email' },
          { path: 'client', select: 'name email' },
        ],
      })
      .sort({ createdAt: -1 });
    res.json({ success: true, payments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
