import { Op } from 'sequelize';
import {
  Contact,
  Conversation,
  Customer,
  Instance,
  Message,
  MessagingAccount,
  Network,
} from '../models/index.js';
import MessagingProvider from '../services/messagingProvider.js';
import MessagingNotifier from '../services/messagingNotifier.js';
import NotificationService from '../services/notificationService.js';
import MediaStorageService from '../services/mediaStorageService.js';

const PROVIDER = 'whatsapp_web';

function normalizePhone(value) {
  if (!value) return null;
  const raw = String(value).replace('@c.us', '').replace('@s.whatsapp.net', '');
  const digits = raw.replace(/\D/g, '');
  return digits || null;
}

function toExternalChatId(value) {
  const phone = normalizePhone(value);
  return phone ? `${phone}@c.us` : null;
}

function normalizeExternalChatId(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  if (raw.includes('@')) return raw;
  return toExternalChatId(raw);
}

function isWhatsappLid(value) {
  return String(value || '').toLowerCase().includes('@lid');
}

function lidToExternalChatId(value) {
  if (!isWhatsappLid(value)) return null;
  const userPart = String(value || '').split('@')[0] || '';
  const digits = userPart.replace(/\D/g, '');
  return digits ? `${digits}@c.us` : null;
}

function externalChatIdToLid(value) {
  const chatId = normalizeExternalChatId(value);
  if (!chatId || isWhatsappLid(chatId)) return null;
  const digits = normalizePhone(chatId);
  return digits ? `${digits}@lid` : null;
}

function expandWhatsappAliases(values = []) {
  const aliases = [];

  values.forEach((value) => {
    const chatId = normalizeExternalChatId(value);
    if (!chatId) return;

    aliases.push(chatId);
    if (isWhatsappLid(chatId)) {
      aliases.push(lidToExternalChatId(chatId));
    } else {
      aliases.push(externalChatIdToLid(chatId));
    }
  });

  return Array.from(new Set(aliases.filter(Boolean)));
}

function isAccountAlias(account, alias) {
  const accountPhone = normalizePhone(account?.phone);
  if (!accountPhone || isWhatsappLid(alias)) return false;
  return normalizePhone(alias) === accountPhone;
}

function getInboundPhone(payload) {
  if (
    payload.technicalAlias === true
    || payload.technical_alias === true
    || isWhatsappLid(payload.originalFrom)
    || isWhatsappLid(payload.original_from)
  ) {
    const contactPhone = [
      payload.contactPhone,
      payload.contact_phone,
      payload.fromPhone,
      payload.from_phone,
      payload.phone,
      payload.externalChatId,
      payload.external_chat_id,
      payload.from,
    ].find((candidate) => candidate && !isWhatsappLid(candidate) && normalizePhone(candidate));
    const normalizedContactPhone = normalizePhone(contactPhone);
    return normalizedContactPhone || null;
  }

  const candidates = [
    payload.contactPhone,
    payload.contact_phone,
    payload.fromPhone,
    payload.from_phone,
    payload.phone,
    payload.from,
    payload.author,
  ];

  for (const candidate of candidates) {
    if (!candidate || isWhatsappLid(candidate)) continue;
    const normalized = normalizePhone(candidate);
    if (normalized) return normalized;
  }

  return null;
}

function getInboundAliasIds(payload = {}, account = null) {
  const rawAliases = Array.isArray(payload.aliasIds)
    ? payload.aliasIds
    : Array.isArray(payload.alias_ids)
      ? payload.alias_ids
      : [];

  return expandWhatsappAliases([
    payload.externalChatId,
    payload.external_chat_id,
    payload.from,
    payload.originalFrom,
    payload.original_from,
    payload.originalAuthor,
    payload.original_author,
    payload.author,
    payload.contactId,
    payload.contact_id,
    payload.contactPhone ? toExternalChatId(payload.contactPhone) : null,
    payload.contact_phone ? toExternalChatId(payload.contact_phone) : null,
    ...rawAliases,
  ]).filter((alias) => !isAccountAlias(account, alias));
}

function getInboundExternalChatId(payload, phone = null) {
  if (phone) return toExternalChatId(phone);

  const candidates = [
    payload.externalChatId,
    payload.external_chat_id,
    payload.from,
    payload.author,
    payload.originalFrom,
    payload.originalAuthor,
  ];

  for (const candidate of candidates) {
    const chatId = normalizeExternalChatId(candidate);
    if (chatId) return chatId;
  }

  return null;
}

function getGatewayAliasIds(payload = {}) {
  const rawAliases = Array.isArray(payload.aliasIds)
    ? payload.aliasIds
    : Array.isArray(payload.alias_ids)
      ? payload.alias_ids
      : [];

  return expandWhatsappAliases([
    payload.chatId,
    payload.chat_id,
    payload.contactId,
    payload.contact_id,
    payload.contactPhone ? toExternalChatId(payload.contactPhone) : null,
    payload.contact_phone ? toExternalChatId(payload.contact_phone) : null,
    payload.to,
    ...rawAliases,
  ]);
}

