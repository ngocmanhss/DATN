import validator from 'validator'
import bcrypt from 'bcrypt'
import userModel from '../models/userModel.js'
import productModel from '../models/productModel.js'
import cartModel from '../models/cartModel.js'
import orderModel from '../models/orderModel.js'
import jwt from 'jsonwebtoken'
import { v2 as cloudinary } from 'cloudinary';
import Review from '../models/reviewModel.js';
import Product from '../models/productModel.js';
import { sendPushNotification } from '../untils/sendNotification.js';

export const getProductDetail = async (req, res) => {
  try {
    const productId = req.params.productId;

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, product });
  } catch (error) {
    console.error('Error getting product detail:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const registerUser = async (req, res) => {
    try {
        const { username, email, phone, password_1, password_2 } = req.body


        if (!username || !email || !phone || !password_1 || !password_2 ) {
            return res.json({ success: false, message: 'Please Fill In All Information' })
        }

        if (!validator.isEmail(email)) {
            return res.status(400).json({ success: false, message: "Please Enter Valid Email" })
        }

        const isUser = await userModel.findOne({ email })

        if (isUser) {
            return res.json({ success: false, message: 'This email already exists' })
        }
        const isUsername = await userModel.findOne({ username })
        if (isUsername) {
            return res.json({ success: false, message: 'Username already exists' })
        }

        const isPhone = await userModel.findOne({ phone })
        if (isPhone) {
            return res.json({ success: false, message: 'This phone number already exists' })
        }

        if (phone.length !== 10) {
            return res.json({ success: false, message: 'Please Enter Valid Phone Number ' })
        }

        if (password_1.length < 3) {
            return res.json({ success: false, message: 'Password Not Strong Enough' })
        }

        if (password_1 !== password_2) {
            return res.json({ success: false, message: 'Passwords Are Not The Same' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password_1, salt)

        const userData = {
            name: username,
            username,
            email,
            phone,
            password: hashedPassword,
        }

        const newUser = new userModel(userData)
        await newUser.save()

        res.json({ success: true })

    } catch (error) {
        console.log(error)
        res.status(400).json({ success: false, message: error.message })
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Kiểm tra email và password
        if (!email || !password) {
            return res.json({ success: false, message: "Vui lòng nhập đầy đủ thông tin" });
        }

        // Tìm user theo email
        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "Email không tồn tại" });
        }

        // Kiểm tra password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.json({ success: false, message: "Mật khẩu không đúng" });
        }

        // Tạo token
        if (!process.env.ACCESS_TOKEN_SECRET) {
            console.error('ACCESS_TOKEN_SECRET is not defined');
            return res.status(500).json({ 
                success: false, 
                message: "Lỗi server: ACCESS_TOKEN_SECRET không được định nghĩa" 
            });
        }

        const accesstoken = jwt.sign(
            { id: user._id }, 
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '7d' }
        );

        // Trả về thông tin user và token
        res.json({
            success: true,
            accesstoken,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address,
                image: user.image
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: "Lỗi server: " + error.message 
        });
    }
};

// api get user
export const getUser = async (req, res) => {
    try {
        console.log('Getting user with req.user:', req.user);
        
        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }

        const user = await userModel.findById(req.user.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng'
            });
        }

        res.json({ 
            success: true, 
            user 
        });
    }
    catch (error) {
        console.log('Error in getUser:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message 
        });
    }
}

