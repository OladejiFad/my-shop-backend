const mongoose = require('mongoose');

const bargainSchema = new mongoose.Schema({
  buyerName: { type: String, required: true },
  buyerPhone: { type: String, required: true },
  note: { type: String, required: true },
  sellerNote: { type: String },

  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  buyerOffers: [
    {
      items: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
          productName: { type: String },
          productImage: { type: String },
          quantity: { type: Number, default: 1, min: 1 },
        }
      ],
      totalOfferedPrice: { type: Number, required: true, min: 0 },
      time: { type: Date, default: Date.now }
    }
  ],

  sellerOffers: [
    {
      items: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
          productName: { type: String },
          productImage: { type: String },
          quantity: { type: Number, default: 1, min: 1 },
        }
      ],
      totalCounterPrice: { type: Number, required: true, min: 0 },
      time: { type: Date, default: Date.now }
    }
  ],

  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired', 'completed'],
    default: 'pending'
  },

  acceptedPrice: { type: Number, min: 0 },
  addedToCart: { type: Boolean, default: false },
  orderId: { type: String },  // Optional: links to order after checkout

  ordered: { type: Boolean, default: false }, // ✅ Added this line

}, { timestamps: true });

// Indexes for performance
bargainSchema.index({ seller: 1, status: 1 });
bargainSchema.index({ buyerPhone: 1 });

module.exports = mongoose.model('Bargain', bargainSchema);
