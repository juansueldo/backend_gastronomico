import express from 'express';
import DeliveryZoneController from '../controllers/deliveryZoneController.js';

const router = express.Router();

/**
 * @swagger
 * /delivery-zone:
 *   post:
 *     summary: Crear una nueva zona de entrega
 *     description: Crea una zona de entrega para una tienda con un polígono geométrico.
 *     tags:
 *       - Delivery Zones
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storeId
 *               - name
 *               - polygon
 *             properties:
 *               storeId:
 *                 type: integer
 *                 description: ID de la tienda
 *               name:
 *                 type: string
 *                 description: Nombre de la zona de entrega
 *               polygon:
 *                 type: string
 *                 description: Polígono en formato WKT o GeoJSON (ej. POLYGON((-56.16 -33.87, -56.15 -33.87, -56.15 -33.88, -56.16 -33.87)))
 *               metadata:
 *                 type: object
 *                 description: Datos adicionales (opcional)
 *               zoneid:
 *                 type: string
 *                 description: Identificador único de la zona (opcional)
 *     responses:
 *       201:
 *         description: Zona de entrega creada exitosamente
 *       400:
 *         description: Validación fallida
 *       404:
 *         description: Tienda no encontrada
 */
router.post('/', async (req, res) => {
  await DeliveryZoneController.create(req, res);
});

/**
 * @swagger
 * /delivery-zone:
 *   get:
 *     summary: Obtener todas las zonas de entrega de una tienda
 *     description: Retorna todas las zonas de entrega activas de una tienda específica.
 *     tags:
 *       - Delivery Zones
 *     parameters:
 *       - name: storeId
 *         in: query
 *         required: true
 *         description: ID de la tienda
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zonas de entrega encontradas
 *       400:
 *         description: storeId requerido
 */
router.get('/', async (req, res) => {
  await DeliveryZoneController.getByStore(req, res);
});

/**
 * @swagger
 * /delivery-zone/{id}:
 *   get:
 *     summary: Obtener una zona de entrega por ID
 *     description: Retorna los detalles de una zona de entrega específica.
 *     tags:
 *       - Delivery Zones
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la zona de entrega
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zona encontrada
 *       404:
 *         description: Zona no encontrada
 */
router.get('/:id', async (req, res) => {
  await DeliveryZoneController.getById(req, res);
});

/**
 * @swagger
 * /delivery-zone/{id}:
 *   patch:
 *     summary: Actualizar una zona de entrega
 *     description: Actualiza los datos de una zona de entrega existente.
 *     tags:
 *       - Delivery Zones
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la zona de entrega
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               polygon:
 *                 type: string
 *               metadata:
 *                 type: object
 *               zoneid:
 *                 type: string
 *     responses:
 *       200:
 *         description: Zona actualizada exitosamente
 *       404:
 *         description: Zona no encontrada
 */
router.patch('/:id', async (req, res) => {
  await DeliveryZoneController.update(req, res);
});

/**
 * @swagger
 * /delivery-zone/{id}/status:
 *   patch:
 *     summary: Cambiar estado de una zona de entrega
 *     description: Activa o desactiva una zona de entrega.
 *     tags:
 *       - Delivery Zones
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la zona de entrega
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - statusId
 *             properties:
 *               statusId:
 *                 type: integer
 *                 description: ID del estado (1=Activo, 2=Inactivo, etc.)
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       404:
 *         description: Zona no encontrada
 */
router.patch('/:id/status', async (req, res) => {
  await DeliveryZoneController.updateStatus(req, res);
});

/**
 * @swagger
 * /delivery-zone/{id}:
 *   delete:
 *     summary: Eliminar una zona de entrega
 *     description: Elimina una zona de entrega de manera permanente.
 *     tags:
 *       - Delivery Zones
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID de la zona de entrega
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Zona eliminada exitosamente
 *       404:
 *         description: Zona no encontrada
 */
router.delete('/:id', async (req, res) => {
  await DeliveryZoneController.delete(req, res);
});

export default router;
