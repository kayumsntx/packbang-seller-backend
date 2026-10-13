# Packbang Seller Center - Backend API

REST API server built with Node.js, Express, MongoDB/Mongoose, and JWT for Packbang Packaging Seller Center.

## Quick Start

```bash
cd K:\packbang-seller-backend

# Install dependencies (already included in node_modules)
npm install

# Start Backend Server (Port 5000)
npm start
# OR in development with nodemon:
npm run dev
```

## Configuration (.env)
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/packbang_sellers
JWT_SECRET=packbang_packaging_secret_key_2026_super_secure
CLIENT_URL=http://localhost:5173
```

## API Endpoints
- `POST /api/auth/register` - Register new packaging supplier / shop
- `POST /api/auth/login` - Login with phone/email and password
- `POST /api/auth/send-otp` - Send 6-digit OTP verification code
- `POST /api/auth/verify-otp` - Verify OTP code and login
- `GET  /api/auth/me` - Get current logged-in seller profile (Requires Bearer token)
- `GET  /api/health` - Service & database health check
