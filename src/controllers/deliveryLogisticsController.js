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
import OrderTrackingService from '../services/orderTrackingService.js';
import DriverInviteService from '../services/driverInviteService.js';
import DriverPushNotificationService from '../services/driverPushNotificationService.js';

const ACTIVE_ORDER_STATUSES = ['pending', 'processing', 'ready'];
const ACTIVE_ROUTE_STATUSES = ['planning', 'assigned', 'in_transit'];
const SAFE_DRIVER_ATTRIBUTES = { exclude: ['inviteCodeHash'] };

function requireStoreId(req, res) {
  const storeId = req.user?.storeId;
  if (!storeId) {
    res.status(401).json({ error: 'storeId no encontrado en el token' });
    return null;
  }
  return storeId;
}

function normalizeVehicleType(value) {
  return ['motorcycle', 'bicycle', 'car', 'other'].includes(value) ? value : 'motorcycle';
}

function normalizeDriverStatus(value, fallback = 'active') {
  return ['active', 'inactive', 'busy'].includes(value) ? value : fallback;
}

function orderIncludes() {
  return [
    { model: Customer, attributes: ['id', 'name', 'phone', 'email'] },
    { model: DeliveryZone, attributes: ['id', 'name', 'zoneid', 'deliveryFee'] },
    { model: OrderItem, include: [{ model: Product, attributes: ['id', 'name', 'price'] }] },
  ];
}

function routeIncludes() {
  return [
    { model: DeliveryDriver, attributes: SAFE_DRIVER_ATTRIBUTES },
    {
      model: DeliveryRouteOrder,
      include: [{ model: Order, include: orderIncludes() }],
      order: [['sequence', 'ASC']],
    },
  ];
}

async function loadRoute(routeId, storeId) {
  return DeliveryRoute.findOne({
    where: { id: routeId, storeId },
    include: routeIncludes(),
  });
}

