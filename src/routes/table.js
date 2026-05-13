
import express from 'express';
import TableController from '../controllers/tableController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /table:
 *   post:
 *     summary: Crear una nueva mesa
 *     description: Crea una nueva mesa en el restaurante de la tienda autenticada
 *     tags:
 *       - Table
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
 *               - table_number
 *               - headquarterId
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Mesa 1"
 *               table_number:
 *                 type: integer
 *                 example: 1
 *               headquarterId:
 *                 type: integer
 *                 example: 1
 *               capacity:
 *                 type: integer
 *                 example: 4
 *               location:
 *                 type: string
 *                 example: "Sector 1"
 *               description:
 *                 type: string
 *                 example: "Mesa con vista a la ventana"
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Mesa creada exitosamente
 *       400:
 *         description: Error de validación o mesa duplicada
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener todas las mesas
 *     description: Lista las mesas de la tienda autenticada filtradas por sede
 *     tags:
 *       - Table
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: headquarterId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la sede para filtrar las mesas
 *     responses:
 *       200:
 *         description: Lista de mesas
 *       401:
 *         description: No autorizado
 *       400:
 *         description: headquarterId inválido o faltante
 * /table/{id}:
 *   get:
 *     summary: Obtener detalle de una mesa
 *     tags:
 *       - Table
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
 *         description: Mesa encontrada
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Mesa no encontrada
 *   patch:
 *     summary: Actualizar una mesa
 *     tags:
 *       - Table
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
 *               table_number:
 *                 type: integer
 *               capacity:
 *                 type: integer
 *               location:
 *                 type: string
 *               description:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Mesa actualizada
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Mesa no encontrada
 *   delete:
 *     summary: Eliminar una mesa
 *     tags:
 *       - Table
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
 *         description: Mesa eliminada
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Acceso denegado
 *       404:
 *         description: Mesa no encontrada
 * /table/{id}/status:
 *   patch:
 *     summary: Actualizar estado de una mesa
 *     tags:
 *       - Table
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
 *         description: Mesa no encontrada
 */

router.post('/', authRequired, async (req, res) => {
  await TableController.create(req, res);
});

router.get('/', authRequired, async (req, res) => {
  await TableController.getAll(req, res);
});

router.get('/:id', authRequired, async (req, res) => {
  await TableController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await TableController.update(req, res);
});

router.patch('/:id/status', authRequired, async (req, res) => {
  await TableController.updateStatus(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await TableController.delete(req, res);
});

export default router;
