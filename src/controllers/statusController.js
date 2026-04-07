
import { Status } from '../models/index.js';

class StatusController {
    static async create(req, res) {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'name es requerido' });
            const status = await Status.create({ name });
            res.status(201).json(status);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const statuses = await Status.findAndCountAll();
            res.status(200).json(statuses);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const status = await Status.findByPk(req.params.id);
            if (!status) return res.status(404).json({ error: 'Estado no encontrado' });
            res.status(200).json(status);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const { name } = req.body;
            const status = await Status.findByPk(req.params.id);
            if (!status) return res.status(404).json({ error: 'Estado no encontrado' });
            if (name) await status.update({ name });
            const updated = await Status.findByPk(req.params.id);
            res.status(200).json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const status = await Status.findByPk(req.params.id);
            if (!status) return res.status(404).json({ error: 'Estado no encontrado' });
            await status.destroy();
            res.status(200).json({ message: 'Estado eliminado' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default StatusController;