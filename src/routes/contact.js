import express from 'express';
import ContactController from '../controllers/contactController.js';

const router = express.Router();

/**
 * @swagger
 * /contact:
 *   post:
 *     summary: Crear un nuevo contacto
 *     description: Crea un contacto que vincula un cliente con una instancia (canal de comunicación).
 *     tags:
 *       - Contacts
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - instanceId
 *               - storeId
 *               - identifier
 *               - type
 *             properties:
 *               customerId:
 *                 type: integer
 *                 description: ID del cliente
 *               instanceId:
 *                 type: integer
 *                 description: ID de la instancia (canal - WhatsApp, email, etc.)
 *               storeId:
 *                 type: integer
 *                 description: ID de la tienda
 *               identifier:
 *                 type: string
 *                 description: Identificador único (teléfono, email, usuario de WhatsApp, etc.)
 *               type:
 *                 type: string
 *                 enum: [phone, email, whatsapp, telegram, other]
 *                 description: Tipo de contacto
 *     responses:
 *       201:
 *         description: Contacto creado exitosamente
 *       400:
 *         description: Validación fallida o contacto duplicado
 *       404:
 *         description: Cliente o instancia no encontrado
 */
router.post('/', async (req, res) => {
  await ContactController.create(req, res);
});

/**
 * @swagger
 * /contact/customer/{customerId}:
 *   get:
 *     summary: Obtener todos los contactos de un cliente
 *     description: Retorna todos los canales de comunicación (contactos) asociados a un cliente.
 *     tags:
 *       - Contacts
 *     parameters:
 *       - name: customerId
 *         in: path
 *         required: true
 *         description: ID del cliente
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contactos encontrados
 *       404:
 *         description: Cliente no encontrado
 */
router.get('/customer/:customerId', async (req, res) => {
  await ContactController.getByCustomer(req, res);
});

/**
 * @swagger
 * /contact/instance/{instanceId}:
 *   get:
 *     summary: Obtener todos los contactos de una instancia
 *     description: Retorna todos los clientes que están en comunicación a través de una instancia específica.
 *     tags:
 *       - Contacts
 *     parameters:
 *       - name: instanceId
 *         in: path
 *         required: true
 *         description: ID de la instancia
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contactos encontrados
 *       404:
 *         description: Instancia no encontrada
 */
router.get('/instance/:instanceId', async (req, res) => {
  await ContactController.getByInstance(req, res);
});

/**
 * @swagger
 * /contact/{id}:
 *   get:
 *     summary: Obtener un contacto específico
 *     description: Retorna los detalles de un contacto.
 *     tags:
 *       - Contacts
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del contacto
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contacto encontrado
 *       404:
 *         description: Contacto no encontrado
 */
router.get('/:id', async (req, res) => {
  await ContactController.getById(req, res);
});

/**
 * @swagger
 * /contact/{id}:
 *   patch:
 *     summary: Actualizar un contacto
 *     description: Actualiza los datos de un contacto existente.
 *     tags:
 *       - Contacts
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del contacto
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               identifier:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [phone, email, whatsapp, telegram, other]
 *     responses:
 *       200:
 *         description: Contacto actualizado
 *       404:
 *         description: Contacto no encontrado
 */
router.patch('/:id', async (req, res) => {
  await ContactController.update(req, res);
});

/**
 * @swagger
 * /contact/{id}/status:
 *   patch:
 *     summary: Cambiar estado de un contacto
 *     description: Activa o desactiva un contacto.
 *     tags:
 *       - Contacts
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del contacto
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - statusId
 *             properties:
 *               statusId:
 *                 type: integer
 *                 description: ID del estado
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       404:
 *         description: Contacto no encontrado
 */
router.patch('/:id/status', async (req, res) => {
  await ContactController.updateStatus(req, res);
});

/**
 * @swagger
 * /contact/{id}:
 *   delete:
 *     summary: Eliminar un contacto
 *     description: Elimina el contacto entre un cliente y una instancia.
 *     tags:
 *       - Contacts
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del contacto
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Contacto eliminado
 *       404:
 *         description: Contacto no encontrado
 */
router.delete('/:id', async (req, res) => {
  await ContactController.delete(req, res);
});

export default router;
