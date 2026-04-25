import { Order, OrderItem, Product, Store, Status, Customer, DeliveryZone } from '../models/index.js';
import { Op } from 'sequelize';

// Función para validar si un punto está dentro de un polígono (ray-casting algorithm)
function isPointInPolygon(lat, lon, polygon) {
  // polygon puede ser un objeto GeoJSON o un array de coordenadas
  let orderWithItemscoordinates = polygon;
  
  if (polygon.type === 'Polygon') {
    coordinates = polygon.coordinates[0]; // Tomar el primer anillo (exterior)
  } else if (polygon.type === 'Feature' && polygon.geometry) {
    if (polygon.geometry.type === 'Polygon') {
      coordinates = polygon.geometry.coordinates[0];
    }
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

class OrderController {
  static async create(req, res) {
    try {
      const { customerId, userId, items, type, delivery_address, delivery_latitude, delivery_longitude, delivery_date, tableId, waiterId } = req.body;

      // Validaciones
      const storeId = req.user?.storeId;
      if (!storeId) {
          return res.status(401).json({ error: 'storeId no encontrado en el token' });
      }
      if (!userId) return res.status(400).json({ error: 'userId es requerido' });
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items debe ser un array no vacío' });
      }
      if (!type || !['dine-in', 'takeaway', 'delivery'].includes(type)) {
        return res.status(400).json({ error: 'type debe ser: dine-in, takeaway o delivery' });
      }

      // Validar que la tienda existe
      const store = await Store.findByPk(storeId);
      if (!store) return res.status(404).json({ error: 'Store no encontrada' });

      // Validaciones específicas para delivery
      if (type === 'delivery') {
        if (!delivery_address) {
          return res.status(400).json({ error: 'delivery_address es requerido para órdenes de delivery' });
        }
        if (!delivery_latitude || !delivery_longitude) {
          return res.status(400).json({ error: 'delivery_latitude y delivery_longitude son requeridos para órdenes de delivery' });
        }

        // Validar que la dirección está dentro de una zona de entrega
        const deliveryZones = await DeliveryZone.findAll({
          where: {
            storeId,
            statusId: 1,
          },
        });

        let isInZone = false;
        for (const zone of deliveryZones) {
          if (isPointInPolygon(delivery_latitude, delivery_longitude, zone.polygon)) {
            isInZone = true;
            break;
          }
        }

        if (!isInZone) {
          return res.status(400).json({
            error: 'La dirección de entrega está fuera de las zonas de entrega disponibles',
            details: {
              latitude: delivery_latitude,
              longitude: delivery_longitude,
            },
          });
        }
      }

      // Validaciones específicas para dine-in
      if (type === 'dine-in' && tableId) {
        const Table = (await import('../models/index.js')).Table;
        const table = await Table.findByPk(tableId);
        if (!table) return res.status(404).json({ error: 'Mesa no encontrada' });
        if (table.storeId !== storeId) {
          return res.status(403).json({ error: 'Mesa no pertenece a esta tienda' });
        }
      }

      // Validar waiter si se proporciona
      if (waiterId) {
        const Waiter = (await import('../models/index.js')).Waiter;
        const waiter = await Waiter.findByPk(waiterId);
        if (!waiter) return res.status(404).json({ error: 'Mozo no encontrado' });
        if (waiter.storeId !== storeId) {
          return res.status(403).json({ error: 'Mozo no pertenece a esta tienda' });
        }
      }

      // Validar que todos los items tengan productos válidos
      let totalAmount = 0;
      const itemsData = [];

      for (const item of items) {
        if (!item.productId || !item.quantity || item.quantity <= 0) {
          return res.status(400).json({ error: 'Cada item debe tener productId y quantity > 0' });
        }

        const product = await Product.findByPk(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Producto ${item.productId} no encontrado` });
        }
        if (product.storeId !== storeId) {
          return res.status(403).json({ error: `Producto ${item.productId} no pertenece a esta tienda` });
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        itemsData.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          storeId,
        });
      }

      // Generar número de orden único
      const order_number = `ORD-${Date.now()}-${storeId}`;

      // Crear la orden
      const order = await Order.create({
        order_number,
        total_amount: totalAmount,
        type,
        delivery_address: type === 'delivery' ? delivery_address : null,
        delivery_latitude: type === 'delivery' ? delivery_latitude : null,
        delivery_longitude: type === 'delivery' ? delivery_longitude : null,
        delivery_date: type === 'delivery' ? delivery_date : null,
        tableId: tableId || null,
        waiterId: waiterId || null,
        storeId,
        userId,
        customerId: customerId || null,
        status: 'pending',
        statusId: 1,
      });

      // Crear los items de la orden
      const orderItems = await Promise.all(
        itemsData.map(item =>
          OrderItem.create({
            orderId: order.id,
            ...item,
            statusId: 1,
          })
        )
      );

      // Retornar la orden con sus items
      const orderWithItems = await Order.findByPk(order.id, {
        include: [
          { model: OrderItem, as: 'items', include: [Product] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
          { model: DeliveryZone, attributes: ['id', 'name', 'zoneid'] },
        ],
      });

      res.status(201).json(orderWithItems);
    } catch (err) {
      res.status(400).json({ error: err.message });
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

      const order = await Order.findByPk(id, {
        include: [
          { model: OrderItem, include: [Product] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
      });

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
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !['pending', 'processing', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({ error: 'status debe ser: pending, processing, completed o cancelled' });
      }

      const order = await Order.findByPk(id);
      if (!order) return res.status(404).json({ error: 'Orden no encontrada' });

      await order.update({ status });

      const updatedOrder = await Order.findByPk(id, {
        include: [
          { model: OrderItem, include: [Product] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
      });

      res.status(200).json(updatedOrder);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Eliminar una orden
   * @param {Object} req - Request object con params.id (orderId)
   * @param {Object} res - Response object
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const order = await Order.findByPk(id);
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
