import sequelize from '../models/db.js';
import {
  Customer,
  DeliveryZone,
  Headquarter,
  Order,
  OrderItem,
  Product,
  Status,
  Store,
  Table,
  User,
  Waiter,
} from '../models/index.js';

const ORDER_STATUSES = ['pending', 'processing', 'ready', 'completed', 'cancelled'];
const ORDER_STATUS_TRANSITIONS = {
  pending: [],
  processing: ['pending'],
  ready: ['processing'],
  completed: ['ready'],
  cancelled: ['pending', 'processing', 'ready'],
};

// Función para validar si un punto está dentro de un polígono (ray-casting algorithm)
function isPointInPolygon(lat, lon, polygon) {
  let coordinates = null;

  if (Array.isArray(polygon)) {
    coordinates = polygon;
  } else if (typeof polygon === 'string') {
    try {
      const parsedPolygon = JSON.parse(polygon);
      return isPointInPolygon(lat, lon, parsedPolygon);
    } catch {
      return false;
    }
  } else if (polygon?.type === 'Polygon') {
    coordinates = polygon.coordinates?.[0] || null;
  } else if (polygon?.type === 'Feature' && polygon.geometry?.type === 'Polygon') {
    coordinates = polygon.geometry.coordinates?.[0] || null;
  }

  if (!Array.isArray(coordinates) || coordinates.length < 3) {
    return false;
  }

  let inside = false;
  for (let i = 0, j = coordinates.length - 1; i < coordinates.length; j = i++) {
    const [xi, yi] = coordinates[i];
    const [xj, yj] = coordinates[j];

    const xi_equal = Math.abs(xi - lon) < 0.0000001;
    const xj_equal = Math.abs(xj - lon) < 0.0000001;

    if (xi_equal && xj_equal && Math.min(yi, yj) <= lat && lat <= Math.max(yi, yj)) {
      return true; // En la línea del polígono
    }

    if ((yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

async function getOrderForStore(orderId, storeId) {
  return Order.findOne({
    where: { id: orderId, storeId },
  });
}

async function getOrderWithRelations(orderId, storeId) {
  return Order.findOne({
    where: { id: orderId, storeId },
    include: [
      { model: OrderItem, include: [Product, { model: Status, attributes: ['id', 'name'] }] },
      { model: Customer, attributes: ['id', 'name', 'phone', 'email'] },
      { model: Store, attributes: ['id', 'name'] },
      { model: Status, attributes: ['id', 'name'] },
      { model: DeliveryZone, attributes: ['id', 'name', 'zoneid'] },
      { model: Headquarter, attributes: ['id', 'name', 'location'] },
      { model: Table, attributes: ['id', 'name', 'table_number'] },
      { model: Waiter, attributes: ['id', 'firstname', 'lastname'] },
    ],
  });
}

function validateTransition(currentStatus, targetStatus) {
  const allowedPreviousStatuses = ORDER_STATUS_TRANSITIONS[targetStatus];

  if (!allowedPreviousStatuses) {
    return `status debe ser: ${ORDER_STATUSES.join(', ')}`;
  }

  if (currentStatus === targetStatus) {
    return `La orden ya se encuentra en estado ${targetStatus}`;
  }

  if (!allowedPreviousStatuses.includes(currentStatus)) {
    return `No se puede pasar una orden de ${currentStatus} a ${targetStatus}`;
  }

  return null;
}

class OrderController {
  static async create(req, res) {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      delivery_address,
      delivery_date,
      delivery_latitude,
      delivery_longitude,
      headquarterId,
      items,
      tableId,
      type,
      userId,
      waiterId,
    } = req.body;

    const storeId = req.user?.storeId;
    if (!storeId) {
      return res.status(401).json({ error: 'storeId no encontrado en el token' });
    }

    // Resolver customerId (crear cliente si no existe)
    let resolvedCustomerId = customerId ?? null;
    if (!customerId) {
      if (!customerName) return res.status(400).json({ error: 'customerName es requerido si no se proporciona customerId' });
      if (!customerPhone) return res.status(400).json({ error: 'customerPhone es requerido si no se proporciona customerId' });

      const existingCustomer = await Customer.findOne({ where: { phone: customerPhone, storeId } });
      if (existingCustomer) {
        resolvedCustomerId = existingCustomer.id;
      } else {
        const newCustomer = await Customer.create({ name: customerName, phone: customerPhone, storeId, statusId: 1 });
        resolvedCustomerId = newCustomer.id;
      }
    }

    if (!userId) return res.status(400).json({ error: 'userId es requerido' });
    if (!headquarterId) return res.status(400).json({ error: 'headquarterId es requerido' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items debe ser un array no vacío' });
    }
    if (!type || !['dine-in', 'takeaway', 'delivery'].includes(type)) {
      return res.status(400).json({ error: 'type debe ser: dine-in, takeaway o delivery' });
    }

    const store = await Store.findByPk(storeId);
    if (!store) return res.status(404).json({ error: 'Store no encontrada' });

    const normalizedHeadquarterId = Number(headquarterId);
    if (!Number.isInteger(normalizedHeadquarterId) || normalizedHeadquarterId <= 0) {
      return res.status(400).json({ error: 'headquarterId debe ser un entero válido' });
    }

    const headquarter = await Headquarter.findOne({ where: { id: normalizedHeadquarterId, storeId } });
    if (!headquarter) return res.status(404).json({ error: 'Sede no encontrada para esta tienda' });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user.storeId !== storeId) return res.status(403).json({ error: 'Usuario no pertenece a esta tienda' });

    if (resolvedCustomerId) {
      const customer = await Customer.findByPk(resolvedCustomerId);
      if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
      if (customer.storeId !== storeId) return res.status(403).json({ error: 'Cliente no pertenece a esta tienda' });
    }

    // Validaciones delivery
    let matchedDeliveryZone = null;
    if (type === 'delivery') {
      if (!delivery_address) return res.status(400).json({ error: 'delivery_address es requerido para órdenes de delivery' });
      if (delivery_latitude === undefined || delivery_longitude === undefined) {
        return res.status(400).json({ error: 'delivery_latitude y delivery_longitude son requeridos para órdenes de delivery' });
      }

      const latitude = Number(delivery_latitude);
      const longitude = Number(delivery_longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return res.status(400).json({ error: 'delivery_latitude y delivery_longitude deben ser números válidos' });
      }

      const deliveryZones = await DeliveryZone.findAll({
        where: { headquarterId: normalizedHeadquarterId, storeId, statusId: 1 },
      });

      for (const zone of deliveryZones) {
        if (isPointInPolygon(latitude, longitude, zone.polygon)) {
          matchedDeliveryZone = zone;
          break;
        }
      }

      if (!matchedDeliveryZone) {
        return res.status(400).json({
          error: 'La dirección de entrega está fuera de las zonas de entrega disponibles',
          details: { latitude, longitude },
        });
      }
    }

    if (type !== 'delivery' && (delivery_address || delivery_date || delivery_latitude !== undefined || delivery_longitude !== undefined)) {
      return res.status(400).json({ error: 'Los datos de delivery solo se permiten cuando type es delivery' });
    }

    // Validaciones dine-in
    if (type !== 'dine-in' && tableId) {
      return res.status(400).json({ error: 'tableId solo se permite para órdenes dine-in' });
    }

    if (type === 'dine-in' && tableId) {
      const table = await Table.findByPk(tableId);
      if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
      if (table.storeId !== storeId) return res.status(403).json({ error: 'Mesa no pertenece a esta tienda' });
      if (table.headquarterId !== normalizedHeadquarterId) {
        return res.status(400).json({ error: 'La mesa no pertenece a la sede seleccionada' });
      }
    }

    // Validar waiter
    if (waiterId) {
      const waiter = await Waiter.findByPk(waiterId);
      if (!waiter) return res.status(404).json({ error: 'Mozo no encontrado' });
      if (waiter.storeId !== storeId) return res.status(403).json({ error: 'Mozo no pertenece a esta tienda' });
    }

    // Validar items y calcular total
    let totalAmount = 0;
    const itemsData = [];

    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: 'Cada item debe tener productId y quantity > 0' });
      }

      const product = await Product.findByPk(item.productId);
      if (!product) return res.status(404).json({ error: `Producto ${item.productId} no encontrado` });
      if (product.storeId !== storeId) return res.status(403).json({ error: `Producto ${item.productId} no pertenece a esta tienda` });

      totalAmount += parseFloat(product.price) * item.quantity;
      itemsData.push({
        headquarterId: normalizedHeadquarterId,
        productId: item.productId,
        quantity: item.quantity,
        price: parseFloat(product.price),
        storeId,
      });
    }

    const order_number = `ORD-${Date.now()}-${storeId}`;

    const createdOrder = await sequelize.transaction(async (transaction) => {
      const order = await Order.create({
        customerId: resolvedCustomerId,          // ← corregido
        deliveryZoneId: matchedDeliveryZone?.id ?? null,
        delivery_address: type === 'delivery' ? delivery_address : null,
        delivery_date: type === 'delivery' ? delivery_date : null,
        delivery_latitude: type === 'delivery' ? Number(delivery_latitude) : null,
        delivery_longitude: type === 'delivery' ? Number(delivery_longitude) : null,
        headquarterId: normalizedHeadquarterId,
        order_number,
        status: 'pending',
        statusId: 1,
        storeId,
        tableId: tableId ?? null,
        total_amount: parseFloat(totalAmount.toFixed(2)),
        type,
        userId,
        waiterId: waiterId ?? null,
      }, { transaction });

      await Promise.all(
        itemsData.map((item) =>
          OrderItem.create({ orderId: order.id, ...item, statusId: 1 }, { transaction })
        )
      );

      return order;
    });

    const orderWithItems = await getOrderWithRelations(createdOrder.id, storeId);
    res.status(201).json(orderWithItems);

  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message, details: err.errors ?? [] });
  }
}

  /**
   * Obtener una orden por ID
   * @param {Object} req - Request object con params.id (orderId)
   * @param {Object} res - Response object
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;
      const storeId = req.user?.storeId;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      const order = await getOrderWithRelations(id, storeId);

      if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

      res.status(200).json(order);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Obtener todas las órdenes de una tienda
   * @param {Object} req - Request object con query.storeId
   * @param {Object} res - Response object
   */
  static async getByStore(req, res) {
    try {
      const storeId = req.user?.storeId;
      if (!storeId) {
          return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      const orders = await Order.findAndCountAll({
        where: { storeId },
        include: [
          { model: OrderItem, include: [Product] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
        order: [['order_date', 'DESC']],
      });

      res.status(200).json(orders);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Actualizar el estado de una orden
   * @param {Object} req - Request object con params.id y body { status }
   * @param {Object} res - Response object
   */
  static async updateStatus(req, res) {
  try {
    const storeId = req.user?.storeId;
    const { id } = req.params;
    const { status } = req.body;

    if (!storeId) {
      return res.status(401).json({ error: 'storeId no encontrado en el token' });
    }

    if (!status || !ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status debe ser: ${ORDER_STATUSES.join(', ')}` });
    }

    const order = await getOrderForStore(id, storeId);
    if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

    const transitionError = validateTransition(order.status, status);
    if (transitionError) {
      return res.status(400).json({ error: transitionError });
    }

    // Mapeo de status string → statusId
    const STATUS_ID_MAP = {
      pending: 1,
      processing: 2,
      ready: 3,
      completed: 4,
      cancelled: 5,
    };

    // Actualizar ambos campos para mantener consistencia
    await order.update({
      status,
      statusId: STATUS_ID_MAP[status],
    });

    const updatedOrder = await getOrderWithRelations(id, storeId);
    res.status(200).json(updatedOrder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

  static async moveToProduction(req, res) {
    req.body = { ...(req.body || {}), status: 'processing' };
    return OrderController.updateStatus(req, res);
  }

  static async markAsReady(req, res) {
    req.body = { ...(req.body || {}), status: 'ready' };
    return OrderController.updateStatus(req, res);
  }

  static async finalize(req, res) {
    req.body = { ...(req.body || {}), status: 'completed' };
    return OrderController.updateStatus(req, res);
  }

  /**
   * Eliminar una orden
   * @param {Object} req - Request object con params.id (orderId)
   * @param {Object} res - Response object
   */
  static async delete(req, res) {
    try {
      const storeId = req.user?.storeId;
      const { id } = req.params;

      if (!storeId) {
        return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }

      const order = await getOrderForStore(id, storeId);
      if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

      // Eliminar items relacionados
      await OrderItem.destroy({ where: { orderId: id } });
      await order.destroy();

      res.status(200).json({ message: 'Orden eliminada correctamente' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default OrderController;
