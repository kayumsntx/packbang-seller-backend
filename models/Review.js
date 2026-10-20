const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  reviewType: { 
    type: String, 
    enum: ['product', 'custom_order'], 
    default: 'product' 
  },
  productId: { 
    type: String, 
    default: null,
    index: true
  },
  productName: { 
    type: String, 
    default: '' 
  },
  customOrderId: { 
    type: String, 
    default: null,
    index: true
  },
  customOrderTitle: { 
    type: String, 
    default: '' 
  },
  sellerId: { 
    type: String, 
    default: 'admin',
    index: true
  },
  sellerName: { 
    type: String, 
    default: 'PackBang Direct' 
  },
  userId: { 
    type: String, 
    required: true 
  },
  userName: { 
    type: String, 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    required: true, 
    trim: true 
  },
  isVerifiedPurchase: { 
    type: Boolean, 
    default: true 
  },
  status: { 
    type: String, 
    enum: ['approved', 'flagged', 'hidden'], 
    default: 'approved' 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Review', reviewSchema);
