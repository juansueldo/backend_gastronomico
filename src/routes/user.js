
import express from 'express';
import UserController from '../controllers/userController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /user:
 *   post:
 *     summary: Crear usuario interno
 *     description: Crea un usuario para la tienda autenticada.
 *     tags:
 *       - User
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
 *               - username
 *               - email
 *               - password
 *               - roleId
 *             properties:
 *               firstname:
 *                 type: string
 *                 example: "Ana"
 *               lastname:
 *                 type: string
 *                 example: "Gomez"
 *               username:
 *                 type: string
 *                 example: "agomez"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "ana@resto.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "claveSegura123"
 *               roleId:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       201:
 *         description: Usuario creado exitosamente
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *   get:
 *     summary: Obtener usuarios de la tienda
 *     description: Lista los usuarios pertenecientes a la tienda autenticada.
 *     tags:
 *       - User
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuarios
 *       401:
 *         description: No autorizado
 * /user/{id}:
 *   get:
 *     summary: Obtener un usuario por ID
 *     tags:
 *       - User
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
 *         description: Usuario encontrado
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 *   put:
 *     summary: Actualizar un usuario
 *     tags:
 *       - User
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
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               roleId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Usuario actualizado
 *       400:
 *         description: Error de validación
 *       401:
 *         description: No autorizado
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/', authRequired, async (req, res) => {
  await UserController.createUser(req, res);
});

router.get('/', authRequired, async (req, res) => {
  await UserController.getAllUsers(req, res);
});

router.patch('/profile-image', authRequired, async (req, res) => {
  await UserController.updateProfileImage(req, res);
});

router.get('/:id', authRequired, async (req, res) => {
  await UserController.getUserById(req, res);
});

router.put('/:id', authRequired, async (req, res) => {
  await UserController.updateUser(req, res);
});

export default router;
