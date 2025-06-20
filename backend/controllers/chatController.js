import Message from '../models/messageModel.js';
import User from '../models/userModel.js';
import mongoose from 'mongoose';

// Lấy danh sách tin nhắn giữa 2 người dùng
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Chuyển đổi userId thành ObjectId
    const userObjectId = new mongoose.Types.ObjectId(userId);
    
    // Tìm tất cả tin nhắn liên quan đến user này
    const messages = await Message.find({
      $or: [
        { sender: userObjectId },
        { receiver: userObjectId }
      ]
    }).sort({ timestamp: 1 });

    // Thêm thông tin hiển thị cho mỗi tin nhắn
    const formattedMessages = messages.map(msg => ({
      ...msg.toObject(),
      displaySender: msg.sender.toString() === userId ? 'user' : 'admin',
      displayReceiver: msg.sender.toString() === userId ? 'admin' : 'user'
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ message: 'Lỗi khi lấy tin nhắn' });
  }
};

// Gửi tin nhắn mới
export const sendMessage = async (req, res) => {
  try {
    const { receiver, content } = req.body;
    const senderId = req.user._id;

    // Nếu receiver là 'admin', tìm admin thật
    let receiverId = receiver;
    if (receiver === 'admin') {
      const admin = await User.findOne({ isAdmin: true });
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found' });
      }
      receiverId = admin._id;
    }

    const newMessage = new Message({
      sender: senderId,
      receiver: receiverId,
      content
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar');

    res.status(201).json({ success: true, message: populatedMessage });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Đánh dấu tin nhắn đã đọc
export const markAsRead = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.receiver.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    message.isRead = true;
    await message.save();

    res.json({ success: true, message });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy danh sách người dùng đã chat
export const getChatUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Nếu là admin, lấy danh sách người dùng đã chat
    if (req.user.isAdmin) {
      const messages = await Message.find({
        $or: [{ sender: userId }, { receiver: userId }]
      });

      const chatUserIds = new Set();
      messages.forEach(message => {
        if (message.sender.toString() === userId.toString()) {
          chatUserIds.add(message.receiver.toString());
        } else {
          chatUserIds.add(message.sender.toString());
        }
      });

      const chatUsers = await User.find({
        _id: { $in: Array.from(chatUserIds) },
        isAdmin: false // Chỉ lấy người dùng thường
      }).select('name avatar');

      return res.json({ success: true, users: chatUsers });
    }

    // Nếu là người dùng thường, trả về thông tin admin
    const admin = await User.findOne({ isAdmin: true }).select('name avatar');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, users: [admin] });
  } catch (error) {
    console.error('Error in getChatUsers:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy tin nhắn của admin
export const getAdminMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .sort({ timestamp: 1 });

    // Thêm thông tin hiển thị cho mỗi tin nhắn
    const formattedMessages = messages.map(msg => ({
      ...msg.toObject(),
      displaySender: msg.sender.toString() === 'admin' ? 'admin' : 'user',
      displayReceiver: msg.sender.toString() === 'admin' ? 'user' : 'admin'
    }));

    res.json(formattedMessages);
  } catch (error) {
    console.error('Error in getAdminMessages:', error);
    res.status(500).json({ message: 'Lỗi khi lấy tin nhắn' });
  }
}; 