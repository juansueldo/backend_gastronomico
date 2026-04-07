# Ejemplos de Integración de Notificaciones WebSocket

## 🎯 Integración en Controladores

### Ejemplo 1: Notificación al Crear Producto

**Antes:**
```javascript
// src/controllers/productController.js
static async create(req, res) {
  // ... crear producto ...
  const product = await Product.create({ ... });
  res.status(201).json(product);
}
```

**Después (con notificaciones):**
```javascript
import NotificationService from '../services/notificationService.js';

static async create(req, res) {
  try {
    const storeId = req.user?.storeId;
    
    // ... validaciones ...
    
    const product = await Product.create({ ... });
    
    // Notificar a todos los usuarios de esta tienda
    NotificationService.notifyProductCreated(storeId, product);
    
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

### Ejemplo 2: Notificación al Actualizar Producto

```javascript
static async update(req, res) {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId;
    
    const product = await Product.findByPk(id);
    
    if (product.storeId !== storeId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    // Actualizar
    await product.update({ ... });
    
    // Notificar
    NotificationService.notifyProductUpdated(storeId, product);
    
    res.status(200).json(product);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

### Ejemplo 3: Notificación al Eliminar Producto

```javascript
static async delete(req, res) {
  try {
    const { id } = req.params;
    const storeId = req.user?.storeId;
    
    const product = await Product.findByPk(id);
    
    if (product.storeId !== storeId) {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    // Guardar IDs para la notificación
    const productId = product.id;
    
    // Eliminar
    await product.destroy();
    
    // Notificar
    NotificationService.notifyProductDeleted(storeId, productId);
    
    res.status(200).json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}
```

## 📊 Ejemplos prácticos completos

### Ejemplo 4: Controlador de Órdenes

```javascript
import { Order, OrderItem, Product, Store, Status, DeliveryZone } from '../models/index.js';
import NotificationService from '../services/notificationService.js';

class OrderController {
  static async create(req, res) {
    try {
      const { storeId, userId, items, type, ... } = req.body;
      
      // ... validaciones ...
      
      const order = await Order.create({
        order_number: `ORD-${Date.now()}-${storeId}`,
        total_amount: totalAmount,
        type,
        storeId,
        userId,
        status: 'pending',
        statusId: 1,
      });
      
      // Crear items
      await Promise.all(
        itemsData.map(item => OrderItem.create({ orderId: order.id, ...item }))
      );
      
      // ✨ NOTIFICAR: Nueva orden creada
      NotificationService.notifyOrderCreated(storeId, order);
      
      const orderWithItems = await Order.findByPk(order.id, {
        include: [{ model: OrderItem, include: [Product] }]
      });
      
      res.status(201).json(orderWithItems);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const storeId = req.user?.storeId;
      
      const order = await Order.findByPk(id);
      
      if (!order || order.storeId !== storeId) {
        return res.status(404).json({ error: 'Orden no encontrada' });
      }
      
      const oldStatus = order.status;
      
      await order.update({ status });
      
      // ✨ NOTIFICAR: Estado cambió
      NotificationService.notifyOrderStatusChanged(storeId, order, oldStatus);
      
      res.status(200).json(order);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}
```

### Ejemplo 5: Controlador de Mesas

```javascript
import NotificationService from '../services/notificationService.js';

class TableController {
  static async create(req, res) {
    try {
      const { name, table_number, capacity, location } = req.body;
      const storeId = req.user?.storeId;
      
      // ... validaciones ...
      
      const table = await Table.create({
        name,
        table_number,
        capacity: capacity || 4,
        location,
        storeId,
        statusId: 1
      });
      
      // ✨ NOTIFICAR: Nueva mesa
      NotificationService.notifyTableCreated(storeId, table);
      
      res.status(201).json(table);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { statusId } = req.body;
      const storeId = req.user?.storeId;
      
      const table = await Table.findByPk(id);
      
      if (!table || table.storeId !== storeId) {
        return res.status(403).json({ error: 'No autorizado' });
      }
      
      const oldStatus = table.statusId;
      
      await table.update({ statusId });
      
      // ✨ NOTIFICAR: Estado de mesa cambió
      NotificationService.notifyTableStatusChanged(storeId, table, oldStatus);
      
      res.status(200).json(table);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}
```

## 🔧 Crear Notificaciones Personalizadas

### Para Segmentos

```javascript
// En un nuevo controller o servicio
import NotificationService from '../services/notificationService.js';

export async function sendSegmentUpdate(storeId, segmentData) {
  NotificationService.notifySegmentUpdate(storeId, {
    segmentId: segmentData.id,
    name: segmentData.name,
    totalCount: segmentData.totalCount,
    updatedAt: new Date()
  });
}

// Uso:
await sendSegmentUpdate(1, { id: 1, name: 'VIP', totalCount: 150 });
```

### Notificación Genérica a Canal

```javascript
// Enviar notificación personalizada a un canal específico
NotificationService.notifyChannel(storeId, 'segments', 'segment_sync_started', {
  segmentId: 1,
  syncProgress: 0
});
```

### Notificación a Toda la Tienda

```javascript
// Enviar notificación a todos los clientes de esa tienda
NotificationService.notifyStore(storeId, 'maintenance_alert', {
  message: 'Sistema en mantenimiento en 10 minutos',
  duration: '15 minutos'
});
```

## 📝 Checklist para Integración

Cuando integres WebSocket a un controlador existente:

- [ ] Importar `NotificationService` al inicio del controlador
- [ ] Después de crear/actualizar/eliminar, llamar al método de notificación
- [ ] Usar la misma estructura de datos que espera el frontend
- [ ] Incluir `storeId` en cada notificación
- [ ] Testear con el cliente HTML: `http://localhost:3000/websocket-client.html`
- [ ] Verificar que el evento aparece en los logs del cliente

## 🧪 Testing

### 1. Usar el Cliente HTML

1. Abre `http://localhost:3000/websocket-client.html`
2. Ingresa tu token JWT y storeId
3. Haz clic en "Conectar"
4. Suscríbete a un canal (ej: "products")
5. Desde otro cliente/terminal, crea un producto
6. Observa el evento en el panel de logs

### 2. Usar cURL para Crear Producto y Ver Notificación

Terminal 1 - Ver notificaciones:
```bash
# Abre http://localhost:3000/websocket-client.html
```

Terminal 2 - Crear producto:
```bash
curl -X POST http://localhost:3000/product \
  -H "Authorization: Bearer TU_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pizza Test",
    "price": 15.99,
    "category": "Pizzas"
  }'
```

Observa: El evento `product_created` aparecerá en tiempo real en el navegador.

### 3. Check de Estado del Servidor

```bash
curl http://localhost:3000/websocket/status

# Respuesta:
{
  "totalConnections": 2,
  "storesConnected": 1,
  "stores": [
    { "storeId": 1, "connectedUsers": 2 }
  ]
}
```

## 🚀 Pasos Siguientes

1. **Agregar notificaciones a todos los controladores**
   - productController.js ✅ (incluye imagen)
   - orderController.js ✅
   - tableController.js ✅
   - waiterController.js ✅
   - subscriptionController.js ⏳
   - customerController.js ⏳
   - categoryController.js ⏳

2. **En el Frontend**
   - React: Ver ejemplos en WEBSOCKET_DOCUMENTATION.md
   - Vue/Angular: Similar usando socket.io client

3. **Datos Históricos (Opcional)**
   - Implementar persistencia de eventos en BD
   - Retransmitir si cliente se conecta después de evento

4. **Autenticación JWT Mejorada**
   - Validar token JWT realmente en middleware de Socket.io
   - Rechazar conexiones si token está vencido

## 📚 Documentación Completa

Ver: [WEBSOCKET_DOCUMENTATION.md](./WEBSOCKET_DOCUMENTATION.md)