// api update profile
export const updateProfile = async (req, res) => {
    try {
        const { userId, name, phone, address } = req.body;
        const image = req.file;

        console.log(userId);
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (name) {
            await userModel.findByIdAndUpdate(userId, { name });
        }

        if (phone) {
            await userModel.findByIdAndUpdate(userId, { phone });
        }
        if (address) {
            await userModel.findByIdAndUpdate(userId, { address });
        }
        if (image) {
            // Upload image to Cloudinary
            const imageUpload = await cloudinary.uploader.upload(image.path, { resource_type: "image" });
            const imageUrl = imageUpload.secure_url;

            await userModel.findByIdAndUpdate(userId, { image: imageUrl });
        }

        res.json({ success: true, message: "Profile updated" });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

export const listProduct = async (req, res) => {
    try {
        // Chỉ lấy sản phẩm chưa bị xóa mềm
        const products = await productModel.find({
            $or: [
                { isDeleted: false },
                { isDeleted: { $exists: false } }
            ]
        });
        res.json({ success: true, products });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};


// Add item to cart
export const addToCart = async (req, res) => {
    try {
        console.log('Add to cart request:', {
            body: req.body,
            user: req.user,
            headers: req.headers
        });

        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: 'Người dùng chưa đăng nhập'
            });
        }

        const { productId, quantity, size } = req.body;
        if (!productId || !quantity || !size) {
            return res.status(400).json({
                success: false,
                message: 'Thiếu thông tin sản phẩm, số lượng hoặc size'
            });
        }

        // Tìm sản phẩm để lấy giá
        const product = await productModel.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy sản phẩm'
            });
        }
        if (product.isDeleted) {
            return res.status(400).json({
                success: false,
                message: 'Sản phẩm đã ngưng kinh doanh'
            });
        }
        // Kiểm tra tồn kho trước khi thêm vào giỏ hàng
        if (quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Số lượng vượt quá tồn kho! Hiện chỉ còn ${product.stock} sản phẩm.`
            });
        }

        // Tìm giỏ hàng của user
        let cart = await cartModel.findOne({ userId: req.user.userId });
        
        if (!cart) {
            // Tạo giỏ hàng mới nếu chưa có
            cart = new cartModel({
                userId: req.user.userId,
                items: [{
                    productId: productId,
                    quantity: quantity,
                    price: product.price,
                    size: size
                }],
                totalAmount: product.price * quantity
            });
        } else {
            // Kiểm tra xem sản phẩm đã có trong giỏ hàng chưa (so sánh cả productId và size)
            const existingItem = cart.items.find(item => 
                item.productId.toString() === productId && item.size === size
            );

            if (existingItem) {
                // Cập nhật số lượng nếu sản phẩm đã tồn tại
                existingItem.quantity += quantity;
                existingItem.price = product.price;
            } else {
                // Thêm sản phẩm mới vào giỏ hàng
                cart.items.push({
                    productId: productId,
                    quantity: quantity,
                    price: product.price,
                    size: size
                });
            }

            // Tính lại tổng tiền
            cart.totalAmount = cart.items.reduce((total, item) => {
                return total + (item.price * item.quantity);
            }, 0);
        }

        await cart.save();

        res.json({
            success: true,
            message: 'Thêm vào giỏ hàng thành công',
            cart
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi thêm vào giỏ hàng',
            error: error.message
        });
    }
};

// Edit item in cart (update quantity)
export const editCart = async (req, res) => {
    try {
        const { productId, quantity, size } = req.body;
        const { userId } = req.user;

        // Bắt buộc phải truyền đủ productId, quantity, size
        if (!productId || typeof quantity === 'undefined' || !size) {
            return res.json({ success: false, message: 'Thiếu thông tin sản phẩm, số lượng hoặc size' });
        }

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.json({ success: false, message: 'Không tìm thấy giỏ hàng' });
        }

        // So sánh theo cả productId và size
        const index = cart.items.findIndex(item =>
            String(item.productId) === String(productId) &&
            String(item.size) === String(size)
        );

        if (index > -1) {
            if (Number(quantity) === 0) {
                cart.items.splice(index, 1);
                await cart.save();
                return res.json({
                    success: true,
                    message: 'Đã xóa sản phẩm khỏi giỏ hàng',
                    cart,
                    removed: true
                });
            } else {
                cart.items[index].quantity = Number(quantity);
                await cart.save();
                return res.json({
                    success: true,
                    message: 'Đã cập nhật giỏ hàng thành công',
                    cart,
                    updatedItem: cart.items[index]
                });
            }
        } else {
            return res.json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' });
        }
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


// Remove item from cart
export const removeFromCart = async (req, res) => {
    try {
        const { productId, size } = req.body;
        const { userId } = req.user;

        // Bắt buộc phải truyền đủ productId và size
        if (!productId || !size) {
            return res.json({ success: false, message: 'Thiếu ID sản phẩm hoặc size' });
        }

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.json({ success: false, message: 'Không tìm thấy giỏ hàng' });
        }

        // Log chi tiết các item trong cart
        console.log('Yêu cầu xóa:', { productId, size });
        cart.items.forEach(item => {
            console.log('So sánh với:', {
                productId: String(item.productId),
                size: String(item.size)
            });
        });

        const index = cart.items.findIndex(item =>
            String(item.productId) === String(productId) &&
            String(item.size) === String(size)
        );

        if (index > -1) {
            cart.items.splice(index, 1);
            await cart.save();
            return res.json({ success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng', cart });
        } else {
            return res.json({ success: false, message: 'Không tìm thấy sản phẩm trong giỏ hàng' });
        }
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};


// Clear all items in cart
export const clearCart = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.json({ success: false, message: 'User ID is required' });
        }

        let cart = await cartModel.findOne({ userId });

        if (!cart) {
            return res.json({ success: false, message: 'Cart not found' });
        }

        // Xóa toàn bộ giỏ hàng của người dùng
        cart.items = [];
        await cart.save();

        res.json({ success: true, message: 'Cart cleared', cart });

    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Get cart items
export const getCart = async (req, res) => {
    try {
        console.log('Request user:', req.user);

        if (!req.user || !req.user.userId) {
            return res.status(401).json({
                success: false,
                message: 'Không tìm thấy thông tin người dùng'
            });
        }

        const userId = req.user.userId;
        console.log('Getting cart for user:', userId);

        const cart = await cartModel.findOne({ userId }).populate('items.productId');
        console.log('Found cart:', cart);

        if (!cart) {
            // Nếu không tìm thấy giỏ hàng, tạo giỏ hàng mới
            const newCart = new cartModel({
                userId,
                items: []
            });
            await newCart.save();
            return res.json({ 
                success: true, 
                message: 'Giỏ hàng trống',
                cart: newCart 
            });
        }

        // Tính tổng tiền
        const totalAmount = cart.items.reduce((sum, item) => {
            return sum + (item.productId.price * item.quantity);
        }, 0);

        // Cập nhật tổng tiền vào giỏ hàng
        cart.totalAmount = totalAmount;
        await cart.save();

        return res.json({ 
            success: true, 
            message: 'Lấy giỏ hàng thành công',
            cart 
        });
    } catch (error) {
        console.error('Error in getCart:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy giỏ hàng',
            error: error.message 
        });
    }
};

// Checkout (Create order)
export const checkout = async (req, res) => {
    try {
        console.log('----- Checkout start -----');
        console.log('User ID:', req.user.userId);
        console.log('Request body:', req.body);

        const { paymentMethod, address, phone } = req.body;
        const userId = req.user.userId;

        const cart = await cartModel.findOne({ userId }).populate('items.productId');
        console.log('Cart found:', cart);

        if (!cart || cart.items.length === 0) {
            console.log('Giỏ hàng trống');
            return res.status(400).json({ 
                success: false, 
                message: 'Giỏ hàng trống' 
            });
        }

        const totalAmount = cart.items.reduce((sum, item) => {
            return sum + (item.productId.price * item.quantity);
        }, 0);
        console.log('Total amount:', totalAmount);

        const order = new orderModel({
            userId,
            items: cart.items.map(item => ({
                productId: item.productId._id,
                quantity: item.quantity,
                price: item.productId.price
            })),
            totalAmount,
            paymentMethod,
            address,
            phone,
            note: req.body.note || '',
            status: 'Pending'
        });

        await order.save();
        console.log('Order saved:', order);

        for (const item of cart.items) {
            try {
                console.log(`Before update: Product ${item.productId.name} has stock ${item.productId.stock}, quantity to reduce: ${item.quantity}`);
                if (item.productId.stock < item.quantity) {
                    console.log(`Not enough stock for product ${item.productId.name}`);
                    return res.status(400).json({
                        success: false,
                        message: `Sản phẩm ${item.productId.name} không đủ tồn kho`
                    });
                }
                const updatedProduct = await productModel.findByIdAndUpdate(
                    item.productId._id,
                    { $inc: { stock: -item.quantity } },
                    { new: true }
                );
                console.log(`After update: Product ${updatedProduct.name} new stock: ${updatedProduct.stock}`);
            } catch (err) {
                console.error(`Error updating stock for product ${item.productId._id}:`, err);
                return res.status(500).json({
                    success: false,
                    message: 'Lỗi khi cập nhật tồn kho sản phẩm',
                    error: err.message
                });
            }
        }

        await cartModel.findOneAndDelete({ userId });
        console.log('Cart deleted');

        return res.status(200).json({
            success: true,
            message: 'Đặt hàng thành công',
            order
        });

    } catch (error) {
        console.error('Error in checkout:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi khi đặt hàng',
            error: error.message
        });
    }
};







// Tạo đơn hàng mới
export const createorder = async (req, res) => {
    try {
        console.log('--- createOrder called ---');
        console.log('req.user:', req.user);

        const userId = req.user?.userId;
        console.log('userId:', userId);

        const {
            items,
            shippingAddress,
            paymentMethod,
            note,
            totalAmount
        } = req.body;

        console.log('Request body:', req.body);

        if (!userId) {
            console.log('No userId found in request');
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: userId not found'
            });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng thêm sản phẩm vào đơn hàng' 
            });
        }

        if (!shippingAddress || !shippingAddress.address || !shippingAddress.phone) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ thông tin giao hàng' 
            });
        }

        if (!paymentMethod) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng chọn phương thức thanh toán' 
            });
        }

        // Kiểm tra tồn kho đủ cho tất cả sản phẩm trước khi tạo đơn
        for (const item of items) {
            const product = await productModel.findById(item.product);
            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: `Sản phẩm với ID ${item.product} không tồn tại`
                });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Sản phẩm ${product.name} không đủ tồn kho`
                });
            }
        }

        // Trừ tồn kho cho từng sản phẩm
        for (const item of items) {
            await productModel.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity }
            });
            console.log(`Stock reduced for product ${item.product} by ${item.quantity}`);
        }

        // Chuẩn bị orderItems
        const orderItems = await Promise.all(items.map(async (item) => {
            const product = await productModel.findById(item.product);
            return {
                name: product.name,
                quantity: item.quantity,
                image: product.image,
                price: item.price,
                product: item.product,
                size: item.size || 'Không có',
                color: product.color || ''
            };
        }));

        // Tạo đơn hàng mới
        const order = new orderModel({
            user: userId,
            orderItems,
            shippingAddress,
            paymentMethod,
            note: note || '',
            totalPrice: totalAmount,
            status: 'Pending'
        });

        await order.save();
        console.log('Order saved:', order);

        // Xóa giỏ hàng sau khi đặt hàng thành công
        await cartModel.findOneAndUpdate(
            { userId },
            { $set: { items: [], totalAmount: 0 } }
        );
        console.log('Cart cleared for user:', userId);

        res.status(201).json({
            success: true,
            message: 'Đặt hàng thành công',
            order
        });

    } catch (error) {
        console.error('Error in createOrder:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi tạo đơn hàng',
            error: error.message
        });
    }
};



