import Product from '../models/productModel.js';
import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import Review from '../models/reviewModel.js';
import jwt from 'jsonwebtoken';
import cloudinary from 'cloudinary';

export const login_admin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const accesstoken = jwt.sign({ id: 'admin' }, process.env.ACCESS_TOKEN_SECRET);
            return res.json({ success: true, accesstoken });
        }

        // Tạo token với ID thực của admin
        const accesstoken = jwt.sign(
            { 
                id: admin._id,  // Sử dụng ID thực từ MongoDB
                role: admin.role 
            }, 
            process.env.ACCESS_TOKEN_SECRET
        );

        // Trả về thông tin admin và token
        return res.json({ 
            success: true, 
            accesstoken,
            user: {
                _id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                phone: admin.phone,
                address: admin.address,
                image: admin.image
            }
        });
    }
    catch (error) {
        console.log(error);
        res.status(400).json({ 
            success: false, 
            message: error.message 
        });
    }
}

export const getAllUser = async (req, res) => {
    try {
        const users = await userModel.find()

        res.json({ success: true, users })
    }
    catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
    }
}

export const addProduct = async (req, res) => {
  try {
    const { category, name, color, size, description, price, imageLink, stock } = req.body;
    const image = req.file;

    if (!category || !name || !color || !size || !description || !price || stock == null) {
      return res.json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });
    }

    const imageUrl = image ? image.path : imageLink || null;

    const newProduct = new Product({
      category,
      name,
      color,
      size,
      description,
      price,
      stock, // THÊM SỐ LƯỢNG
      image: imageUrl,
    });

    await newProduct.save();

    res.json({ success: true, newProduct });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};



export const editProduct = async (req, res) => {
  try {
    const { productId, category, name, color, size, description, price, imageLink, stock } = req.body;
    const image = req.file;

    if (!productId || !category || !name || !color || !size || !description || !price || stock == null) {
      return res.json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });
    }

    const updateData = { category, name, color, size, description, price, stock }; // THÊM stock

    if (image) {
      updateData.image = image.path;
    } else if (imageLink) {
      updateData.image = imageLink;
    }

    const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, { new: true });

    if (!updatedProduct) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
    }

    res.json({ success: true, updatedProduct });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};



