import express from 'express'
import multer from 'multer'

import authUser from '../middlewares/authUser.js'
import {
    login, 
    registerUser, 
    getUser, 
    updateProfile, 
    listProduct,
    addToCart,
    removeFromCart,
    getCart,
    editCart,
    createorder,
    getUserOrders,
    cancelOrder,
    getOrderDetails,
    updateOrderStatus,
    addProductReview,
    getProductReviews,
    updateProductReview,
    checkout,
    submitReview,
    getUserReviews,
    getProductDetail ,
    deleteReview,
    getCategories
} from '../controllers/userController.js'

const userRouter = express.Router()

const upload = multer({ dest: 'uploads/' });

// api login + register
userRouter.post('/register', registerUser)
userRouter.post('/login', login)

// api info user
userRouter.get('/get-user', authUser, getUser)
userRouter.put('/update-profile', authUser, upload.single('image'), updateProfile);

// api products
userRouter.get('/products', authUser, listProduct)
userRouter.get('/categories', authUser, getCategories)

// api cart
userRouter.post('/add_cart', authUser, addToCart)
userRouter.delete('/remove_cart', authUser, removeFromCart)
userRouter.put('/edit_cart', authUser, editCart)
userRouter.get('/cart', authUser, getCart)

// api orders
userRouter.post('/checkout', authUser, checkout)
userRouter.post('/createorders', authUser, createorder)
userRouter.get('/get-orders', authUser, getUserOrders)
userRouter.get('/orders/:orderId', authUser, getOrderDetails)
userRouter.post('/cancel-order/:orderId', authUser, cancelOrder)
userRouter.put('/orders/:orderId/status', authUser, updateOrderStatus)
// api product detail
userRouter.get('/products/:productId', authUser, getProductDetail);


// api reviews
userRouter.post('/reviews', authUser, upload.array('images', 5), addProductReview)
userRouter.get('/products/:productId/reviews', getProductReviews)
userRouter.put('/reviews', authUser, upload.array('images', 5), updateProductReview)

// Review routes
userRouter.get('/reviews', authUser, getUserReviews);
userRouter.delete('/reviews/:reviewId', authUser, deleteReview);
userRouter.post('/review', authUser, submitReview);

export default userRouter