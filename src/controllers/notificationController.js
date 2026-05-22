import { Op } from 'sequelize';
import { Notification, Status } from '../models/index.js';

class NotificationController{
    static buildScopedWhere(req, extraWhere = {}) {
        const storeId = req.user?.storeId;
        const headquarterId = req.user?.headquarterId;
        if (!storeId) {
            return null;
        }

        const where = { storeId, ...extraWhere };
        if (headquarterId !== undefined && headquarterId !== null) {
            where[Op.or] = [
                { headquarterId },
                { headquarterId: null },
            ];
        }

        return where;
    }

    static async getAll(req, res) {
        try {
            const where = NotificationController.buildScopedWhere(req, { readAt: null });
            if (!where) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }
            const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
            const offset = Math.max(Number(req.query.offset) || 0, 0);
            const notifications = await Notification.findAll({
                include: [{ model: Status, attributes: ['id', 'name'] }],
                where,
                order: [['createdAt', 'DESC']],
                limit,
                offset,
            });
            res.json(notifications);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async markAsRead(req, res) {
        try {
            const notificationId = req.params.id ?? req.query.id;
            if (!notificationId) {
                return res.status(400).json({ error: 'id de notificación requerido' });
            }

            const where = NotificationController.buildScopedWhere(req, { id: notificationId, readAt: null });
            if (!where) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }

            const [updatedCount] = await Notification.update(
                { readAt: new Date() },
                { where }
            );

            if (updatedCount === 0) {
                return res.status(404).json({ error: 'notificación no encontrada o ya leída' });
            }

            res.json({ ok: true, id: String(notificationId) });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }

    static async markAllAsRead(req, res) {
        try {
            const where = NotificationController.buildScopedWhere(req, { readAt: null });
            if (!where) {
                return res.status(401).json({ error: 'storeId no encontrado en el token' });
            }

            const [updatedCount] = await Notification.update(
                { readAt: new Date() },
                { where }
            );

            res.json({ ok: true, updated: updatedCount });
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    }
}

export default NotificationController;
