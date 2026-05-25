import express from 'express';
import CategoryController from '../controllers/categoryController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /category:
 *   post:
 *     summary: Crear una categoría
 *     description: Crea una categoría para la tienda autenticada.
 *     tags:
 *       - Category
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
 *                 example: "Bebidas"
 *               description:
 *                 type: string
 *                 example: "Productos fríos y calientes"
 *               icon:
 *                 type: string
 *                 example: "glass-water"
 *     responses:
 *       201:
 *         description: Categoría creada exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener categorías activas
 *     description: Lista las categorías activas de la tienda autenticada.
 *     tags:
 *       - Category
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de categorías
 *       401:
 *         description: No autorizado
 * /category/{id}:
 *   get:
 *     summary: Obtener una categoría por ID
 *     tags:
 *       - Category
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
 *         description: Categoría encontrada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Categoría no encontrada
 *   put:
 *     summary: Actualizar una categoría
 *     tags:
 *       - Category
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
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Categoría no encontrada
 */
router.post('/', authRequired, async (req, res) => {
  await CategoryController.create(req, res);
});

router.get('/', authRequired, async (req, res) => {
  await CategoryController.getAll(req, res);
});

router.get('/:id', authRequired, async (req, res) => {
  await CategoryController.getById(req, res);
});

router.put('/:id', authRequired, async (req, res) => {
  await CategoryController.update(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await CategoryController.delete(req, res);
});

export default router;
