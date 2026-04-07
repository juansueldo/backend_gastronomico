
import express from 'express';
import StatusController from '../controllers/statusController.js';
import { authRequired, requireUser } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /status:
 *   post:
 *     summary: Crear un nuevo estado (PROTEGIDO)
 *     description: Requiere autenticación válida
 *     tags:
 *       - Status
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
 *                 description: Nombre del estado
 *     responses:
 *       201:
 *         description: Estado creado exitosamente
 *       401:
 *         description: Token requerido
 *       403:
 *         description: Token inválido
 */
router.post('/', authRequired, async (req, res) => {
    await StatusController.create(req, res);
});

/**
 * @swagger
 * /status:
 *   get:
 *     summary: Obtener todos los estados
 *     description: Acceso público
 *     tags:
 *       - Status
 *     responses:
 *       200:
 *         description: Lista de estados
 */
router.get('/', async (req, res) => {
    await StatusController.getAll(req, res);
});

/**
 * @swagger
 * /status/{id}:
 *   get:
 *     summary: Obtener estado por ID
 *     description: Acceso público
 *     tags:
 *       - Status
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado encontrado
 *       404:
 *         description: Estado no encontrado
 */
router.get('/:id', async (req, res) => {
    await StatusController.getById(req, res);
});

/**
 * @swagger
 * /status/{id}:
 *   patch:
 *     summary: Actualizar un estado (PROTEGIDO)
 *     description: Requiere autenticación válida
 *     tags:
 *       - Status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
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
 *         description: Estado actualizado
 */
router.patch('/:id', authRequired, async (req, res) => {
    await StatusController.update(req, res);
});

/**
 * @swagger
 * /status/{id}:
 *   delete:
 *     summary: Eliminar un estado (PROTEGIDO)
 *     description: Requiere autenticación válida
 *     tags:
 *       - Status
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Estado eliminado
 */
router.delete('/:id', authRequired, async (req, res) => {
    await StatusController.delete(req, res);
});

export default router;