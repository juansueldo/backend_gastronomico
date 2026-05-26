import sequelize from '../models/db.js';
import { Product, Category, Store, Headquarter, InventoryItem, Recipe, RecipeItem, ProductIngredientOption } from "../models/index.js";
import ImageService from '../services/imageService.js';
import InventoryConsumptionService from '../services/inventoryConsumptionService.js';
import { parseLocaleNumber } from '../utils/numberParser.js';

const MAX_PRODUCT_IMAGE_BYTES = Number(process.env.PRODUCT_IMAGE_MAX_BYTES) || 5 * 1024 * 1024;
const VALID_INVENTORY_UNITS = new Set(['unidad', 'kg', 'gr', 'lt', 'ml']);
const INACTIVE_STATUS_ID = 2;

function normalizeInventoryUnit(unit) {
    const normalized = String(unit ?? 'unidad').trim().toLowerCase();
    if (normalized === 'g') return 'gr';
    if (normalized === 'l') return 'lt';
    if (VALID_INVENTORY_UNITS.has(normalized)) return normalized;
    return 'unidad';
}

function getBase64SizeInBytes(base64String) {
    const cleanBase64 = base64String.includes(',')
        ? base64String.split(',')[1]
        : base64String;

    const padding = cleanBase64.endsWith('==') ? 2 : cleanBase64.endsWith('=') ? 1 : 0;
    return Math.floor((cleanBase64.length * 3) / 4) - padding;
}

class ProductController {
    static async resolveHeadquarterId(storeId, requestedHeadquarterId) {
        const parsedHeadquarterId = Number(requestedHeadquarterId);
        if (Number.isInteger(parsedHeadquarterId) && parsedHeadquarterId > 0) {
            const headquarter = await Headquarter.findOne({ where: { id: parsedHeadquarterId, storeId } });
            if (!headquarter) throw new Error('Sede no encontrada para esta tienda');
            return parsedHeadquarterId;
        }

        const firstHeadquarter = await Headquarter.findOne({ where: { storeId, statusId: 1 }, order: [['id', 'ASC']] });
        if (!firstHeadquarter) throw new Error('No hay sedes activas para configurar stock');
        return firstHeadquarter.id;
    }

    static normalizeRecipeRows(rows) {
        return rows.map((recipe) => ({
            productId: String(recipe.productId),
            usesRecipe: true,
            ingredients: (recipe.RecipeItems ?? []).map((item) => ({
                id: String(item.id),
                inventoryItemId: item.inventoryItemId,
                name: item.InventoryItem?.name ?? '',
                quantity: Number(item.quantity),
                unit: item.InventoryItem?.unit ?? 'unidad',
            })),
            updatedAt: recipe.updatedAt,
        }));
    }

    static normalizeModifierRows(rows) {
        return rows.map((option) => ({
            id: String(option.id),
            productId: String(option.productId),
            inventoryItemId: option.inventoryItemId,
            name: option.name,
            unit: option.InventoryItem?.unit ?? option.unit ?? 'unidad',
            isRemovable: option.isRemovable !== false,
            isAddable: option.isAddable === true,
            defaultIncluded: option.defaultIncluded !== false,
            extraPrice: Number(option.extraPrice ?? 0),
            extraQuantity: Number(option.extraQuantity ?? 1),
            maxExtraQuantity: Number(option.maxExtraQuantity ?? 1),
            statusId: option.statusId,
        }));
    }

