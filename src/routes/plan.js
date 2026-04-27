
import express from 'express';
import PlanController from '../controllers/planController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /plan:
 *   post:
 *     summary: Crear un nuevo plan de suscripción
 *     description: Crea un nuevo plan con características y precios asociados
 *     tags:
 *       - Plan
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
 *               - billingCycleId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Plan Pro"
 *               description:
 *                 type: string
 *                 example: "Plan profesional con todas las características"
 *               isFree:
 *                 type: boolean
 *                 example: false
 *               billingCycleId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Plan creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 isFree:
 *                   type: boolean
 *                 billingCycleId:
 *                   type: integer
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener todos los planes
 *     description: Lista todos los planes de suscripción disponibles
 *     tags:
 *       - Plan
 *     responses:
 *       200:
 *         description: Lista de planes
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
 * /plan/{id}:
 *   get:
 *     summary: Obtener un plan por ID
 *     tags:
 *       - Plan
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Plan encontrado
 *       404:
 *         description: Plan no encontrado
 *   patch:
 *     summary: Actualizar un plan
 *     tags:
 *       - Plan
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
 *               description:
 *                 type: string
 *               isFree:
 *                 type: boolean
 *               billingCycleId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Plan actualizado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 *   delete:
 *     summary: Eliminar un plan
 *     tags:
 *       - Plan
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
 *         description: Plan eliminado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 * /plan/{id}/status:
 *   patch:
 *     summary: Actualizar estado del plan
 *     tags:
 *       - Plan
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
 *               statusId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       400:
 *         description: statusId es requerido
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 */

router.post('/', authRequired, async (req, res) => {
  await PlanController.create(req, res);
});

router.get('/', async (req, res) => {
  await PlanController.getAll(req, res);
});

router.get('/:id', async (req, res) => {
  await PlanController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await PlanController.update(req, res);
});

router.patch('/:id/status', authRequired, async (req, res) => {
  await PlanController.updateStatus(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await PlanController.delete(req, res);
});

export default router;
