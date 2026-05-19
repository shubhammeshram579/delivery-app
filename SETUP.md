# 🚀 DeliverPro — Setup Guide

## ✅ What was fixed in this version
- All 15 empty page files now have complete code
- Fixed MongoDB syntax ($ne, $iLike) → Sequelize Op syntax
- Fixed Razorpay & Twilio crash on startup (now lazy-loaded)
- Fixed email util crashing when SMTP not configured (logs OTP to console in dev)
- Fixed broken uiSlice / notificationSlice circular export
- Added missing postcss.config.js (Tailwind wasn't working)
- Fixed next.config.js deprecated option
- Rewrote _all.routes.js into proper separate route files
- Fixed docker-compose.yml paths (was looking in wrong folder)
- Added Dockerfile inside server/ and client/ (not in docker/ subfolder)
- Added root app/page.js that redirects based on role

---

## 🐳 Run with Docker (RECOMMENDED — easiest)

### Step 1: Open the project folder
```
cd delivery-app
```

### Step 2: Copy env file
```
copy .env.example .env
```
The app works with default values — Docker sets DB/Redis automatically.
Only fill in Razorpay, Google Maps, Cloudinary etc when you need those features.

### Step 3: Start everything
```
docker-compose up --build
```

That's it! Visit:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/health

---

## 💻 Run WITHOUT Docker (manual)

### Prerequisites
- Node.js 20+
- PostgreSQL 15 running on port 5432
- Redis running on port 6379

### Backend
```bash
cd server
npm install
```

Create `.env` file in `server/` with at minimum:
```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/delivery_app
REDIS_URL=redis://localhost:6379
JWT_SECRET=any_long_random_string_at_least_64_chars
JWT_REFRESH_SECRET=another_long_random_string_at_least_64_chars
CLIENT_URL=http://localhost:3000
NODE_ENV=development
PORT=5000
```

Then run:
```bash
npm run migrate    # Create tables
npm run seed       # Create admin user
npm run dev        # Start server
```

### Frontend
```bash
cd client
npm install
```

Create `client/.env.local` (already created for you with defaults):
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key_here
```

Then run:
```bash
npm run dev
```

---

## 🔑 Default Login After Seeding

| Role     | Email                    | Password    |
|----------|--------------------------|-------------|
| Admin    | admin@deliveryapp.com    | Admin@1234  |

Register new Customer/Driver accounts via the UI.

---

## 📝 Notes
- OTP emails: if SMTP not configured, OTP is **printed in server console** so you can still test
- Razorpay/Twilio: optional — app works without them, those features just won't process
- Google Maps: optional — app falls back to Haversine distance calculation
- Cloudinary: optional — file uploads won't work without it

