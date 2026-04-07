import { Customer, Store, Status } from '../models/index.js';

class CustomerController {
    static async create(req, res) {
        try {
            const { firstname, lastname, phone, email, metadata } = req.body;
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            if (!firstname) return res.status(400).json({ error: 'firstname es requerido' });
            if (!lastname) return res.status(400).json({ error: 'lastname es requerido' });
            if (!phone) return res.status(400).json({ error: 'phone es requerido' });
            
            const store = await Store.findByPk(storeId);
            if (!store) return res.status(404).json({ error: 'Tienda no encontrada' });
            
            const customer = await Customer.create({ 
                firstname,
                lastname,
                phone, 
                email,
                metadata,
                storeId,
                statusId: 1 
            });
            
            const result = await Customer.findByPk(customer.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] }
                ]
            });
            
            res.status(201).json(result);
        }
        catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getAll(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const customers = await Customer.findAndCountAll({
                where: { storeId },
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] }
                ],
            });
            res.json(customers);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async getById(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const customer = await Customer.findByPk(req.params.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] }
                ]
            });
            
            if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
            if (customer.storeId !== storeId) return res.status(403).json({ error: 'No tienes acceso a este cliente' });
            
            res.status(200).json(customer);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async update(req, res) {
        try {
            const storeId = req.user?.storeId;
            
            if (!storeId) return res.status(401).json({ error: 'Store ID requerido en token' });
            
            const customer = await Customer.findByPk(req.params.id);
            if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
            if (customer.storeId !== storeId) return res.status(403).json({ error: 'No tienes acceso a este cliente' });
            
            const { firstname, lastname, phone, email, metadata } = req.body;
            
            if (firstname) customer.firstname = firstname;
            if (lastname) customer.lastname = lastname;
            if (phone) customer.phone = phone;
            if (email) customer.email = email;
            if (metadata) customer.metadata = metadata;
            
            await customer.save();
            
            const updated = await Customer.findByPk(req.params.id, {
                include: [
                    { model: Store, attributes: ['id', 'name'] },
                    { model: Status, attributes: ['id', 'name'] }
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
            
            const customer = await Customer.findByPk(req.params.id);
            if (!customer) return res.status(404).json({ error: 'Cliente no encontrado' });
            if (customer.storeId !== storeId) return res.status(403).json({ error: 'No tienes acceso a este cliente' });
            
            await customer.destroy();
            res.status(200).json({ message: 'Cliente eliminado' });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default CustomerController;