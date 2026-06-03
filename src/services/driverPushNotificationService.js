import { Expo } from 'expo-server-sdk';
import { Op } from 'sequelize';
import { DriverPushToken } from '../models/index.js';

const expo = new Expo();
const INVALID_TOKEN_ERRORS = new Set(['DeviceNotRegistered']);

function normalizePlatform(platform) {
  return ['ios', 'android', 'web'].includes(platform) ? platform : 'unknown';
}

class DriverPushNotificationService {
  static normalizePlatform(platform) {
    return normalizePlatform(String(platform || '').toLowerCase());
  }

  static isExpoPushToken(token) {
    return Expo.isExpoPushToken(token);
  }

  static async registerToken(driver, { token, platform, deviceId = null }) {
    const normalizedToken = String(token || '').trim();
    if (!Expo.isExpoPushToken(normalizedToken)) {
      throw new Error('Expo push token inválido');
    }

    const [row, created] = await DriverPushToken.findOrCreate({
      where: { token: normalizedToken },
      defaults: {
        storeId: driver.storeId,
        driverId: driver.id,
        token: normalizedToken,
        platform: normalizePlatform(platform),
        deviceId: deviceId ? String(deviceId).trim() : null,
        enabled: true,
        lastRegisteredAt: new Date(),
        disabledAt: null,
      },
    });

    if (!created) {
      await row.update({
        storeId: driver.storeId,
        driverId: driver.id,
        platform: normalizePlatform(platform),
        deviceId: deviceId ? String(deviceId).trim() : row.deviceId,
        enabled: true,
        lastRegisteredAt: new Date(),
        disabledAt: null,
      });
    }

    return row;
  }

  static async unregisterToken(driver, token) {
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) return 0;

    const [count] = await DriverPushToken.update(
      { enabled: false, disabledAt: new Date() },
      {
        where: {
          token: normalizedToken,
          storeId: driver.storeId,
          driverId: driver.id,
        },
      }
    );

    return count;
  }

  static async notifyDriver(driverId, storeId, notification) {
    const tokens = await DriverPushToken.findAll({
      where: { driverId, storeId, enabled: true },
    });
    if (tokens.length === 0) return { sent: 0, disabled: 0 };

    const messages = tokens
      .filter((row) => Expo.isExpoPushToken(row.token))
      .map((row) => ({
        to: row.token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
      }));

    if (messages.length === 0) return { sent: 0, disabled: 0 };

    let disabled = 0;
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        await Promise.all(tickets.map(async (ticket, index) => {
          if (ticket.status !== 'error') return;
          const error = ticket.details?.error;
          if (!INVALID_TOKEN_ERRORS.has(error)) return;
          disabled += 1;
          await DriverPushToken.update(
            { enabled: false, disabledAt: new Date() },
            { where: { token: chunk[index].to } }
          );
        }));
      } catch (err) {
        console.error('Error enviando push al repartidor:', err);
      }
    }

    await DriverPushToken.update(
      { lastUsedAt: new Date() },
      { where: { token: { [Op.in]: messages.map((message) => message.to) } } }
    );

    return { sent: messages.length, disabled };
  }

  static async notifyRouteAssigned(route) {
    return this.notifyDriver(route.driverId, route.storeId, {
      title: 'Nuevo recorrido asignado',
      body: 'Tenés pedidos para entregar',
      data: {
        type: 'route_assigned',
        routeId: String(route.id),
        storeId: String(route.storeId),
      },
    });
  }

  static async notifyRouteUpdated(route) {
    return this.notifyDriver(route.driverId, route.storeId, {
      title: 'Recorrido actualizado',
      body: 'Se actualizaron tus entregas',
      data: {
        type: 'route_updated',
        routeId: String(route.id),
        storeId: String(route.storeId),
      },
    });
  }
}

export default DriverPushNotificationService;