export const listProduct = async (req, res) => {
    try {
        // Find products where isDeleted is explicitly false or undefined (not present)
        const products = await Product.find({
            $or: [
                { isDeleted: false },
                { isDeleted: { $exists: false } } // Matches documents where isDeleted field does not exist
            ]
        });
        res.json({ success: true, products });
    } catch (error) {
        console.error('Error listing products:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sản phẩm' });
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        const product = await Product.findByIdAndUpdate(productId, { isDeleted: true }, { new: true });

        if (!product) {
            return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
        }

        res.json({ success: true, message: "Sản phẩm đã được chuyển vào thùng rác" });
    } catch (error) {
        console.error('Error soft deleting product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        // Get total products
        const totalProducts = await Product.countDocuments();
        
        // Get total users
        const totalUsers = await userModel.countDocuments();
        
        // Get products by category
        const productsByCategory = await Product.aggregate([
            {
                $group: {
                    _id: "$category",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get latest products
        const latestProducts = await Product.find()
            .sort({ createdAt: -1 })
            .limit(5);

        // Get latest users
        const latestUsers = await userModel.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('-password'); // Exclude password field

        res.json({
            success: true,
            stats: {
                totalProducts,
                totalUsers,
                productsByCategory,
                latestProducts,
                latestUsers
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { userId, name, email, phone, address } = req.body;

        if (!userId) {
            return res.json({ success: false, message: "User ID is required" });
        }

        const updateData = {};
        if (name) updateData.name = name;
        if (email) updateData.email = email;
        if (phone) updateData.phone = phone;
        if (address) updateData.address = address;

        const updatedUser = await userModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).select('-password');

        if (!updatedUser) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({ success: true, updatedUser });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};


export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({ success: false, message: "User ID is required" });
        }

        const deletedUser = await userModel.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.json({ success: false, message: "User not found" });
        }

        res.json({ success: true, message: "User deleted successfully" });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllOrders = async (req, res) => {
    try {
        const orders = await orderModel.find()
            .populate('user', 'name email')
            .populate('orderItems.product')
            .sort({ createdAt: -1 });

        res.json({ success: true, orders });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Lấy chi tiết đơn hàng
export const getOrderDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await orderModel.findById(id)
      .populate('user', 'name email')
      .populate('orderItems.product');  // Sửa đúng

    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    res.json({ success: true, order });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Cập nhật trạng thái đơn hàng
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus } = req.body;

    const validStatuses = ['Pending', 'Approved', 'Prepare', 'Delivered', 'Success', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Trạng thái không hợp lệ. Phải là một trong: " + validStatuses.join(', ') 
      });
    }

    const order = await orderModel.findById(id).populate('orderItems.product');  // Sửa đúng
    if (!order) {
      return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
    }

    // Cập nhật trạng thái và các trường liên quan
    order.status = status;
    
    if (status === 'Delivered' || status === 'Success') {
      order.isDelivered = true;
      order.deliveredAt = Date.now();
    }

    if (status === 'Success') {
      order.isPaid = true;
      order.paidAt = Date.now();
      order.paymentStatus = 'paid';
    }

    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    if (status === 'Cancelled') {
      order.paymentStatus = 'refunded';
    }

    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    console.log(error);
    res.status(400).json({ success: false, message: error.message });
  }
};

// Lấy giỏ hàng (nếu có thao tác populate cho đơn hàng tương tự)
export const getCart = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin người dùng'
      });
    }

    const userId = req.user.userId;
    const cart = await cartModel.findOne({ userId }).populate('items.productId');
    
    // Nếu giỏ hàng dùng schema items.productId thì ok,
    // nếu muốn đồng bộ với đơn hàng, cần xem lại schema giỏ hàng của bạn.
    
    if (!cart) {
      const newCart = new cartModel({
        userId,
        items: []
      });
      await newCart.save();
      return res.json({ success: true, message: 'Giỏ hàng trống', cart: newCart });
    }

    const totalAmount = cart.items.reduce((sum, item) => {
      return sum + (item.productId.price * item.quantity);
    }, 0);

    cart.totalAmount = totalAmount;
    await cart.save();

    return res.json({ success: true, message: 'Lấy giỏ hàng thành công', cart });
  } catch (error) {
    console.error('Error in getCart:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi lấy giỏ hàng', error: error.message });
  }
};


