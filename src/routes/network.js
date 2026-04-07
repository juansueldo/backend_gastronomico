
import express from 'express';
import NetworkController from '../controllers/NetworkController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /network:
 *   post:
 *     summary: Crear una nueva red de comunicación
 *     description: Crea una nueva canal o red de comunicación (WhatsApp, Telegram, Email, etc.)
 *     tags:
 *       - Network
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
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 example: "WhatsApp"
 *               slug:
 *                 type: string
 *                 example: "whatsapp"
 *               type:
 *                 type: string
 *                 enum: [whatsapp, email, telegram, sms, social]
 *                 example: "whatsapp"
 *               icon:
 *                 type: string
 *                 example: "whatsapp-icon"
 *     responses:
 *       201:
 *         description: Red creada exitosamente
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
 *                 type:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener todas las redes
 *     description: Lista todas las redes de comunicación disponibles
 *     tags:
 *       - Network
 *     responses:
 *       200:
 *         description: Lista de redes
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
 *                   type:
 *                     type: string
 * /network/{id}:
 *   get:
 *     summary: Obtener una red por ID
 *     tags:
 *       - Network
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Red encontrada
 *       404:
 *         description: Red no encontrada
 *   patch:
 *     summary: Actualizar una red
 *     tags:
 *       - Network
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
 *               type:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: Red actualizada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Red no encontrada
 *   delete:
 *     summary: Eliminar una red
 *     tags:
 *       - Network
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
 *         description: Red eliminada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Red no encontrada
 */

router.post('/', authRequired, async (req, res) => {
  await NetworkController.create(req, res);
});

router.get('/', async (req, res) => {
  await NetworkController.getAll(req, res);
});

router.get('/:id', async (req, res) => {
  await NetworkController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await NetworkController.update(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await NetworkController.delete(req, res);
});

export default router;