const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  images: [{ type: String }], // URLs or file paths
  stock: { type: Number, required: true, default: 0 },
  ratingsAverage: { type: Number, default: 0 },
  ratingsQuantity: { type: Number, default: 0 },
  sold: { type: Number, default: 0 },
  isBargainable: { type: Boolean, default: false },

  // Market Day section (optional)
  marketSection: {
    type: String,
    enum: ['used', 'general', null],
    default: null,
  },

  discount: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },

  // Updated to support multiple sizes and colors
  sizes: {
    type: [String],
    default: [],
  },
  colors: {
    type: [String],
    default: [],
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual to expose the first image as `imageUrl`
productSchema.virtual('imageUrl').get(function () {
  return this.images && this.images.length > 0 ? this.images[0] : null;
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
