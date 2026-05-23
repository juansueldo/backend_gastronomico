
import express from 'express';
import CustomerController from '../controllers/customerController.js';
import { authRequired, authOptional } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /customer:
 *   post:
 *     summary: Crear un nuevo cliente
 *     description: Crea un nuevo cliente para la tienda autenticada
 *     tags:
 *       - Customer
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
 *               - phone
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: "Juan"
 *               lastname:
 *                 type: string
 *                 example: "Pérez"
 *               phone:
 *                 type: string
 *                 example: "+598912345678"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "juan@example.com"
 *               metadata:
 *                 type: object
 *                 example: { preferences: "sin picante" }
 *     responses:
 *       201:
 *         description: Cliente creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 firstname:
 *                   type: string
 *                 lastname:
 *                   type: string
 *                 phone:
 *                   type: string
 *                 storeId:
 *                   type: integer
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener todos los clientes
 *     description: Lista todos los clientes de la tienda autenticada
 *     tags:
 *       - Customer
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Límite de resultados por página
 *     responses:
 *       200:
 *         description: Lista de clientes
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   firstname:
 *                     type: string
 *                   lastname:
 *                     type: string
 *                   phone:
 *                     type: string
 *       401:
 *         description: No autorizado
 * /customer/{id}:
 *   get:
 *     summary: Obtener un cliente por ID
 *     tags:
 *       - Customer
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
 *         description: Cliente encontrado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Cliente no encontrado
 *   patch:
 *     summary: Actualizar un cliente
 *     tags:
 *       - Customer
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
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Cliente actualizado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Cliente no encontrado
 *   delete:
 *     summary: Eliminar un cliente
 *     tags:
 *       - Customer
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
 *         description: Cliente eliminado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Cliente no encontrado
 */

router.get('/search', authRequired, async (req, res) => {
  await CustomerController.search(req, res);
}); 

router.get('/datatable', authRequired, async (req, res) => {
  await CustomerController.datatable(req, res);
});

router.post('/', authRequired, async (req, res) => {
  await CustomerController.create(req, res);
});

router.get('/', authRequired, async (req, res) => {
  await CustomerController.getAll(req, res);
});

router.get('/:id/orders', authRequired, async (req, res) => {
  await CustomerController.getOrders(req, res);
});

router.get('/:id', authRequired, async (req, res) => {
  await CustomerController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await CustomerController.update(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await CustomerController.delete(req, res);
});

export default router;
