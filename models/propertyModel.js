const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  landlordId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String },
  propertyType: { type: String, enum: ['house', 'shop'], required: true },

  transactionType: { type: String, enum: ['rent', 'sale'], required: true },

  images: [{ type: String }],
  videoUrl: { type: String },
  documents: {
    type: [{ type: String }],
    required: true,
  },

  verified: { type: Boolean, default: false },

  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },

  rejectionReason: { type: String },

  approvedAt: { type: Date },

  price: { type: Number, required: true },

  location: {
    address: { type: String, required: true },
    city: { type: String },
    state: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number },
    },
  },

  amenities: [{
    type: String,
    enum: ['water', 'electricity', 'security', 'parking', 'internet', 'furnished', 'air_conditioning'],
  }],

  availability: {
    isAvailable: { type: Boolean, default: true },
    availableFrom: { type: Date },
    leaseDurationMonths: { type: Number },
  },
}, { timestamps: true });

module.exports = mongoose.model('Property', propertySchema);
