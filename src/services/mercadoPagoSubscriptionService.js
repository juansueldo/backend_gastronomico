import crypto from 'crypto';

const MERCADOPAGO_API_URL = 'https://api.mercadopago.com';

function getAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');
  return token;
}

async function mercadoPagoRequest(path, options = {}) {
  const response = await fetch(`${MERCADOPAGO_API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || `Mercado Pago respondió ${response.status}`);
  }
  return data;
}

function parseSignature(signatureHeader = '') {
  return String(signatureHeader)
    .split(',')
    .map((part) => part.trim().split('='))
    .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
}

class MercadoPagoSubscriptionService {
  static buildBackUrl(subscriptionId) {
    const configuredBackUrl = process.env.MERCADOPAGO_BACK_URL;
    if (configuredBackUrl) return configuredBackUrl.replace(':subscriptionId', subscriptionId);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return `${frontendUrl.replace(/\/$/, '')}/dashboard?subscription=${subscriptionId}`;
  }

  static verifyWebhookSignature(req) {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!secret) return true;

    const signatureHeader = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    const dataId = req.query?.['data.id'] || req.body?.data?.id || req.body?.id;
    const { ts, v1 } = parseSignature(signatureHeader);

    if (!ts || !v1 || !requestId || !dataId) return false;

    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
  }

  static createPreapproval(payload) {
    return mercadoPagoRequest('/preapproval', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static getPreapproval(preapprovalId) {
    return mercadoPagoRequest(`/preapproval/${preapprovalId}`);
  }

  static updatePreapproval(preapprovalId, payload) {
    return mercadoPagoRequest(`/preapproval/${preapprovalId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  static getAuthorizedPayment(paymentId) {
    return mercadoPagoRequest(`/authorized_payments/${paymentId}`);
  }
}

export default MercadoPagoSubscriptionService;
