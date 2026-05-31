import express from 'express';
import AdminController from '../controllers/adminController.js';
import { adminAuthRequired } from '../middleware/adminAuthMiddleware.js';

const router = express.Router();

router.post('/login', async (req, res) => {
  await AdminController.login(req, res);
});

router.get('/me', adminAuthRequired, async (req, res) => {
  await AdminController.me(req, res);
});

router.get('/dashboard', adminAuthRequired, async (req, res) => {
  await AdminController.dashboard(req, res);
});

router.get('/accounts', adminAuthRequired, async (req, res) => {
  await AdminController.accounts(req, res);
});

router.post('/accounts', adminAuthRequired, async (req, res) => {
  await AdminController.createAccount(req, res);
});

router.patch('/accounts/:id', adminAuthRequired, async (req, res) => {
  await AdminController.updateAccount(req, res);
});

router.post('/accounts/assign-plan', adminAuthRequired, async (req, res) => {
  await AdminController.assignPlan(req, res);
});

router.get('/users', adminAuthRequired, async (req, res) => {
  await AdminController.users(req, res);
});

router.patch('/users/:id', adminAuthRequired, async (req, res) => {
  await AdminController.updateUser(req, res);
});

router.get('/roles', adminAuthRequired, async (req, res) => {
  await AdminController.roles(req, res);
});

router.post('/roles', adminAuthRequired, async (req, res) => {
  await AdminController.createRole(req, res);
});

router.get('/statuses', adminAuthRequired, async (req, res) => {
  await AdminController.statuses(req, res);
});

router.post('/statuses', adminAuthRequired, async (req, res) => {
  await AdminController.createStatus(req, res);
});

router.get('/billing-cycles', adminAuthRequired, async (req, res) => {
  await AdminController.billingCycles(req, res);
});

router.get('/addons', adminAuthRequired, async (req, res) => {
  await AdminController.addons(req, res);
});

router.post('/addons', adminAuthRequired, async (req, res) => {
  await AdminController.createAddon(req, res);
});

router.get('/admins', adminAuthRequired, async (req, res) => {
  await AdminController.list(req, res);
});

router.post('/admins', adminAuthRequired, async (req, res) => {
  await AdminController.create(req, res);
});

router.patch('/admins/:id', adminAuthRequired, async (req, res) => {
  await AdminController.updateAdmin(req, res);
});

router.delete('/admins/:id', adminAuthRequired, async (req, res) => {
  await AdminController.deleteAdmin(req, res);
});

router.get('/subscriptions', adminAuthRequired, async (req, res) => {
  await AdminController.subscriptions(req, res);
});

router.get('/todos', adminAuthRequired, async (req, res) => {
  await AdminController.todos(req, res);
});

router.post('/todos', adminAuthRequired, async (req, res) => {
  await AdminController.createTodo(req, res);
});

router.patch('/todos/:id', adminAuthRequired, async (req, res) => {
  await AdminController.updateTodo(req, res);
});

router.delete('/todos/:id', adminAuthRequired, async (req, res) => {
  await AdminController.deleteTodo(req, res);
});

export default router;