function buildProviderMessageId(account, payload, phone, body) {
  if (payload.id) return String(payload.id);

  return [
    account.id,
    phone || 'unknown',
    payload.timestamp || Date.now(),
    String(body || '').slice(0, 80),
  ].join(':');
}

function getPagination(query) {
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  return { limit, offset: (page - 1) * limit, page };
}

function preview(body) {
  if (!body) return null;
  return String(body).slice(0, 140);
}

function messagePreview(message) {
  const textPreview = preview(message.body);
  if (textPreview) return textPreview;
  if (message.type === 'image') return 'Imagen';
  if (message.type === 'audio') return 'Audio';
  if (message.type === 'video') return 'Video';
  if (message.type === 'document') return 'Documento';
  return null;
}

function isOutboundGatewayMessage(payload) {
  return payload.fromMe === true || payload.from_me === true || payload.direction === 'outbound' || payload.direction === 'o';
}

function normalizeMessageType(value) {
  const type = String(value || 'text').toLowerCase();
  if (['text', 'image', 'audio', 'video', 'document', 'location'].includes(type)) return type;
  if (type.includes('image')) return 'image';
  if (type.includes('audio') || type.includes('ptt') || type.includes('voice')) return 'audio';
  if (type.includes('video')) return 'video';
  if (type.includes('document') || type.includes('file') || type.includes('application')) return 'document';
  if (type.includes('location')) return 'location';
  return 'unknown';
}

function getMediaUrl(payload) {
  return (
    payload.mediaUrl ||
    payload.media_url ||
    payload.media?.url ||
    payload.media?.mediaUrl ||
    payload.attachment?.url ||
    payload.file?.url ||
    null
  );
}

function getMediaData(payload) {
  return (
    payload.mediaData ||
    payload.media_data ||
    payload.base64 ||
    payload.media?.data ||
    payload.media?.base64 ||
    payload.attachment?.data ||
    payload.file?.data ||
    null
  );
}

function getMediaMetadata(payload) {
  return {
    mediaUrl: getMediaUrl(payload),
    mediaData: getMediaData(payload),
    mediaMime: payload.mediaMime || payload.media_mime || payload.mimetype || payload.mimeType || payload.media?.mimetype || payload.media?.mimeType || null,
    mediaFilename: payload.mediaFilename || payload.media_filename || payload.filename || payload.fileName || payload.media?.filename || payload.media?.fileName || null,
    mediaSize: payload.mediaSize || payload.media_size || payload.size || payload.media?.size || null,
    caption: payload.caption || payload.media?.caption || null,
  };
}

function getMessageReactions(message) {
  const rawPayload = message?.rawPayload && typeof message.rawPayload === 'object' ? message.rawPayload : {};
  const reactions = rawPayload.reactions && typeof rawPayload.reactions === 'object' ? rawPayload.reactions : {};
  return { ...reactions };
}

async function updateMessageReaction(message, reaction, actor = 'me') {
  const rawPayload = message.rawPayload && typeof message.rawPayload === 'object' ? message.rawPayload : {};
  const reactions = getMessageReactions(message);

  if (reaction) {
    reactions[actor] = reaction;
  } else {
    delete reactions[actor];
  }

  await message.update({
    rawPayload: {
      ...rawPayload,
      reactions,
    },
  });

  return message;
}

async function storeIncomingMedia(storeId, mediaMetadata) {
  if (!mediaMetadata.mediaData) return mediaMetadata;

  const savedMedia = await MediaStorageService.saveBase64(mediaMetadata.mediaData, {
    storeId,
    filename: mediaMetadata.mediaFilename,
    contentType: mediaMetadata.mediaMime || 'application/octet-stream',
  });

  return {
    ...mediaMetadata,
    mediaUrl: savedMedia.url,
    mediaMime: savedMedia.contentType,
    mediaFilename: savedMedia.filename,
    mediaSize: savedMedia.size,
    storagePath: savedMedia.path,
  };
}

async function prepareOutgoingMedia(storeId, payloadMedia = null) {
  if (!payloadMedia) return null;

  const mediaData = getMediaData({ media: payloadMedia, ...payloadMedia });
  const mediaUrl = getMediaUrl({ media: payloadMedia, ...payloadMedia });
  const mediaMime = payloadMedia.mediaMime || payloadMedia.media_mime || payloadMedia.mimeType || payloadMedia.mimetype || payloadMedia.type || null;
  const mediaFilename = payloadMedia.mediaFilename || payloadMedia.media_filename || payloadMedia.filename || payloadMedia.fileName || null;
  const caption = payloadMedia.caption || null;

  if (mediaData) {
    const savedMedia = await MediaStorageService.saveBase64(mediaData, {
      storeId,
      filename: mediaFilename,
      contentType: mediaMime || 'application/octet-stream',
    });

    return {
      mediaUrl: savedMedia.url,
      mediaData,
      mediaMime: savedMedia.contentType,
      mediaFilename: savedMedia.filename,
      mediaSize: savedMedia.size,
      storagePath: savedMedia.path,
      caption,
    };
  }

  if (mediaUrl) {
    return {
      mediaUrl,
      mediaMime,
      mediaFilename,
      caption,
    };
  }

  return null;
}

