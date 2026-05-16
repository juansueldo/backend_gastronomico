import express from 'express';
import NotificationController from '../controllers/notificationController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authRequired, async (req, res) => {
  await NotificationController.getAll(req, res);
});

export default router;