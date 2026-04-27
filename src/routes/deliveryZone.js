import express from 'express';
import DeliveryZoneController from '../controllers/deliveryZoneController.js';

const router = express.Router();

/**
 * @swagger
 * /delivery-zone:
 *   post:
 *     summary: Crear una nueva zona de entrega
 *     description: Crea una zona de entrega para la tienda autenticada y la asocia a una sede.
 *     tags:
 *       - DeliveryZone
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
 *               - name
 *               - polygon
 *             properties:
 *               headquarterId:
 *                 type: integer
 *                 description: ID de la sede a la que pertenece la zona
 *               name:
 *                 type: string
 *                 description: Nombre de la zona de entrega
 *               polygon:
 *                 type: object
 *                 description: Polígono en formato GeoJSON
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
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Tienda o sede no encontrada
 */
router.post('/', async (req, res) => {
  await DeliveryZoneController.create(req, res);
});

/**
 * @swagger
 * /delivery-zone:
 *   get:
 *     summary: Obtener todas las zonas de entrega de la tienda
 *     description: Retorna todas las zonas de entrega de la tienda autenticada.
 *     tags:
 *       - DeliveryZone
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Zonas de entrega encontradas
 *       401:
 *         description: No autorizado
 */
router.get('/', async (req, res) => {
  await DeliveryZoneController.getByStore(req, res);
});

/**
 * @swagger
 * /delivery-zone/check:
 *   post:
 *     summary: Validar una dirección contra zonas de entrega
 *     description: Verifica si unas coordenadas pertenecen a una zona de entrega activa de la tienda autenticada. Si se envía `headquarterId`, limita la validación a esa sede.
 *     tags:
 *       - DeliveryZone
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - latitude
 *               - longitude
 *             properties:
 *               headquarterId:
 *                 type: integer
 *                 description: ID de la sede a validar. Opcional
 *               latitude:
 *                 type: number
 *                 format: float
 *                 description: Latitud de la dirección
 *               longitude:
 *                 type: number
 *                 format: float
 *                 description: Longitud de la dirección
 *     responses:
 *       200:
 *         description: Resultado de la validación
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Sede no encontrada
 */
router.post('/check', async (req, res) => {
  await DeliveryZoneController.checkAddress(req, res);
});

/**
 * @swagger
 * /delivery-zone/{id}:
 *   get:
 *     summary: Obtener una zona de entrega por ID
 *     description: Retorna los detalles de una zona de entrega de la tienda autenticada.
 *     tags:
 *       - DeliveryZone
 *     security:
 *       - BearerAuth: []
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
 *       401:
 *         description: No autorizado
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
 *       - DeliveryZone
 *     security:
 *       - BearerAuth: []
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
 *               headquarterId:
 *                 type: integer
 *                 description: Nueva sede asociada a la zona
 *               name:
 *                 type: string
 *               polygon:
 *                 type: object
 *               metadata:
 *                 type: object
 *               zoneid:
 *                 type: string
 *     responses:
 *       200:
 *         description: Zona actualizada exitosamente
 *       401:
 *         description: No autorizado
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
 *       - DeliveryZone
 *     security:
 *       - BearerAuth: []
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
 *       400:
 *         description: statusId es requerido
 *       401:
 *         description: No autorizado
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
 *       - DeliveryZone
 *     security:
 *       - BearerAuth: []
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
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Zona no encontrada
 */
router.delete('/:id', async (req, res) => {
  await DeliveryZoneController.delete(req, res);
});

export default router;
