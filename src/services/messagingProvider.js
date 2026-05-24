import WhatsappWebProvider from './whatsappWebProvider.js';

const providers = {
  whatsapp_web: WhatsappWebProvider,
};

class MessagingProvider {
  static forAccount(account) {
    const provider = providers[account.provider];
    if (!provider) {
      throw new Error(`Provider de mensajería no soportado: ${account.provider}`);
    }
    return provider;
  }
}

export default MessagingProvider;
