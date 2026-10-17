require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy headers (Render, Heroku, Cloudflare)
app.set('trust proxy', 1);

// ==========================================
// CORS CONFIGURATION (PRODUCTION & LOCAL)
// ==========================================
const allowedOrigins = [
  'https://seller.packbang.com',
  'http://seller.packbang.com',
  'https://packbang.com',
  'https://www.packbang.com',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost:8000'
];

if (process.env.CLIENT_URL) {
  process.env.CLIENT_URL.split(',').forEach(url => {
    const trimmed = url.trim();
    if (trimmed && !allowedOrigins.includes(trimmed)) {
      allowedOrigins.push(trimmed);
    }
  });
}

const corsOptions = {
  origin: function (origin, callback) {
    // Allow non-browser requests (Postman, curl, server-to-server)
    if (!origin) return callback(null, true);

    const isAllowed =
      allowedOrigins.includes(origin) ||
      /^https?:\/\/([a-z0-9-]+\.)?packbang\.com$/i.test(origin) ||
      /^https?:\/\/.*\.onrender\.com$/i.test(origin) ||
      /^https?:\/\/.*\.vercel\.app$/i.test(origin);

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} (Origin: ${req.headers.origin || 'direct'})`);
  next();
});

// ==========================================
// ROUTES
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'Packbang Seller Backend',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'connecting/offline',
    liveFrontend: 'https://seller.packbang.com',
    timestamp: new Date().toISOString()
  });
});

// Root welcome route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Packbang Seller API</title></head>
      <body style="font-family: system-ui, sans-serif; padding: 40px; text-align: center; background: #0F172A; color: white;">
        <h1 style="color: #FF5A1F;">Packbang Packaging Seller API is Live</h1>
        <p>Live Supplier Portal: <a href="https://seller.packbang.com" style="color: #FDE047; text-decoration: none; font-weight: bold;">https://seller.packbang.com</a></p>
        <p>Health Check: <a href="/api/health" style="color: #38BDF8;">/api/health</a></p>
      </body>
    </html>
  `);
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
  console.warn('⚠️ MongoDB connection warning:', err.message);
  console.warn('⚠️ Server will still run. Verify MONGODB_URI in .env when ready.');
});

app.listen(PORT, () => {
  console.log('======================================================');
  console.log(`🚀 Packbang Seller Backend running on port: ${PORT}`);
  console.log('🌐 Enabled for live frontend: https://seller.packbang.com');
  console.log('📡 Endpoints:');
  console.log('   - POST /api/auth/login');
  console.log('   - POST /api/auth/register');
  console.log('   - POST /api/auth/send-otp');
  console.log('   - POST /api/auth/verify-otp');
  console.log('   - GET  /api/auth/me');
  console.log('   - GET  /api/health');
  console.log('======================================================');
});
