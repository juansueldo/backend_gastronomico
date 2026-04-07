import express from 'express';

const router = express.Router();

/**
 * @swagger
 * /websocket/status:
 *   get:
 *     summary: Obtener estado del servidor WebSocket
 *     description: Retorna información sobre conexiones activas, tiendas conectadas y estadísticas
 *     tags:
 *       - WebSocket
 *     responses:
 *       200:
 *         description: Estado del servidor WebSocket
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalConnections:
 *                   type: integer
 *                   description: Total de conexiones WebSocket activas
 *                 storesConnected:
 *                   type: integer
 *                   description: Cantidad de tiendas con conexiones activas
 *                 stores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       storeId:
 *                         type: integer
 *                       connectedUsers:
 *                         type: integer
 */
router.get('/status', (req, res) => {
  const status = global.wsService.getServerStatus();
  res.json(status);
});

export default router;
