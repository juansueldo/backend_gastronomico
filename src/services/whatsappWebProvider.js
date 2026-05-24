const gatewayUrl = process.env.WHATSAPP_GATEWAY_URL || 'http://localhost:3100';
const gatewayApiKey = process.env.WHATSAPP_GATEWAY_API_KEY || process.env.INTERNAL_API_KEY || '';

async function requestGateway(path, options = {}) {
  const response = await fetch(`${gatewayUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': gatewayApiKey,
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || `Gateway respondió ${response.status}`);
  }

  return payload;
}

class WhatsappWebProvider {
  static provider = 'whatsapp_web';

  static connectAccount(account) {
    return requestGateway(`/internal/sessions/${account.id}/connect`, {
      method: 'POST',
      body: JSON.stringify({
        storeId: account.storeId,
        webhookUrl: process.env.MESSAGING_WEBHOOK_URL || null,
      }),
    });
  }

  static disconnectAccount(account) {
    return requestGateway(`/internal/sessions/${account.id}/disconnect`, {
      method: 'POST',
      body: JSON.stringify({ storeId: account.storeId }),
    });
  }

  static restartAccount(account) {
    return requestGateway(`/internal/sessions/${account.id}/restart`, {
      method: 'POST',
      body: JSON.stringify({ storeId: account.storeId }),
    });
  }

  static getAccountStatus(account) {
    return requestGateway(`/internal/sessions/${account.id}/status`);
  }

  static sendMessage(account, { to, body, media }) {
    return requestGateway(`/internal/sessions/${account.id}/send`, {
      method: 'POST',
      body: JSON.stringify({ storeId: account.storeId, to, body, media }),
    });
  }
}

export default WhatsappWebProvider;