// Get user's orders
export const getUserOrders = async (req, res) => {
    try {
        console.log('Getting orders for user:', req.user);
        const userId = req.user.userId;

        // Lấy danh sách đơn hàng và populate thông tin sản phẩm
        const orders = await orderModel.find({ user: userId })
            .populate('orderItems.product')
            .sort({ createdAt: -1 });

        // Iterate through orders and orderItems to ensure review._id is present for existing reviews
        for (const order of orders) {
            for (const orderItem of order.orderItems) {
                // Check if orderItem has a review and if that review is missing its _id
                if (orderItem.review && !orderItem.review._id) {
                    // Try to find the actual Review document in the Review collection
                    const reviewDoc = await Review.findOne({
                        order: order._id,
                        product: orderItem.product._id,
                        user: userId
                    });

                    if (reviewDoc) {
                        // If found, assign its _id to the embedded review
                        orderItem.review._id = reviewDoc._id;
                    }
                }
            }
        }

        console.log('Found orders:', orders);

        return res.status(200).json({
            success: true,
            message: "Lấy danh sách đơn hàng thành công",
            orders
        });
    } catch (error) {
        console.error("Error in getUserOrders:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi khi lấy danh sách đơn hàng",
            error: error.message
        });
    }
};

// Cancel order
export const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId;

        console.log('Cancelling order:', { orderId, userId });

        // Tìm đơn hàng trước khi cập nhật
        const order = await orderModel.findOne({ _id: orderId, user: userId });
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy đơn hàng'
            });
        }

        // Kiểm tra trạng thái trước khi cập nhật
        if (order.status === 'Cancelled') {
            return res.status(400).json({
                success: false,
                message: 'Đơn hàng đã được hủy trước đó'
            });
        }

        if (order.status === 'Successful') {
            return res.status(400).json({
                success: false,
                message: 'Không thể hủy đơn hàng đã hoàn thành'
            });
        }

        // Cập nhật trạng thái đơn hàng
        const updatedOrder = await orderModel.findOneAndUpdate(
            { _id: orderId, user: userId },
            { $set: { status: 'Cancelled' } },
            { new: true, runValidators: false }
        );

        res.json({
            success: true,
            message: 'Hủy đơn hàng thành công',
            order: updatedOrder
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi hủy đơn hàng',
            error: error.message
        });
    }
};

