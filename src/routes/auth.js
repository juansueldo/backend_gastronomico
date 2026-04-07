
import express from 'express';
import AuthController from '../controllers/authController.js';
const router = express.Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario y crear store
 *     description: Crea una nueva tienda y usuario admin en una sola operación
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - storename
 *               - firstname
 *               - lastname
 *               - username
 *               - email
 *               - password
 *               - slug
 *     properties:
 *       storename:
 *         type: string
 *         example: "Mi Restaurante"
 *       slug:
 *         type: string
 *         example: "mi-restaurante"
 *       timezone:
 *         type: string
 *         example: "UTC-3"
 *       location:
 *         type: string
 *         example: "Montevideo"
 *       firstname:
 *         type: string
 *         example: "Juan"
 *       lastname:
 *         type: string
 *         example: "Pérez"
 *       username:
 *         type: string
 *         example: "juanperez"
 *       email:
 *         type: string
 *         format: email
 *         example: "juan@example.com"
 *       password:
 *         type: string
 *         format: password
 *         example: "securepassword123"
 *     responses:
 *       201:
 *         description: Usuario y tienda creados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 store:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     slug:
 *                       type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     firstname:
 *                       type: string
 *                     lastname:
 *                       type: string
 *                     email:
 *                       type: string
 *                     username:
 *                       type: string
 *       400:
 *         description: Error de validación
 */
router.post('/register', async (req, res) => {
  await AuthController.register(req, res);
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     description: Autentica un usuario y devuelve JWT token
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: "juanperez"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "securepassword123"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     firstname:
 *                       type: string
 *                     lastname:
 *                       type: string
 *                     email:
 *                       type: string
 *                     customerId:
 *                       type: integer
 *                       nullable: true
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Credenciales inválidas
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/login', async (req, res) => {
  await AuthController.login(req, res);
});

export default router;