import express from 'express';
import StorefrontController from '../controllers/storefrontController.js';

const router = express.Router();

router.get('/:slug', async (req, res) => {
  await StorefrontController.getPublicStore(req, res);
});

router.get('/:slug/products', async (req, res) => {
  await StorefrontController.getPublicProducts(req, res);
});

router.post('/:slug/orders', async (req, res) => {
  await StorefrontController.createPublicOrder(req, res);
});

export default router;
