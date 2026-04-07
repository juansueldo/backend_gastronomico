
import express from 'express';
import UserController from '../controllers/userController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', authRequired, async (req, res) => {
  await UserController.createUser(req, res);
});

router.get('/', authRequired, async (req, res) => {
  await UserController.getAllUsers(req, res);
});

router.get('/:id', authRequired, async (req, res) => {
  await UserController.getUserById(req, res);
});

router.put('/:id', authRequired, async (req, res) => {
  await UserController.updateUser(req, res);
});

export default router;