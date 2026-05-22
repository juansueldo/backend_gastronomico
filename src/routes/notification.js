import express from 'express';
import NotificationController from '../controllers/notificationController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  await NotificationController.getAll(req, res);
});

router.post('/read-all', authRequired, async (req, res) => {
  await NotificationController.markAllAsRead(req, res);
});

router.post('/:id/read', authRequired, async (req, res) => {
  await NotificationController.markAsRead(req, res);
});

export default router;
