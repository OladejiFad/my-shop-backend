const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  storeName: { type: String, default: "" },
  storeTheme: { type: String, default: "" },
  storeDescription: { type: String, default: "" },
  occupationType: { type: String, default: "" },

  storeCategory: {
    type: String,
    default: "",
    trim: true,
  },

  // Lock flags
  storeNameLocked: { type: Boolean, default: false },
  storeOccupationLocked: { type: Boolean, default: false },
  occupationTypeLocked: { type: Boolean, default: false },

  storeOccupation: {
    type: String,
    enum: ['vendor', 'skillworker'],
    required: true,
    trim: true,
  },

  isTopSeller: {
    type: Boolean,
    default: false,
  },

  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  ratings: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      score: { type: Number, min: 1, max: 5, required: true },
    },
  ],

  sellerScore: { type: Number, default: 0 },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Store', storeSchema);
