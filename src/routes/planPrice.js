
import express from 'express';
import PlanPriceController from '../controllers/planPriceController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /plan-price:
 *   post:
 *     summary: Crear un nuevo precio para un plan
 *     description: Crea un nuevo registro de precio para un plan específico con soporte multi-moneda
 *     tags:
 *       - PlanPrice
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
 *               - price
 *               - currency
 *             properties:
 *               planId:
 *                 type: integer
 *                 example: 1
 *               price:
 *                 type: number
 *                 format: float
 *                 example: 99.99
 *               currency:
 *                 type: string
 *                 example: "USD"
 *                 description: "Código ISO 4217 (USD, EUR, UYU, ARS, BRL, etc.)"
 *     responses:
 *       201:
 *         description: Precio de plan creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 planId:
 *                   type: integer
 *                 price:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 statusId:
 *                   type: integer
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Plan no encontrado
 *   get:
 *     summary: Obtener todos los precios de planes
 *     tags:
 *       - PlanPrice
 *     responses:
 *       200:
 *         description: Lista de precios de planes
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
 *                       price:
 *                         type: number
 *                       currency:
 *                         type: string
 *                       Plan:
 *                         type: object
 * /plan-price/{id}:
 *   get:
 *     summary: Obtener un precio de plan por ID
 *     tags:
 *       - PlanPrice
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Precio de plan encontrado
 *       404:
 *         description: Precio de plan no encontrado
 *   patch:
 *     summary: Actualizar un precio de plan
 *     tags:
 *       - PlanPrice
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
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Precio actualizado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Precio de plan no encontrado
 *   delete:
 *     summary: Eliminar un precio de plan
 *     tags:
 *       - PlanPrice
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
 *         description: Precio eliminado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Precio de plan no encontrado
 * /plan-price/plan/{planId}:
 *   get:
 *     summary: Obtener precios de un plan específico
 *     description: Lista todos los precios en diferentes monedas de un plan
 *     tags:
 *       - PlanPrice
 *     parameters:
 *       - in: path
 *         name: planId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Lista de precios del plan
 *       404:
 *         description: Plan no encontrado
 * /plan-price/{id}/status:
 *   patch:
 *     summary: Actualizar estado de un precio de plan
 *     tags:
 *       - PlanPrice
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
 *       404:
 *         description: Precio de plan no encontrado
 */

router.post('/', authRequired, async (req, res) => {
  await PlanPriceController.create(req, res);
});

router.get('/', async (req, res) => {
  await PlanPriceController.getAll(req, res);
});

router.get('/plan/:planId', async (req, res) => {
  await PlanPriceController.getByPlan(req, res);
});

router.get('/:id', async (req, res) => {
  await PlanPriceController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await PlanPriceController.update(req, res);
});

router.patch('/:id/status', authRequired, async (req, res) => {
  await PlanPriceController.updateStatus(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await PlanPriceController.delete(req, res);
});

export default router;
