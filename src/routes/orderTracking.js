import express from 'express';
import OrderTrackingController from '../controllers/orderTrackingController.js';

const router = express.Router();

router.get('/:token', async (req, res) => {
  await OrderTrackingController.getByToken(req, res);
});

export default router;