function getMessageBody(payload, messageType, mediaMetadata) {
  const body = payload.body || payload.text || payload.message || payload.caption || mediaMetadata.caption;
  if (body) return body;
  if (messageType === 'image') return 'Imagen recibida';
  if (messageType === 'video') return 'Video recibido';
  if (messageType === 'audio') return 'Audio recibido';
  if (messageType === 'document') return mediaMetadata.mediaFilename ? `Documento: ${mediaMetadata.mediaFilename}` : 'Documento recibido';
  if (messageType === 'location') return 'Ubicación recibida';
  return null;
}

async function getWhatsappNetwork() {
  const [network] = await Network.findOrCreate({
    where: { name: 'WhatsApp' },
    defaults: { name: 'WhatsApp', statusId: 1 },
  });
  return network;
}

async function ensureMessagingAccount(storeId) {
  let account = await MessagingAccount.findOne({
    where: { storeId, provider: PROVIDER },
    order: [['createdAt', 'DESC']],
  });

  if (account) return account;

  const network = await getWhatsappNetwork();
  const instance = await Instance.create({
    name: 'WhatsApp',
    phone: null,
    connection: 0,
    storeId,
    networkId: network.id,
    statusId: 1,
  });

  account = await MessagingAccount.create({
    storeId,
    instanceId: instance.id,
    provider: PROVIDER,
    status: 'disconnected',
    sessionId: `store_${storeId}_whatsapp_web`,
  });

  return account;
}

async function getActiveAccount(storeId) {
  const account = await MessagingAccount.findOne({
    where: { storeId, provider: PROVIDER },
    order: [['createdAt', 'DESC']],
  });

  if (!account) throw new Error('No hay una cuenta de WhatsApp configurada para esta tienda');
  return account;
}

async function resolveUniqueCustomerName({ storeId, baseName, phone, identifier }) {
  const fallback = normalizePhone(phone) || normalizePhone(identifier) || normalizeExternalChatId(identifier) || 'Cliente WhatsApp';
  const cleanBaseName = String(baseName || fallback).trim() || fallback;
  const suffixSource = normalizePhone(phone) || normalizePhone(identifier) || String(identifier || '').replace(/\W+/g, '');
  const suffix = suffixSource ? suffixSource.slice(-4) : null;
  const candidates = [
    cleanBaseName,
    suffix ? `${cleanBaseName} ${suffix}` : null,
    suffix ? `${cleanBaseName} (${suffix})` : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const existing = await Customer.findOne({ where: { name: candidate } });
    if (!existing) return candidate;
  }

  return `${cleanBaseName} ${Date.now().toString(36)}`;
}

async function findOrCreateCustomerContact({ storeId, account, phone, identifier, name, profileImageUrl }) {
  const normalizedPhone = normalizePhone(phone);
  const contactIdentifier = normalizedPhone || normalizeExternalChatId(identifier);
  if (!contactIdentifier) throw new Error('Identificador de contacto inválido');

  let contact = await Contact.findOne({
    where: {
      storeId,
      instanceId: account.instanceId,
      type: 'whatsapp',
      identifier: contactIdentifier,
    },
  });

  let customer = contact?.customerId ? await Customer.findOne({ where: { id: contact.customerId, storeId } }) : null;
  if (!customer && normalizedPhone) {
    customer = await Customer.findOne({ where: { storeId, phone: normalizedPhone } });
  }
  if (!customer) {
    const customerName = await resolveUniqueCustomerName({
      storeId,
      baseName: name,
      phone: normalizedPhone,
      identifier: contactIdentifier,
    });

    try {
      customer = await Customer.create({
        storeId,
        name: customerName,
        phone: normalizedPhone,
        statusId: 1,
        metadata: {
          ...(profileImageUrl ? { whatsappProfileImageUrl: profileImageUrl } : {}),
          ...(!normalizedPhone ? { whatsappExternalChatId: contactIdentifier } : {}),
          ...(name && name !== customerName ? { whatsappNotifyName: name } : {}),
        },
      });
    } catch (err) {
      if (err?.name !== 'SequelizeUniqueConstraintError') throw err;

      const fallbackName = await resolveUniqueCustomerName({
        storeId,
        baseName: name || normalizedPhone || contactIdentifier,
        phone: normalizedPhone,
        identifier: `${contactIdentifier}-${Date.now()}`,
      });
      customer = await Customer.create({
        storeId,
        name: fallbackName,
        phone: normalizedPhone,
        statusId: 1,
        metadata: {
          ...(profileImageUrl ? { whatsappProfileImageUrl: profileImageUrl } : {}),
          ...(!normalizedPhone ? { whatsappExternalChatId: contactIdentifier } : {}),
          ...(name ? { whatsappNotifyName: name } : {}),
        },
      });
    }
  } else if (profileImageUrl || (normalizedPhone && customer.phone !== normalizedPhone) || customer.statusId !== 1) {
    await customer.update({
      ...(normalizedPhone && customer.phone !== normalizedPhone ? { phone: normalizedPhone } : {}),
      ...(customer.statusId !== 1 ? { statusId: 1 } : {}),
      metadata: {
        ...(customer.metadata || {}),
        ...(profileImageUrl ? { whatsappProfileImageUrl: profileImageUrl } : {}),
        ...(name ? { whatsappNotifyName: name } : {}),
      },
    });
  }

  if (!contact) {
    contact = await Contact.create({
      storeId,
      customerId: customer.id,
      instanceId: account.instanceId,
      identifier: contactIdentifier,
      type: 'whatsapp',
      statusId: 1,
    });
  } else if (contact.customerId !== customer.id) {
    await contact.update({ customerId: customer.id });
  }

  return { customer, contact };
}

