import jwt from 'jsonwebtoken'
import userModel from '../models/userModel.js'

// user authentication middleware
const authUser = async (req, res, next) => {
  try {
    console.log('authUser middleware called');
    console.log('Request headers:', req.headers);

    // Kiểm tra token trong nhiều vị trí
    let token = null;
    
    // 1. Kiểm tra trong Authorization header
    if (req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = authHeader;
      }
    }
    
    // 2. Kiểm tra trong token header
    if (!token && req.headers.token) {
      token = req.headers.token;
    }

    console.log('Extracted token:', token);

    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({ 
        success: false, 
        message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại" 
      });
    }

    try {
      // Verify token
      const token_decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      console.log('Decoded token:', token_decode);

      // Nếu id là 'admin', cho phép truy cập
      if (token_decode.id === 'admin') {
        req.user = { 
          userId: 'admin',
          role: 'admin',
          isAdmin: true
        };
        console.log('Admin access granted');
        return next();
      }

      // Nếu không, tìm user trong database
      const user = await userModel.findById(token_decode.id);
      console.log('Found user:', user);

      if (!user) {
        console.log('User not found in database');
        return res.status(403).json({ 
          success: false, 
          message: "Không tìm thấy người dùng" 
        });
      }

      // Set user data in request
      req.user = {
        userId: user._id,
        isAdmin: user.isAdmin,
        role: user.role
      };
      console.log('User authenticated:', req.user);
      next();
    } catch (verifyError) {
      console.log('Token verification error:', verifyError);
      if (verifyError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: "Token đã hết hạn. Vui lòng đăng nhập lại" 
        });
      }
      return res.status(401).json({ 
        success: false, 
        message: "Token không hợp lệ. Vui lòng đăng nhập lại" 
      });
    }
  } catch (error) {
    console.log('Auth middleware error:', error);
    return res.status(401).json({ 
      success: false, 
      message: "Lỗi xác thực. Vui lòng đăng nhập lại" 
    });
  }
}

export default authUser;