    static async create(req, res) {
        try {
            const { name, description, price, categoryId, category, categorydescription, image } = req.body;
            const storeId = req.user?.storeId;

            // Validar que storeId exista
            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }

            // Validar que la tienda existe
            const store = await Store.findByPk(storeId);
            if (!store) {
                return res.status(404).json({ error: 'Store no encontrada' });
            }

            // Validar campos requeridos
            if (!name || !price) {
                return res.status(400).json({ error: 'name y price son requeridos' });
            }

            // Crear categoría si no existe
            let finalCategoryId = categoryId;
            if (!categoryId && category) {
                const newCategory = await Category.create({ 
                    name: category, 
                    description: categorydescription, 
                    statusId: 1,
                    storeId 
                });
                finalCategoryId = newCategory.id;
            }

            // Procesar imagen si se proporciona
            let imageUrl = null;
            if (image) {
                const imageSizeBytes = getBase64SizeInBytes(image);
                if (!Number.isFinite(imageSizeBytes) || imageSizeBytes <= 0) {
                    return res.status(400).json({ error: 'No se pudo determinar el tamaño de la imagen base64' });
                }
                if (imageSizeBytes > MAX_PRODUCT_IMAGE_BYTES) {
                    return res.status(413).json({
                        error: `Imagen demasiado grande. Máximo permitido: ${Math.floor(MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024))}MB`,
                    });
                }

                // Validar que es válido base64
                if (!ImageService.isValidBase64(image)) {
                    return res.status(400).json({ error: 'Imagen debe ser un string base64 válido' });
                }

                // Guardar imagen
                const imageResult = await ImageService.saveImage(
                    image, 
                    storeId, 
                    `product_${Date.now()}`
                );
                imageUrl = imageResult.url;
            }

            const parsedPrice = parseLocaleNumber(price);
            if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
                return res.status(400).json({ error: 'price debe ser un número válido mayor a 0' });
            }

            // Crear producto
            const product = await Product.create({ 
                name, 
                description, 
                price: parsedPrice, 
                categoryId: finalCategoryId,
                storeId,
                type: 'simple',
                statusId: 1,
                image_url: imageUrl
            });

