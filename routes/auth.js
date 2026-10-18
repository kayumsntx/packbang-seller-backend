const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Seller = require('../models/Seller');
const verifySellerToken = require('../middleware/auth');

// In-memory OTP storage for rapid verification testing (phone -> { code, expiresAt })
const otpStore = new Map();

// Generate JWT Helper
function generateToken(seller) {
  return jwt.sign(
    {
      id: seller._id,
      phone: seller.phone,
      shopName: seller.shopName,
      tier: seller.tier
    },
    process.env.JWT_SECRET || 'packbang_seller_secret_key_2026',
    { expiresIn: '7d' }
  );
}

// Normalize phone (+88017... -> 017...)
function formatPhone(phone) {
  if (!phone) return '';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('880')) {
    clean = '0' + clean.slice(3);
  }
  return clean;
}

function sanitizeSeller(sellerDoc) {
  if (!sellerDoc) return null;
  const obj = sellerDoc.toObject ? sellerDoc.toObject() : { ...sellerDoc };
  delete obj.password;
  obj.id = String(obj._id || obj.id);
  return obj;
}

// ============================================================================
// 1. POST /api/auth/register - Register a new packaging supplier
// ============================================================================
router.post('/register', async (req, res) => {
  try {
    const { phone, password, shopName, email, categories, tier, ownerName } = req.body;

    if (!phone || !password || !shopName) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, password, and shop name are required.'
      });
    }

    const cleanPhone = formatPhone(phone);
    if (cleanPhone.length < 11) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 11-digit Bangladeshi mobile number.'
      });
    }

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ phone: cleanPhone });
    if (existingSeller) {
      return res.status(409).json({
        success: false,
        message: 'A seller account with this phone number already exists. Please log in.'
      });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create seller
    const newSeller = new Seller({
      phone: cleanPhone,
      email: email ? email.trim() : '',
      password: hashedPassword,
      shopName: shopName.trim(),
      ownerName: ownerName ? ownerName.trim() : shopName.trim(),
      categories: Array.isArray(categories) && categories.length > 0 
        ? categories 
        : ['Courier Poly', 'Corrugated Boxes', 'Bubble Wrap', 'Shopping Bags'],
      tier: tier === 'pro' ? 'pro' : 'standard',
      status: 'pending_approval'
    });

    await newSeller.save();

    // Generate JWT
    const token = generateToken(newSeller);

    return res.status(201).json({
      success: true,
      message: 'Seller account registered successfully! Welcome to Packbang.',
      token,
      seller: sanitizeSeller(newSeller)
    });

  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again later.'
    });
  }
});

// ============================================================================
// 2. POST /api/auth/login - Seller Login (Phone or Email + Password)
// ============================================================================
router.post('/login', async (req, res) => {
  try {
    const { account, password } = req.body;

    if (!account || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone/Email and password are required.'
      });
    }

    const cleanAccount = formatPhone(account);

    // Find seller by phone or by email
    const seller = await Seller.findOne({
      $or: [
        { phone: cleanAccount },
        { phone: account },
        { email: account.toLowerCase().trim() }
      ]
    });

    if (!seller) {
      return res.status(401).json({
        success: false,
        message: 'No seller account found with this phone number or email.'
      });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, seller.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.'
      });
    }

    if (seller.status === 'suspended') {
      if (seller.suspendedUntil && new Date(seller.suspendedUntil) <= new Date()) {
        seller.status = 'approved';
        seller.suspendedUntil = null;
        seller.suspensionReason = '';
        await seller.save();
      } else {
        return res.status(403).json({
          success: false,
          message: `Your seller account is suspended until ${seller.suspendedUntil ? new Date(seller.suspendedUntil).toLocaleDateString() : 'further notice'}. Reason: ${seller.suspensionReason || 'Administrative suspension'}. Contact support@packbang.com for inquiries.`
        });
      }
    }

    if (seller.status === 'banned') {
      return res.status(403).json({
        success: false,
        message: `Your seller account has been permanently banned. Reason: ${seller.banReason || 'Policy violation'}. Contact support@packbang.com for details.`
      });
    }

    // Generate token
    const token = generateToken(seller);

    return res.json({
      success: true,
      message: 'Login successful! Welcome to Packbang Seller Center.',
      token,
      seller: sanitizeSeller(seller)
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again later.'
    });
  }
});

