import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
        {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
            quantity: { type: Number, required: true, min: 1 },
            quantity: { type: Number, required: true, default: 1 },
            price: { type: Number, required: true },
            size: { type: String, default: 'Không có' }
        }
    ],
    totalAmount: { type: Number, default: 0 }
}, { timestamps: true });


const cartModel = mongoose.model('Cart', cartSchema);

export default cartModel;
