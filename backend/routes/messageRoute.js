import express from 'express';
import authUser from '../middlewares/authUser.js';
import authAdmin from '../middlewares/authAdmin.js';
import {
  getChatUsers,
  getMessages,
  sendMessage,
  getUnreadCount
} from '../controllers/messageController.js';

const router = express.Router();

// Admin chat routes
router.get('/admin/chat/users', authUser, authAdmin, getChatUsers);
router.get('/admin/chat/messages', authUser, authAdmin, getMessages);
router.post('/admin/chat/messages', authUser, authAdmin, sendMessage);
router.get('/admin/chat/unread-count', authUser, authAdmin, getUnreadCount);

export default router; 