// ============================================================================
// 3. POST /api/auth/send-otp - Send OTP for Phone Sign-in
// ============================================================================
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const cleanPhone = formatPhone(phone);
    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(cleanPhone, { code, expiresAt });
    console.log(`[Packbang OTP] Generated code for ${cleanPhone}: ${code}`);

    // In production, integrate SMS gateway here (e.g., Greenweb, SSL Wireless, Steadfast SMS)
    return res.json({
      success: true,
      message: `OTP code sent successfully to +880${cleanPhone}.`,
      // Provide preview in development mode for easy testing
      debugCode: process.env.NODE_ENV !== 'production' ? code : undefined
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
});

// ============================================================================
// 4. POST /api/auth/verify-otp - Login via Phone + OTP
// ============================================================================
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP code are required.' });
    }

    const cleanPhone = formatPhone(phone);
    const record = otpStore.get(cleanPhone);

    // Verify OTP
    if (!record || record.code !== otp.trim()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code.' });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(cleanPhone);
      return res.status(400).json({ success: false, message: 'OTP code has expired. Please request a new one.' });
    }

    // OTP verified -> remove from store
    otpStore.delete(cleanPhone);

    // Check if seller exists, or create a quick account
    let seller = await Seller.findOne({ phone: cleanPhone });
    if (!seller) {
      const defaultPassword = await bcrypt.hash('packbang123', 10);
      seller = new Seller({
        phone: cleanPhone,
        shopName: 'Packaging Store ' + cleanPhone.slice(-4),
        password: defaultPassword,
        tier: 'standard'
      });
      await seller.save();
    }

    const token = generateToken(seller);

    return res.json({
      success: true,
      message: 'OTP verified successfully! Welcome to Packbang.',
      token,
      seller: sanitizeSeller(seller)
    });

  } catch (err) {
    console.error('OTP verify error:', err);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification.' });
  }
});

// ============================================================================
// 5. GET /api/auth/me - Get Current Logged-in Seller
// ============================================================================
router.get('/me', verifySellerToken, async (req, res) => {
  try {
    const seller = await Seller.findById(req.seller.id).select('-password');
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }
    return res.json({ success: true, seller: sanitizeSeller(seller) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch seller profile.' });
  }
});


// ============================================================================
// 6. PUT /api/auth/profile - Update Seller Profile & KYC Verification Documents
// ============================================================================
router.put('/profile', verifySellerToken, async (req, res) => {
  try {
    const {
      shopName,
      ownerName,
      email,
      warehouseAddress,
      tradeLicenseNumber,
      tradeLicenseImage,
      nidNumber,
      nidFrontImage,
      nidBackImage,
      bankDetails
    } = req.body;

    const seller = await Seller.findById(req.seller.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller account not found.' });
    }

    if (shopName) seller.shopName = shopName.trim();
    if (ownerName !== undefined) seller.ownerName = ownerName.trim();
    if (email !== undefined) seller.email = email.trim();
    if (warehouseAddress) {
      seller.warehouseAddress = {
        ...(seller.warehouseAddress || {}),
        ...warehouseAddress
      };
    }

    // Trade License
    if (tradeLicenseNumber !== undefined) seller.tradeLicenseNumber = String(tradeLicenseNumber).trim();
    if (tradeLicenseImage !== undefined) seller.tradeLicenseImage = tradeLicenseImage;

    // National ID Information (Front & Back)
    if (nidNumber !== undefined) seller.nidNumber = String(nidNumber).trim();
    if (nidFrontImage !== undefined) seller.nidFrontImage = nidFrontImage;
    if (nidBackImage !== undefined) seller.nidBackImage = nidBackImage;

    // Bank / Payout details
    if (bankDetails) {
      seller.bankDetails = {
        ...(seller.bankDetails || {}),
        ...bankDetails
      };
    }

    // Check verification status
    const hasTradeLicense = !!(seller.tradeLicenseNumber || seller.tradeLicenseImage);
    const hasNidFront = !!seller.nidFrontImage;
    const hasNidBack = !!seller.nidBackImage;

    if (hasTradeLicense && hasNidFront && hasNidBack) {
      if (seller.kycStatus === 'unverified' || seller.kycStatus === 'rejected') {
        seller.kycStatus = 'pending_verification';
      }
      if (seller.status === 'pending_approval' || seller.status === 'rejected' || !seller.status) {
        seller.status = 'pending_approval';
      }
      seller.kycSubmittedAt = new Date();
    }

    await seller.save();

    const safeSeller = seller.toObject();
    delete safeSeller.password;

    return res.json({
      success: true,
      message: 'Factory profile and verification documents saved successfully.',
      seller: sanitizeSeller(seller)
    });
  } catch (err) {
    console.error('Update seller profile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile: ' + err.message });
  }
});

module.exports = router;