// Get order details
export const getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.userId;

        // Tìm đơn hàng theo id và kiểm tra quyền sở hữu
        const order = await orderModel.findOne({ _id: orderId, user: userId })
            .populate('items.productId');

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng' 
            });
        }

        res.json({ 
            success: true, 
            message: 'Lấy thông tin đơn hàng thành công',
            order 
        });

    } catch (error) {
        console.error('Error in getOrderDetails:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Lỗi khi lấy thông tin đơn hàng',
            error: error.message 
        });
    }
};

// Update order status (for admin)
export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        const order = await orderModel.findById(orderId).populate('user');
        if (!order) {
            return res.status(404).json({ success: false, message: "Không tìm thấy đơn hàng" });
        }

        order.status = status;
        await order.save();

        let message = '';
        switch (status) {
            case 'Approved':
                message = 'Đơn hàng của bạn đã được xác nhận';
                break;
            case 'Prepare':
                message = 'Đơn hàng của bạn đang được chuẩn bị';
                break;
            case 'Delivered':
                message = 'Đơn hàng của bạn đang được giao';
                break;
            case 'Success':
                message = 'Đơn hàng của bạn đã hoàn thành';
                break;
            case 'Cancelled':
                message = 'Đơn hàng của bạn đã bị hủy';
                break;
            default:
                message = 'Trạng thái đơn hàng của bạn đã được cập nhật';
        }

        res.json({ success: true, order, message });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};

