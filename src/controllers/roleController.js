import { Role, Status } from "../models/index.js";

class RoleController {

    static async create(req, res) {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'name es requerido' });
            const role = await Role.create({ name, statusId: 1 });
            res.status(201).json(role);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const roles = await Role.findAndCountAll({
                include: [{ model: Status, attributes: ['id', 'name'] }],
            });
            res.status(200).json(roles);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const role = await Role.findByPk(req.params.id, {
                include: [{ model: Status, attributes: ['id', 'name'] }],
            });
            if (!role) return res.status(404).json({ error: 'Rol no encontrado' });
            res.status(200).json(role);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const role = await Role.findByPk(req.params.id);
            if (!role) return res.status(404).json({ error: 'Rol no encontrado' });
            if (req.body.name) await role.update({ name: req.body.name });
            const updated = await Role.findByPk(req.params.id, {
                include: [{ model: Status, attributes: ['id', 'name'] }],
            });
            res.status(200).json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const role = await Role.findByPk(req.params.id);
            if (!role) return res.status(404).json({ error: 'Rol no encontrado' });
            await role.destroy();
            res.status(200).json({ message: 'Rol eliminado' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default RoleController;