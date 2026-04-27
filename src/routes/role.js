import express from 'express';
import RoleController from "../controllers/roleController.js";
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /role:
 *   post:
 *     summary: Crear un nuevo rol
 *     description: Crea un nuevo rol para la tienda. Requiere autenticación.
 *     tags:
 *       - Role
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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Gerente"
 *     responses:
 *       201:
 *         description: Rol creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener todos los roles
 *     description: Lista todos los roles disponibles.
 *     tags:
 *       - Role
 *     responses:
 *       200:
 *         description: Lista de roles
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
 * /role/{id}:
 *   get:
 *     summary: Obtener un rol por ID
 *     tags:
 *       - Role
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del rol
 *     responses:
 *       200:
 *         description: Rol encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *       404:
 *         description: Rol no encontrado
 *   patch:
 *     summary: Actualizar un rol
 *     tags:
 *       - Role
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
 *     responses:
 *       200:
 *         description: Rol actualizado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Rol no encontrado
 *   delete:
 *     summary: Eliminar un rol
 *     tags:
 *       - Role
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
 *         description: Rol eliminado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Rol no encontrado
 */

router.post('/', authRequired, async (req, res) => {
  await RoleController.create(req, res);
});

router.get('/', async (req, res) => {
  await RoleController.getAll(req, res);
});

router.get('/:id', async (req, res) => {
  await RoleController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await RoleController.update(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await RoleController.delete(req, res);
});

export default router;
