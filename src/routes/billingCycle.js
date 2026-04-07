
import express from 'express';
import BillingCycleController from '../controllers/billingCycleController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /billing-cycle:
 *   post:
 *     summary: Crear un nuevo ciclo de facturación
 *     description: Crea un nuevo período de facturación (mensual, trimestral, anual, etc.)
 *     tags:
 *       - BillingCycle
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - slug
 *               - days
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Mensual"
 *               slug:
 *                 type: string
 *                 example: "monthly"
 *               days:
 *                 type: integer
 *                 example: 30
 *               description:
 *                 type: string
 *                 example: "Ciclo de facturación mensual"
 *     responses:
 *       201:
 *         description: Ciclo de facturación creado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 slug:
 *                   type: string
 *                 days:
 *                   type: integer
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener todos los ciclos de facturación
 *     description: Lista todos los ciclos de facturación disponibles
 *     tags:
 *       - BillingCycle
 *     responses:
 *       200:
 *         description: Lista de ciclos
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   slug:
 *                     type: string
 *                   days:
 *                     type: integer
 * /billing-cycle/{id}:
 *   get:
 *     summary: Obtener un ciclo por ID
 *     tags:
 *       - BillingCycle
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ciclo encontrado
 *       404:
 *         description: Ciclo no encontrado
 *   patch:
 *     summary: Actualizar un ciclo de facturación
 *     tags:
 *       - BillingCycle
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
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               days:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Ciclo actualizado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Ciclo no encontrado
 *   delete:
 *     summary: Eliminar un ciclo de facturación
 *     tags:
 *       - BillingCycle
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
 *         description: Ciclo eliminado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Ciclo no encontrado
 * /billing-cycle/{id}/status:
 *   patch:
 *     summary: Actualizar estado del ciclo
 *     tags:
 *       - BillingCycle
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
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Ciclo no encontrado
 */

router.post('/', authRequired, async (req, res) => {
  await BillingCycleController.create(req, res);
});

router.get('/', async (req, res) => {
  await BillingCycleController.getAll(req, res);
});

router.get('/:id', async (req, res) => {
  await BillingCycleController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await BillingCycleController.update(req, res);
});

router.patch('/:id/status', authRequired, async (req, res) => {
  await BillingCycleController.updateStatus(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await BillingCycleController.delete(req, res);
});

export default router;