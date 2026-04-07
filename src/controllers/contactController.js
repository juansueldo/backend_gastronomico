import { Contact, Customer, Instance, Store, Status } from '../models/index.js';

class ContactController {
  /**
   * Crear un nuevo contacto para un cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async create(req, res) {
    try {
      const { customerId, instanceId, storeId, identifier, type } = req.body;

      // Validaciones
      if (!customerId) return res.status(400).json({ error: 'customerId es requerido' });
      if (!instanceId) return res.status(400).json({ error: 'instanceId es requerido' });
      if (!storeId) return res.status(400).json({ error: 'storeId es requerido' });
      if (!identifier) return res.status(400).json({ error: 'identifier es requerido' });
      if (!type || !['phone', 'email', 'whatsapp', 'telegram', 'other'].includes(type)) {
        return res.status(400).json({ error: 'type debe ser: phone, email, whatsapp, telegram u other' });
      }

      // Validar que el cliente existe
      const customer = await Customer.findByPk(customerId);
      if (!customer) return res.status(404).json({ error: 'Customer no encontrado' });
      if (customer.storeId !== storeId) {
        return res.status(403).json({ error: 'Customer no pertenece a esta tienda' });
      }

      // Validar que la instancia existe
      const instance = await Instance.findByPk(instanceId);
      if (!instance) return res.status(404).json({ error: 'Instance no encontrada' });
      if (instance.storeId !== storeId) {
        return res.status(403).json({ error: 'Instance no pertenece a esta tienda' });
      }

      // Validar que no exista contacto duplicado para el mismo customer/instance
      const existingContact = await Contact.findOne({
        where: { customerId, instanceId, identifier },
      });

      if (existingContact) {
        return res.status(400).json({ error: 'Este contacto ya existe para este cliente en esta instancia' });
      }

      // Crear contacto
      const contact = await Contact.create({
        customerId,
        instanceId,
        storeId,
        identifier,
        type,
        statusId: 1,
      });

      // Retornar con relaciones
      const contactWithRelations = await Contact.findByPk(contact.id, {
        include: [
          { model: Customer, attributes: ['id', 'name', 'email', 'phone'] },
          { model: Instance, attributes: ['id', 'name', 'phone', 'connection'] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
      });

      res.status(201).json(contactWithRelations);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Obtener todos los contactos de un cliente
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getByCustomer(req, res) {
    try {
      const { customerId } = req.params;

      if (!customerId) {
        return res.status(400).json({ error: 'customerId es requerido' });
      }

      // Validar que el cliente existe
      const customer = await Customer.findByPk(customerId);
      if (!customer) return res.status(404).json({ error: 'Customer no encontrado' });

      const contacts = await Contact.findAndCountAll({
        where: { customerId, statusId: 1 },
        include: [
          { model: Customer, attributes: ['id', 'name', 'email', 'phone'] },
          { model: Instance, attributes: ['id', 'name', 'phone', 'connection'] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
      });

      res.status(200).json(contacts);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Obtener todos los contactos de una instancia
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getByInstance(req, res) {
    try {
      const { instanceId } = req.params;

      if (!instanceId) {
        return res.status(400).json({ error: 'instanceId es requerido' });
      }

      // Validar que la instancia existe
      const instance = await Instance.findByPk(instanceId);
      if (!instance) return res.status(404).json({ error: 'Instance no encontrada' });

      const contacts = await Contact.findAndCountAll({
        where: { instanceId, statusId: 1 },
        include: [
          { model: Customer, attributes: ['id', 'name', 'email', 'phone'] },
          { model: Instance, attributes: ['id', 'name', 'phone', 'connection'] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
      });

      res.status(200).json(contacts);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Obtener un contacto específico
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getById(req, res) {
    try {
      const { id } = req.params;

      const contact = await Contact.findByPk(id, {
        include: [
          { model: Customer, attributes: ['id', 'name', 'email', 'phone'] },
          { model: Instance, attributes: ['id', 'name', 'phone', 'connection'] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
      });

      if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

      res.status(200).json(contact);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Actualizar un contacto
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const { identifier, type } = req.body;

      const contact = await Contact.findByPk(id);
      if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

      await contact.update({
        ...(identifier && { identifier }),
        ...(type && { type }),
      });

      const updatedContact = await Contact.findByPk(id, {
        include: [
          { model: Customer, attributes: ['id', 'name', 'email', 'phone'] },
          { model: Instance, attributes: ['id', 'name', 'phone', 'connection'] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
      });

      res.status(200).json(updatedContact);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Cambiar estado de un contacto
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { statusId } = req.body;

      if (!statusId) {
        return res.status(400).json({ error: 'statusId es requerido' });
      }

      const contact = await Contact.findByPk(id);
      if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

      await contact.update({ statusId });

      const updatedContact = await Contact.findByPk(id, {
        include: [
          { model: Customer, attributes: ['id', 'name', 'email', 'phone'] },
          { model: Instance, attributes: ['id', 'name', 'phone', 'connection'] },
          { model: Store, attributes: ['id', 'name'] },
          { model: Status, attributes: ['id', 'name'] },
        ],
      });

      res.status(200).json(updatedContact);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  /**
   * Eliminar un contacto
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async delete(req, res) {
    try {
      const { id } = req.params;

      const contact = await Contact.findByPk(id);
      if (!contact) return res.status(404).json({ error: 'Contacto no encontrado' });

      await contact.destroy();

      res.status(200).json({ message: 'Contacto eliminado correctamente' });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
}

export default ContactController;
