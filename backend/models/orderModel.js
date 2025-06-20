import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  orderItems: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      image: { type: String, required: true },
      price: { type: Number, required: true },
      product: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Product'
      },
      size: { type: String, default: 'Không có' },
      color: { type: String, default: 'Không có' },
      review: {
        _id: { type: mongoose.Schema.Types.ObjectId },
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String },
        images: [{ type: String }],
        createdAt: { type: Date, default: Date.now }
      }
    }
  ],
  shippingAddress: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
    phone: { type: String, required: true }
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['COD', 'QR_PAYMENT'],
    default: 'COD'
  },
  paymentResult: {
    id: { type: String },
    status: { type: String },
    update_time: { type: String },
    email_address: { type: String },
    qrCode: { type: String },        // QR code image URL
    qrExpiryTime: { type: Date },   // QR code expiry time
    bankName: { type: String },      // Bank name for QR payment
    accountNumber: { type: String }, // Account number for QR payment
    accountName: { type: String }    // Account holder name
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0.0
  },
  isPaid: {
    type: Boolean,
    required: true,
    default: false
  },
  isReviewed: {
    type: Boolean,
    default: false
  },
  paidAt: {
    type: Date
  },
  isDelivered: {
    type: Boolean,
    required: true,
    default: false
  },
  deliveredAt: {
    type: Date
  },
  status: {
    type: String,
    required: true,
    enum: ['Pending', 'Approved', 'Prepare', 'Delivered','Success', 'Cancelled'],
    default: 'Dending'
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  }
}, {
  timestamps: true
});

const orderModel = mongoose.model('Order', orderSchema);
export default orderModel;
