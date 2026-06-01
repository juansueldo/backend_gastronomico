import crypto from 'node:crypto';
import { Op } from 'sequelize';
import {
  Customer,
  DeliveryDriver,
  DeliveryRoute,
  DeliveryRouteOrder,
  DeliveryZone,
  Order,
  Store,
} from '../models/index.js';

const TRACKING_TOKEN_BYTES = 32;
const TRACKING_TOKEN_DAYS = 7;
const ACTIVE_TRACKING_ORDER_STATUSES = ['pending', 'processing', 'ready'];
const LOCATION_VISIBLE_ROUTE_STATUSES = ['assigned', 'in_transit'];
const LOCATION_FRESH_MS = 2 * 60 * 1000;

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function createToken() {
  return crypto.randomBytes(TRACKING_TOKEN_BYTES).toString('base64url');
}

function publicStatus(status) {
  const labels = {
    pending: 'Recibido',
    processing: 'Preparando',
    ready: 'Listo',
    completed: 'Entregado',
    cancelled: 'Cancelado',
  };
  return labels[status] || status || 'Pendiente';
}

function routeStatusLabel(status) {
  const labels = {
    planning: 'Planificando',
    assigned: 'Asignado',
    in_transit: 'En camino',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
  };
  return labels[status] || status || null;
}

function isExpired(order) {
  return Boolean(order?.tracking_token_expires_at && new Date(order.tracking_token_expires_at).getTime() < Date.now());
}

function getRouteOrder(order) {
  return order?.DeliveryRouteOrder ?? null;
}

function getRoute(order) {
  return getRouteOrder(order)?.DeliveryRoute ?? null;
}

function getDriver(order) {
  return getRoute(order)?.DeliveryDriver ?? null;
}

function getLocation(route) {
  if (!route || !LOCATION_VISIBLE_ROUTE_STATUSES.includes(route.status)) return null;

  const lastLocationAt = route.lastLocationAt ? new Date(route.lastLocationAt) : null;
  const isFresh = Boolean(lastLocationAt && Date.now() - lastLocationAt.getTime() <= LOCATION_FRESH_MS);
  const latitude = Number(route.lastLatitude);
  const longitude = Number(route.lastLongitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    accuracy: route.lastLocationAccuracy ?? null,
    lastLocationAt,
    isFresh,
  };
}

function toPublicPayload(order) {
  const route = getRoute(order);
  const routeOrder = getRouteOrder(order);
  const driver = getDriver(order);
  const driverLocation = getLocation(route);
  const finalStatus = ['completed', 'cancelled'].includes(order.status);

  return {
    token: order.tracking_token,
    expiresAt: order.tracking_token_expires_at,
    isFinal: finalStatus,
    order: {
      number: order.order_number,
      status: order.status,
      statusLabel: publicStatus(order.status),
      totalAmount: order.total_amount,
      deliveryAddress: order.delivery_address,
      destination: {
        latitude: order.delivery_latitude,
        longitude: order.delivery_longitude,
      },
      createdAt: order.order_date,
      deliveryDate: order.delivery_date,
    },
    store: order.Store ? {
      name: order.Store.name,
      slug: order.Store.slug,
    } : null,
    customer: order.Customer ? {
      name: order.Customer.name,
    } : null,
    deliveryZone: order.DeliveryZone ? {
      name: order.DeliveryZone.name,
    } : null,
    route: route ? {
      status: route.status,
      statusLabel: routeStatusLabel(route.status),
      sequence: routeOrder?.sequence ?? null,
      startedAt: route.startedAt,
      completedAt: route.completedAt,
    } : null,
    driver: driver ? {
      name: driver.name,
      vehicleType: driver.vehicleType,
      plate: driver.plate,
    } : null,
    driverLocation,
  };
}

class OrderTrackingService {
  static async ensureOrderTrackingToken(order, options = {}) {
    if (!order || order.tracking_token) return order;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        await order.update({
          tracking_token: createToken(),
          tracking_token_expires_at: addDays(new Date(), TRACKING_TOKEN_DAYS),
        }, { transaction: options.transaction });
        return order;
      } catch (error) {
        if (String(error?.name || '').includes('Unique') || String(error?.message || '').includes('unique')) {
          continue;
        }
        throw error;
      }
    }

    throw new Error('No se pudo generar token de tracking');
  }

  static async ensureTrackingForOrders(orders, options = {}) {
    await Promise.all((orders || []).map((order) => this.ensureOrderTrackingToken(order, options)));
  }

  static trackingInclude() {
    return [
      { model: Customer, attributes: ['id', 'name'] },
      { model: Store, attributes: ['id', 'name', 'slug'] },
      { model: DeliveryZone, attributes: ['id', 'name', 'zoneid'] },
      {
        model: DeliveryRouteOrder,
        required: false,
        include: [{
          model: DeliveryRoute,
          required: false,
          include: [{ model: DeliveryDriver, required: false }],
        }],
      },
    ];
  }

  static async findOrderByToken(token) {
    const normalizedToken = String(token || '').trim();
    if (!normalizedToken) return null;

    return Order.findOne({
      where: { tracking_token: normalizedToken },
      include: this.trackingInclude(),
    });
  }

  static async getPublicTrackingByToken(token) {
    const order = await this.findOrderByToken(token);
    if (!order) return { status: 404, error: 'Tracking no encontrado' };
    if (isExpired(order)) return { status: 410, error: 'El link de seguimiento expiró' };
    if (order.type !== 'delivery') return { status: 404, error: 'Tracking no encontrado' };
    return { status: 200, data: toPublicPayload(order) };
  }

  static async getPublicTrackingByOrderId(orderId, storeId) {
    const order = await Order.findOne({
      where: { id: orderId, storeId },
      include: this.trackingInclude(),
    });
    if (!order || !order.tracking_token || isExpired(order)) return null;
    return toPublicPayload(order);
  }

  static notifyPayload(payload) {
    if (!payload?.token || !global.wsService) return;
    global.wsService.notifyTracking(payload.token, 'tracking_updated', payload);
  }

  static async notifyOrder(orderId, storeId) {
    const payload = await this.getPublicTrackingByOrderId(orderId, storeId);
    if (payload) this.notifyPayload(payload);
  }

  static async notifyRoute(routeId, storeId) {
    const routeOrders = await DeliveryRouteOrder.findAll({
      where: { routeId, storeId },
      include: [{
        model: Order,
        where: {
          type: 'delivery',
          tracking_token: { [Op.ne]: null },
        },
        include: this.trackingInclude(),
      }],
    });

    routeOrders.forEach((routeOrder) => {
      if (routeOrder.Order) this.notifyPayload(toPublicPayload(routeOrder.Order));
    });
  }

  static isActiveForPublic(order) {
    return order?.type === 'delivery' && ACTIVE_TRACKING_ORDER_STATUSES.includes(order.status);
  }
}

export default OrderTrackingService;
