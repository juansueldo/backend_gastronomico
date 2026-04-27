import { Headquarter } from '../models/index.js';

class HeadquarterController {
    static async create(req, res) {
        try {
            const { name, phone, location } = req.body;
            const storeId = req.user?.storeId;
            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }
            if (!name) {
                return res.status(400).json({ error: 'name es requerido' });
            }
            const headquarter = await Headquarter.create({ name, phone, location, storeId, statusId: 1 });
            res.status(201).json(headquarter);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getList(req, res) {
        try {
            const storeId = req.user?.storeId;
            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }
            const headquarters = await Headquarter.findAll({ where: { storeId } });
            res.json(headquarters);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res){
        try {
            const { id } = req.params;
            const storeId = req.user?.storeId;
            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }
            const headquarter = await Headquarter.findOne({ where: { id, storeId } });
            if (!headquarter) {
                return res.status(404).json({ error: 'Sede no encontrada' });
            }
            res.json(headquarter);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

export default HeadquarterController;
