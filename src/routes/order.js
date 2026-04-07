import express from 'express';
import OrderController from '../controllers/orderController.js';

const router = express.Router();

/**
 * @swagger
 * /order:
 *   post:
 *     summary: Crear una nueva orden
 *     description: Crea una orden con múltiples items. Para órdenes de delivery, se valida que las coordenadas estén dentro de una zona de entrega registrada. Para órdenes dine-in, se puede asociar una mesa y un mozo.
 *     tags:
 *       - Orders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeId
 *               - userId
 *               - items
 *               - type
 *             properties:
 *               storeId:
 *                 type: integer
 *                 description: ID de la tienda
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
 *                 description: ID de la mesa (solo para órdenes dine-in, opcional)
 *               waiterId:
 *                 type: integer
 *                 description: ID del mozo/camarero (opcional)
 *               delivery_address:
 *                 type: string
 *                 description: Dirección de entrega (requerida si type es delivery)
 *               delivery_latitude:
 *                 type: number
 *                 format: float
 *                 description: Latitud de la dirección de entrega (requerida si type es delivery)
 *               delivery_longitude:
 *                 type: number
 *                 format: float
 *                 description: Longitud de la dirección de entrega (requerida si type es delivery)
 *               delivery_date:
 *                 type: string
 *                 format: date-time
 *                 description: Fecha de entrega (requerida si type es delivery)
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
 *                 storeId:
 *                   type: integer
 *                 userId:
 *                   type: integer
 *                 DeliveryZone:
 *                   type: object
 *                   nullable: true
 *       400:
 *         description: Validación fallida o coordenadas fuera de zona de entrega
 *       404:
 *         description: Tienda, producto, mesa o mozo no encontrado
 */
router.post('/', async (req, res) => {
  await OrderController.create(req, res);
});

/**
 * @swagger
 * /order/{id}:
 *   get:
 *     summary: Obtener una orden por ID
 *     description: Retorna los detalles completos de una orden incluyendo sus items y productos asociados.
 *     tags:
 *       - Orders
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
 *     description: Retorna todas las órdenes de una tienda específica con paginación implícita.
 *     tags:
 *       - Orders
 *     parameters:
 *       - name: storeId
 *         in: query
 *         required: true
 *         description: ID de la tienda
 *         schema:
 *           type: integer
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
 *         description: storeId requerido
 */
router.get('/', async (req, res) => {
  await OrderController.getByStore(req, res);
});

/**
 * @swagger
 * /order/{id}/status:
 *   patch:
 *     summary: Actualizar estado de una orden
 *     description: Cambia el estado de una orden (pending, processing, completed, cancelled).
 *     tags:
 *       - Orders
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
 *                 enum: [pending, processing, completed, cancelled]
 *                 description: Nuevo estado de la orden
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Estado inválido
 *       404:
 *         description: Orden no encontrada
 */
router.patch('/:id/status', async (req, res) => {
  await OrderController.updateStatus(req, res);
});

/**
 * @swagger
 * /order/{id}:
 *   delete:
 *     summary: Eliminar una orden
 *     description: Elimina una orden y todos sus items asociados.
 *     tags:
 *       - Orders
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
 *       404:
 *         description: Orden no encontrada
 */
router.delete('/:id', async (req, res) => {
  await OrderController.delete(req, res);
});

export default router;