export const getOrderStats = async (req, res) => {
    try {
        // Get total orders
        const totalOrders = await orderModel.countDocuments();
        
        // Get orders by status
        const ordersByStatus = await orderModel.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get orders by payment method
        const ordersByPaymentMethod = await orderModel.aggregate([
            {
                $group: {
                    _id: "$paymentMethod",
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get total revenue
        const totalRevenue = await orderModel.aggregate([
            {
                $match: {
                    status: 'Success'
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalPrice" }
                }
            }
        ]);

        // Get latest orders
        const latestOrders = await orderModel.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            stats: {
                totalOrders,
                ordersByStatus,
                ordersByPaymentMethod,
                totalRevenue: totalRevenue[0]?.total || 0,
                latestOrders
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getAllReviews = async (req, res) => {
    try {
        const reviews = await Review.find()
            .populate('user', 'name email')
            .populate('product', 'name image')
            .populate('order', 'orderNumber')
            .sort({ createdAt: -1 });

        res.json({ success: true, reviews });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getReviewDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const review = await Review.findById(id)
            .populate('user', 'name email')
            .populate('product', 'name image')
            .populate('order', 'orderNumber');

        if (!review) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đánh giá" });
        }

        res.json({ success: true, review });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.body;

        if (!reviewId) {
            return res.json({ success: false, message: "ID đánh giá là bắt buộc" });
        }

        const deletedReview = await Review.findByIdAndDelete(reviewId);

        if (!deletedReview) {
            return res.json({ success: false, message: "Không tìm thấy đánh giá" });
        }

        res.json({ success: true, message: "Xóa đánh giá thành công" });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        const reviews = await Review.find({ product: productId })
            .populate('user', 'name email')
            .populate('order', 'orderNumber')
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            reviews 
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi lấy đánh giá sản phẩm' 
        });
    }
};

export const getOrderReviews = async (req, res) => {
    try {
        const { orderId } = req.params;

        const reviews = await Review.find({ order: orderId })
            .populate('user', 'name email')
            .populate('product', 'name image')
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            reviews 
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi lấy đánh giá đơn hàng' 
        });
    }
};

export const getUserReviews = async (req, res) => {
    try {
        const { userId } = req.params;

        const reviews = await Review.find({ user: userId })
            .populate('product', 'name image')
            .populate('order', 'orderNumber')
            .sort({ createdAt: -1 });

        res.json({ 
            success: true, 
            reviews 
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi lấy đánh giá của người dùng' 
        });
    }
};

export const getReviewStats = async (req, res) => {
    try {
        // Tổng số đánh giá
        const totalReviews = await Review.countDocuments();
        
        // Đánh giá theo rating
        const reviewsByRating = await Review.aggregate([
            {
                $group: {
                    _id: "$rating",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Đánh giá theo sản phẩm
        const reviewsByProduct = await Review.aggregate([
            {
                $group: {
                    _id: "$product",
                    count: { $sum: 1 },
                    averageRating: { $avg: "$rating" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "productDetails"
                }
            },
            {
                $unwind: "$productDetails"
            },
            {
                $project: {
                    productName: "$productDetails.name",
                    count: 1,
                    averageRating: 1
                }
            }
        ]);

        // Đánh giá mới nhất
        const latestReviews = await Review.find()
            .populate('user', 'name')
            .populate('product', 'name')
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({
            success: true,
            stats: {
                totalReviews,
                reviewsByRating,
                reviewsByProduct,
                latestReviews
            }
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi lấy thống kê đánh giá' 
        });
    }
};

// Admin functions for deleted products (Trash Bin)
export const listDeletedProducts = async (req, res) => {
    try {
        const deletedProducts = await Product.find({ isDeleted: true });
        res.json({ success: true, products: deletedProducts });
    } catch (error) {
        console.error('Error listing deleted products:', error);
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách sản phẩm đã xóa' });
    }
};

export const restoreProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        const product = await Product.findByIdAndUpdate(productId, { isDeleted: false }, { new: true });

        if (!product) {
            return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
        }

        res.json({ success: true, message: "Sản phẩm đã được khôi phục thành công" });
    } catch (error) {
        console.error('Error restoring product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const hardDeleteProduct = async (req, res) => {
    try {
        const { productId } = req.body;
        const product = await Product.findByIdAndDelete(productId);

        if (!product) {
            return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm" });
        }

        res.json({ success: true, message: "Sản phẩm đã được xóa vĩnh viễn" });
    } catch (error) {
        console.error('Error hard deleting product:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const authAdmin = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại" 
            });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại" 
            });
        }

        // Verify token
        const token_decode = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log('Decoded token:', token_decode);

        // Nếu id là 'admin', cho phép truy cập
        if (token_decode.id === 'admin') {
            req.user = { _id: 'admin', role: 'admin' };
            return next();
        }

        // Nếu không, tìm user trong database
        const user = await userModel.findById(token_decode.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                message: "Không có quyền truy cập" 
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.log('Auth middleware error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                message: "Token đã hết hạn. Vui lòng đăng nhập lại" 
            });
        }
        return res.status(401).json({ 
            success: false, 
            message: "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại" 
        });
    }
};

export default authAdmin;