# WebSocket - Sistema de Notificaciones en Tiempo Real

## 📡 Descripción General

Sistema de notificaciones en tiempo real basado en Socket.io que permite a los clientes del frontend recibir actualizaciones instantáneas sobre cambios en:
- **Productos**: Creación, actualización, eliminación
- **Órdenes**: Creación, cambios de estado
- **Mesas**: Creación, cambios de estado
- **Mozos**: Creación, información
- **Segmentos**: Actualizaciones personalizadas
- **Suscripciones**: Cambios en estado de suscripción

## 🚀 Conexión Básica

### JavaScript Vanilla

```javascript
// Conectar al servidor WebSocket
const socket = io('http://localhost:3000', {
  auth: {
    token: 'tu_jwt_token_aqui',
    storeId: 1
  },
  transports: ['websocket', 'polling']
});

// Escuchar conexión
socket.on('connect', () => {
  console.log('Conectado:', socket.id);
});

// Escuchar desconexión
socket.on('disconnect', () => {
  console.log('Desconectado');
});

// Escuchar errores
socket.on('error', (error) => {
  console.error('Error:', error);
});
```

### React Hooks

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

export function useWebSocket(token, storeId) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL, {
      auth: { token, storeId },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Conectado al WebSocket');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Error WebSocket:', error);
    });

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, [token, storeId]);

  return { socket, connected };
}
```

## 📨 Escuchar Eventos

### Eventos de Productos

```javascript
// Producto creado
socket.on('product_created', (data) => {
  console.log('Nuevo producto:', data.data.product);
  // data estructura:
  // {
  //   timestamp: Date
  //   channel: 'products'
  //   event: 'product_created'
  //   data: {
  //     type: 'product_created'
  //     product: { id, name, price, image_url, categoryId, statusId }
  //   }
  // }
});

// Producto actualizado
socket.on('product_updated', (data) => {
  console.log('Producto actualizado:', data.data.product);
});

// Producto eliminado
socket.on('product_deleted', (data) => {
  console.log('Producto eliminado:', data.data.productId);
});
```

### Eventos de Órdenes

```javascript
// Orden creada
socket.on('order_created', (data) => {
  console.log('Nueva orden:', data.data.order);
  // data.data.order contiene: id, order_number, total_amount, type, status, etc.
});

// Estado de orden cambió
socket.on('order_status_changed', (data) => {
  console.log(`Orden ${data.data.order_number}: ${data.data.oldStatus} → ${data.data.newStatus}`);
});
```

### Eventos de Mesas

```javascript
// Mesa creada
socket.on('table_created', (data) => {
  console.log('Nueva mesa:', data.data.table);
});

// Estado de mesa cambió
socket.on('table_status_changed', (data) => {
  console.log(`Mesa ${data.data.table_number}: ${data.data.oldStatus} → ${data.data.newStatus}`);
});
```

### Eventos de Mozos

```javascript
socket.on('waiter_created', (data) => {
  console.log('Nuevo mozo:', data.data.waiter);
});
```

### Eventos de Segmentos

```javascript
socket.on('segment_updated', (data) => {
  console.log('Segmento actualizado:', data.data);
  // Útil para notificaciones de análisis, reportes, etc.
});
```

## 🔄 Sistema de Canales

### Suscribirse a un Canal

```javascript
// Suscribirse a actualizaciones de productos
socket.emit('subscribe', { channel: 'products' });

// Suscribirse a actualizaciones de órdenes
socket.emit('subscribe', { channel: 'orders' });

// Suscribirse a múltiples canales
['products', 'orders', 'tables'].forEach(channel => {
  socket.emit('subscribe', { channel });
});

// Escuchar confirmación
socket.on('subscribed', (data) => {
  console.log(`Suscrito a: ${data.channel}`);
});
```

### Desuscribirse de un Canal

```javascript
socket.emit('unsubscribe', { channel: 'products' });

