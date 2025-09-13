const mongoose = require('mongoose');
const { Schema } = mongoose;

const CartItemSchema = new Schema({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  sellerId: { type: Schema.Types.ObjectId, ref: 'Seller', required: true },
  sellerLocation: { type: String }, // Optional
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  imageUrl: { type: String },
  isBargain: { type: Boolean, default: false },   // ✅ Bargain flag
  isGroupBuy: { type: Boolean, default: false },  // ✅ Group buy flag
  bargainId: { type: Schema.Types.ObjectId, ref: 'Bargain', default: null },
  groupBuyId: { type: Schema.Types.ObjectId, ref: 'GroupBuy', default: null },
});

const CartSchema = new Schema({
  buyerPhone: { type: String, required: true, unique: true },
  items: { type: [CartItemSchema], required: true },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Cart', CartSchema);
