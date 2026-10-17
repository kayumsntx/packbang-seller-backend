const express = require('express');
const router = express.Router();
const verifySellerToken = require('../middleware/auth');

// Store API URL
const STORE_API_URL = process.env.STORE_API_URL || 
  (process.env.NODE_ENV === 'production' ? 'https://packbang.com' : 'http://localhost:8000');

// GET /api/products - Get products for the seller
router.get('/', verifySellerToken, async (req, res) => {
  try {
    const sellerId = req.seller.id;
    const sellerPhone = req.seller.phone;
    const url = `${STORE_API_URL}/api/seller/products?sellerId=${encodeURIComponent(sellerId)}&sellerPhone=${encodeURIComponent(sellerPhone)}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Store API returned status: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Fetch seller products error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch products: ' + err.message });
  }
});

// POST /api/products - Create a new marketplace product
router.post('/', verifySellerToken, async (req, res) => {
  try {
    const payload = {
      ...req.body,
      sellerId: req.seller.id,
      sellerName: req.seller.shopName || req.body.sellerName,
      sellerPhone: req.seller.phone || req.body.sellerPhone
    };

    const response = await fetch(`${STORE_API_URL}/api/seller/products/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Create seller product error:', err);
    res.status(500).json({ success: false, message: 'Failed to create product: ' + err.message });
  }
});

// PUT /api/products/:id - Update product details
router.put('/:id', verifySellerToken, async (req, res) => {
  try {
    const response = await fetch(`${STORE_API_URL}/api/seller/products/${req.params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Update seller product error:', err);
    res.status(500).json({ success: false, message: 'Failed to update product: ' + err.message });
  }
});

// DELETE /api/products/:id - Deactivate/Delete product
router.delete('/:id', verifySellerToken, async (req, res) => {
  try {
    const response = await fetch(`${STORE_API_URL}/api/seller/products/${req.params.id}`, {
      method: 'DELETE'
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('Delete seller product error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete product: ' + err.message });
  }
});

module.exports = router;
