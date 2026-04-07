
import http from 'http';
import app from './index.js';
import { syncModels } from './src/models/index.js';
import WebSocketService from './src/services/websocketService.js';
import NotificationService from './src/services/notificationService.js';

const PORT = process.env.PORT || 3000;

// Crear servidor HTTP
const httpServer = http.createServer(app);

// Inicializar WebSocket
const wsService = new WebSocketService(httpServer);

// Inicializar servicio de notificaciones
NotificationService.initialize(wsService);

// Hacer disponible globalmente para los controladores
global.notificationService = NotificationService;
global.wsService = wsService;

syncModels().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
    console.log(`WebSocket disponible en ws://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Error al sincronizar modelos:', err);
});
