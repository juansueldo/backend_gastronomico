import express from 'express';
import DeliveryLogisticsController from '../controllers/deliveryLogisticsController.js';

const router = express.Router();

router.get('/drivers', DeliveryLogisticsController.listDrivers);
router.post('/drivers', DeliveryLogisticsController.createDriver);
router.patch('/drivers/:id', DeliveryLogisticsController.updateDriver);
router.post('/drivers/:id/invite', DeliveryLogisticsController.regenerateDriverInvite);
router.delete('/drivers/:id', DeliveryLogisticsController.deleteDriver);

router.get('/board', DeliveryLogisticsController.board);
router.post('/routes', DeliveryLogisticsController.assignRoute);
router.patch('/routes/:id/status', DeliveryLogisticsController.updateRouteStatus);
router.patch('/routes/:id/location', DeliveryLogisticsController.updateRouteLocation);
router.post('/routes/:id/print', DeliveryLogisticsController.markPrinted);

export default router;
