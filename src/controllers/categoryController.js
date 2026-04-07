import { Category } from "../models/index.js";

class CategoryController {

    static async create(req, res) {
        try {
            const { name, description, icon } = req.body;
            const category = await Category.create({ name, description, icon, statusId: 1 });
            res.status(201).json(category);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default CategoryController;