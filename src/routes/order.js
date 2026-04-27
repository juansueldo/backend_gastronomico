import express from 'express';
import OrderController from '../controllers/orderController.js';

const router = express.Router();

/**
 * @swagger
 * /order:
 *   post:
 *     summary: Crear una nueva orden
 *     description: Crea una orden para la tienda autenticada. Todas las órdenes deben asociarse a una sede y, si son delivery, la dirección debe pertenecer a una zona activa de esa sede.
 *     tags:
 *       - Order
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - headquarterId
 *               - userId
 *               - items
 *               - type
 *             properties:
 *               headquarterId:
 *                 type: integer
 *                 description: ID de la sede que gestionará la orden
 *               userId:
 *                 type: integer
 *                 description: ID del usuario que crea la orden
 *               customerId:
 *                 type: integer
 *                 description: ID del cliente (opcional)
 *               items:
 *                 type: array
 *                 description: Array de items de la orden
 *                 items:
 *                   type: object
 *                   required:
 *                     - productId
 *                     - quantity
 *                   properties:
 *                     productId:
 *                       type: integer
 *                       description: ID del producto
 *                     quantity:
 *                       type: integer
 *                       description: Cantidad del producto
 *               type:
 *                 type: string
 *                 enum: [dine-in, takeaway, delivery]
 *                 description: Tipo de orden
 *               tableId:
 *                 type: integer
 *                 description: ID de la mesa. Solo se permite para órdenes dine-in
 *               waiterId:
 *                 type: integer
 *                 description: ID del mozo/camarero (opcional)
 *               delivery_address:
 *                 type: string
 *                 description: Dirección de entrega. Requerida si type es delivery
 *               delivery_latitude:
 *                 type: number
 *                 format: float
 *                 description: Latitud de entrega. Requerida si type es delivery
 *               delivery_longitude:
 *                 type: number
 *                 format: float
 *                 description: Longitud de entrega. Requerida si type es delivery
 *               delivery_date:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha estimada de entrega
 *     responses:
 *       201:
 *         description: Orden creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 order_number:
 *                   type: string
 *                 total_amount:
 *                   type: number
 *                 type:
 *                   type: string
 *                 status:
 *                   type: string
 *                 tableId:
 *                   type: integer
 *                   nullable: true
 *                 waiterId:
 *                   type: integer
 *                   nullable: true
 *                 delivery_address:
 *                   type: string
 *                 delivery_latitude:
 *                   type: number
 *                 delivery_longitude:
 *                   type: number
 *                 headquarterId:
 *                   type: integer
 *                 storeId:
 *                   type: integer
 *                 userId:
 *                   type: integer
 *                 DeliveryZone:
 *                   type: object
 *                   nullable: true
 *       400:
 *         description: Validación fallida o coordenadas fuera de zona de entrega
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Alguna relación no pertenece a la tienda autenticada
 *       404:
 *         description: Usuario, cliente, sede, tienda, producto, mesa o mozo no encontrado
 */
router.post('/', async (req, res) => {
  await OrderController.create(req, res);
});

/**
 * @swagger
 * /order/{id}:
 *   get:
 *     summary: Obtener una orden por ID
 *     description: Retorna los detalles completos de una orden perteneciente a la tienda autenticada.
 *     tags:
 *       - Order
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 order_number:
 *                   type: string
 *                 total_amount:
 *                   type: number
 *                 type:
 *                   type: string
 *                 status:
 *                   type: string
 *                 OrderItems:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       quantity:
 *                         type: integer
 *                       price:
 *                         type: number
 *                       Product:
 *                         type: object
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Orden no encontrada
 */
router.get('/:id', async (req, res) => {
  await OrderController.getById(req, res);
});

/**
 * @swagger
 * /order:
 *   get:
 *     summary: Obtener todas las órdenes de una tienda
 *     description: Retorna todas las órdenes de la tienda autenticada ordenadas por fecha.
 *     tags:
 *       - Order
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Órdenes de la tienda
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 rows:
 *                   type: array
 *                   items:
 *                     type: object
 *       400:
 *         description: Error al obtener las órdenes
 *       401:
 *         description: No autorizado
 */
router.get('/', async (req, res) => {
  await OrderController.getByStore(req, res);
});

/**
 * @swagger
 * /order/{id}/status:
 *   patch:
 *     summary: Actualizar estado de una orden
 *     description: Cambia el estado de una orden respetando el flujo pending -> processing -> ready -> completed. También permite cancelar desde pending, processing o ready.
 *     tags:
 *       - Order
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, processing, ready, completed, cancelled]
 *                 description: Nuevo estado de la orden
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Estado inválido o transición no permitida
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Orden no encontrada
 */
router.patch('/:id/status', async (req, res) => {
  await OrderController.updateStatus(req, res);
});

/**
 * @swagger
 * /order/{id}/production:
 *   patch:
 *     summary: Enviar una orden a producción
 *     description: Cambia el estado de la orden de pending a processing.
 *     tags:
 *       - Order
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden enviada a producción
 *       400:
 *         description: La transición no está permitida
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Orden no encontrada
 */
router.patch('/:id/production', async (req, res) => {
  await OrderController.moveToProduction(req, res);
});

/**
 * @swagger
 * /order/{id}/ready:
 *   patch:
 *     summary: Marcar una orden como lista
 *     description: Cambia el estado de la orden de processing a ready.
 *     tags:
 *       - Order
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden marcada como lista
 *       400:
 *         description: La transición no está permitida
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Orden no encontrada
 */
router.patch('/:id/ready', async (req, res) => {
  await OrderController.markAsReady(req, res);
});

/**
 * @swagger
 * /order/{id}/finalize:
 *   patch:
 *     summary: Finalizar una orden
 *     description: Cambia el estado de la orden de ready a completed.
 *     tags:
 *       - Order
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden finalizada
 *       400:
 *         description: La transición no está permitida
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Orden no encontrada
 */
router.patch('/:id/finalize', async (req, res) => {
  await OrderController.finalize(req, res);
});

/**
 * @swagger
 * /order/{id}:
 *   delete:
 *     summary: Eliminar una orden
 *     description: Elimina una orden de la tienda autenticada y todos sus items asociados.
 *     tags:
 *       - Order
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la orden
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Orden eliminada exitosamente
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Orden no encontrada
 */
router.delete('/:id', async (req, res) => {
  await OrderController.delete(req, res);
});

export default router;
