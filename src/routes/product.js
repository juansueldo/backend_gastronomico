import express from 'express';
import ProductController from '../controllers/productController.js';

const router = express.Router();

/**
 * @swagger
 * /product:
 *   post:
 *     summary: Crear un nuevo producto
 *     description: Crea un nuevo producto con soporte para imagen en base64. La imagen se guarda en un directorio por tienda en /public/images/products/store_{storeId}/
 *     tags:
 *       - Product
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nombre del producto
 *                 example: "Pizza Margarita"
 *               description:
 *                 type: string
 *                 description: Descripción del producto
 *                 example: "Pizza con salsa, queso y albahaca"
 *               price:
 *                 type: number
 *                 description: Precio del producto
 *                 example: 15.99
 *               categoryId:
 *                 type: integer
 *                 description: ID de la categoría (opcional, si no existe se crea una nueva)
 *               category:
 *                 type: string
 *                 description: Nombre de la categoría a crear (si no existe categoryId)
 *                 example: "Pizzas"
 *               categorydescription:
 *                 type: string
 *                 description: Descripción de la categoría a crear
 *               image:
 *                 type: string
 *                 description: Imagen en base64 (puede incluir prefijo data:image/... o solo el string base64)
 *                 example: "iVBORw0KGgoAAAANSUhEUgAAAAUA..."
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 price:
 *                   type: number
 *                 image_url:
 *                   type: string
 *                   description: URL relativa de la imagen guardada
 *                   example: "/images/products/store_1/product_1704067200000.png"
 *                 storeId:
 *                   type: integer
 *                 categoryId:
 *                   type: integer
 *                 type:
 *                   type: string
 *                   example: "simple"
 *                 statusId:
 *                   type: integer
 *                 Store:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                 Category:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *       400:
 *         description: Validación fallida (campos requeridos faltantes, imagen base64 inválida)
 *       401:
 *         description: No autorizado (falta token JWT)
 *       404:
 *         description: Store no encontrada
 *     security:
 *       - BearerAuth: []
 */
router.post('/', async (req, res) => {
  await ProductController.create(req, res);
});

/**
 * @swagger
 * /product:
 *   get:
 *     summary: Obtener todos los productos de la tienda
 *     description: Retorna todos los productos activos (statusId=1) de la tienda del usuario autenticado, ordenados por fecha de creación descendente
 *     tags:
 *       - Product
 *     responses:
 *       200:
 *         description: Lista de productos obtenida exitosamente
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
 *                   description:
 *                     type: string
 *                   price:
 *                     type: number
 *                   image_url:
 *                     type: string
 *                     nullable: true
 *                   type:
 *                     type: string
 *                   statusId:
 *                     type: integer
 *                   storeId:
 *                     type: integer
 *                   categoryId:
 *                     type: integer
 *                   Store:
 *                     type: object
 *                   Category:
 *                     type: object
 *       401:
 *         description: No autorizado (falta token JWT)
 *     security:
 *       - BearerAuth: []
 */
router.get('/', async (req, res) => {
  await ProductController.getAll(req, res);
});

router.post('/recipe/save', async (req, res) => {
  await ProductController.saveRecipe(req, res);
});

router.get('/recipe', async (req, res) => {
  await ProductController.getRecipe(req, res);
});

router.get('/recipe/list', async (req, res) => {
  await ProductController.listRecipes(req, res);
});

router.post('/stock/upsert', async (req, res) => {
  await ProductController.upsertProductStock(req, res);
});

router.get('/stock', async (req, res) => {
  await ProductController.listProductStock(req, res);
});

router.post('/stock/consume', async (req, res) => {
  await ProductController.consumeProductStock(req, res);
});

router.post('/inventory/consume-order', async (req, res) => {
  await ProductController.consumeOrderInventory(req, res);
});

router.post('/ingredient/stock/upsert', async (req, res) => {
  await ProductController.upsertIngredientStock(req, res);
});

router.post('/ingredient/create', async (req, res) => {
  await ProductController.upsertIngredientStock(req, res);
});

router.get('/ingredient/list', async (req, res) => {
  await ProductController.listIngredients(req, res);
});

router.get('/ingredient/stock', async (req, res) => {
  await ProductController.listIngredients(req, res);
});

/**
 * @swagger
 * /product/{id}:
 *   get:
 *     summary: Obtener un producto por ID
 *     description: Retorna los detalles completos de un producto, incluyendo su imagen y categoría
 *     tags:
 *       - Product
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del producto
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Producto encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 price:
 *                   type: number
 *                 image_url:
 *                   type: string
 *                 type:
 *                   type: string
 *                 statusId:
 *                   type: integer
 *                 storeId:
 *                   type: integer
 *                 categoryId:
 *                   type: integer
 *                 Store:
 *                   type: object
 *                 Category:
 *                   type: object
 *       401:
 *         description: No autorizado (falta token JWT)
 *       403:
 *         description: Prohibido (producto no pertenece a tu tienda)
 *       404:
 *         description: Producto no encontrado
 *     security:
 *       - BearerAuth: []
 */
router.get('/:id', async (req, res) => {
  await ProductController.getById(req, res);
});

/**
 * @swagger
 * /product/{id}:
 *   patch:
 *     summary: Actualizar un producto
 *     description: Actualiza los datos de un producto. Si se proporciona una nueva imagen, la imagen anterior se elimina automáticamente.
 *     tags:
 *       - Product
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del producto
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
 *               price:
 *                 type: number
 *               categoryId:
 *                 type: integer
 *               image:
 *                 type: string
 *                 description: Nueva imagen en base64 (opcional). Si se proporciona, reemplaza la imagen anterior.
 *     responses:
 *       200:
 *         description: Producto actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       401:
 *         description: No autorizado (falta token JWT)
 *       403:
 *         description: Prohibido (producto no pertenece a tu tienda)
 *       404:
 *         description: Producto no encontrado
 *     security:
 *       - BearerAuth: []
 */
router.patch('/:id', async (req, res) => {
  await ProductController.update(req, res);
});

/**
 * @swagger
 * /product/{id}:
 *   delete:
 *     summary: Eliminar un producto
 *     description: Elimina un producto y su imagen asociada del servidor
 *     tags:
 *       - Product
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID del producto
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Producto eliminado exitosamente
 *       401:
 *         description: No autorizado (falta token JWT)
 *       403:
 *         description: Prohibido (producto no pertenece a tu tienda)
 *       404:
 *         description: Producto no encontrado
 *     security:
 *       - BearerAuth: []
 */
router.delete('/:id', async (req, res) => {
  await ProductController.delete(req, res);
});

export default router;
