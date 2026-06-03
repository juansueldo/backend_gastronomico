import { Op } from 'sequelize';
import sequelize from '../models/db.js';
import {
  Customer,
  DeliveryDriver,
  DeliveryRoute,
  DeliveryRouteOrder,
  DeliveryZone,
  Order,
  OrderItem,
  Product,
} from '../models/index.js';
import { generateDriverToken } from '../middleware/token.js';
import DriverInviteService from '../services/driverInviteService.js';
import OrderTrackingService from '../services/orderTrackingService.js';
import DriverPushNotificationService from '../services/driverPushNotificationService.js';

const ACTIVE_ROUTE_STATUSES = ['assigned', 'in_transit'];
const ROUTE_STATUSES = ['assigned', 'in_transit', 'completed'];
const ROUTE_ORDER_STATUSES = ['assigned', 'picked_up', 'delivered', 'failed'];
const ORDER_STATUS_ID_MAP = {
  pending: 1,
  processing: 2,
  ready: 3,
  completed: 4,
  cancelled: 5,
};

function orderIncludes() {
  return [
    { model: Customer, attributes: ['id', 'name', 'phone', 'email'] },
    { model: DeliveryZone, attributes: ['id', 'name', 'zoneid', 'deliveryFee'] },
    { model: OrderItem, include: [{ model: Product, attributes: ['id', 'name', 'price'] }] },
  ];
}

function routeIncludes() {
  return [
    { model: DeliveryDriver, attributes: ['id', 'name', 'phone', 'vehicleType', 'plate', 'status', 'lastLoginAt'] },
    {
      model: DeliveryRouteOrder,
      include: [{ model: Order, include: orderIncludes() }],
    },
  ];
}

function sortRouteOrders(route) {
  if (!route?.DeliveryRouteOrders) return route;
  route.DeliveryRouteOrders.sort((left, right) => Number(left.sequence) - Number(right.sequence));
  return route;
}

function validateLocation(body) {
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);
  const accuracy = body.accuracy !== undefined && body.accuracy !== null ? Number(body.accuracy) : null;

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return { error: 'latitude inválida' };
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return { error: 'longitude inválida' };
  }
  if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0)) {
    return { error: 'accuracy inválida' };
  }

  return { latitude, longitude, accuracy };
}

async function loadDriverRoute(routeId, driver) {
  const route = await DeliveryRoute.findOne({
    where: {
      id: routeId,
      storeId: driver.storeId,
      driverId: driver.id,
    },
    include: routeIncludes(),
  });
  return sortRouteOrders(route);
}

async function closeRouteIfFinished(routeId, storeId, transaction) {
  const pendingRouteOrders = await DeliveryRouteOrder.count({
    where: {
      storeId,
      routeId,
      status: { [Op.notIn]: ['delivered', 'failed'] },
    },
    transaction,
  });

  if (pendingRouteOrders > 0) return;

  const route = await DeliveryRoute.findOne({ where: { id: routeId, storeId }, transaction });
  if (!route || route.status === 'completed') return;

  await route.update({ status: 'completed', completedAt: new Date() }, { transaction });
  await DeliveryDriver.update({ status: 'active' }, { where: { id: route.driverId, storeId }, transaction });
}

