
import express from 'express';
import WaiterController from '../controllers/waiterController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /waiter:
 *   post:
 *     summary: Crear un nuevo mozo
 *     description: Crea un nuevo empleado mozo en la tienda autenticada
 *     tags:
 *       - Waiter
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstname
 *               - lastname
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: "Juan"
 *               lastname:
 *                 type: string
 *                 example: "Pérez"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan@example.com"
 *               phone:
 *                 type: string
 *                 example: "+598912345678"
 *               identification:
 *                 type: string
 *                 example: "12345678-9"
 *               salary:
 *                 type: number
 *                 format: float
 *                 example: 20000.00
 *               hire_date:
 *                 type: string
 *                 format: date
 *                 example: "2024-01-01"
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Mozo creado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener todos los mozos
 *     description: Lista todos los mozos de la tienda autenticada
 *     tags:
 *       - Waiter
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de mozos
 *       401:
 *         description: No autorizado
 * /waiter/{id}:
 *   get:
 *     summary: Obtener detalle de un mozo
 *     tags:
 *       - Waiter
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
 *         description: Mozo encontrado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Mozo no encontrado
 *   patch:
 *     summary: Actualizar un mozo
 *     tags:
 *       - Waiter
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
 *               firstname:
 *                 type: string
 *               lastname:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               identification:
 *                 type: string
 *               salary:
 *                 type: number
 *               hire_date:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Mozo actualizado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Mozo no encontrado
 *   delete:
 *     summary: Eliminar un mozo
 *     tags:
 *       - Waiter
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
 *         description: Mozo eliminado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Mozo no encontrado
 * /waiter/{id}/status:
 *   patch:
 *     summary: Actualizar estado de un mozo
 *     tags:
 *       - Waiter
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
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Mozo no encontrado
 */

router.post('/', authRequired, async (req, res) => {
  await WaiterController.create(req, res);
});

router.get('/', authRequired, async (req, res) => {
  await WaiterController.getAll(req, res);
});

router.get('/:id', authRequired, async (req, res) => {
  await WaiterController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await WaiterController.update(req, res);
});

router.patch('/:id/status', authRequired, async (req, res) => {
  await WaiterController.updateStatus(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await WaiterController.delete(req, res);
});

export default router;