socket.on('unsubscribed', (data) => {
  console.log(`Desuscrito de: ${data.channel}`);
});
```

### Canales Disponibles

| Canal | Descripción | Eventos |
|-------|-------------|---------|
| `products` | Cambios en productos | `product_created`, `product_updated`, `product_deleted` |
| `orders` | Cambios en órdenes | `order_created`, `order_status_changed` |
| `tables` | Cambios en mesas | `table_created`, `table_status_changed` |
| `waiters` | Cambios en mozos | `waiter_created` |
| `segments` | Actualizaciones de segmentos | `segment_updated` |
| `subscriptions` | Cambios en suscripciones | `subscription_updated` |

## 🎯 Ejemplos Prácticos

### Dashboard de Órdenes en Tiempo Real

```javascript
export function OrdersDashboard() {
  const { socket, connected } = useWebSocket(token, storeId);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (!socket) return;

    // Suscribirse a órdenes
    socket.emit('subscribe', { channel: 'orders' });

    // Nueva orden
    const handleNewOrder = (data) => {
      setOrders(prev => [data.data.order, ...prev]);
      toast.success(`Nueva orden: ${data.data.order.order_number}`);
    };

    // Cambio de estado
    const handleStatusChanged = (data) => {
      setOrders(prev => prev.map(order =>
        order.id === data.data.orderId
          ? { ...order, status: data.data.newStatus }
          : order
      ));
      toast.info(`Orden ${data.data.order_number}: ${data.data.newStatus}`);
    };

    socket.on('order_created', handleNewOrder);
    socket.on('order_status_changed', handleStatusChanged);

    return () => {
      socket.off('order_created', handleNewOrder);
      socket.off('order_status_changed', handleStatusChanged);
      socket.emit('unsubscribe', { channel: 'orders' });
    };
  }, [socket]);

  return (
    <div>
      <h2>Órdenes en Tiempo Real</h2>
      <p>Estado: {connected ? '🟢 Conectado' : '🔴 Desconectado'}</p>
      <ul>
        {orders.map(order => (
          <li key={order.id}>
            {order.order_number} - {order.status} (${order.total_amount})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Catálogo de Productos Actualizado

```javascript
export function ProductCatalog() {
  const { socket } = useWebSocket(token, storeId);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.emit('subscribe', { channel: 'products' });

    socket.on('product_created', (data) => {
      const product = data.data.product;
      setProducts(prev => [...prev, {
        ...product,
        image: product.image_url
      }]);
    });

    socket.on('product_updated', (data) => {
      const product = data.data.product;
      setProducts(prev => prev.map(p =>
        p.id === product.id ? { ...p, ...product, image: product.image_url } : p
      ));
    });

    socket.on('product_deleted', (data) => {
      setProducts(prev => prev.filter(p => p.id !== data.data.productId));
    });

    return () => {
      socket.emit('unsubscribe', { channel: 'products' });
      socket.off('product_created');
      socket.off('product_updated');
      socket.off('product_deleted');
    };
  }, [socket]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
      {products.map(product => (
        <div key={product.id} style={{ border: '1px solid #ccc', padding: '10px' }}>
          {product.image && <img src={product.image} alt={product.name} />}
          <h3>{product.name}</h3>
          <p>Precio: ${product.price}</p>
        </div>
      ))}
    </div>
  );
}
```

## 🔌 Health Check

```javascript
// Verificar conexión periódicamente
setInterval(() => {
  socket.emit('ping');
}, 30000); // cada 30 segundos

socket.on('pong', () => {
  console.log('Servidor activo');
});
```

## 📊 Obtener Estado del Servidor

```bash
# HTTP GET - Ver conexiones activas
curl http://localhost:3000/websocket/status

# Respuesta:
{
  "totalConnections": 5,
  "storesConnected": 2,
  "stores": [
    { "storeId": 1, "connectedUsers": 3 },
    { "storeId": 2, "connectedUsers": 2 }
  ]
}
```

## ⚙️ Configuración

### Variables de Entorno

```env
# En .env
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### CORS para WebSocket

El Sistema de WebSocket soporta CORS. Se configura en `src/services/websocketService.js`:

```javascript
cors: {
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}
```

## 🔒 Seguridad

### Autenticación

- Requiere JWT token válido en `auth.token`
- Requiere `storeId` en `auth.storeId`
- Solo permite conexiones de usuarios autenticados

### Aislamiento de Datos

- Cada tienda tiene su propia instancia de socket
- Los eventos se envían solo a conexiones de esa tienda
- No hay riesgo de que una tienda vea datos de otra

### Middleware de Validación

```javascript
// Agregado en websocketService.js
this.io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const storeId = socket.handshake.auth.storeId;

  if (!token || !storeId) {
    return next(new Error('Autenticación requerida'));
  }

  socket.storeId = parseInt(storeId);
  next();
});
```

## 📝 Agregar Notificaciones Personalizadas

### Desde un Controlador

```javascript
// En productController.js
import NotificationService from '../services/notificationService.js';

static async create(req, res) {
  // ... crear producto ...
  
  // Notificar
  NotificationService.notifyProductCreated(storeId, product);
  
  res.status(201).json(product);
}
```

### Crear Nuevo Tipo de Notificación

En `src/services/notificationService.js`:

```javascript
// Agregar método
static notifyCustomEvent(storeId, eventName, data) {
  if (!ioInstance) return;
  ioInstance.notifyChannel(storeId, 'custom', eventName, data);
}
```

## 🖥️ Cliente HTML Interactivo

Abre en el navegador: `http://localhost:3000/websocket-client.html`

Proporciona una interfaz gráfica para:
- Conectar/desconectar
- Suscribirse a canales
- Ver eventos en tiempo real
- Debugging

## 📚 Referencias

- [Socket.io Documentación](https://socket.io/docs/)
- [Socket.io Client](https://socket.io/docs/v4/client-api/)
- [Express.js](https://expressjs.com/)

## ⚡ Próximas Mejoras Sugeridas

1. **Persistencia**: Guardar notificaciones importantes en BD
2. **Notificaciones Offline**: Sistema de cola para usuarios offline
3. **Push Notifications**: Integración con Firebase Cloud Messaging
4. **Rate Limiting**: Evitar spam de eventos
5. **Audit Log**: Registrar todos los eventos para debugging
6. **Autenticación JWT Mejorada**: Validar token en middleware
7. **Compresión**: Comprimir payload grandes
8. **Reconnection**: Manejo automático de reconexiones
