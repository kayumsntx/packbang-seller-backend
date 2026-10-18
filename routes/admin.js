const express = require('express');
const router = express.Router();
const Seller = require('../models/Seller');

// Helper to remove password from seller doc
const cleanSeller = (s) => {
  const obj = s.toObject ? s.toObject() : { ...s };
  delete obj.password;
  obj.id = String(obj._id || obj.id);
  return obj;
};

// ============================================================================
// 1. GET /api/admin/sellers - Fetch all sellers with KPI status counts
// ============================================================================
router.get('/sellers', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status && status !== 'all') {
      if (status === 'pending') {
        query.status = { $in: ['pending_approval', 'pending'] };
      } else if (status === 'approved') {
        query.status = { $in: ['approved', 'active'] };
      } else {
        query.status = status;
      }
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { shopName: regex },
        { ownerName: regex },
        { phone: regex },
        { email: regex },
        { tradeLicenseNumber: regex },
        { nidNumber: regex }
      ];
    }

    const [sellers, totalCount, pendingCount, approvedCount, suspendedCount, bannedCount, rejectedCount] = await Promise.all([
      Seller.find(query).sort({ createdAt: -1 }),
      Seller.countDocuments(),
      Seller.countDocuments({ status: { $in: ['pending_approval', 'pending'] } }),
      Seller.countDocuments({ status: { $in: ['approved', 'active'] } }),
      Seller.countDocuments({ status: 'suspended' }),
      Seller.countDocuments({ status: 'banned' }),
      Seller.countDocuments({ status: 'rejected' })
    ]);

    return res.json({
      success: true,
      counts: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        suspended: suspendedCount,
        banned: bannedCount,
        rejected: rejectedCount
      },
      sellers: sellers.map(cleanSeller)
    });
  } catch (err) {
    console.error('Admin fetch sellers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch sellers: ' + err.message });
  }
});

// ============================================================================
// 2. GET /api/admin/sellers/:id - Get Single Seller Full Profile & KYC Details
// ============================================================================
router.get('/sellers/:id', async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }
    return res.json({ success: true, seller: cleanSeller(seller) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch seller details.' });
  }
});

// ============================================================================
// 3. PUT /api/admin/sellers/:id/approve - Approve Seller Application
// ============================================================================
router.put('/sellers/:id/approve', async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    seller.status = 'approved';
    seller.kycStatus = 'verified';
    seller.isVerified = true;
    seller.rejectionReason = '';
    seller.suspendedUntil = null;
    seller.suspensionReason = '';
    seller.banReason = '';
    seller.reviewedAt = new Date();
    seller.reviewedBy = req.body.reviewedBy || 'Admin';

    await seller.save();

    return res.json({
      success: true,
      message: `Supplier "${seller.shopName}" has been successfully approved! Full catalog and bidding privileges activated.`,
      seller: cleanSeller(seller)
    });
  } catch (err) {
    console.error('Approve seller error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve seller: ' + err.message });
  }
});

// ============================================================================
// 4. PUT /api/admin/sellers/:id/reject - Reject Seller Application
// ============================================================================
router.put('/sellers/:id/reject', async (req, res) => {
  try {
    const { reason, reviewedBy } = req.body;
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    seller.status = 'rejected';
    seller.kycStatus = 'rejected';
    seller.isVerified = false;
    seller.rejectionReason = (reason && reason.trim()) || 'Submitted trade license or NID documents did not meet verification criteria.';
    seller.reviewedAt = new Date();
    seller.reviewedBy = reviewedBy || 'Admin';

    await seller.save();

    return res.json({
      success: true,
      message: `Supplier "${seller.shopName}" has been rejected. Notification recorded.`,
      seller: cleanSeller(seller)
    });
  } catch (err) {
    console.error('Reject seller error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject seller: ' + err.message });
  }
});

// ============================================================================
// 5. PUT /api/admin/sellers/:id/suspend - Suspend Seller for a Period
// ============================================================================
router.put('/sellers/:id/suspend', async (req, res) => {
  try {
    const { durationDays, suspendedUntil, reason, reviewedBy } = req.body;
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    let untilDate;
    if (suspendedUntil) {
      untilDate = new Date(suspendedUntil);
    } else {
      const days = parseInt(durationDays) || 7;
      untilDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    seller.status = 'suspended';
    seller.suspendedUntil = untilDate;
    seller.suspensionReason = (reason && reason.trim()) || 'Account temporarily suspended for compliance review.';
    seller.reviewedAt = new Date();
    seller.reviewedBy = reviewedBy || 'Admin';

    await seller.save();

    return res.json({
      success: true,
      message: `Supplier "${seller.shopName}" suspended until ${untilDate.toLocaleDateString()}. Privileges paused.`,
      seller: cleanSeller(seller)
    });
  } catch (err) {
    console.error('Suspend seller error:', err);
    return res.status(500).json({ success: false, message: 'Failed to suspend seller: ' + err.message });
  }
});

// ============================================================================
// 6. PUT /api/admin/sellers/:id/ban - Permanently Ban Seller
// ============================================================================
router.put('/sellers/:id/ban', async (req, res) => {
  try {
    const { reason, reviewedBy } = req.body;
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    seller.status = 'banned';
    seller.isVerified = false;
    seller.banReason = (reason && reason.trim()) || 'Permanent termination due to policy violation.';
    seller.reviewedAt = new Date();
    seller.reviewedBy = reviewedBy || 'Admin';

    await seller.save();

    return res.json({
      success: true,
      message: `Supplier "${seller.shopName}" has been permanently banned from Packbang.`,
      seller: cleanSeller(seller)
    });
  } catch (err) {
    console.error('Ban seller error:', err);
    return res.status(500).json({ success: false, message: 'Failed to ban seller: ' + err.message });
  }
});

// ============================================================================
// 7. PUT /api/admin/sellers/:id/unsuspend - Reactivate / Unsuspend Seller
// ============================================================================
router.put('/sellers/:id/unsuspend', async (req, res) => {
  try {
    const seller = await Seller.findById(req.params.id);
    if (!seller) {
      return res.status(404).json({ success: false, message: 'Seller not found.' });
    }

    seller.status = 'approved';
    seller.isVerified = true;
    seller.suspendedUntil = null;
    seller.suspensionReason = '';
    seller.banReason = '';
    seller.reviewedAt = new Date();
    seller.reviewedBy = req.body.reviewedBy || 'Admin';

    await seller.save();

    return res.json({
      success: true,
      message: `Supplier "${seller.shopName}" has been reactivated and approved!`,
      seller: cleanSeller(seller)
    });
  } catch (err) {
    console.error('Unsuspend seller error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unsuspend seller: ' + err.message });
  }
});

module.exports = router;
