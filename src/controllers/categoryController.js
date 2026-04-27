import { Category } from "../models/index.js";

class CategoryController {

    static async create(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }
            const { name, description, icon } = req.body;
            const category = await Category.create({ name, description, icon, statusId: 1, storeId });
            res.status(201).json(category);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const storeId = req.user?.storeId;
            console.log('storeId en CategoryController.getAll:', storeId);
            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }
            const categories = await Category.findAll({ where: { statusId: 1, storeId }, order: [['createdAt', 'DESC']] });
            res.json(categories);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;
            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }
            const category = await Category.findOne({ where: { id, storeId } });
            if (!category) {
                return res.status(404).json({ error: 'Categoría no encontrada' });
            }
            res.json(category);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;
            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }
            const category = await Category.findOne({ where: { id, storeId } });
            if (!category) {
                return res.status(404).json({ error: 'Categoría no encontrada' });
            }
            const { name, description, icon } = req.body;
            await category.update({ name, description, icon });
            res.json(category);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

}

export default CategoryController;
