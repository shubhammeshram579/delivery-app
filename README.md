# 🚚 DeliverPro — AI-Powered Delivery Management Platform

A production-grade, real-time delivery platform built for the Indian logistics market — connecting customers, drivers, and admins through live tracking, intelligent automation, and human-in-the-loop AI support.

Built to demonstrate real-world full-stack engineering: not a CRUD demo, but a system that handles the messy edge cases actual delivery platforms face — drivers going offline mid-delivery, payment method choice, support triage at scale, and driver reassignment under time pressure.

---

## 🎯 What Problem This Solves

Most delivery-app tutorials stop at "customer places order, driver accepts it." This project goes further and solves the problems that actually break MVPs in production:

| Real-world problem | How it's solved here |
|---|---|
| Driver cancels after accepting — who tells the customer, and who finds a new driver? | Deterministic matching engine auto-reassigns to the next-best driver within 15km, retries up to 5 candidates, escalates to admin only if all fail |
| Customer wants to track their driver live, but showing GPS to everyone is a privacy/cost problem | 15km visibility rule — driver location only broadcasts to the customer when within range, cached in Redis (30s TTL), not hammering Postgres every 5 seconds |
| Support tickets pile up because every question needs a human | AI-first triage answers known FAQs instantly; anything it can't resolve (or anything safety-critical like accidents/fraud) auto-escalates into a ticket with priority + admin notification — AI never auto-closes a ticket |
| "Why is my delivery ₹520?" — a wall of numbers doesn't build trust | AI explains pricing in plain language, on demand |
| New drivers get stuck accepting bad-fit orders (heavy furniture on a bike) | AI recommends the right vehicle type from a natural-language item description |
| A refund request or wrong-item complaint gets "handled" by a chatbot loop | Hard safety-net keyword matching forces immediate human escalation for accidents, fraud, legal complaints, and self-harm mentions — bypasses AI judgment entirely |

---

## 🏗️ Tech Stack

**Frontend:** Next.js 14 (App Router) · Redux Toolkit · Tailwind CSS · Socket.IO Client · Google Maps JavaScript API · React Hook Form + Zod · Recharts

**Backend:** Node.js + Express · PostgreSQL (Sequelize ORM) · Redis (caching, OTP, rate-limit, live location) · Socket.IO Server · JWT (access + refresh tokens)

**AI:** Google Gemini API (gemini-2.5-flash) — structured outputs / function-calling pattern, Gemini never touches the database directly, only calls pre-built service functions

**Payments:** Razorpay (online) + Cash on Delivery, with driver-side cash-collection confirmation

**Infra:** Docker Compose (Postgres + Redis + server + client), designed for local dev → containerized staging → cloud production (Railway/Render/RDS)

---

## 👥 Three Roles, Three Experiences

### Customer
- Natural-language order booking ("move a washing machine from Baner to Hinjewadi tomorrow morning" → AI extracts pickup, drop, weight, vehicle, price)
- Live driver tracking on Google Maps once a driver accepts (animated marker, ETA, distance-to-you)
- Choose payment method: online (Razorpay) or cash on delivery
- Real-time chat with assigned driver
- AI packaging tips based on item description, auto-suggested while typing
- Order timeline with real timestamps (placed → accepted → picked up → in transit → delivered)
- 5-star rating + review after delivery
- Floating AI support widget — resolves FAQs instantly, escalates to a live ticket when it can't

### Driver
- Full-screen "New Order Request" with a 30-second countdown ring (real Uber/Swiggy-style offer UX)
- Google Maps navigation to pickup/drop with one-tap "Open in Maps"
- OTP-based pickup verification before marking picked up
- Photo upload required before marking delivered (delivery proof)
- Cash collection confirmation for COD orders
- Cancel an accepted delivery — system automatically finds and offers the order to the next-best driver, no manual admin intervention needed
- Earnings dashboard with per-order breakdown
- AI-generated smart replies for customer chat messages
- Same AI support widget as customer, driver-specific FAQs (license updates, payment issues, GPS troubleshooting)

