// index.js (hoặc server.js)
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from './config/mongodb.js';
import connectCloudinary from './config/cloudinary.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import userRoutes from './routes/userRoute.js';
import adminRoutes from './routes/adminRoute.js';
import chatRoutes from './routes/chatRoute.js';
import messageRoutes from './routes/messageRoute.js';
import Message from './models/messageModel.js';
import User from './models/userModel.js';
import momoController from './server/momoController.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 4000;

// Kết nối database và Cloudinary
connectDB();
connectCloudinary();

// Socket.IO configuration
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling']
});

console.log('Socket.IO server initialized');

// Middleware xác thực socket
io.use(async (socket, next) => {
  try {
    console.log('Socket connection attempt:', {
      id: socket.id,
      auth: socket.handshake.auth,
      headers: socket.handshake.headers
    });

    // Kiểm tra token trong auth
    let token = socket.handshake.auth.token;
    
    // Nếu không có token trong auth, kiểm tra trong headers
    if (!token && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      console.error('No token provided in socket connection');
      return next(new Error('Authentication error: No token provided'));
    }

    console.log('Verifying token with ACCESS_TOKEN_SECRET:', process.env.ACCESS_TOKEN_SECRET ? 'exists' : 'missing');

    try {
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      console.log('Decoded token:', decoded);

      // Nếu id là 'admin', cho phép truy cập
      if (decoded.id === 'admin') {
        socket.user = { _id: 'admin', role: 'admin' };
        return next();
      }

      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.error('User not found for token:', decoded.id);
        return next(new Error('User not found'));
      }

      console.log('User authenticated:', user._id);
      socket.user = user;
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.message);
      return next(new Error('Invalid token'));
    }
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication error: ' + error.message));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New socket connection:', {
    socketId: socket.id,
    userId: socket.user?._id,
    userRole: socket.user?.role
  });

  // Store active users
  const activeUsers = new Set();

  // Join user chat room
  socket.on('join_user_chat', (data) => {
    try {
      if (!socket.user) {
        console.error('No user found in socket');
        return;
      }
      const userId = data.userId;
      socket.join(userId);
      activeUsers.add(userId);
      // Broadcast user joined to admin
      io.to('admin').emit('user_joined', userId);
      console.log(`User ${socket.user._id} joined chat room ${userId}`);
    } catch (error) {
      console.error('Error joining user chat:', error);
    }
  });

  // Join admin chat room
  socket.on('join_admin_chat', () => {
    try {
      if (!socket.user) {
        console.error('No user found in socket');
        return;
      }
      socket.join('admin');
      console.log(`User ${socket.user._id} joined admin chat room`);
    } catch (error) {
      console.error('Error joining admin chat:', error);
    }
  });

  // Get active users
  socket.on('get_active_users', () => {
    console.log('Active users requested');
    socket.emit('active_users', Array.from(activeUsers));
  });

  // Handle new message
  socket.on('send_message', async (data) => {
    try {
      if (!socket.user) {
        throw new Error('User not authenticated');
      }

      console.log('Received message:', {
        from: socket.user._id,
        to: data.receiver,
        content: data.content
      });

      const { receiver, content } = data;
      
      // Validate receiver ID
      if (!mongoose.Types.ObjectId.isValid(receiver)) {
        throw new Error('Invalid receiver ID');
      }

      // Save message to database
      const newMessage = new Message({
        sender: socket.user._id === 'admin' ? '684aa904b94a32c714cb7540' : socket.user._id,
        receiver,
        content,
        timestamp: new Date()
      });
      await newMessage.save();

      // Populate message with user info
      const populatedMessage = await Message.findById(newMessage._id)
        .populate('sender', 'name avatar')
        .populate('receiver', 'name avatar');

      console.log('Message saved and populated:', populatedMessage);

      // Emit to both sender and receiver
      if (socket.user._id === 'admin') {
        // If sender is admin, emit to specific user room
        io.to(receiver).emit('new_message', populatedMessage);
      } else if (receiver === 'admin' || receiver === '684aa904b94a32c714cb7540') {
        // If receiver is admin, emit to admin room
        io.to('admin').emit('new_message', populatedMessage);
        // Also emit to sender's room
        io.to(socket.user._id).emit('new_message', populatedMessage);
      } else {
        // Normal user to user message
        io.to(socket.user._id).emit('new_message', populatedMessage);
        io.to(receiver).emit('new_message', populatedMessage);
      }
    } catch (error) {
      console.error('Error in send_message:', error);
      socket.emit('error', { message: error.message || 'Error sending message' });
    }
  });

  // Handle typing status
  socket.on('typing', (data) => {
    if (!socket.user) return;
    
    socket.to(data.receiver).emit('user_typing', {
      userId: socket.user._id,
      isTyping: true
    });
  });

  // Handle stop typing
  socket.on('stop_typing', (data) => {
    if (!socket.user) return;
    
    socket.to(data.receiver).emit('user_typing', {
      userId: socket.user._id,
      isTyping: false
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (socket.user && socket.user._id !== 'admin') {
      activeUsers.delete(socket.user._id);
      io.to('admin').emit('user_left', socket.user._id);
    }
    console.log('User disconnected:', {
      socketId: socket.id,
      userId: socket.user?._id
    });
  });

  socket.on('error', (error) => {
    console.error('Socket error:', {
      socketId: socket.id,
      userId: socket.user?._id,
      error: error.message
    });
  });
});

// Middleware để parse JSON và form-data, đồng thời bật CORS
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Các route hiện có
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api', messageRoutes);

// Thêm các route liên quan đến MoMo (đặt sau các router khác)
app.post('/api/momo/create', momoController.createMomoPayment);
app.get('/momo-return', momoController.handleReturnUrl);
app.post('/api/momo/notify', momoController.handleNotify);

// Route gốc kiểm tra server chạy
app.get('/', (req, res) => {
  res.send('API WORKING');
});

// Start server
httpServer.listen(port, '0.0.0.0', () => console.log(`Server Started on port ${port}`));
