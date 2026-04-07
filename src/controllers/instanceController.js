
import { Instance, Store, Status, Network } from '../models/index.js';

class InstanceController {
    static async create(req, res) {
        try {
            const { name, identifier, networkId, credentials, metadata } = req.body;
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            if (!name) return res.status(400).json({ error: 'name es requerido' });
            if (!identifier) return res.status(400).json({ error: 'identifier es requerido' });
            if (!networkId) return res.status(400).json({ error: 'networkId es requerido' });
            
            const store = await Store.findByPk(storeId);
            if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });
            
            const network = await Network.findByPk(networkId);
            if (!network) return res.status(404).json({ error: 'Red no encontrada' });
            
            const instance = await Instance.create({ 
                name, 
                identifier,
                networkId, 
                storeId,
                credentials,
                metadata,
                statusId: 1 
            });
            
            const result = await Instance.findByPk(instance.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                    { model: Network, attributes: ['id', 'name', 'slug'] }
                ]
            });
            
            res.status(201).json(result);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const instances = await Instance.findAndCountAll({
                where: { storeId },
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                    { model: Network, attributes: ['id', 'name', 'slug'] }
                ],
            });
            res.json(instances);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const instance = await Instance.findByPk(req.params.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                    { model: Network, attributes: ['id', 'name', 'slug'] }
                ]
            });
            
            if (!instance) return res.status(404).json({ error: 'Instancia no encontrada' });
            if (instance.storeId !== storeId) return res.status(403).json({ error: 'No tienes acceso a esta instancia' });
            
            res.status(200).json(instance);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const instance = await Instance.findByPk(req.params.id);
            if (!instance) return res.status(404).json({ error: 'Instancia no encontrada' });
            if (instance.storeId !== storeId) return res.status(403).json({ error: 'No tienes acceso a esta instancia' });
            
            const { name, identifier, credentials, metadata } = req.body;
            
            if (name) instance.name = name;
            if (identifier) instance.identifier = identifier;
            if (credentials) instance.credentials = credentials;
            if (metadata) instance.metadata = metadata;
            
            await instance.save();
            
            const updated = await Instance.findByPk(req.params.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] },
                    { model: Network, attributes: ['id', 'name', 'slug'] }
                ]
            });
            
            res.status(200).json(updated);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async delete(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const instance = await Instance.findByPk(req.params.id);
            if (!instance) return res.status(404).json({ error: 'Instancia no encontrada' });
            if (instance.storeId !== storeId) return res.status(403).json({ error: 'No tienes acceso a esta instancia' });
            
            await instance.destroy();
            res.status(200).json({ message: 'Instancia eliminada' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default InstanceController;