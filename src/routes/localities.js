import express from 'express';
import LocalityController from '../controllers/localityController.js';

const router = express.Router();

/**
 * @swagger
 * /localities:
 *   get:
 *     summary: Obtener localidades de zonas de entrega
 *     description: Retorna las localidades únicas derivadas de las zonas de entrega creadas para la tienda autenticada.
 *     tags:
 *       - Locality
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: headquarterId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filtra las localidades por sede
 *       - in: query
 *         name: includeInactive
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Si es true, incluye zonas inactivas
 *     responses:
 *       200:
 *         description: Localidades obtenidas correctamente
 *       400:
 *         description: Parámetros inválidos
 *       401:
 *         description: No autorizado
 */
router.get('/', async (req, res) => {
  await LocalityController.getByStore(req, res);
});

export default router;
