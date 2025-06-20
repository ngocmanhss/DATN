import mongoose from 'mongoose';
import User from '../models/userModel.js';
import 'dotenv/config';

const createAdmin = async () => {
  try {
    // Kết nối database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ isAdmin: true });
    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      return;
    }

    // Tạo tài khoản admin mới
    const admin = new User({
      name: 'Admin',
      email: 'admin@example.com',
      password: 'admin123', // Trong thực tế nên mã hóa password
      role: 'admin',
      isAdmin: true
    });

    await admin.save();
    console.log('Admin created successfully:', admin.email);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin(); 