async function ensureWhatsappContactAlias({ storeId, account, customerId, identifier }) {
  const contactIdentifier = normalizeExternalChatId(identifier) || normalizePhone(identifier);
  if (!contactIdentifier || !customerId) return null;

  const [contact] = await Contact.findOrCreate({
    where: {
      storeId,
      instanceId: account.instanceId,
      type: 'whatsapp',
      identifier: contactIdentifier,
    },
    defaults: {
      storeId,
      customerId,
      instanceId: account.instanceId,
      identifier: contactIdentifier,
      type: 'whatsapp',
      statusId: 1,
    },
  });

  if (contact.customerId !== customerId) {
    await contact.update({ customerId });
  }

  return contact;
}

async function findExistingConversationForAlias({ storeId, account, externalChatId, aliasIds = [], name, profileImageUrl }) {
  const aliases = expandWhatsappAliases([externalChatId, ...aliasIds])
    .filter((alias) => !isAccountAlias(account, alias));
  if (aliases.length === 0) return null;

  const existingContact = await Contact.findOne({
    where: {
      storeId,
      instanceId: account.instanceId,
      type: 'whatsapp',
      identifier: { [Op.in]: aliases },
    },
    order: [['updatedAt', 'DESC']],
  });

  if (existingContact) {
    const conversation = await Conversation.findOne({
      where: {
        storeId,
        messagingAccountId: account.id,
        [Op.or]: [
          { contactId: existingContact.id },
          { customerId: existingContact.customerId },
        ],
      },
      order: [['lastMessageAt', 'DESC'], ['updatedAt', 'DESC']],
    });

    if (conversation) return { conversation, contact: existingContact };
  }

  const normalizedName = String(name || '').trim();
  if (!normalizedName && !profileImageUrl) return null;

  const customerWhere = {};
  if (normalizedName) {
    customerWhere.name = { [Op.iLike]: normalizedName };
  }
  if (profileImageUrl) {
    customerWhere[Op.or] = [
      ...(customerWhere[Op.or] || []),
      { metadata: { whatsappProfileImageUrl: profileImageUrl } },
    ];
  }

  const possibleConversations = await Conversation.findAll({
    where: {
      storeId,
      messagingAccountId: account.id,
      status: 'open',
    },
    include: [
      {
        model: Customer,
        attributes: ['id', 'name', 'phone', 'metadata'],
        where: customerWhere,
      },
    ],
    order: [['lastMessageAt', 'DESC'], ['updatedAt', 'DESC']],
    limit: 2,
  });

  if (possibleConversations.length !== 1) return null;

  const conversation = possibleConversations[0];
  const contact = await ensureWhatsappContactAlias({
    storeId,
    account,
    customerId: conversation.customerId,
    identifier: aliases[0],
  });

  if (contact && conversation.contactId !== contact.id) {
    await conversation.update({ contactId: contact.id });
  }

  return { conversation, contact };
}

async function getConversationRecipientIds(conversation, account) {
  const primary = normalizeExternalChatId(conversation.externalChatId);
  const customerPhone = normalizePhone(conversation.Customer?.phone);
  const contactIdentifier = normalizeExternalChatId(conversation.Contact?.identifier) || normalizePhone(conversation.Contact?.identifier);
  const contacts = conversation.customerId
    ? await Contact.findAll({
      where: {
        storeId: conversation.storeId,
        customerId: conversation.customerId,
        instanceId: account.instanceId,
        type: 'whatsapp',
      },
      order: [['updatedAt', 'DESC']],
    })
    : [];

  const aliases = contacts
    .map((contact) => normalizeExternalChatId(contact.identifier))
    .filter(Boolean);

  const lidAliases = aliases.filter(isWhatsappLid);
  const nonLidAliases = aliases.filter((alias) => !isWhatsappLid(alias));
  const convertedLidAliases = [
    lidToExternalChatId(primary),
    ...lidAliases.map(lidToExternalChatId),
  ].filter(Boolean);
  const nonLidPrimary = primary && !isWhatsappLid(primary) ? primary : null;
  const lidPrimary = primary && isWhatsappLid(primary) ? primary : null;
  const customerPhoneChatId = customerPhone ? toExternalChatId(customerPhone) : null;
  const contactChatId = contactIdentifier && !isWhatsappLid(contactIdentifier)
    ? normalizeExternalChatId(contactIdentifier)
    : null;

  return Array.from(new Set([
    customerPhoneChatId,
    contactChatId,
    nonLidPrimary,
    ...convertedLidAliases,
    ...nonLidAliases,
    lidPrimary,
    ...lidAliases,
  ].filter(Boolean)));
}

