import { Network, Status } from '../models/index.js';

class NetworkController {
    static async create(req, res) {
        try {
            const { name } = req.body;
            if (!name) return res.status(400).json({ error: 'name es requerido' });
            const network = await Network.create({ name, statusId: 1 });
            res.status(201).json(network);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const networks = await Network.findAndCountAll({
                include: [{ model: Status, attributes: ['id', 'name'] }],
            });
            res.json(networks);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const network = await Network.findByPk(id, {
                include: [{ model: Status, attributes: ['id', 'name'] }],
            });
            if (!network) return res.status(404).json({ error: 'Red no encontrada' });
            res.json(network);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const { name } = req.body;
            const network = await Network.findByPk(req.params.id);
            if (!network) return res.status(404).json({ error: 'Red no encontrada' });
            if (name) await network.update({ name });
            const updated = await Network.findByPk(req.params.id, {
                include: [{ model: Status, attributes: ['id', 'name'] }],
            });
            res.json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const network = await Network.findByPk(req.params.id);
            if (!network) return res.status(404).json({ error: 'Red no encontrada' });
            await network.destroy();
            res.json({ message: 'Red eliminada' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default NetworkController;