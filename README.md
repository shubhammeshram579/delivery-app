# 🚀 DeliverPro — Production-Grade Delivery Management System

A full-stack, real-world delivery platform built with Next.js, Node.js, PostgreSQL, Redis, and Socket.IO.

---

## 🏗️ Architecture

```
delivery-app/
├── client/                         # Next.js 14 (App Router)
│   ├── app/
│   │   ├── (customer)/             # Customer panel (route group)
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   │   ├── [id]/           # Order detail + tracking + chat
│   │   │   │   └── new/            # Place order (Google Maps autocomplete)
│   │   │   ├── track/              # Live driver tracking
│   │   │   ├── chat/
│   │   │   ├── payment/
│   │   │   └── profile/
│   │   ├── (driver)/               # Driver panel (route group)
│   │   │   ├── dashboard/          # Online toggle + earnings + available orders
│   │   │   ├── orders/[id]/        # Accept, update status, upload proof
│   │   │   ├── earnings/           # Earnings history + charts
│   │   │   ├── location/           # GPS location broadcast
│   │   │   └── profile/
│   │   ├── (admin)/                # Admin dashboard (route group)
│   │   │   ├── dashboard/          # Revenue charts + live stats
│   │   │   ├── users/              # Manage customers
│   │   │   ├── drivers/            # Verify drivers, manage docs
│   │   │   ├── orders/             # All orders with filters
│   │   │   ├── analytics/          # Revenue & delivery analytics
│   │   │   └── settings/
│   │   ├── login/
│   │   ├── register/
│   │   └── verify-otp/
│   ├── components/
│   │   ├── ui/                     # StatCard, Modal, StatusBadge, Pagination, etc.
│   │   ├── shared/                 # Layout, Sidebar, Topbar, AuthGuard, Providers
│   │   ├── customer/               # Domain-specific components
│   │   ├── driver/
│   │   └── admin/
│   ├── hooks/
│   │   ├── useSocket.js            # Real-time socket connection
│   │   ├── useGeolocation.js       # GPS watch/get
│   │   ├── useRazorpay.js          # Payment checkout
│   │   └── useGoogleMaps.js        # Map + route drawing
│   ├── redux/
│   │   ├── store.js
│   │   └── slices/                 # auth, orders, notifications, ui
│   └── services/                   # Axios API layer (auth, orders, payments, admin)
│
└── server/                         # Node.js + Express
    ├── server.js                   # Entry point
    ├── config/
    │   ├── database.js             # Sequelize + PostgreSQL
    │   ├── redis.js                # Redis + cache helpers
    │   ├── cloudinary.js           # File uploads
    │   └── sequelize.config.js     # Migrations config
    ├── controllers/                # Thin — delegates to services
    ├── services/                   # Business logic
    │   ├── auth.service.js         # JWT, OTP, refresh, logout blacklist
    │   ├── order.service.js        # Pricing, Maps API, driver assignment
    │   └── payment.service.js      # Razorpay, webhooks, refunds
    ├── models/                     # Sequelize models + associations
    ├── routes/                     # Express routers
    ├── middleware/
    │   ├── auth.middleware.js       # JWT protect, role restriction, blacklist
    │   ├── error.middleware.js      # Central handler + custom error classes
    │   ├── validator.middleware.js  # express-validator schemas
    │   └── upload.middleware.js     # Multer + Cloudinary
    ├── sockets/index.js            # Socket.IO: tracking, chat, notifications
    ├── utils/
    │   ├── logger.js               # Winston (console + file)
    │   ├── email.js                # Nodemailer templates
    │   ├── sms.js                  # Twilio OTP
    │   └── notifications.js        # In-app real-time notifications
    ├── migrations/                  # Sequelize DB migrations
    ├── seeders/                     # Seed data (admin user, etc.)
    └── tests/                       # Jest + Supertest
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Redux Toolkit, Tailwind CSS |
| Real-time | Socket.IO (tracking, chat, notifications) |
| HTTP client | Axios with interceptors + auto token refresh |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Backend | Node.js, Express, express-async-errors |
| Auth | JWT (access + refresh tokens), Redis blacklist |
| Database | PostgreSQL + Sequelize ORM |
| Cache | Redis (API cache, session, OTP, token blacklist) |
| Payments | Razorpay (order creation, verification, webhooks, refunds) |
| Maps | Google Maps Platform (Directions, Distance Matrix, Autocomplete) |
| File uploads | Multer + Cloudinary |
| Email | Nodemailer (SMTP templates) |
| SMS | Twilio (OTP) |
| Logging | Winston (file + console) |
| Security | Helmet, CORS, rate limiting, bcrypt |
| DevOps | Docker Compose, Nginx, GitHub Actions CI/CD |
| Testing | Jest + Supertest |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)
- Redis 7 (or use Docker)

### 1. Clone & configure
```bash
git clone https://github.com/yourname/delivery-app.git
cd delivery-app

# Copy and fill environment variables
cp .env.example .env
# Edit .env with your credentials
```

### 2. Run with Docker (recommended)
```bash
docker-compose -f docker/docker-compose.yml up --build
```

### 3. Run manually (development)

**Backend:**
```bash
cd server
npm install
npm run migrate          # Run DB migrations
npm run seed             # Seed admin user
npm run dev              # Start with nodemon
```

**Frontend:**
```bash
cd client
npm install
# Create client/.env.local with:
# NEXT_PUBLIC_API_URL=http://localhost:5000/api
# NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
# NEXT_PUBLIC_GOOGLE_MAPS_KEY=your_key
npm run dev
```

### 4. Default admin credentials
```
Email:    admin@deliveryapp.com
Password: Admin@1234
```

---

## 🔐 Authentication Flow

1. Register → email OTP sent
2. Verify OTP → account active
3. Login → access token (7d) + refresh token (30d)
4. Access token attached to all requests via Axios interceptor
5. On 401 → automatic refresh using refresh token
6. Logout → access token blacklisted in Redis

---

## 💳 Payment Flow

1. Customer places order → Payment record created (pending)
2. Customer initiates payment → Backend creates Razorpay order
3. Frontend opens Razorpay Checkout
4. On success → Frontend calls `/api/payments/verify`
5. Backend verifies HMAC signature → marks payment as success
6. Razorpay webhook also handles payment.failed events

---

## 📡 Socket.IO Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `driver:online` | Client → Server | Driver goes online |
| `driver:location` | Client → Server | GPS update |
| `order:location` | Server → Client | Broadcast driver position |
| `order:track` | Client → Server | Join order tracking room |
| `chat:send` | Client → Server | Send chat message |
| `chat:message` | Server → Client | Receive chat message |
| `notification` | Server → Client | Push notification |

---

## 🧪 Testing
```bash
cd server
npm test                 # Run all tests
npm run test:coverage    # With coverage report
```

---

## 🐳 Production Deployment

```bash
# With Nginx reverse proxy
docker-compose -f docker/docker-compose.yml --profile production up -d --build
```

Configure DNS → point to server IP → add SSL certs to `nginx/ssl/`.

---

## 👨‍💻 Author
Shubham Meshram
