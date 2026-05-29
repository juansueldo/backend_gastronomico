import express from 'express';
import MessagingController from '../controllers/messagingController.js';
import { authRequired } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/internal/events', async (req, res) => {
  await MessagingController.handleGatewayEvent(req, res);
});

router.get('/accounts/current', authRequired, async (req, res) => {
  await MessagingController.getCurrentAccount(req, res);
});

router.post('/accounts/connect', authRequired, async (req, res) => {
  await MessagingController.connectAccount(req, res);
});

router.post('/accounts/disconnect', authRequired, async (req, res) => {
  await MessagingController.disconnectAccount(req, res);
});

router.post('/accounts/restart', authRequired, async (req, res) => {
  await MessagingController.restartAccount(req, res);
});

router.get('/conversations', authRequired, async (req, res) => {
  await MessagingController.listConversations(req, res);
});

router.post('/conversations', authRequired, async (req, res) => {
  await MessagingController.createConversation(req, res);
});

router.get('/conversations/:id/messages', authRequired, async (req, res) => {
  await MessagingController.listMessages(req, res);
});

router.post('/conversations/:id/messages', authRequired, async (req, res) => {
  await MessagingController.sendConversationMessage(req, res);
});

router.post('/messages/:messageId/reactions', authRequired, async (req, res) => {
  await MessagingController.reactMessage(req, res);
});

router.patch('/conversations/:id/read', authRequired, async (req, res) => {
  await MessagingController.markConversationRead(req, res);
});

router.delete('/conversations/:id', authRequired, async (req, res) => {
  await MessagingController.deleteConversation(req, res);
});

router.post('/messages/send', authRequired, async (req, res) => {
  await MessagingController.sendDirectMessage(req, res);
});

export default router;