// Thêm đánh giá sản phẩm
export const addProductReview = async (req, res) => {
    try {
        const { orderId, productId, rating, comment } = req.body;
        const userId = req.user.userId;

        if (!orderId || !productId || !rating) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ thông tin đánh giá' 
            });
        }

        // Kiểm tra rating hợp lệ
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'Đánh giá phải từ 1 đến 5 sao' 
            });
        }

        // Kiểm tra đơn hàng
        const order = await orderModel.findOne({
            _id: orderId,
            user: userId,
            status: 'Success'
        });

        if (!order) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đơn hàng hoặc đơn hàng chưa hoàn thành' 
            });
        }

        // Kiểm tra xem sản phẩm có trong đơn hàng không
        const orderItem = order.orderItems.find(
            item => item.product.toString() === productId
        );

        if (!orderItem) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy sản phẩm trong đơn hàng' 
            });
        }

        // Kiểm tra xem đã đánh giá chưa
        if (orderItem.review && orderItem.review.rating) {
            return res.status(400).json({ 
                success: false, 
                message: 'Bạn đã đánh giá sản phẩm này' 
            });
        }

        // Tạo đánh giá mới
        const review = new Review({
            user: userId,
            product: productId,
            order: orderId,
            rating,
            comment
        });

        await review.save();

        // Cập nhật đánh giá vào orderItem
        orderItem.review = {
            rating,
            comment,
            createdAt: new Date(),
            _id: review._id
        };

        await order.save();

        // Cập nhật đánh giá trung bình của sản phẩm
        const product = await productModel.findById(productId);
        if (product) {
            const reviews = await Review.find({ product: productId });
            const totalRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
            product.averageRating = totalRatings / reviews.length;
            await product.save();
        }

        res.json({ 
            success: true, 
            message: 'Đánh giá thành công',
            review 
        });
    } catch (error) {
        console.error('Error in addProductReview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi thêm đánh giá',
            error: error.message 
        });
    }
};

// Lấy đánh giá của sản phẩm
export const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;

        // Thay vì tìm kiếm trong orderItems, tìm kiếm trực tiếp trong collection Review
        const reviews = await Review.find({ product: productId })
            .populate('user', 'name image') // Populate name và image của user
            .sort({ createdAt: -1 }); // Sắp xếp theo thời gian tạo mới nhất

        res.json({ success: true, reviews });
    } catch (error) {
        console.error('Error in getProductReviews:', error);
        res.status(400).json({ success: false, message: 'Có lỗi xảy ra khi lấy đánh giá sản phẩm' });
    }
};

