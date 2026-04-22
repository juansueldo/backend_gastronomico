import { Headquarter } from '../models/index.js';

class HeadquarterController {
    static async create(req, res) {
        try {
            const { name, phone, location } = req.body;
            const storeId = req.user?.storeId;
            const headquarter = await Headquarter.create({ name, phone, location, storeId, statusId: 1 });
            res.status(201).json(headquarter);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getList(req, res) {
        try {
            const storeId = req.user?.storeId;
            const headquarters = await Headquarter.findAll({ where: { storeId } });
            res.json(headquarters);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default HeadquarterController;