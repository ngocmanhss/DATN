import express from 'express';
import { getMessages, sendMessage, markAsRead, getChatUsers } from '../controllers/chatController.js';
import authUser from '../middlewares/authUser.js';

const router = express.Router();

// Tất cả routes đều yêu cầu đăng nhập
router.use(authUser);

// User chat routes
router.get('/messages', getMessages);
router.post('/messages', sendMessage);
router.put('/messages/:messageId/read', markAsRead);

// Lấy danh sách người dùng đã chat
router.get('/users', getChatUsers);

// Lấy tin nhắn với một người dùng cụ thể hoặc admin
router.get('/messages/:userId', getMessages);

// Lấy tin nhắn với admin (route riêng)
router.get('/messages/admin', getMessages);

export default router; 