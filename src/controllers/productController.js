import { Product, Category, Store } from "../models/index.js";
import ImageService from '../services/imageService.js';
import { parseLocaleNumber } from '../utils/numberParser.js';

class ProductController {

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
                // Validar que es válido base64
                if (!ImageService.isValidBase64(image)) {
                    return res.status(400).json({ error: 'Imagen debe ser un string base64 válido' });
                }

                // Guardar imagen
                const imageResult = ImageService.saveImage(
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
                    { model: Category, attributes: ['id', 'name', 'description'] }
                ],
                order: [['createdAt', 'DESC']]
            });

            res.status(200).json(products);
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
                if (!ImageService.isValidBase64(image)) {
                    return res.status(400).json({ error: 'Imagen debe ser un string base64 válido' });
                }

                // Eliminar imagen anterior si existe
                if (product.image_url) {
                    ImageService.deleteImage(product.image_url);
                }

                // Guardar nueva imagen
                const imageResult = ImageService.saveImage(
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
                ImageService.deleteImage(product.image_url);
            }

            await product.destroy();

            res.status(200).json({ message: 'Producto eliminado correctamente' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default ProductController;
