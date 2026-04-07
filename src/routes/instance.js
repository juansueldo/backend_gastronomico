
import express from 'express';
import InstanceController from '../controllers/instanceController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /instance:
 *   post:
 *     summary: Crear una nueva instancia de canal
 *     description: Crea una nueva instancia de comunicación (WhatsApp, Email, etc.) para la tienda
 *     tags:
 *       - Instance
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - networkId
 *               - name
 *               - identifier
 *             properties:
 *               networkId:
 *                 type: integer
 *                 example: 1
 *               name:
 *                 type: string
 *                 example: "WhatsApp Ventas"
 *               identifier:
 *                 type: string
 *                 example: "+598912345678"
 *               credentials:
 *                 type: object
 *                 example: { token: "xxx", secret: "yyy" }
 *               metadata:
 *                 type: object
 *                 example: { status: "active" }
 *     responses:
 *       201:
 *         description: Instancia creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 networkId:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 identifier:
 *                   type: string
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener todas las instancias
 *     description: Lista todas las instancias de comunicación de la tienda autenticada
 *     tags:
 *       - Instance
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de instancias
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
 *                   networkId:
 *                     type: integer
 *       401:
 *         description: No autorizado
 * /instance/{id}:
 *   get:
 *     summary: Obtener una instancia por ID
 *     tags:
 *       - Instance
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
 *         description: Instancia encontrada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Instancia no encontrada
 *   patch:
 *     summary: Actualizar una instancia
 *     tags:
 *       - Instance
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
 *               identifier:
 *                 type: string
 *               credentials:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Instancia actualizada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Instancia no encontrada
 *   delete:
 *     summary: Eliminar una instancia
 *     tags:
 *       - Instance
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
 *         description: Instancia eliminada
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Instancia no encontrada
 */

router.post('/', authRequired, async (req, res) => {
  await InstanceController.create(req, res);
});

router.get('/', authRequired, async (req, res) => {
  await InstanceController.getAll(req, res);
});

router.get('/:id', authRequired, async (req, res) => {
  await InstanceController.getById(req, res);
});

router.patch('/:id', authRequired, async (req, res) => {
  await InstanceController.update(req, res);
});

router.delete('/:id', authRequired, async (req, res) => {
  await InstanceController.delete(req, res);
});

export default router;