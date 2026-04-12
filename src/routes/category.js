import express from 'express';
import CategoryController from '../controllers/categoryController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authRequired, async (req, res) => {
  await CategoryController.create(req, res);
});

router.get('/', authRequired, async (req, res) => {
  await CategoryController.getAll(req, res);
});

router.get('/:id', authRequired, async (req, res) => {
  await CategoryController.getById(req, res);
});

router.put('/:id', authRequired, async (req, res) => {
  await CategoryController.update(req, res);
});

export default router;