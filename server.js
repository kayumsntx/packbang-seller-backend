require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// MIDDLEWARE
// ==========================================
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    process.env.CLIENT_URL || 'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// ==========================================
// ROUTES
// ==========================================
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Packbang Seller Backend',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting/offline',
    timestamp: new Date().toISOString()
  });
});

// Root welcome route
app.get('/', (req, res) => {
  res.send('<h1>Packbang Packaging Seller API is Running</h1><p>Frontend: <a href="http://localhost:5173">http://localhost:5173</a></p>');
});

// ==========================================
// MONGODB CONNECTION & SERVER START
// ==========================================
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/packbang_sellers';

console.log('Connecting to MongoDB...');
mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 8000
})
.then(() => {
  console.log('✅ Connected to MongoDB successfully!');
})
.catch(err => {
  console.warn('⚠️ MongoDB connection warning (Atlas/Local):', err.message);
  console.warn('⚠️ Server will still run. Verify MONGODB_URI in .env when ready.');
});

app.listen(PORT, () => {
  console.log(`======================================================`);
  console.log(`🚀 Packbang Seller Backend running on: http://localhost:${PORT}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - POST /api/auth/register`);
  console.log(`   - POST /api/auth/send-otp`);
  console.log(`   - POST /api/auth/verify-otp`);
  console.log(`   - GET  /api/auth/me`);
  console.log(`   - GET  /api/health`);
  console.log(`======================================================`);
});