### Admin
- Full ticket management dashboard — priority-sorted, live new-ticket socket alerts, assign-to-self, status workflow (open → in progress → waiting on user → resolved → closed)
- AI operations assistant — ask "What's our revenue this week?" or "Any delayed orders right now?" in plain English, answered from real DB queries via Gemini function calling / tool use
- One-click AI fraud check on any driver — analyzes cancellation patterns, flags risk level
- Manual driver reassignment UI — ranked candidate list with live match scores, or one-click "Auto-Assign Best Match"
- Revenue analytics, driver verification queue, user management

---

## 🧠 Where AI Is Used (and Deliberately Not Used)

AI is applied only where it adds real value over deterministic logic — not sprinkled in for its own sake.

**Used:**
- Booking assistant (natural language → structured order data)
- Vehicle recommendation from item description
- Price explanation in plain language
- Packaging advice
- Driver smart-reply suggestions
- Support FAQ answering + escalation judgment
- Admin natural-language data queries
- Driver fraud pattern analysis

**Deliberately NOT used — solved with plain logic instead, and why:**
- **Driver-to-order matching** — this is a scored ranking problem (`distance×40% + rating×20% + acceptance rate×20% + workload×20%`), fully deterministic, debuggable, and instant. Adding an LLM call here would only add latency and cost with zero accuracy benefit. AI-enhanced matching (predicted acceptance probability, ML-tuned weights) is a natural v2 once enough `AssignmentHistory` data exists.
- **Support ticket auto-closing** — AI can *propose* an issue is resolved, but a human always makes the final close decision. This is a trust boundary, not a technical limitation.
- **Safety-critical support messages** (accidents, fraud, legal, self-harm) — bypass AI reasoning entirely via keyword pattern matching before the message ever reaches Gemini. This guarantees these cases are never "handled" by a model that might misjudge severity.

---

## ✅ Feature Checklist — What's Actually Built

### Core Platform
- [x] JWT auth (access + refresh tokens) with Redis token blacklisting on logout
- [x] Email OTP verification on registration
- [x] Full forgot-password flow: email → OTP → reset (single-page wizard with `sessionStorage` refresh recovery, no link-in-email required)
- [x] Role-based route protection (customer/driver/admin), with `isInitialized` gating to prevent flash-of-wrong-page on refresh
- [x] Order lifecycle: pending → accepted → picked up → in transit → delivered/cancelled
- [x] Order cancellation (customer, before pickup) and driver cancellation (after accept, triggers reassignment)

### Real-Time
- [x] Socket.IO with reconnect-safe room rejoining (`pendingRooms` pattern — survives disconnects/refreshes)
- [x] Live driver GPS tracking, 5-second interval, Redis-cached (30s TTL)
- [x] 15km visibility rule — driver location hidden from customer beyond range
- [x] Smooth animated marker movement on Google Maps (not teleporting dots)
- [x] Driver online/offline detection with graceful "reconnecting" UI state
- [x] Live in-app chat (customer ↔ driver) with read receipts

### Payments
- [x] Razorpay integration — order creation, signature verification, webhook handling
- [x] Cash-on-delivery option with driver-side collection confirmation
- [x] Payment status tracking independent of order status

### Driver Reassignment Engine
- [x] Deterministic scoring algorithm (distance/rating/acceptance-rate/workload)
- [x] 30-second offer countdown with automatic timeout → retry next candidate
- [x] Up to 5 retry attempts before falling back to admin
- [x] Full `AssignmentHistory` audit trail (every offer, score breakdown, outcome)
- [x] Admin manual override with the same ranked candidate view

### AI Layer
- [x] Tool-use architecture — Gemini calls pre-built service functions, never raw SQL
- [x] Customer: booking assistant, vehicle recommendation, price explainer, packaging advisor
- [x] Driver: smart reply generator, delivery notes summarizer
- [x] Admin: natural-language ops queries, fraud detection
- [x] Rate-limited (15 req/min) to control cost