async function findOrCreateConversation({ storeId, account, phone, externalChatId: rawExternalChatId, aliasIds = [], name, profileImageUrl }) {
  const externalChatId = normalizeExternalChatId(rawExternalChatId) || toExternalChatId(phone);
  if (!externalChatId) throw new Error('Identificador de conversación inválido');

  const normalizedPhone = normalizePhone(phone);
  const expandedAliasIds = expandWhatsappAliases([
    externalChatId,
    normalizedPhone ? toExternalChatId(normalizedPhone) : null,
    ...aliasIds,
  ]).filter((alias) => !isAccountAlias(account, alias));
  const existingAlias = await findExistingConversationForAlias({
    storeId,
    account,
    externalChatId,
    aliasIds: expandedAliasIds,
    name,
    profileImageUrl,
  });

  if (existingAlias?.conversation) {
    if (normalizedPhone && existingAlias.conversation.customerId) {
      const existingCustomer = await Customer.findOne({
        where: { id: existingAlias.conversation.customerId, storeId },
      });
      if (existingCustomer && existingCustomer.phone !== normalizedPhone) {
        await existingCustomer.update({ phone: normalizedPhone });
      }
    }
    await Promise.all(expandedAliasIds.map((aliasId) => ensureWhatsappContactAlias({
      storeId,
      account,
      customerId: existingAlias.conversation.customerId,
      identifier: aliasId,
    })));
    return existingAlias.conversation;
  }

  const { customer, contact } = await findOrCreateCustomerContact({
    storeId,
    account,
    phone,
    identifier: externalChatId,
    name,
    profileImageUrl,
  });

  const [conversation] = await Conversation.findOrCreate({
    where: {
      storeId,
      messagingAccountId: account.id,
      externalChatId,
    },
    defaults: {
      storeId,
      messagingAccountId: account.id,
      customerId: customer.id,
      contactId: contact.id,
      channel: 'whatsapp',
      externalChatId,
      status: 'open',
      unreadCount: 0,
    },
  });

  if (conversation.customerId !== customer.id || conversation.contactId !== contact.id) {
    await conversation.update({ customerId: customer.id, contactId: contact.id });
  }

  await Promise.all(expandedAliasIds.map((aliasId) => ensureWhatsappContactAlias({
    storeId,
    account,
    customerId: customer.id,
    identifier: aliasId,
  })));

  return conversation;
}

async function loadConversation(conversationId, storeId) {
  return Conversation.findOne({
    where: { id: conversationId, storeId },
    include: [
      { model: Customer, attributes: ['id', 'name', 'phone', 'email', 'metadata'] },
      { model: Contact, attributes: ['id', 'identifier', 'type'] },
      { model: MessagingAccount, attributes: ['id', 'provider', 'status', 'phone', 'displayName'] },
    ],
  });
}

async function refreshMissingProfilePictures(conversations) {
  for (const conversation of conversations) {
    const customer = conversation.Customer;
    const currentAvatar = customer?.metadata?.whatsappProfileImageUrl;
    if (!customer || currentAvatar || isWhatsappLid(conversation.externalChatId)) continue;

    try {
      const account = conversation.MessagingAccount || await MessagingAccount.findByPk(conversation.messagingAccountId);
      if (!account || MessagingProvider.forAccount(account).getProfilePicUrl === undefined) continue;

      const result = await MessagingProvider.forAccount(account).getProfilePicUrl(account, {
        to: conversation.externalChatId,
      });
      const profileImageUrl = result?.profilePicUrl;
      if (!profileImageUrl) continue;

      await customer.update({
        metadata: {
          ...(customer.metadata || {}),
          whatsappProfileImageUrl: profileImageUrl,
        },
      });
      customer.metadata = {
        ...(customer.metadata || {}),
        whatsappProfileImageUrl: profileImageUrl,
      };
    } catch (_err) {
      // La foto de perfil es opcional; no debe bloquear el listado de chats.
    }
  }
}

async function updateConversationAfterMessage(conversation, message, incrementUnread = false) {
  await conversation.update({
    lastMessageAt: message.createdAt,
    lastMessagePreview: messagePreview(message),
    unreadCount: incrementUnread ? conversation.unreadCount + 1 : conversation.unreadCount,
  });
  return loadConversation(conversation.id, conversation.storeId);
}

