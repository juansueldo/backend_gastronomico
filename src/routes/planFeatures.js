
import express from 'express';
import PlanFeaturesController from '../controllers/planFeaturesController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /plan-features:
 *   post:
 *     summary: Crear una característica de plan
 *     description: Añade una nueva característica a un plan de suscripción
 *     tags:
 *       - PlanFeatures
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
 *               - feature
 *               - key
 *               - value
 *             properties:
 *               planId:
 *                 type: integer
 *                 example: 1
 *               feature:
 *                 type: string
 *                 example: "API Calls"
 *               key:
 *                 type: string
 *                 example: "api-calls"
 *               description:
 *                 type: string
 *                 example: "Llamadas API ilimitadas"
 *               value:
 *                 type: string
 *                 example: "unlimited"
 *     responses:
 *       201:
 *         description: Característica creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 planId:
 *                   type: integer
 *                 feature:
 *                   type: string
 *                 key:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 * /plan-features/plan/{planId}:
 *   get:
 *     summary: Obtener características de un plan
 *     description: Lista todas las características de un plan específico
 *     tags:
 *       - PlanFeatures
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de características
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
 * /plan-features/{id}:
 *   get:
 *     summary: Obtener una característica por ID
 *     tags:
 *       - PlanFeatures
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Característica encontrada
 *       404:
 *         description: Característica no encontrada
 *   patch:
 *     summary: Actualizar una característica
 *     tags:
 *       - PlanFeatures
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
 *               feature:
 *                 type: string
 *               key:
 *                 type: string
 *               description:
 *                 type: string
 *               value:
 *                 type: string
 *     responses:
 *       200:
 *         description: Característica actualizada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Característica no encontrada
 *   delete:
 *     summary: Eliminar una característica
 *     tags:
 *       - PlanFeatures
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
 *         description: Característica eliminada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Característica no encontrada
 * /plan-features/{id}/status:
 *   patch:
 *     summary: Actualizar estado de la característica
 *     tags:
 *       - PlanFeatures
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
 *         description: Característica no encontrada
 */

router.post('/', authRequired, async (req, res) => {
  await PlanFeaturesController.create(req, res);
});

router.get('/plan/:planId', async (req, res) => {
  await PlanFeaturesController.getByPlan(req, res);
});

router.get('/:id', async (req, res) => {
  await PlanFeaturesController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await PlanFeaturesController.update(req, res);
});

router.patch('/:id/status', authRequired, async (req, res) => {
  await PlanFeaturesController.updateStatus(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await PlanFeaturesController.delete(req, res);
});

export default router;
