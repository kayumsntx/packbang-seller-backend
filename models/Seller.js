const mongoose = require('mongoose');

const sellerSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  password: {
    type: String,
    required: true
  },
  shopName: {
    type: String,
    required: true,
    trim: true
  },
  ownerName: {
    type: String,
    default: '',
    trim: true
  },
  // Packaging Categories the seller specializes in
  categories: {
    type: [String],
    default: ['Courier Poly', 'Corrugated Boxes', 'Bubble Wrap']
  },
  warehouseAddress: {
    division: { type: String, default: 'Dhaka' },
    city: { type: String, default: '' },
    fullAddress: { type: String, default: '' }
  },
  // Tier: 'standard' (ready-stock) or 'pro' (custom printing / factory manufacturer)
  tier: {
    type: String,
    enum: ['standard', 'pro'],
    default: 'standard'
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'suspended'],
    default: 'active'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  commissionRate: {
    type: Number,
    default: 0 // 0% commission for first 30 days
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Seller', sellerSchema);