class MessagingController {
  static async getCurrentAccount(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const account = await MessagingAccount.findOne({
        where: { storeId, provider: PROVIDER },
        include: [{ model: Instance, attributes: ['id', 'name', 'phone', 'connection'] }],
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json(account);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async connectAccount(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const account = await ensureMessagingAccount(storeId);
      await account.update({ status: 'connecting', qrCode: null });
      if (account.instanceId) {
        await Instance.update({ connection: 2 }, { where: { id: account.instanceId, storeId } });
      }

      await MessagingProvider.forAccount(account).connectAccount(account);
      const updated = await MessagingAccount.findByPk(account.id);

      MessagingNotifier.accountStatusChanged(storeId, updated);
      res.status(202).json(updated);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async disconnectAccount(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const account = await getActiveAccount(storeId);
      await MessagingProvider.forAccount(account).disconnectAccount(account);
      await account.update({
        status: 'disconnected',
        qrCode: null,
        lastDisconnectedAt: new Date(),
      });
      if (account.instanceId) {
        await Instance.update({ connection: 0 }, { where: { id: account.instanceId, storeId } });
      }

      MessagingNotifier.accountStatusChanged(storeId, account);
      res.status(200).json(account);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async restartAccount(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const account = await getActiveAccount(storeId);
      await account.update({ status: 'connecting', qrCode: null });
      await MessagingProvider.forAccount(account).restartAccount(account);

      MessagingNotifier.accountStatusChanged(storeId, account);
      res.status(202).json(account);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listConversations(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const { limit, offset, page } = getPagination(req.query);
      const search = String(req.query.search || '').trim();
      const where = {
        storeId,
        status: { [Op.ne]: 'archived' },
      };

      if (search) {
        where[Op.or] = [
          { lastMessagePreview: { [Op.iLike]: `%${search}%` } },
          { externalChatId: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const conversations = await Conversation.findAndCountAll({
        where,
        include: [
          { model: Customer, attributes: ['id', 'name', 'phone', 'email', 'metadata'] },
          { model: Contact, attributes: ['id', 'identifier', 'type'] },
          { model: MessagingAccount, attributes: ['id', 'provider', 'status', 'phone', 'displayName'] },
        ],
        limit,
        offset,
        order: [['lastMessageAt', 'DESC'], ['updatedAt', 'DESC']],
      });

      await refreshMissingProfilePictures(conversations.rows);

      res.status(200).json({
        count: conversations.count,
        rows: conversations.rows,
        page,
        limit,
        totalPages: Math.ceil(conversations.count / limit),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async listMessages(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const conversation = await loadConversation(req.params.id, storeId);
      if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

      const { limit, offset, page } = getPagination(req.query);
      const messages = await Message.findAndCountAll({
        where: { storeId, conversationId: conversation.id },
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json({
        conversation,
        count: messages.count,
        rows: messages.rows,
        page,
        limit,
        totalPages: Math.ceil(messages.count / limit),
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async createConversation(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const { phone, customerId, name } = req.body;
      const account = await getActiveAccount(storeId);
      let targetPhone = phone;
      let customerName = name;

      if (!targetPhone && customerId) {
        const customer = await Customer.findOne({ where: { id: customerId, storeId } });
        if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
        targetPhone = customer.phone;
        customerName = customerName || customer.name;
      }

      if (!targetPhone) return res.status(400).json({ error: 'phone o customerId es requerido' });

      const conversation = await findOrCreateConversation({
        storeId,
        account,
        phone: targetPhone,
        name: customerName,
      });
      const updatedConversation = await loadConversation(conversation.id, storeId);

      res.status(201).json({ conversation: updatedConversation });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async sendConversationMessage(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const { body, media } = req.body;
      if (!body && !media) return res.status(400).json({ error: 'body o media es requerido' });

      const conversation = await loadConversation(req.params.id, storeId);
      if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

      const account = await MessagingAccount.findOne({ where: { id: conversation.messagingAccountId, storeId } });
      if (!account) return res.status(404).json({ error: 'Cuenta de mensajería no encontrada' });

      const outgoingMedia = await prepareOutgoingMedia(storeId, media);
      const messageType = outgoingMedia ? normalizeMessageType(outgoingMedia.mediaMime || media?.type || media?.mediaType) : 'text';
      const finalBody = body || outgoingMedia?.caption || null;

      const message = await Message.create({
        storeId,
        conversationId: conversation.id,
        messagingAccountId: account.id,
        provider: account.provider,
        direction: 'outbound',
        type: messageType,
        body: finalBody,
        mediaUrl: outgoingMedia?.mediaUrl || null,
        status: 'pending',
        rawPayload: outgoingMedia ? { ...outgoingMedia, mediaData: undefined } : null,
      });

      try {
        const recipientIds = await getConversationRecipientIds(conversation, account);
        let sent = null;
        let lastSendError = null;

        for (const recipientId of recipientIds) {
          try {
            sent = await MessagingProvider.forAccount(account).sendMessage(account, {
              to: recipientId,
              body: finalBody,
              media: outgoingMedia,
            });
            break;
          } catch (candidateErr) {
            lastSendError = candidateErr;
            const message = String(candidateErr?.message || '');
            if (!message.toLowerCase().includes('lid')) {
              break;
            }
          }
        }

        if (!sent) throw lastSendError || new Error('No se pudo enviar el mensaje');

        const aliasIds = getGatewayAliasIds(sent);
        await Promise.all(aliasIds.map((aliasId) => ensureWhatsappContactAlias({
          storeId,
          account,
          customerId: conversation.customerId,
          identifier: aliasId,
        })));
        await message.update({
          providerMessageId: sent.providerMessageId || null,
          status: 'sent',
          sentAt: new Date(),
          rawPayload: outgoingMedia ? { ...outgoingMedia, mediaData: undefined, sent } : sent,
        });
      } catch (sendErr) {
        await message.update({ status: 'failed', rawPayload: { error: sendErr.message } });
        throw sendErr;
      }

      const updatedConversation = await updateConversationAfterMessage(conversation, message, false);
      MessagingNotifier.messageSent(storeId, message, updatedConversation);
      res.status(201).json({ message, conversation: updatedConversation });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async sendDirectMessage(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const { body, phone, customerId, media } = req.body;
      if (!body && !media) return res.status(400).json({ error: 'body o media es requerido' });

      const account = await getActiveAccount(storeId);
      let targetPhone = phone;

      if (!targetPhone && customerId) {
        const customer = await Customer.findOne({ where: { id: customerId, storeId } });
        if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
        targetPhone = customer.phone;
      }

      if (!targetPhone) return res.status(400).json({ error: 'phone o customerId es requerido' });

      const conversation = await findOrCreateConversation({
        storeId,
        account,
        phone: targetPhone,
      });

      req.params.id = conversation.id;
      return MessagingController.sendConversationMessage(req, res);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async markConversationRead(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const conversation = await Conversation.findOne({ where: { id: req.params.id, storeId } });
      if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

      await Message.update(
        { status: 'read', readAt: new Date() },
        { where: { storeId, conversationId: conversation.id, direction: 'inbound', status: 'received' } }
      );
      await conversation.update({ unreadCount: 0 });

      const updatedConversation = await loadConversation(conversation.id, storeId);
      MessagingNotifier.conversationUpdated(storeId, updatedConversation);
      res.status(200).json(updatedConversation);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async reactMessage(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const { reaction = '' } = req.body;
      const message = await Message.findOne({
        where: { id: req.params.messageId, storeId },
        include: [{ model: MessagingAccount, attributes: ['id', 'provider', 'storeId'] }],
      });
      if (!message) return res.status(404).json({ error: 'Mensaje no encontrado' });
      if (!message.providerMessageId) return res.status(400).json({ error: 'El mensaje no tiene id de proveedor para reaccionar' });

      const account = message.MessagingAccount || await MessagingAccount.findOne({
        where: { id: message.messagingAccountId, storeId },
      });
      if (!account) return res.status(404).json({ error: 'Cuenta de mensajería no encontrada' });

      await MessagingProvider.forAccount(account).reactMessage(account, {
        messageId: message.providerMessageId,
        reaction,
      });

      await updateMessageReaction(message, reaction, 'me');
      MessagingNotifier.messageReactionChanged(storeId, message);

      res.status(200).json({ message });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteConversation(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) return res.status(401).json({ error: 'storeId requerido en token' });

      const conversation = await Conversation.findOne({ where: { id: req.params.id, storeId } });
      if (!conversation) return res.status(404).json({ error: 'Conversación no encontrada' });

      await conversation.update({
        status: 'archived',
        unreadCount: 0,
      });

      const updatedConversation = await loadConversation(conversation.id, storeId);
      MessagingNotifier.conversationUpdated(storeId, updatedConversation);
      res.status(200).json({ ok: true, conversation: updatedConversation });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async handleGatewayEvent(req, res) {
    try {
      const apiKey = req.headers['x-api-key'];
      const expectedApiKey = process.env.MESSAGING_WEBHOOK_API_KEY || process.env.INTERNAL_API_KEY || '';
      if (expectedApiKey && apiKey !== expectedApiKey) {
        return res.status(401).json({ error: 'API key inválida' });
      }

      const { type, accountId, storeId, payload = {} } = req.body;
      const account = await MessagingAccount.findOne({ where: { id: accountId, storeId } });
      if (!account) return res.status(404).json({ error: 'Cuenta de mensajería no encontrada' });

      if (type === 'qr.generated') {
        await account.update({
          status: 'pending_qr',
          qrCode: payload.qr,
          lastQrAt: new Date(),
        });
        MessagingNotifier.qrGenerated(storeId, account);
        return res.status(200).json({ ok: true });
      }

      if (type === 'session.ready') {
        await account.update({
          status: 'ready',
          qrCode: null,
          phone: normalizePhone(payload.phone) || account.phone,
          displayName: payload.displayName || account.displayName,
          lastConnectedAt: new Date(),
          metadata: payload,
        });
        if (account.instanceId) {
          await Instance.update(
            { connection: 1, phone: normalizePhone(payload.phone) || account.phone },
            { where: { id: account.instanceId, storeId } }
          );
        }
        MessagingNotifier.accountStatusChanged(storeId, account);
        return res.status(200).json({ ok: true });
      }

      if (type === 'session.disconnected' || type === 'session.failed') {
        await account.update({
          status: type === 'session.failed' ? 'failed' : 'disconnected',
          qrCode: null,
          lastDisconnectedAt: new Date(),
          metadata: payload,
        });
        if (account.instanceId) {
          await Instance.update({ connection: 0 }, { where: { id: account.instanceId, storeId } });
        }
        MessagingNotifier.accountStatusChanged(storeId, account);
        return res.status(200).json({ ok: true });
      }

      if (type === 'message.received') {
        const isOutbound = isOutboundGatewayMessage(payload);
        const phone = getInboundPhone(payload);
        const inboundAliasIds = getInboundAliasIds(payload, account);
        const externalChatId = getInboundExternalChatId(payload, phone);
        if (!phone && !externalChatId && inboundAliasIds.length === 0) {
          return res.status(200).json({ ok: true, ignored: 'unresolved_sender' });
        }

        const messageType = normalizeMessageType(payload.type || payload.mediaType || payload.media_mime || payload.mimetype);
        const mediaMetadata = await storeIncomingMedia(storeId, getMediaMetadata(payload));
        const body = getMessageBody(payload, messageType, mediaMetadata);
        const providerMessageId = buildProviderMessageId(account, payload, phone, body);
        const existingMessage = await Message.findOne({
          where: {
            storeId,
            providerMessageId,
            messagingAccountId: account.id,
          },
        });
        const conversation = existingMessage
          ? await Conversation.findOne({
            where: {
              id: existingMessage.conversationId,
              storeId,
              messagingAccountId: account.id,
            },
          })
          : await findOrCreateConversation({
          storeId,
          account,
          phone,
          externalChatId: externalChatId || inboundAliasIds[0],
          aliasIds: inboundAliasIds,
          name: payload.notifyName,
          profileImageUrl: payload.profilePicUrl,
        });
        if (!conversation) {
          return res.status(200).json({ ok: true, ignored: 'unresolved_conversation' });
        }
        if (conversation.customerId && inboundAliasIds.length > 0) {
          await Promise.all(inboundAliasIds.map((aliasId) => ensureWhatsappContactAlias({
            storeId,
            account,
            customerId: conversation.customerId,
            identifier: aliasId,
          })));
        }

        const [message, wasCreated] = await Message.findOrCreate({
          where: {
            storeId,
            providerMessageId,
            messagingAccountId: account.id,
          },
          defaults: {
            storeId,
            conversationId: conversation.id,
            messagingAccountId: account.id,
            provider: account.provider,
            providerMessageId,
            direction: isOutbound ? 'outbound' : 'inbound',
            type: messageType,
            body,
            mediaUrl: mediaMetadata.mediaUrl,
            status: isOutbound ? 'sent' : 'received',
            sentAt: payload.timestamp ? new Date(payload.timestamp * 1000) : new Date(),
            rawPayload: {
              ...payload,
              ...mediaMetadata,
            },
          },
        });

        const updatedConversation = await updateConversationAfterMessage(conversation, message, wasCreated && !isOutbound);
        if (wasCreated && !isOutbound) {
          try {
            await NotificationService.createStoreNotification(
              storeId,
              'Nuevo mensaje de WhatsApp',
              `${payload.notifyName || normalizePhone(phone) || 'Cliente'}: ${preview(body) || 'Adjunto recibido'}`,
              'message-icon',
            );
            NotificationService.notifyChannel(storeId, 'notifications', 'notification_created', {
              title: 'Nuevo mensaje de WhatsApp',
              message: `${payload.notifyName || normalizePhone(phone) || 'Cliente'}: ${preview(body) || 'Adjunto recibido'}`,
              conversationId: conversation.id,
              messageId: message.id,
            });
          } catch (notificationErr) {
            console.error('Error creando notificación de mensaje entrante:', notificationErr);
          }
          MessagingNotifier.messageReceived(storeId, message, updatedConversation);
          MessagingNotifier.conversationUpdated(storeId, updatedConversation);
        } else if (wasCreated) {
          MessagingNotifier.messageSent(storeId, message, updatedConversation);
          MessagingNotifier.conversationUpdated(storeId, updatedConversation);
        }
        return res.status(200).json({ ok: true });
      }

      if (type === 'message.ack') {
        const message = await Message.findOne({
          where: {
            storeId,
            messagingAccountId: account.id,
            providerMessageId: payload.id,
          },
        });

        if (message) {
          const status = payload.status || message.status;
          await message.update({
            status,
            deliveredAt: status === 'delivered' ? new Date() : message.deliveredAt,
            readAt: status === 'read' ? new Date() : message.readAt,
            rawPayload: {
              ...(message.rawPayload && typeof message.rawPayload === 'object' ? message.rawPayload : {}),
              ack: payload,
            },
          });
          MessagingNotifier.messageStatusChanged(storeId, message);
        }

        return res.status(200).json({ ok: true });
      }

      if (type === 'message.reaction') {
        const targetProviderMessageId = payload.messageId || payload.message_id || payload.msgId || payload.msg_id;
        if (!targetProviderMessageId) {
          return res.status(200).json({ ok: true, ignored: 'missing_message_id' });
        }

        const message = await Message.findOne({
          where: {
            storeId,
            messagingAccountId: account.id,
            providerMessageId: targetProviderMessageId,
          },
        });

        if (message) {
          const senderPhone = normalizePhone(payload.senderId);
          const actor = senderPhone && senderPhone === normalizePhone(account.phone)
            ? 'me'
            : senderPhone || String(payload.senderId || 'contact');
          await updateMessageReaction(message, payload.reaction || '', actor);
          MessagingNotifier.messageReactionChanged(storeId, message);
        }

        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: `Evento no soportado: ${type}` });
    } catch (err) {
      res.status(400).json({
        error: err.message,
        details: err.errors?.map((detail) => ({
          message: detail.message,
          path: detail.path,
          value: detail.value,
          type: detail.type,
        })),
      });
    }
  }
}

export default MessagingController;