class DriverAppController {
  static async activate(req, res) {
    try {
      const driverId = Number(req.body.driverId);
      const inviteCode = String(req.body.inviteCode || req.body.pin || '').trim();

      if (!Number.isInteger(driverId) || driverId <= 0) {
        return res.status(400).json({ error: 'driverId inválido' });
      }
      if (!inviteCode) return res.status(400).json({ error: 'inviteCode es requerido' });

      const driver = await DeliveryDriver.findOne({ where: { id: driverId } });
      if (!driver || driver.status === 'inactive') {
        return res.status(404).json({ error: 'Repartidor no encontrado' });
      }

      const isValidInvite = await DriverInviteService.verifyInvite(driver, inviteCode);
      if (!isValidInvite) {
        return res.status(401).json({ error: 'PIN inválido o expirado' });
      }

      await driver.update({
        inviteCodeHash: null,
        inviteCodeExpiresAt: null,
        lastLoginAt: new Date(),
        mobileSessionVersion: Number(driver.mobileSessionVersion ?? 0) + 1,
      });

      const token = await generateDriverToken(driver);
      res.status(200).json({
        token,
        driver: {
          id: driver.id,
          storeId: driver.storeId,
          name: driver.name,
          phone: driver.phone,
          vehicleType: driver.vehicleType,
          plate: driver.plate,
          status: driver.status,
          lastLoginAt: driver.lastLoginAt,
        },
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async me(req, res) {
    const driver = req.driver;
    res.status(200).json({
      driver: {
        id: driver.id,
        storeId: driver.storeId,
        name: driver.name,
        phone: driver.phone,
        vehicleType: driver.vehicleType,
        plate: driver.plate,
        status: driver.status,
        lastLoginAt: driver.lastLoginAt,
      },
    });
  }

  static async routes(req, res) {
    try {
      const driver = req.driver;
      const routes = await DeliveryRoute.findAll({
        where: {
          storeId: driver.storeId,
          driverId: driver.id,
          status: { [Op.in]: ACTIVE_ROUTE_STATUSES },
        },
        include: routeIncludes(),
        order: [['scheduledAt', 'ASC'], ['createdAt', 'DESC']],
      });

      res.status(200).json({ routes: routes.map(sortRouteOrders) });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async registerPushToken(req, res) {
    try {
      const driver = req.driver;
      const token = String(req.body.token || '').trim();
      if (!token) return res.status(400).json({ error: 'token es requerido' });

      const row = await DriverPushNotificationService.registerToken(driver, {
        token,
        platform: req.body.platform,
        deviceId: req.body.deviceId,
      });

      res.status(200).json({
        ok: true,
        pushToken: {
          id: row.id,
          platform: row.platform,
          enabled: row.enabled,
          lastRegisteredAt: row.lastRegisteredAt,
        },
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async unregisterPushToken(req, res) {
    try {
      const driver = req.driver;
      const token = String(req.body.token || '').trim();
      if (!token) return res.status(400).json({ error: 'token es requerido' });

      const count = await DriverPushNotificationService.unregisterToken(driver, token);
      res.status(200).json({ ok: true, disabled: count });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateRouteStatus(req, res) {
    try {
      const driver = req.driver;
      const status = String(req.body.status || '').trim();
      if (!ROUTE_STATUSES.includes(status)) return res.status(400).json({ error: 'status inválido' });

      const route = await DeliveryRoute.findOne({
        where: { id: req.params.id, storeId: driver.storeId, driverId: driver.id },
      });
      if (!route) return res.status(404).json({ error: 'Recorrido no encontrado' });

      await route.update({
        status,
        startedAt: status === 'in_transit' ? new Date() : route.startedAt,
        completedAt: status === 'completed' ? new Date() : route.completedAt,
      });

      await driver.update({ status: status === 'completed' ? 'active' : 'busy' });

      const loadedRoute = await loadDriverRoute(route.id, driver);
      await OrderTrackingService.notifyRoute(route.id, driver.storeId);
      res.status(200).json(loadedRoute);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateRouteLocation(req, res) {
    try {
      const driver = req.driver;
      const location = validateLocation(req.body);
      if (location.error) return res.status(400).json({ error: location.error });

      const route = await DeliveryRoute.findOne({
        where: {
          id: req.params.id,
          storeId: driver.storeId,
          driverId: driver.id,
          status: { [Op.in]: ACTIVE_ROUTE_STATUSES },
        },
      });
      if (!route) return res.status(404).json({ error: 'Recorrido activo no encontrado' });

      await route.update({
        lastLatitude: location.latitude,
        lastLongitude: location.longitude,
        lastLocationAccuracy: location.accuracy,
        lastLocationAt: new Date(),
      });

      const loadedRoute = await loadDriverRoute(route.id, driver);
      await OrderTrackingService.notifyRoute(route.id, driver.storeId);
      res.status(200).json(loadedRoute);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateRouteOrderStatus(req, res) {
    try {
      const driver = req.driver;
      const status = String(req.body.status || '').trim();
      if (!ROUTE_ORDER_STATUSES.includes(status)) return res.status(400).json({ error: 'status inválido' });

      const routeOrder = await DeliveryRouteOrder.findOne({
        where: { id: req.params.id, storeId: driver.storeId },
        include: [
          {
            model: DeliveryRoute,
            where: { storeId: driver.storeId, driverId: driver.id },
          },
          { model: Order },
        ],
      });

      if (!routeOrder) return res.status(404).json({ error: 'Pedido del recorrido no encontrado' });

      await sequelize.transaction(async (transaction) => {
        await routeOrder.update({ status }, { transaction });

        if (status === 'delivered' && routeOrder.Order && routeOrder.Order.status !== 'completed') {
          await routeOrder.Order.update({
            status: 'completed',
            statusId: ORDER_STATUS_ID_MAP.completed,
          }, { transaction });
        }

        await closeRouteIfFinished(routeOrder.routeId, driver.storeId, transaction);
      });

      const loadedRoute = await loadDriverRoute(routeOrder.routeId, driver);
      await OrderTrackingService.notifyRoute(routeOrder.routeId, driver.storeId);
      res.status(200).json(loadedRoute);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default DriverAppController;