            // Retornar producto con relaciones
            const productWithRelations = await Product.findByPk(product.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Category, attributes: ['id', 'name', 'description'] }
                ]
            });

            res.status(201).json(productWithRelations);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const storeId = req.user?.storeId;

            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }

            const products = await Product.findAll({ 
                where: { statusId: 1, storeId },
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Category, attributes: ['id', 'name', 'description'] },
                    { model: Recipe, attributes: ['id', 'statusId'], required: false }
                ],
                order: [['createdAt', 'DESC']]
            });

            res.status(200).json(products.map((product) => {
                const row = product.toJSON();
                row.usesRecipe = row.type === 'recipe' || Boolean(row.Recipe && row.Recipe.statusId === 1);
                return row;
            }));
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;

            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }

            const product = await Product.findByPk(id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Category, attributes: ['id', 'name', 'description'] }
                ]
            });

            if (!product) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            if (product.storeId !== storeId) {
                return res.status(403).json({ error: 'No tienes permiso para acceder a este producto' });
            }

            res.status(200).json(product);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { name, description, price, categoryId, image } = req.body;
            const storeId = req.user?.storeId;

            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }

            const product = await Product.findByPk(id);

            if (!product) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            if (product.storeId !== storeId) {
                return res.status(403).json({ error: 'No tienes permiso para actualizar este producto' });
            }

            // Procesar nueva imagen si se proporciona
            let newImageUrl = product.image_url;
            if (image) {
                const imageSizeBytes = getBase64SizeInBytes(image);
                if (!Number.isFinite(imageSizeBytes) || imageSizeBytes <= 0) {
                    return res.status(400).json({ error: 'No se pudo determinar el tamaño de la imagen base64' });
                }
                if (imageSizeBytes > MAX_PRODUCT_IMAGE_BYTES) {
                    return res.status(413).json({
                        error: `Imagen demasiado grande. Máximo permitido: ${Math.floor(MAX_PRODUCT_IMAGE_BYTES / (1024 * 1024))}MB`,
                    });
                }

                if (!ImageService.isValidBase64(image)) {
                    return res.status(400).json({ error: 'Imagen debe ser un string base64 válido' });
                }

                // Eliminar imagen anterior si existe
                if (product.image_url) {
                    await ImageService.deleteImage(product.image_url);
                }

                // Guardar nueva imagen
                const imageResult = await ImageService.saveImage(
                    image, 
                    storeId, 
                    `product_${id}_${Date.now()}`
                );
                newImageUrl = imageResult.url;
            }

            let parsedUpdatedPrice = product.price;
            if (price !== undefined) {
                parsedUpdatedPrice = parseLocaleNumber(price);
                if (!Number.isFinite(parsedUpdatedPrice) || parsedUpdatedPrice <= 0) {
                    return res.status(400).json({ error: 'price debe ser un número válido mayor a 0' });
                }
            }

            // Actualizar producto
            await product.update({
                name: name || product.name,
                description: description !== undefined ? description : product.description,
                price: parsedUpdatedPrice,
                categoryId: categoryId || product.categoryId,
                image_url: newImageUrl
            });

            const updatedProduct = await Product.findByPk(id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Category, attributes: ['id', 'name', 'description'] }
                ]
            });

            res.status(200).json(updatedProduct);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;

            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }

            const product = await Product.findByPk(id);

            if (!product) {
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            if (product.storeId !== storeId) {
                return res.status(403).json({ error: 'No tienes permiso para eliminar este producto' });
            }

            // Eliminar imagen si existe
            if (product.image_url) {
                await ImageService.deleteImage(product.image_url);
            }

            await product.update({ statusId: INACTIVE_STATUS_ID });

            res.status(200).json({ message: 'Producto eliminado correctamente' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async saveRecipe(req, res) {
        const storeId = req.user?.storeId;
        if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });

        try {
            const { productId, usesRecipe, ingredients = [], headquarterId } = req.body;
            if (!productId) return res.status(400).json({ error: 'productId es requerido' });

            const product = await Product.findOne({ where: { id: productId, storeId } });
            if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

            const result = await sequelize.transaction(async (transaction) => {
                if (!usesRecipe) {
                    const recipe = await Recipe.findOne({ where: { productId: product.id, storeId }, transaction });
                    if (recipe) await RecipeItem.destroy({ where: { recipeId: recipe.id, storeId }, transaction });
                    await Recipe.destroy({ where: { productId: product.id, storeId }, transaction });
                    await product.update({ type: 'simple' }, { transaction });
                    return {
                        productId: String(product.id),
                        usesRecipe: false,
                        ingredients: [],
                        updatedAt: new Date().toISOString(),
                    };
                }

                if (!Array.isArray(ingredients) || ingredients.length === 0) {
                    throw new Error('Agregá al menos un ingrediente para la receta');
                }

                const resolvedHeadquarterId = await ProductController.resolveHeadquarterId(storeId, headquarterId);
                const [recipe] = await Recipe.findOrCreate({
                    where: { productId: product.id, storeId },
                    defaults: {
                        name: `Receta ${product.name}`,
                        description: null,
                        productId: product.id,
                        storeId,
                        statusId: 1,
                    },
                    transaction,
                });

                await recipe.update({ statusId: 1, name: `Receta ${product.name}` }, { transaction });
                await RecipeItem.destroy({ where: { recipeId: recipe.id, storeId }, transaction });

                const savedIngredients = [];
                for (const ingredient of ingredients) {
                    const name = String(ingredient.name ?? '').trim();
                    const quantity = Number(ingredient.quantity);
                    const unit = normalizeInventoryUnit(ingredient.unit);
                    if (!name || !Number.isFinite(quantity) || quantity <= 0) {
                        throw new Error('Cada ingrediente debe tener nombre y cantidad mayor a 0');
                    }

                    const inventoryItem = await InventoryConsumptionService.upsertIngredientStock({
                        name,
                        unit,
                        currentStock: ingredient.currentStock ?? ingredient.stock,
                        minStock: ingredient.minStock ?? ingredient.min_stock,
                        storeId,
                        headquarterId: resolvedHeadquarterId,
                        transaction,
                    });

                    const recipeItem = await RecipeItem.create({
                        quantity,
                        recipeId: recipe.id,
                        inventoryItemId: inventoryItem.id,
                        storeId,
                        statusId: 1,
                    }, { transaction });

                    savedIngredients.push({
                        id: String(recipeItem.id),
                        inventoryItemId: inventoryItem.id,
                        name: inventoryItem.name,
                        quantity,
                        unit: inventoryItem.unit,
                    });
                }

                await product.update({ type: 'recipe' }, { transaction });

                return {
                    productId: String(product.id),
                    usesRecipe: true,
                    ingredients: savedIngredients,
                    updatedAt: new Date().toISOString(),
                };
            });

            res.json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getRecipe(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const productId = req.query.productId;
            const recipe = await Recipe.findOne({
                where: { productId, storeId, statusId: 1 },
                include: [{ model: RecipeItem, include: [InventoryItem] }],
            });
            if (!recipe) return res.json(null);
            res.json(ProductController.normalizeRecipeRows([recipe])[0]);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async listRecipes(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const recipes = await Recipe.findAll({
                where: { storeId, statusId: 1 },
                include: [{ model: RecipeItem, include: [InventoryItem] }],
            });
            res.json(ProductController.normalizeRecipeRows(recipes));
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async saveIngredientOptions(req, res) {
        const storeId = req.user?.storeId;
        if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });

        try {
            const { productId, options = [], headquarterId } = req.body;
            if (!productId) return res.status(400).json({ error: 'productId es requerido' });
            if (!Array.isArray(options)) return res.status(400).json({ error: 'options debe ser un array' });

            const product = await Product.findOne({ where: { id: productId, storeId } });
            if (!product) return res.status(404).json({ error: 'Producto no encontrado' });

            const result = await sequelize.transaction(async (transaction) => {
                const resolvedHeadquarterId = await ProductController.resolveHeadquarterId(storeId, headquarterId);
                await ProductIngredientOption.destroy({ where: { productId: product.id, storeId }, transaction });

                const saved = [];
                for (const option of options) {
                    const inventoryItemId = Number(option.inventoryItemId ?? option.inventory_item_id);
                    const name = String(option.name ?? '').trim();

                    if (!Number.isInteger(inventoryItemId) || inventoryItemId <= 0) {
                        throw new Error('Cada opcion debe tener inventoryItemId valido');
                    }

                    const inventoryItem = await InventoryItem.findOne({
                        where: { id: inventoryItemId, storeId, headquarterId: resolvedHeadquarterId, statusId: 1 },
                        transaction,
                    });
                    if (!inventoryItem) {
                        throw new Error(`Ingrediente ${inventoryItemId} no encontrado para esta sede`);
                    }

                    const isRemovable = option.isRemovable ?? option.is_removable ?? true;
                    const isAddable = option.isAddable ?? option.is_addable ?? false;
                    const defaultIncluded = option.defaultIncluded ?? option.default_included ?? true;
                    const extraPrice = Number(option.extraPrice ?? option.extra_price ?? 0);
                    const extraQuantity = Number(option.extraQuantity ?? option.extra_quantity ?? 1);
                    const maxExtraQuantity = Number(option.maxExtraQuantity ?? option.max_extra_quantity ?? 1);

                    if (!Number.isFinite(extraPrice) || extraPrice < 0) {
                        throw new Error('extraPrice debe ser mayor o igual a 0');
                    }
                    if (!Number.isFinite(extraQuantity) || extraQuantity <= 0) {
                        throw new Error('extraQuantity debe ser mayor a 0');
                    }
                    if (!Number.isInteger(maxExtraQuantity) || maxExtraQuantity < 0) {
                        throw new Error('maxExtraQuantity debe ser un entero mayor o igual a 0');
                    }

                    const created = await ProductIngredientOption.create({
                        productId: product.id,
                        inventoryItemId: inventoryItem.id,
                        name: name || inventoryItem.name,
                        isRemovable: Boolean(isRemovable),
                        isAddable: Boolean(isAddable),
                        defaultIncluded: Boolean(defaultIncluded),
                        extraPrice,
                        extraQuantity,
                        maxExtraQuantity,
                        storeId,
                        statusId: 1,
                    }, { transaction });

                    saved.push({ ...created.toJSON(), InventoryItem: inventoryItem });
                }

                return ProductController.normalizeModifierRows(saved);
            });

            res.json({ productId: String(product.id), options: result });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getIngredientOptions(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const productId = req.query.productId;
            if (!productId) return res.status(400).json({ error: 'productId es requerido' });

            const options = await ProductIngredientOption.findAll({
                where: { productId, storeId, statusId: 1 },
                include: [{ model: InventoryItem }],
                order: [['id', 'ASC']],
            });
            res.json({ productId: String(productId), options: ProductController.normalizeModifierRows(options) });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async listIngredientOptions(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const where = { storeId, statusId: 1 };
            if (req.query.productId) where.productId = Number(req.query.productId);
            const options = await ProductIngredientOption.findAll({
                where,
                include: [{ model: InventoryItem }],
                order: [['productId', 'ASC'], ['id', 'ASC']],
            });
            res.json(ProductController.normalizeModifierRows(options));
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async upsertProductStock(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const { productId, currentStock, minStock, headquarterId } = req.body;
            const product = await Product.findOne({ where: { id: productId, storeId } });
            if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
            const resolvedHeadquarterId = await ProductController.resolveHeadquarterId(storeId, headquarterId);
            const stockItem = await InventoryConsumptionService.upsertProductStock({
                product,
                currentStock,
                minStock,
                storeId,
                headquarterId: resolvedHeadquarterId,
            });
            res.json({
                productId: String(product.id),
                currentStock: Number(stockItem.stock),
                minStock: Number(stockItem.min_stock),
                updatedAt: stockItem.updatedAt,
            });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async listProductStock(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const where = { storeId, statusId: 1 };
            if (req.query.headquarterId) where.headquarterId = Number(req.query.headquarterId);
            const rows = await InventoryItem.findAll({ where, include: [Product] });
            res.json(rows
                .filter((item) => item.productId)
                .map((item) => ({
                    productId: String(item.productId),
                    currentStock: Number(item.stock),
                    minStock: Number(item.min_stock),
                    updatedAt: item.updatedAt,
                })));
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async consumeProductStock(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const { productId, quantity, headquarterId } = req.body;
            const product = await Product.findOne({ where: { id: productId, storeId } });
            if (!product) return res.status(404).json({ error: 'Producto no encontrado' });
            const resolvedHeadquarterId = await ProductController.resolveHeadquarterId(storeId, headquarterId);
            const stockItem = await InventoryItem.findOne({
                where: { productId: product.id, storeId, headquarterId: resolvedHeadquarterId, statusId: 1 },
            });
            if (!stockItem) return res.status(404).json({ error: 'Stock directo no configurado para el producto' });
            await InventoryConsumptionService.consumeInventoryItem({
                inventoryItem: stockItem,
                quantity,
                reason: `Ajuste manual - producto ${product.name}`,
                storeId,
                headquarterId: resolvedHeadquarterId,
            });
            res.json({ ok: true });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async consumeOrderInventory(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const { orderId } = req.body;
            if (!orderId) return res.status(400).json({ error: 'orderId es requerido' });
            const result = await sequelize.transaction((transaction) =>
                InventoryConsumptionService.consumeOrderInventory(orderId, storeId, { transaction })
            );
            res.json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async upsertIngredientStock(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const resolvedHeadquarterId = await ProductController.resolveHeadquarterId(storeId, req.body.headquarterId);
            const item = await InventoryConsumptionService.upsertIngredientStock({
                name: req.body.name,
                unit: normalizeInventoryUnit(req.body.unit),
                currentStock: req.body.currentStock ?? req.body.stock ?? 0,
                minStock: req.body.minStock ?? req.body.minimumStock ?? 0,
                storeId,
                headquarterId: resolvedHeadquarterId,
            });
            res.json({
                key: String(item.id),
                name: item.name,
                unit: item.unit,
                currentStock: Number(item.stock),
                minStock: Number(item.min_stock),
                updatedAt: item.updatedAt,
            });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async listIngredients(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) return res.status(401).json({ error: 'storeId no encontrado en el token' });
            const where = { storeId, statusId: 1, productId: null };
            if (req.query.headquarterId) where.headquarterId = Number(req.query.headquarterId);
            const rows = await InventoryItem.findAll({ where, order: [['name', 'ASC']] });
            res.json(rows.map((item) => ({
                key: String(item.id),
                name: item.name,
                unit: item.unit,
                currentStock: Number(item.stock),
                minStock: Number(item.min_stock),
                updatedAt: item.updatedAt,
            })));
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default ProductController;
