// models/reviewModel.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true }, // productId
    targetType: {
      type: String,
      enum: ['product'], // only allow 'product' now
      required: true,
      default: 'product',
    },
    buyerPhone: { type: String, required: false },
    buyerName: { type: String, required: false },
    rating: { type: Number, required: true, min: 1, max: 5 },
    message: { type: String, default: '' },
  },
  { timestamps: true }
);

reviewSchema.index({ targetId: 1, targetType: 1 });

module.exports = mongoose.model('Review', reviewSchema);
