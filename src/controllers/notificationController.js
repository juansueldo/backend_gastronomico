import { Notification, Status } from '../models/index.js';

class NotificationController{
    static async getAll(req, res) {
        try {
            const storeId = req.user?.storeId;
            const headquarterId = req.user?.headquarterId;
            if (!storeId) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }
            const where = { storeId };
            if (headquarterId !== undefined && headquarterId !== null) {
                where.headquarterId = headquarterId;
            }
            const notifications = await Notification.findAll({
                include: [{ model: Status, attributes: ['id', 'name'] }],
                where,
                order: [['createdAt', 'DESC']]
            });
            res.json(notifications);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default NotificationController;
