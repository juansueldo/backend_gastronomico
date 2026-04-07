
import express from 'express';
import SubscriptionController from '../controllers/subscriptionController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /subscription:
 *   post:
 *     summary: Crear una nueva suscripción
 *     description: Crea una nueva suscripción para la tienda autenticada a un plan específico
 *     tags:
 *       - Subscription
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: integer
 *                 example: 1
 *               billingCycleId:
 *                 type: integer
 *                 example: 1
 *                 description: "ID del ciclo de facturación (opcional)"
 *     responses:
 *       201:
 *         description: Suscripción creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 storeId:
 *                   type: integer
 *                 planId:
 *                   type: integer
 *                 startDate:
 *                   type: string
 *                   format: date-time
 *                 endDate:
 *                   type: string
 *                   format: date-time
 *                 payment:
 *                   type: integer
 *                   enum: [0, 1, 2]
 *                   description: "0=pendiente, 1=pagado, 2=rechazado"
 *                 statusId:
 *                   type: integer
 *       400:
 *         description: La tienda ya tiene una suscripción activa o error de validación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 *   get:
 *     summary: Obtener todas las suscripciones de la tienda
 *     description: Lista todas las suscripciones de la tienda autenticada
 *     tags:
 *       - Subscription
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de suscripciones
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
 *                     properties:
 *                       id:
 *                         type: integer
 *                       planId:
 *                         type: integer
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: No autorizado
 * /subscription/{id}:
 *   get:
 *     summary: Obtener detalle de una suscripción
 *     tags:
 *       - Subscription
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Suscripción encontrada
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Suscripción no encontrada
 *   patch:
 *     summary: Actualizar una suscripción
 *     tags:
 *       - Subscription
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: integer
 *               billingCycleId:
 *                 type: integer
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Suscripción actualizada
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Suscripción no encontrada
 *   delete:
 *     summary: Eliminar una suscripción
 *     tags:
 *       - Subscription
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Suscripción eliminada
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Suscripción no encontrada
 * /subscription/{id}/payment:
 *   patch:
 *     summary: Actualizar estado de pago
 *     description: Actualiza el estado de pago de una suscripción
 *     tags:
 *       - Subscription
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - payment
 *             properties:
 *               payment:
 *                 type: integer
 *                 enum: [0, 1, 2]
 *                 example: 1
 *                 description: "0=pendiente, 1=pagado, 2=rechazado"
 *     responses:
 *       200:
 *         description: Estado de pago actualizado
 *       400:
 *         description: Valor de payment inválido
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Suscripción no encontrada
 * /subscription/{id}/status:
 *   patch:
 *     summary: Actualizar estado de la suscripción
 *     tags:
 *       - Subscription
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
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
 *                 example: 1
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Suscripción no encontrada
 */

router.post('/', authRequired, async (req, res) => {
  await SubscriptionController.create(req, res);
});

router.get('/', authRequired, async (req, res) => {
  await SubscriptionController.getAll(req, res);
});

router.get('/:id', authRequired, async (req, res) => {
  await SubscriptionController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await SubscriptionController.update(req, res);
});

router.patch('/:id/payment', authRequired, async (req, res) => {
  await SubscriptionController.updatePaymentStatus(req, res);
});

router.patch('/:id/status', authRequired, async (req, res) => {
  await SubscriptionController.updateStatus(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await SubscriptionController.delete(req, res);
});

export default router;
