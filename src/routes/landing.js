import express from 'express';
import LandingController from '../controllers/landingController.js';

const router = express.Router();

router.get('/pricing', async (req, res) => {
  await LandingController.pricing(req, res);
});

export default router;
