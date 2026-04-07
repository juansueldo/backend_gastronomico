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
 *               - slug
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Gerente"
 *               slug:
 *                 type: string
 *                 example: "gerente"
 *               description:
 *                 type: string
 *                 example: "Rol de gerente de tienda"
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
 *                 slug:
 *                   type: string
 *                 storeId:
 *                   type: integer
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener todos los roles
 *     description: Lista todos los roles de la tienda del usuario autenticado
 *     tags:
 *       - Role
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: integer
 *         description: ID de la tienda (se obtiene automáticamente del token)
 *     responses:
 *       200:
 *         description: Lista de roles
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
 *       401:
 *         description: No autorizado
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
 *                 slug:
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
 *               slug:
 *                 type: string
 *               description:
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