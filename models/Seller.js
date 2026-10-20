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
  // Trade License Information (Required after account creation)
  tradeLicenseNumber: {
    type: String,
    default: '',
    trim: true
  },
  tradeLicenseImage: {
    type: String,
    default: ''
  },
  // National ID (NID) Information (Required after account creation)
  nidNumber: {
    type: String,
    default: '',
    trim: true
  },
  nidFrontImage: {
    type: String,
    default: ''
  },
  nidBackImage: {
    type: String,
    default: ''
  },
  // Verification / KYC status
  kycStatus: {
    type: String,
    enum: ['unverified', 'pending_verification', 'verified', 'rejected'],
    default: 'unverified'
  },
  kycSubmittedAt: {
    type: Date,
    default: null
  },
  // Settlement / Payout Bank & MFS Details
  bankDetails: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    accountHolderName: { type: String, default: '' },
    branchName: { type: String, default: '' },
    bkashNumber: { type: String, default: '' }
  },
  // Tier: 'standard' (ready-stock) or 'pro' (custom printing / factory manufacturer)
  tier: {
    type: String,
    enum: ['standard', 'pro'],
    default: 'standard'
  },
  // Account Status managed by Admin
  status: {
    type: String,
    enum: ['pending_approval', 'approved', 'active', 'pending', 'rejected', 'suspended', 'banned'],
    default: 'active'
  },
  rejectionReason: {
    type: String,
    default: '',
    trim: true
  },
  suspendedUntil: {
    type: Date,
    default: null
  },
  suspensionReason: {
    type: String,
    default: '',
    trim: true
  },
  banReason: {
    type: String,
    default: '',
    trim: true
  },
  reviewedBy: {
    type: String,
    default: '',
    trim: true
  },
  reviewedAt: {
    type: Date,
    default: null
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
