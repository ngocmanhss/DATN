import express from 'express';
import {
    login_admin, 
    addProduct, 
    editProduct, 
    getAllUser, 
    listProduct, 
    deleteProduct, 
    getDashboardStats, 
    updateUser, 
    deleteUser,
    getAllOrders,
    getOrderDetails,
    updateOrderStatus,
    getOrderStats,
    getAllReviews,
    getReviewDetails,
    deleteReview,
    getReviewStats,
    getProductReviews,
    getOrderReviews,
    getUserReviews,
    listDeletedProducts,
    restoreProduct,
    hardDeleteProduct
} from '../controllers/adminController.js';

import authAdmin from '../middlewares/authAdmin.js';
import upload from '../middleware/upload.js';

const adminRouter = express.Router();

// Public routes
adminRouter.post('/login', login_admin);

// Protected routes
adminRouter.get('/dashboard', authAdmin, getDashboardStats);
adminRouter.post('/add', authAdmin, upload.single('image'), addProduct);
adminRouter.post('/edit', authAdmin, upload.single('image'), editProduct); 
adminRouter.post('/delete', authAdmin, deleteProduct);
adminRouter.get('/list', authAdmin, listProduct);
adminRouter.get('/getuser', authAdmin, getAllUser);
adminRouter.post('/update-user', authAdmin, updateUser);
adminRouter.post('/delete-user', authAdmin, deleteUser);

// Order management routes
adminRouter.get('/orders', authAdmin, getAllOrders);
adminRouter.get('/order/:id', authAdmin, getOrderDetails);
adminRouter.put('/order/:id/status', authAdmin, updateOrderStatus);
adminRouter.get('/order-stats', authAdmin, getOrderStats);

// Review Management Routes
adminRouter.get('/reviews', authAdmin, getAllReviews);
adminRouter.get('/reviews/:id', authAdmin, getReviewDetails);
adminRouter.delete('/reviews', authAdmin, deleteReview);
adminRouter.get('/review-stats', authAdmin, getReviewStats);
adminRouter.get('/product-reviews/:productId', authAdmin, getProductReviews);
adminRouter.get('/order-reviews/:orderId', authAdmin, getOrderReviews);
adminRouter.get('/user-reviews/:userId', authAdmin, getUserReviews);

// Routes for Deleted Products (Trash Bin)
adminRouter.get('/deleted-products', authAdmin, listDeletedProducts);
adminRouter.post('/restore-product', authAdmin, restoreProduct);
adminRouter.post('/hard-delete-product', authAdmin, hardDeleteProduct);

export default adminRouter;