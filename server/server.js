// require('dotenv').config();
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('express-async-errors');

// console.log("ai api connection server", process.env.GEMINI_API_KEY)


const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');


const { sequelize } = require('./models');
const { connectDB } = require('./config/database');

// const { sequelize, connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initSocket } = require('./sockets');
const { errorHandler,globalErrorHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');
const {orderEscalationQueue} = require("./utils/orderWorker")

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const driverRoutes = require('./routes/driver.routes');
const adminRoutes = require('./routes/admin.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const locationRoutes = require('./routes/location.routes');
const uploadRoutes = require('./routes/upload.routes');
const chatRoutes = require('./routes/chat.routes');
const aiRoutes = require('./routes/ai.routes');
const supportRoutes = require('./routes/support.routes');
const matchingRoutes = require('./routes/matching.routes');


const app = express();
const server = http.createServer(app);

// 1. MUST BE SET if running behind Nginx, Cloudflare, Heroku, Render, Vercel, etc.
// Ensures req.ip gets the actual client IP instead of the internal reverse proxy IP
app.set("trust proxy", 1);

// ── Security & Middleware ──────────────────────────────────
app.use(helmet());
app.use(compression());

const allowedOrigins = [
  'https://localhost',       // Nginx reverse proxy
  'http://localhost',        // HTTP Nginx
  'http://localhost:3000',   // Next.js direct dev
  'http://localhost:5000',   // Express direct dev
  process.env.CLIENT_URL,    // Production URL from .env
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like Postman, mobile apps, or server-to-server)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        console.log(`[CORS Blocked Origin]: ${origin}`); // Helps debug if another origin hits it
        return callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// app.use(cors({
//   origin: process.env.CLIENT_URL || "http://localhost:3001",
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization'],
// }));

// HTTP request logger
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
}));

// Body parsers
// Razorpay webhooks need raw body — mount before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser()); // Parses req.cookies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// Global rate limiter
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
//   max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: { success: false, message: 'Too many requests, please try again later.' },
// });

// ─────────────────────────────────────────────
// Global Rate Limiter
// ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  // Reduce window to 1 minute so users recover quickly if they hit the cap
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 1 * 60 * 1000, 
  
  // Increase global max limit to 300-500 per minute for rich dashboards
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300, 

  standardHeaders: true,
  legacyHeaders: false,

  // 2. Dynamic Key Generator: Distinguish requests by User ID (if authenticated) instead of IP alone
  keyGenerator: (req) => {
    if (req.user && req.user.id) {
      return `user_${req.user.id}`;
    }
    // Fallback to IP address for unauthenticated requests
    return req.ip;
  },

  // 3. Skip static assets or health check endpoints
  skip: (req) => {
    return req.path === "/health" || req.path.startsWith("/uploads");
  },

  message: {
    success: false,
    message: "Too many requests from this device/account. Please wait a moment.",
  },
});

app.use('/api', globalLimiter);

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/matching', matchingRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), env: process.env.NODE_ENV });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Centralised error handler (must be last)
app.use(errorHandler);

// ── Startup ───────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    // Syncs all tables whenever DB_SYNC=true is set in .env
    if (process.env.DB_SYNC === 'true') {
      console.log('🔄 Syncing database models...');
      await sequelize.sync({ alter: true });
      console.log('✅ Database synced successfully (All tables created)!');
    }

    await connectRedis();
    initSocket(server);

    server.on('error', (err) => {
      console.error('SERVER LISTEN ERROR:', err.code, err.message);
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Kill the process using it and retry.`);
      }
      process.exit(1);
    });

    server.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log(`✅ Server ready at http://localhost:${PORT}`);
    });

  } catch (error) {
    console.error('STARTUP ERROR CODE:', error.code);
    console.error('STARTUP ERROR MESSAGE:', error.message);
    console.error('STARTUP ERROR STACK:', error.stack);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

module.exports = { app, server }; // export for tests