// Cập nhật đánh giá
export const updateProductReview = async (req, res) => {
    try {
        const { orderId, productId, rating, comment, reviewId } = req.body;
        const userId = req.user.userId;

        console.log('Received updateProductReview request:');
        console.log('  userId:', userId);
        console.log('  reviewId:', reviewId);
        console.log('  orderId:', orderId);
        console.log('  productId:', productId);
        console.log('  rating:', rating);
        console.log('  comment:', comment);

        if (!reviewId || !orderId || !productId || !rating) {
            return res.status(400).json({ 
                success: false, 
                message: 'Vui lòng cung cấp đầy đủ thông tin đánh giá và ID đánh giá' 
            });
        }

        // Kiểm tra rating hợp lệ
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                message: 'Đánh giá phải từ 1 đến 5 sao' 
            });
        }

        // Tìm và cập nhật đánh giá trong collection Review
        const reviewToUpdate = await Review.findOne({
            _id: reviewId,
            user: userId,
            product: productId,
            order: orderId
        });

        if (!reviewToUpdate) {
            return res.status(404).json({ 
                success: false, 
                message: 'Không tìm thấy đánh giá để cập nhật' 
            });
        }

        reviewToUpdate.rating = rating;
        reviewToUpdate.comment = comment;
        reviewToUpdate.updatedAt = new Date();
        await reviewToUpdate.save();

        // Cập nhật đánh giá nhúng trong orderItem (nếu cần)
        const order = await orderModel.findById(orderId);
        if (order) {
            const orderItem = order.orderItems.find(
                item => item.product.toString() === productId
            );

            if (orderItem && orderItem.review) {
                orderItem.review.rating = rating;
                orderItem.review.comment = comment;
                orderItem.review.updatedAt = new Date();
                await order.save();
            }
        }

        // Cập nhật đánh giá trung bình của sản phẩm
        const product = await productModel.findById(productId);
        if (product) {
            const reviews = await Review.find({ product: productId });
            const totalRatings = reviews.reduce((sum, review) => sum + review.rating, 0);
            product.averageRating = reviews.length > 0 ? totalRatings / reviews.length : 0;
            await product.save();
        }

        res.json({ 
            success: true, 
            message: 'Cập nhật đánh giá thành công',
            review: reviewToUpdate
        });
    } catch (error) {
        console.error('Error in updateProductReview:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Có lỗi xảy ra khi cập nhật đánh giá',
            error: error.message 
        });
    }
};

export const submitReview = async (req, res) => {
  try {
    const { orderId, rating, comment, products } = req.body;
    const userId = req.user.userId;

    // Kiểm tra đơn hàng
    const order = await orderModel.findOne({
      _id: orderId,
      user: userId,
      status: 'Success'
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng hoặc đơn hàng chưa hoàn thành'
      });
    }

    // Kiểm tra xem đã đánh giá chưa
    const existingReview = await Review.findOne({ order: orderId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã đánh giá đơn hàng này rồi'
      });
    }

    // Tạo đánh giá cho từng sản phẩm
    const reviewPromises = products.map(product => {
      const review = new Review({
        user: userId,
        order: orderId,
        product: product.productId,
        rating: product.rating,
        comment: product.comment
      });
      return review.save();
    });

    await Promise.all(reviewPromises);

    // Cập nhật trạng thái đã đánh giá cho đơn hàng
    order.isReviewed = true;
    await order.save();

    res.json({
      success: true,
      message: 'Cảm ơn bạn đã đánh giá!'
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể gửi đánh giá'
    });
  }
};

// Lấy đánh giá của người dùng
export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log('Getting reviews for user:', userId);

    const reviews = await Review.find({ user: userId })
      .populate('product', 'name image price')
      .populate('order', 'orderNumber')
      .sort({ createdAt: -1 });

    console.log('Found reviews:', reviews);

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    console.error('Error in getUserReviews:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy danh sách đánh giá'
    });
  }
};

// Xóa đánh giá
export const deleteReview = async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.userId;

    console.log('Deleting review:', { reviewId, userId });

    const review = await Review.findOne({ _id: reviewId, user: userId });
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đánh giá'
      });
    }

    await Review.findByIdAndDelete(reviewId);

    res.json({
      success: true,
      message: 'Xóa đánh giá thành công'
    });
  } catch (error) {
    console.error('Error in deleteReview:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi xóa đánh giá'
    });
  }
};

export const getCategories = async (req, res) => {
    try {
        const categories = await productModel.distinct('category');
        res.json({ 
            success: true, 
            categories: categories.map(category => ({
                id: category.toLowerCase().replace(/\s+/g, '-'),
                name: category,
                keywords: [category.toLowerCase()]
            }))
        });
    } catch (error) {
        console.log(error);
        res.status(400).json({ success: false, message: error.message });
    }
};
