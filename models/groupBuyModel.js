const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  name: String,
  phone: String,
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
}, { _id: false });

const paidParticipantSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
  addedToCart: {
    type: Boolean,
    default: false,
  },
  ordered: {
    type: Boolean,
    default: false,
  },
}, { _id: false });

const groupBuySchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: String,
  pricePerUnit: {
    type: Number,
    required: true,
  },
  minParticipants: {
    type: Number,
    required: true,
  },
  deadline: {
    type: Date,
    required: true,
  },
  visible: {
    type: Boolean,
    default: true,
  },
  participants: [participantSchema],
  paidParticipants: [paidParticipantSchema],
  status: {
    type: String,
    enum: ['open', 'full', 'ready', 'closed'],
    default: 'open',
  },
}, { timestamps: true });

// ✅ Virtual field: total joined quantity (unpaid + paid)
groupBuySchema.virtual('joinedQuantity').get(function () {
  const unpaid = this.participants.reduce((sum, p) => sum + (p.quantity || 0), 0);
  const paid = this.paidParticipants.reduce((sum, p) => sum + (p.quantity || 0), 0);
  return unpaid + paid;
});

// ✅ Virtual field: check if full
groupBuySchema.virtual('isFull').get(function () {
  return this.joinedQuantity >= this.minParticipants;
});

// ✅ Enable virtuals in JSON and object outputs
groupBuySchema.set('toObject', { virtuals: true });
groupBuySchema.set('toJSON', { virtuals: true });

// ✅ Indexes for performance
groupBuySchema.index({ 'participants.phone': 1 });
groupBuySchema.index({ 'paidParticipants.phone': 1 });
groupBuySchema.index({ sellerId: 1 });
groupBuySchema.index({ productId: 1 });

module.exports = mongoose.model('GroupBuy', groupBuySchema);
