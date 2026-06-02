import express from 'express';
import DriverAppController from '../controllers/driverAppController.js';
import { driverAuthRequired } from '../middleware/driverAuthMiddleware.js';

const router = express.Router();

router.post('/activate', DriverAppController.activate);
router.get('/me', driverAuthRequired, DriverAppController.me);
router.get('/me/routes', driverAuthRequired, DriverAppController.routes);
router.patch('/routes/:id/status', driverAuthRequired, DriverAppController.updateRouteStatus);
router.patch('/routes/:id/location', driverAuthRequired, DriverAppController.updateRouteLocation);
router.patch('/route-orders/:id/status', driverAuthRequired, DriverAppController.updateRouteOrderStatus);

export default router;