### Support Center
- [x] AI-first triage with FAQ knowledge for both customer and driver common questions
- [x] Automatic ticket creation + priority assignment when AI can't resolve
- [x] Hard safety-net escalation for accidents/fraud/legal/self-harm (bypasses AI)
- [x] Live ticket chat (customer/driver ↔ admin) via Socket.IO
- [x] Cheap keyword-based sentiment flagging (frustrated/urgent) — no extra AI call
- [x] Admin dashboard: priority sort, stats, assign, status workflow

### UI/UX
- [x] Dark / light / system theme — zero flash-of-wrong-theme on page load (blocking inline script technique)
- [x] Fully responsive, mobile-first sidebar with drawer
- [x] Notification system with role-aware smart routing (tapping a notification takes you to the right page based on type + role)
- [x] Toast-based error feedback (no jarring page refreshes on validation failure)

### DevOps
- [x] Docker Compose — Postgres, Redis, server, client, one-command local spin-up
- [x] Environment-based config (dev connects to local Postgres via pgAdmin; Docker uses isolated containerized DB — intentionally separate, matching real dev→staging→prod separation)
- [x] Sequelize auto-sync in dev (no manual migrations needed for local development)

---

## 📁 Project Structure

```
deliverpro/
├── client/                          Next.js 14 App Router
│   ├── app/
│   │   ├── customer/                Customer panel
│   │   ├── driver/                  Driver panel
│   │   ├── admin/                   Admin panel
│   │   ├── login, register,
│   │   │   forgot-password/         Auth flows
│   ├── components/
│   │   ├── ai/                      AI-powered UI (booking assistant, smart reply, admin chat...)
│   │   ├── support/                 Support widget + admin ticket dashboard
│   │   ├── shared/                  Layout, Sidebar, Topbar, AuthGuard, ThemeToggle
│   │   └── ui/                      Design system (Card, Badge, Modal, StatCard...)
│   ├── hooks/                       useSocket, useLiveTracking, useDriverTracking,
│   │                                 useAI, useSupportChat, useOrderOffers, useTheme
│   └── redux/slices/                auth, orders, notifications, ui
│
└── server/                          Node.js + Express
    ├── services/
    │   ├── order.service.js         Order CRUD, pricing
    │   ├── matching.service.js      Driver scoring + reassignment engine
    │   ├── payment.service.js       Razorpay integration
    │   ├── ai.service.js            Customer/driver/admin AI features
    │   ├── support-ai.service.js    Support triage + escalation logic
    │   ├── support.service.js       Ticket CRUD, admin notification
    │   └── location.service.js      Redis-cached GPS + 15km filtering
    ├── sockets/index.js             All real-time event handlers
    ├── models/                      User, Driver, Order, Payment, SupportTicket,
    │                                 SupportMessage, AssignmentHistory, ChatMessage
    └── routes/                      REST API, role-protected, rate-limited
```

---

## 🚀 Quick Start

```bash
# Clone and configure
cp .env.example .env
# Fill in: DATABASE_URL, REDIS_URL, JWT secrets, RAZORPAY keys,
# GEMINI_API_KEY, GOOGLE_MAPS_API_KEY

# Local development
cd server && npm install && npm run dev     # auto-creates tables via Sequelize sync
cd client && npm install && npm run dev

# OR full stack via Docker
docker-compose up --build
```

Default admin (auto-seeded on first run): `admin@delivery.com` / `Admin@1234`

---

## 🗺️ What's Deliberately Deferred (and why)

Every "not built yet" item below was a conscious scope decision, not an oversight:

| Feature | Why deferred |
|---|---|
| AI-enhanced driver matching (predicted acceptance probability) | Needs weeks of real `AssignmentHistory` data to train against — premature on a fresh platform, current deterministic scoring already works well |
| Multi-language chat translation | Adds per-message latency to every chat interaction; better as an opt-in toggle once core flows are stable |
| Demand prediction / driver positioning | Needs historical order volume by time/location — no signal yet on a new platform |
| Voice support | Natural v2, not core to proving the platform works |
| Admin AI-suggested ticket replies | Same tool-use pattern as `AISmartReply` for drivers — clear next step, not yet wired |

---

## 👨‍💻 Author

Shubham Meshram