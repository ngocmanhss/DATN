import Message from '../models/messageModel.js';
import User from '../models/userModel.js';

// Lấy danh sách người dùng để chat (cho admin)
export const getChatUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('name email avatar');
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error in getChatUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách người dùng'
    });
  }
};

// Lấy tin nhắn giữa 2 người dùng
export const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, receiver: userId },
        { sender: userId, receiver: req.user._id }
      ]
    })
    .populate('sender', 'name avatar')
    .populate('receiver', 'name avatar')
    .sort({ createdAt: 1 });

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy tin nhắn'
    });
  }
};

// Gửi tin nhắn mới
export const sendMessage = async (req, res) => {
  try {
    const { receiver, content } = req.body;
    
    const newMessage = new Message({
      sender: req.user._id,
      receiver,
      content
    });

    await newMessage.save();

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('sender', 'name avatar')
      .populate('receiver', 'name avatar');

    res.json({
      success: true,
      message: populatedMessage
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi gửi tin nhắn'
    });
  }
};

// Lấy số tin nhắn chưa đọc
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver: req.user._id,
      read: false
    });

    res.json({
      success: true,
      count
    });
  } catch (error) {
    console.error('Error in getUnreadCount:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy số tin nhắn chưa đọc'
    });
  }
}; 