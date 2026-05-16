/**
 * Servicio centralizado de notificaciones
 * Se usa desde los controladores para notificar cambios en tiempo real
 */

import { Notification, User } from '../models/index.js';

let ioInstance = null;

function formatCustomer(customer) {
  if (!customer) return null;

  return {
    id: customer.id,
    name: customer.name ?? null,
    phone: customer.phone ?? null,
    email: customer.email ?? null,
  };
}

class NotificationService {
  /**
   * Inicializar el servicio con la instancia de Socket.io
   * @param {WebSocketService} webSocketService - Instancia del servicio WebSocket
   */
  static initialize(webSocketService) {
    ioInstance = webSocketService;
  }

  /**
   * Notificar creación de producto
   */
  static notifyProductCreated(storeId, product) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'products', 'product_created', {
      type: 'product_created',
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        categoryId: product.categoryId,
        statusId: product.statusId
      }
    });
  }

  /**
   * Notificar actualización de producto
   */
  static notifyProductUpdated(storeId, product) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'products', 'product_updated', {
      type: 'product_updated',
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        categoryId: product.categoryId,
        statusId: product.statusId
      }
    });
  }

  /**
   * Notificar eliminación de producto
   */
  static notifyProductDeleted(storeId, productId) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'products', 'product_deleted', {
      type: 'product_deleted',
      productId
    });
  }

  /**
   * Notificar creación de orden
   */
  static notifyOrderCreated(storeId, order) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'orders', 'order_created', {
      type: 'order_created',
      order: {
        id: order.id,
        order_number: order.order_number,
        total_amount: order.total_amount,
        type: order.type,
        status: order.status,
        userId: order.userId,
        customerId: order.customerId,
        tableId: order.tableId,
        waiterId: order.waiterId,
        Customer: formatCustomer(order.Customer)
      }
    });
  }

  /**
   * Notificar cambio de estado de orden
   */
  static notifyOrderStatusChanged(storeId, order, oldStatus) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'orders', 'order_status_changed', {
      type: 'order_status_changed',
      orderId: order.id,
      order_number: order.order_number,
      oldStatus,
      newStatus: order.status,
      timestamp: new Date()
    });
  }

  /**
   * Notificar creación de mesa
   */
  static notifyTableCreated(storeId, table) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'tables', 'table_created', {
      type: 'table_created',
      table: {
        id: table.id,
        name: table.name,
        table_number: table.table_number,
        capacity: table.capacity,
        location: table.location,
        statusId: table.statusId
      }
    });
  }

  /**
   * Notificar cambio de estado de mesa
   */
  static notifyTableStatusChanged(storeId, table, oldStatus) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'tables', 'table_status_changed', {
      type: 'table_status_changed',
      tableId: table.id,
      table_number: table.table_number,
      oldStatus,
      newStatus: table.statusId,
      timestamp: new Date()
    });
  }

  /**
   * Notificar creación de mozo
   */
  static notifyWaiterCreated(storeId, waiter) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'waiters', 'waiter_created', {
      type: 'waiter_created',
      waiter: {
        id: waiter.id,
        firstname: waiter.firstname,
        lastname: waiter.lastname,
        email: waiter.email,
        phone: waiter.phone,
        statusId: waiter.statusId
      }
    });
  }

  /**
   * Notificar actualización de suscripción
   */
  static notifySubscriptionUpdated(storeId, subscription) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'subscriptions', 'subscription_updated', {
      type: 'subscription_updated',
      subscription: {
        id: subscription.id,
        planId: subscription.planId,
        status: subscription.status,
        payment_status: subscription.payment_status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  }

  /**
   * Notificar evento genérico
   * Útil para segmentos y otros eventos personalizados
   */
  static notifySegmentUpdate(storeId, segmentData) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, 'segments', 'segment_updated', {
      type: 'segment_updated',
      ...segmentData,
      timestamp: new Date()
    });
  }

  /**
   * Notificar evento genérico a toda la tienda
   */
  static notifyStore(storeId, eventName, data) {
    if (!ioInstance) return;
    ioInstance.notifyStore(storeId, eventName, {
      type: eventName,
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Notificar evento a un canal específico
   */
  static notifyChannel(storeId, channel, eventName, data) {
    if (!ioInstance) return;
    ioInstance.notifyChannel(storeId, channel, eventName, {
      type: eventName,
      ...data,
      timestamp: new Date()
    });
  }

  /**
   * Obtener estado del servidor (para debugging)
   */
  static getServerStatus() {
    if (!ioInstance) return null;
    return ioInstance.getServerStatus();
  }

  /**
   * Crear notificación en la base de datos para el store
   * @param {number} storeId - ID de la tienda
   * @param {string} title - Título de la notificación
   * @param {string} message - Mensaje de la notificación
   * @param {string} icon - URL del icono (opcional)
   * @returns {Promise<Notification>} - Notificación creada
   */
  static async createStoreNotification(
    storeId,
    title,
    message,
    icon = null,
    options = {}
  ) {
    try {
      const payload = {
        storeId,
        title,
        message,
        icon,
        statusId: 1, // Active
      };

      if (options.headquarterId !== undefined && options.headquarterId !== null) {
        payload.headquarterId = options.headquarterId;
      }

      if (options.userId !== undefined && options.userId !== null) {
        payload.userId = options.userId;
      }

      const notification = await Notification.create({
        ...payload,
      });
      return notification;
    } catch (err) {
      console.error('Error creando notificación del store:', err);
      throw err;
    }
  }

  /**
   * Crear notificaciones para todos los usuarios de un headquarter
   * @param {number} storeId - ID de la tienda
   * @param {number} headquarterId - ID del headquarter
   * @param {string} title - Título de la notificación
   * @param {string} message - Mensaje de la notificación
   * @param {string} icon - URL del icono (opcional)
   * @returns {Promise<Array>} - Array de notificaciones creadas
   */
  static async createHeadquarterNotifications(storeId, headquarterId, title, message, icon = null) {
    try {
      // Obtener todos los usuarios del headquarter
      const users = await User.findAll({
        where: { storeId, headquarterId, statusId: 1 }, // statusId: 1 = activos
      });

      if (users.length === 0) {
        console.log(`No se encontraron usuarios activos en el headquarter ${headquarterId}`);
        return [];
      }

      // Crear notificaciones para cada usuario
      const notifications = await Promise.all(
        users.map((user) =>
          Notification.create({
            storeId,
            headquarterId,
            userId: user.id,
            title,
            message,
            icon,
            statusId: 1, // Active
          })
        )
      );

      return notifications;
    } catch (err) {
      console.error('Error creando notificaciones del headquarter:', err);
      throw err;
    }
  }

  /**
   * Notificar creación de orden (almacenar en BD y emitir vía WebSocket)
   * @param {number} storeId - ID de la tienda
   * @param {number} headquarterId - ID del headquarter
   * @param {Object} order - Objeto de orden con detalles
   * @returns {Promise<void>}
   */
  static async notifyOrderCreatedWithPersistence(storeId, headquarterId, order) {
    const safeOrderNumber = order?.order_number ?? order?.orderNumber ?? order?.id ?? 'N/A';
    const safeTotalAmount = order?.total_amount ?? order?.totalAmount ?? 0;
    const safeOrderType = order?.type ?? 'desconocido';

    try {
      const storeMessage = `Nueva orden #${safeOrderNumber} por $${safeTotalAmount}`;
      await this.createStoreNotification(
        storeId,
        'Nueva Orden',
        storeMessage,
        'order-icon',
        { headquarterId }
      );
    } catch (err) {
      console.error('Error creando notificación general de tienda para orden:', err);
    }

    try {
      const headquarterMessage = `Nueva orden #${safeOrderNumber} de tipo ${safeOrderType} - Total: $${safeTotalAmount}`;
      await this.createHeadquarterNotifications(
        storeId,
        headquarterId,
        'Nueva Orden Recibida',
        headquarterMessage,
        'order-icon'
      );
    } catch (err) {
      console.error('Error creando notificaciones por sede para orden:', err);
    }

    try {
      this.notifyOrderCreated(storeId, order);
    } catch (err) {
      console.error('Error enviando notificación websocket de orden:', err);
    }

    console.log(`Flujo de notificación ejecutado para orden ${order?.id ?? 'N/A'}`);
  }
}

export default NotificationService;