class DeliveryLogisticsController {
  static async listDrivers(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const drivers = await DeliveryDriver.findAll({
        where: { storeId },
        attributes: SAFE_DRIVER_ATTRIBUTES,
        order: [['status', 'ASC'], ['name', 'ASC']],
      });
      res.status(200).json({ rows: drivers, count: drivers.length });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async createDriver(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const name = String(req.body.name || '').trim();
      if (!name) return res.status(400).json({ error: 'name es requerido' });

      const driver = await DeliveryDriver.create({
        storeId,
        name,
        phone: String(req.body.phone || '').trim() || null,
        vehicleType: normalizeVehicleType(req.body.vehicleType),
        plate: String(req.body.plate || '').trim() || null,
        status: normalizeDriverStatus(req.body.status),
        notes: String(req.body.notes || '').trim() || null,
      });

      res.status(201).json(driver);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateDriver(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const driver = await DeliveryDriver.findOne({ where: { id: req.params.id, storeId } });
      if (!driver) return res.status(404).json({ error: 'Repartidor no encontrado' });

      const updates = {};
      if (req.body.name !== undefined) {
        const name = String(req.body.name || '').trim();
        if (!name) return res.status(400).json({ error: 'name no puede estar vacío' });
        updates.name = name;
      }
      if (req.body.phone !== undefined) updates.phone = String(req.body.phone || '').trim() || null;
      if (req.body.vehicleType !== undefined) updates.vehicleType = normalizeVehicleType(req.body.vehicleType);
      if (req.body.plate !== undefined) updates.plate = String(req.body.plate || '').trim() || null;
      if (req.body.status !== undefined) updates.status = normalizeDriverStatus(req.body.status, driver.status);
      if (req.body.notes !== undefined) updates.notes = String(req.body.notes || '').trim() || null;

      await driver.update(updates);
      res.status(200).json(driver);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async regenerateDriverInvite(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const driver = await DeliveryDriver.findOne({ where: { id: req.params.id, storeId } });
      if (!driver) return res.status(404).json({ error: 'Repartidor no encontrado' });
      if (driver.status === 'inactive') return res.status(400).json({ error: 'El repartidor está inactivo' });

      const invite = await DriverInviteService.regenerateInvite(driver);
      const publicDriver = invite.driver.toJSON();
      delete publicDriver.inviteCodeHash;
      res.status(200).json({
        driver: publicDriver,
        inviteCode: invite.inviteCode,
        inviteCodeExpiresAt: invite.inviteCodeExpiresAt,
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteDriver(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const driver = await DeliveryDriver.findOne({ where: { id: req.params.id, storeId } });
      if (!driver) return res.status(404).json({ error: 'Repartidor no encontrado' });

      const activeRoutes = await DeliveryRoute.count({
        where: { storeId, driverId: driver.id, status: { [Op.in]: ACTIVE_ROUTE_STATUSES } },
      });
      if (activeRoutes > 0) {
        await driver.update({ status: 'inactive' });
        return res.status(200).json({ ok: true, driver });
      }

      await driver.destroy();
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async board(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const [drivers, orders, routes] = await Promise.all([
        DeliveryDriver.findAll({ where: { storeId }, order: [['name', 'ASC']] }),
        Order.findAll({
          where: {
            storeId,
            type: 'delivery',
            status: { [Op.in]: ACTIVE_ORDER_STATUSES },
            delivery_latitude: { [Op.ne]: null },
            delivery_longitude: { [Op.ne]: null },
          },
          include: [...orderIncludes(), { model: DeliveryRouteOrder, required: false }],
          order: [['delivery_date', 'ASC'], ['order_date', 'ASC']],
        }),
        DeliveryRoute.findAll({
          where: { storeId, status: { [Op.in]: ACTIVE_ROUTE_STATUSES } },
          include: routeIncludes(),
          order: [['createdAt', 'DESC']],
        }),
      ]);

      res.status(200).json({ drivers, orders, routes });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async assignRoute(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const driverId = Number(req.body.driverId);
      const orderIds = Array.isArray(req.body.orderIds)
        ? req.body.orderIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
        : [];

      if (!Number.isInteger(driverId) || driverId <= 0) return res.status(400).json({ error: 'driverId inválido' });
      if (orderIds.length === 0) return res.status(400).json({ error: 'orderIds debe incluir al menos un pedido' });

      const driver = await DeliveryDriver.findOne({ where: { id: driverId, storeId } });
      if (!driver) return res.status(404).json({ error: 'Repartidor no encontrado' });
      if (driver.status === 'inactive') return res.status(400).json({ error: 'El repartidor está inactivo' });

      const orders = await Order.findAll({
        where: {
          id: { [Op.in]: orderIds },
          storeId,
          type: 'delivery',
          status: { [Op.in]: ACTIVE_ORDER_STATUSES },
        },
      });

      if (orders.length !== orderIds.length) {
        return res.status(400).json({ error: 'Uno o más pedidos no son delivery activos de esta tienda' });
      }

      const route = await sequelize.transaction(async (transaction) => {
        const createdRoute = await DeliveryRoute.create({
          storeId,
          driverId,
          name: String(req.body.name || '').trim() || `Recorrido ${new Date().toLocaleString('es-AR')}`,
          status: 'assigned',
          scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : null,
          notes: String(req.body.notes || '').trim() || null,
        }, { transaction });

        await DeliveryRouteOrder.destroy({
          where: { storeId, orderId: { [Op.in]: orderIds }, status: { [Op.ne]: 'delivered' } },
          transaction,
        });

        await OrderTrackingService.ensureTrackingForOrders(orders, { transaction });

        await DeliveryRouteOrder.bulkCreate(orderIds.map((orderId, index) => ({
          storeId,
          routeId: createdRoute.id,
          orderId,
          sequence: index + 1,
          status: 'assigned',
        })), { transaction });

        await driver.update({ status: 'busy' }, { transaction });
        return createdRoute;
      });

      const loadedRoute = await loadRoute(route.id, storeId);
      await OrderTrackingService.notifyRoute(route.id, storeId);
      try {
        await DriverPushNotificationService.notifyRouteAssigned(route);
      } catch (notificationErr) {
        console.error('Error enviando push de recorrido asignado:', notificationErr);
      }
      res.status(201).json(loadedRoute);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateRouteStatus(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const status = String(req.body.status || '').trim();
      if (!['assigned', 'in_transit', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'status inválido' });
      }

      const route = await DeliveryRoute.findOne({ where: { id: req.params.id, storeId } });
      if (!route) return res.status(404).json({ error: 'Recorrido no encontrado' });

      await route.update({
        status,
        startedAt: status === 'in_transit' ? new Date() : route.startedAt,
        completedAt: status === 'completed' ? new Date() : route.completedAt,
      });

      if (['completed', 'cancelled'].includes(status)) {
        await DeliveryDriver.update({ status: 'active' }, { where: { id: route.driverId, storeId } });
      }

      const loadedRoute = await loadRoute(route.id, storeId);
      await OrderTrackingService.notifyRoute(route.id, storeId);
      if (['assigned', 'in_transit'].includes(status)) {
        try {
          await DriverPushNotificationService.notifyRouteUpdated(route);
        } catch (notificationErr) {
          console.error('Error enviando push de recorrido actualizado:', notificationErr);
        }
      }
      res.status(200).json(loadedRoute);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async markPrinted(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const route = await DeliveryRoute.findOne({ where: { id: req.params.id, storeId } });
      if (!route) return res.status(404).json({ error: 'Recorrido no encontrado' });

      await DeliveryRouteOrder.update(
        { printedAt: new Date() },
        { where: { storeId, routeId: route.id } }
      );

      const loadedRoute = await loadRoute(route.id, storeId);
      res.status(200).json(loadedRoute);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateRouteLocation(req, res) {
    try {
      const storeId = requireStoreId(req, res);
      if (!storeId) return;

      const latitude = Number(req.body.latitude);
      const longitude = Number(req.body.longitude);
      const accuracy = req.body.accuracy !== undefined && req.body.accuracy !== null
        ? Number(req.body.accuracy)
        : null;

      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        return res.status(400).json({ error: 'latitude inválida' });
      }
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        return res.status(400).json({ error: 'longitude inválida' });
      }
      if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0)) {
        return res.status(400).json({ error: 'accuracy inválida' });
      }

      const route = await DeliveryRoute.findOne({ where: { id: req.params.id, storeId } });
      if (!route) return res.status(404).json({ error: 'Recorrido no encontrado' });
      if (!ACTIVE_ROUTE_STATUSES.includes(route.status)) {
        return res.status(400).json({ error: 'El recorrido no está activo' });
      }

      await route.update({
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationAccuracy: accuracy,
        lastLocationAt: new Date(),
      });

      const loadedRoute = await loadRoute(route.id, storeId);
      await OrderTrackingService.notifyRoute(route.id, storeId);
      res.status(200).json(loadedRoute);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default DeliveryLogisticsController;
