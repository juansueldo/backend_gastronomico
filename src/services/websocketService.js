import { Server } from 'socket.io';
import OrderTrackingService from './orderTrackingService.js';

class WebSocketService {
  constructor(httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Almacenar conexiones activas por storeId
    this.userConnections = new Map(); // { storeId: [socketIds] }
    this.socketToStore = new Map(); // { socketId: storeId }

    this.setupMiddleware();
    this.setupTrackingNamespace();
    this.setupEventHandlers();
  }

  /**
   * Middleware para validar autenticación
   */
  setupMiddleware() {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      const storeId = socket.handshake.auth.storeId;

      // Aquí deberías validar el token JWT
      // Por ahora solo verificamos que existan
      if (!token || !storeId) {
        return next(new Error('Autenticación requerida'));
      }

      socket.storeId = parseInt(storeId);
      socket.token = token;
      next();
    });
  }

  setupTrackingNamespace() {
    const trackingNamespace = this.io.of('/tracking');

    trackingNamespace.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        const result = await OrderTrackingService.getPublicTrackingByToken(token);
        if (result.status !== 200) {
          return next(new Error(result.error || 'Tracking inválido'));
        }
        socket.trackingToken = String(token);
        socket.trackingPayload = result.data;
        return next();
      } catch {
        return next(new Error('Tracking inválido'));
      }
    });

    trackingNamespace.on('connection', (socket) => {
      const token = socket.trackingToken;
      socket.join(`tracking:${token}`);
      socket.emit('tracking_updated', socket.trackingPayload);
    });
  }

  /**
   * Configurar manejadores de eventos
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const storeId = socket.storeId;

      console.log(`[WebSocket] Cliente conectado: ${socket.id} (Store: ${storeId})`);

      // Registrar conexión
      if (!this.userConnections.has(storeId)) {
        this.userConnections.set(storeId, []);
      }
      this.userConnections.get(storeId).push(socket.id);
      this.socketToStore.set(socket.id, storeId);
      socket.join(`${storeId}`);

      // Emitir que el usuario se conectó
      socket.emit('connected', {
        message: 'Conectado al servidor de notificaciones',
        socketId: socket.id,
        storeId: storeId
      });

      // Escuchar desconexión
      socket.on('disconnect', () => {
        console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
        this.handleDisconnect(socket.id, storeId);
      });

      // Escuchar heartbeat/ping
      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Escuchar eventos personalizados
      socket.on('subscribe', (data) => {
        console.log(`[WebSocket] Cliente ${socket.id} se suscribió a: ${data.channel}`);
        socket.join(`${storeId}:${data.channel}`);
        socket.emit('subscribed', { channel: data.channel });
      });

      socket.on('unsubscribe', (data) => {
        console.log(`[WebSocket] Cliente ${socket.id} se desuscribió de: ${data.channel}`);
        socket.leave(`${storeId}:${data.channel}`);
        socket.emit('unsubscribed', { channel: data.channel });
      });
    });
  }

  /**
   * Manejar desconexión
   */
  handleDisconnect(socketId, storeId) {
    const connections = this.userConnections.get(storeId);
    if (connections) {
      const index = connections.indexOf(socketId);
      if (index > -1) {
        connections.splice(index, 1);
      }
      if (connections.length === 0) {
        this.userConnections.delete(storeId);
      }
    }
    this.socketToStore.delete(socketId);
  }

  /**
   * Emitir notificación a una tienda específica
   * @param {number} storeId - ID de la tienda
   * @param {string} event - Nombre del evento
   * @param {object} data - Datos a enviar
   */
  notifyStore(storeId, event, data) {
    this.io.to(`${storeId}`).emit(event, {
      timestamp: new Date(),
      event,
      data
    });
  }

  /**
   * Emitir notificación a un canal específico
   * @param {number} storeId - ID de la tienda
   * @param {string} channel - Nombre del canal (ej: 'orders', 'products', 'segments')
   * @param {string} event - Nombre del evento
   * @param {object} data - Datos a enviar
   */
  notifyChannel(storeId, channel, event, data) {
    this.io.to(`${storeId}:${channel}`).emit(event, {
      timestamp: new Date(),
      channel,
      event,
      data
    });
  }

  /**
   * Emitir notificación a todos los clientes
   * @param {string} event - Nombre del evento
   * @param {object} data - Datos a enviar
   */
  broadcastAll(event, data) {
    this.io.emit(event, {
      timestamp: new Date(),
      event,
      data
    });
  }

  notifyTracking(token, event, data) {
    if (!token) return;
    this.io.of('/tracking').to(`tracking:${token}`).emit(event, {
      timestamp: new Date(),
      event,
      data,
    });
  }

  /**
   * Obtener cantidad de usuarios conectados para una tienda
   * @param {number} storeId - ID de la tienda
   * @returns {number} Cantidad de conexiones
   */
  getConnectedUsersCount(storeId) {
    return (this.userConnections.get(storeId) || []).length;
  }

  /**
   * Obtener estado del servidor
   */
  getServerStatus() {
    return {
      totalConnections: this.io.engine.clientsCount,
      storesConnected: this.userConnections.size,
      stores: Array.from(this.userConnections.entries()).map(([storeId, connections]) => ({
        storeId,
        connectedUsers: connections.length
      }))
    };
  }
}

export default WebSocketService;
