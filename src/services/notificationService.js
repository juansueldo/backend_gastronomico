/**
 * Servicio centralizado de notificaciones
 * Se usa desde los controladores para notificar cambios en tiempo real
 */

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
}

export default NotificationService;
