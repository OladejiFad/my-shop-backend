// models/orderModel.js

const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true },
    buyerPhone: { type: String, required: true },
    buyerName: { type: String, required: true },
    buyerLocation: { type: String, required: true },

    deliveryStatus: {
      type: String,
      enum: ['Processing', 'Out for Delivery', 'Delivered', 'Cancelled'],
      default: 'Processing',
    },
    satisfactionStatus: {
      type: String,
      enum: ['Unrated', 'Satisfied ❤', 'I Like It 💛', 'Refund'],
      default: 'Unrated',
    },
    paymentStatus: {
      type: String,
      enum: ['with Trady', 'success', 'refund', 'Pending'],
      default: 'with Trady',
    },
    orderStatus: {
      type: String,
      enum: ['Processing', 'Success', 'Failed'],
      default: 'Processing',
    },

    products: [
      {
        productId: { type: String, required: true },
        productName: { type: String, required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        isBargain: { type: Boolean, default: false },
        isGroupBuy: { type: Boolean, default: false },
        sellerId: { type: String, required: true },
      },
    ],
  },
  { timestamps: true }
);

orderSchema.index({ buyerPhone: 1 });

module.exports = mongoose.model('Order', orderSchema);
