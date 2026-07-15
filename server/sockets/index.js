// const { Server } = require("socket.io");
// const jwt = require("jsonwebtoken");
// const { Op } = require("sequelize");
// const { Driver, ChatMessage, Order, User ,SupportTicket,SupportMessage} = require("../models");
// const { cacheSet } = require("../config/redis");
// const { setIo } = require("../utils/notifications");
// const logger = require("../utils/logger");
// // const calculateDistance = require("../utils/distance")

// let io;

// const initSocket = (server) => {
//   io = new Server(server, {
//     cors: {
//       origin: process.env.CLIENT_URL || "http://localhost:3000",
//       methods: ["GET", "POST"],
//       credentials: true,
//     },
//     transports: ["websocket", "polling"],
//     pingTimeout: 60000,
//     pingInterval: 25000,
//   });

//   // ===============================
//   // AUTH MIDDLEWARE
//   // ===============================
//   io.use(async (socket, next) => {
//     try {
//       const token =
//         socket.handshake.auth?.token ||
//         socket.handshake.headers?.authorization?.split(" ")[1];

//       if (!token) return next(new Error("No token"));

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       socket.userId = decoded.id;

//       next();
//     } catch (err) {
//       next(new Error("Invalid token"));
//     }
//   });

//   // ===============================
//   // CONNECTION
//   // ===============================
//   io.on("connection", async (socket) => {
//     logger.info(`Socket connected: ${socket.id} user:${socket.userId}`);

//     // Prevent duplicate joins
//     socket.join(`user:${socket.userId}`);

//     // ===============================
//     // DRIVER ONLINE
//     // ===============================
//     socket.on("driver:online", async () => {
//       await Driver.update(
//         { isOnline: true, isAvailable: true },
//         { where: { userId: socket.userId } },
//       ).catch(() => {});
//     });

//     // ===============================
//     // DRIVER LOCATION
//     // ===============================
   

//     function calculateDistance(lat1, lon1, lat2, lon2) {
//       const R = 6371;

//       const dLat = ((lat2 - lat1) * Math.PI) / 180;
//       const dLon = ((lon2 - lon1) * Math.PI) / 180;

//       const a =
//         Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//         Math.cos((lat1 * Math.PI) / 180) *
//           Math.cos((lat2 * Math.PI) / 180) *
//           Math.sin(dLon / 2) *
//           Math.sin(dLon / 2);

//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//       return R * c;
//     }

//     socket.on("driver:location", async ({ lat, lng, orderId }) => {
//       try {
//         // Always update cache and DB
//         await cacheSet(
//           `driver-location:${socket.userId}`,
//           { lat, lng, updatedAt: Date.now() },
//           60,
//         );

//         await Driver.update(
//           {
//             currentLat: lat,
//             currentLng: lng,
//             driverLastLocationAt: new Date(),
//           },
//           { where: { userId: socket.userId } },
//         ).catch(() => {});

//         if (!orderId) return;

//         const order = await Order.findByPk(orderId, {
//           attributes: [
//             "id",
//             "pickupLat",
//             "pickupLng",
//             "dropLat",
//             "dropLng",
//             "driverStatus",
//             "status",
//             "customerId",
//           ],
//         });

//         if (!order) return;
//         if (!["accepted", "picked_up", "in_transit"].includes(order.status))
//           return;

//         const distanceToPickup = calculateDistance(
//           lat,
//           lng,
//           order.pickupLat,
//           order.pickupLng,
//         );
//         const distanceToDrop = calculateDistance(
//           lat,
//           lng,
//           order.dropLat,
//           order.dropLng,
//         );

//         // ← KEY FIX: Only emit if within 15km of either pickup or drop
//         const MIN_DISTANCE_KM = 15;
//         if (
//           distanceToPickup > MIN_DISTANCE_KM &&
//           distanceToDrop > MIN_DISTANCE_KM
//         ) {
//           console.log(
//             `[Socket] Driver ${socket.userId} too far (${Math.min(distanceToPickup, distanceToDrop).toFixed(1)}km) — not emitting`,
//           );
//           return;
//         }

//         // Update driverStatus if arrived at pickup
//         let driverStatus = order.driverStatus;
//         if (
//           distanceToPickup <= 0.2 &&
//           order.driverStatus === "going_to_pickup"
//         ) {
//           driverStatus = "arrived_pickup";
//           await Order.update(
//             {
//               driverStatus: "arrived_pickup",
//               driverLastLocationAt: new Date(),
//             },
//             { where: { id: orderId } },
//           );
//         }

//         const payload = {
//           lat: Number(lat),
//           lng: Number(lng),
//           driverId: socket.userId,
//           orderId,
//           driverStatus,
//           distanceToPickup: parseFloat(distanceToPickup.toFixed(2)),
//           distanceToDrop: parseFloat(distanceToDrop.toFixed(2)),
//           updatedAt: Date.now(),
//         };

//         console.log(`[Socket] Emitting location to order:${orderId}`, {
//           lat,
//           lng,
//           distanceToPickup,
//         });
//         io.to(`order:${orderId}`).emit("order:location", payload);
//       } catch (error) {
//         console.error("[Socket] driver:location error:", error.message);
//       }
//     });

//     socket.on("order:track", ({ orderId }) => {
//       const roomName = `order:${orderId}`;

//       socket.join(roomName);

//       console.log(`✅ User ${socket.userId} joined room ${roomName}`);

//       console.log("Current rooms:", Array.from(socket.rooms));
//     });

//     socket.on("order:untrack", ({ orderId }) => {
//       const roomName = `order:${orderId}`;

//       socket.leave(roomName);

//       console.log(`❌ User ${socket.userId} left room ${roomName}`);
//     });

//     // ===============================
//     // CHAT READ RECEIPT
//     // ===============================
//     // =================================================================
//     // CHAT SYSTEM (FIXED & OPTIMIZED)
//     // =================================================================
    
//     socket.on("chat:send", async (payload, callback) => {
//       try {
//         const { orderId, message, senderRole } = payload;

//         if (!message?.trim() || !orderId) {
//           return callback?.({ success: false, error: "Invalid message data" });
//         }

//         // 1. Ensure this current socket is securely joined to the order room channel
//         socket.join(`order:${orderId}`);

//         // 2. Save message to database cleanly
//         const msg = await ChatMessage.create({
//           orderId,
//           senderId: socket.userId,
//           senderRole: senderRole || "customer",
//           message: message.trim(),
//         });

//         const response = {
//           id: msg.id,
//           orderId,
//           senderId: socket.userId,
//           senderRole: msg.senderRole,
//           message: msg.message,
//           createdAt: msg.createdAt,
//         };

//         // ── CRITICAL FIX ──
//         // Option A: Emit 'message' if your frontend useSocket hook expects socket.on("message")
//         io.to(`order:${orderId}`).emit("message", response);

//         // Option B: If you prefer keeping standard namespaces, use:
//         // io.to(`order:${orderId}`).emit("chat:message", response); 
//         // (If you use Option B, change your frontend hooks/useSocket to listen to "chat:message")


//         // 3. Fire-and-forget notification fetch so it doesn't block fast message deliveries
//         setImmediate(async () => {
//           try {
//             const order = await Order.findByPk(orderId, {
//               attributes: ["id", "customerId"],
//               include: [
//                 { model: User, as: "customer", attributes: ["id", "name"] },
//                 { 
//                   model: Driver, 
//                   as: "driver", 
//                   attributes: ["id"],
//                   include: [{ model: User, as: "user", attributes: ["id", "name"] }] 
//                 },
//               ],
//             });

//             if (!order) return;
//             const { sendNotification } = require("../utils/notifications");

//             // CUSTOMER -> DRIVER
//             if (senderRole === "customer" && order.driver?.user?.id) {
//               await sendNotification(order.driver.user.id, {
//                 title: "New Message",
//                 body: `${order.customer?.name || "Customer"}: ${message}`,
//                 type: "chat",
//                 data: { orderId, senderId: socket.userId },
//               });
//             }

//             // DRIVER -> CUSTOMER
//             if (senderRole === "driver" && order.customer?.id) {
//               await sendNotification(order.customer.id, {
//                 title: "Driver Message",
//                 body: `${order.driver?.user?.name || "Driver"}: ${message}`,
//                 type: "chat",
//                 data: { orderId, senderId: socket.userId },
//               });
//             }
//           } catch (notificationError) {
//             logger.error("Asynchronous push notification breakdown:", notificationError);
//           }
//         });

//         // 4. Respond back to sender successfully
//         callback?.({
//           success: true,
//           data: response,
//         });

//       } catch (err) {
//         logger.error("Chat send error:", err);
//         callback?.({
//           success: false,
//           error: "Chat failed to route safely",
//         });
//       }
//     });
    
//     socket.on("chat:read", async ({ orderId }) => {
//       try {
//         await ChatMessage.update(
//           { isRead: true },
//           {
//             where: {
//               orderId,
//               senderId: { [Op.ne]: socket.userId },
//               isRead: false,
//             },
//           },
//         );

//         io.to(`order:${orderId}`).emit("chat:read", {
//           orderId,
//           readBy: socket.userId,
//         });
//       } catch (err) {
//         logger.error("Chat read error:", err.message);
//       }
//     });


// // ── Join a support ticket room (customer/driver/admin) ────
// socket.on('support:join', ({ ticketId }) => {
//   if (!ticketId) return;
//   socket.join(`support:${ticketId}`);
//   logger.info(`[Socket] ${socket.userId} joined support:${ticketId}`);
// });

// socket.on('support:leave', ({ ticketId }) => {
//   if (!ticketId) return;
//   socket.leave(`support:${ticketId}`);
// });

// // ── Admin joins the global "admin support" room to get live new-ticket alerts ──
// socket.on('support:admin:subscribe', () => {
//   socket.join('support:admins');
// });

// // ── Send message in a ticket (real-time, in addition to REST) ──
// socket.on('support:message', async ({ ticketId, message, senderType }) => {
//   try {
//     if (!ticketId || !message?.trim()) return;

//     const msg = await SupportMessage.create({
//       ticketId,
//       senderId: socket.userId,
//       senderType, // 'customer' | 'driver' | 'admin'
//       message: message.trim(),
//     });

//     const payload = {
//       id: msg.id,
//       ticketId,
//       senderId: socket.userId,
//       senderType,
//       message: msg.message,
//       createdAt: msg.createdAt,
//     };

//     // Broadcast to everyone in this ticket's room
//     io.to(`support:${ticketId}`).emit('support:message', payload);

//     // If admin sent it, update ticket status
//     if (senderType === 'admin') {
//       await SupportTicket.update({ status: 'waiting_on_user' }, { where: { id: ticketId } });
//     } else if (senderType !== 'admin') {
//       await SupportTicket.update({ status: 'in_progress' }, { where: { id: ticketId, status: 'waiting_on_user' } });
//     }
//   } catch (e) {
//     logger.error('[Socket] support:message error:', e.message);
//   }
// });

//  // ===============================
//     // DISCONNECT
//     // ===============================
//     socket.on("disconnect", async () => {
//       logger.info(`Socket disconnected: ${socket.id}`);

//       await Driver.update(
//         { isOnline: false },
//         { where: { userId: socket.userId } },
//       ).catch(() => {});
//     });
//   });

//   setIo(io);
//   logger.info("Socket.IO initialized");
//   return io;
// };

// const getIo = () => io;

// module.exports = { initSocket, getIo };




const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { Driver, ChatMessage, Order, User ,SupportTicket,SupportMessage} = require("../models");
const { cacheSet } = require("../config/redis");
const { setIo } = require("../utils/notifications");
const logger = require("../utils/logger");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ===============================
  // AUTH MIDDLEWARE
  // ===============================
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) return next(new Error("No token"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  // ===============================
  // CONNECTION
  // ===============================
  io.on("connection", async (socket) => {
    logger.info(`Socket connected: ${socket.id} user:${socket.userId}`);
    socket.join(`user:${socket.userId}`);

    // ── Driver Online ─────────────────────────────────────────────
    socket.on("driver:online", async () => {
      await Driver.update(
        { isOnline: true, isAvailable: true },
        { where: { userId: socket.userId } },
      ).catch(() => {});
    });

    // ── Driver Location & Distance Calculations ────────────────────
    function calculateDistance(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    socket.on("driver:location", async ({ lat, lng, orderId }) => {
      try {
        await cacheSet(
          `driver-location:${socket.userId}`,
          { lat, lng, updatedAt: Date.now() },
          60,
        );

        await Driver.update(
          {
            currentLat: lat,
            currentLng: lng,
            driverLastLocationAt: new Date(),
          },
          { where: { userId: socket.userId } },
        ).catch(() => {});

        if (!orderId) return;

        const order = await Order.findByPk(orderId, {
          attributes: ["id", "pickupLat", "pickupLng", "dropLat", "dropLng", "driverStatus", "status", "customerId"],
        });

        if (!order || !["accepted", "picked_up", "in_transit"].includes(order.status)) return;

        const distanceToPickup = calculateDistance(lat, lng, order.pickupLat, order.pickupLng);
        const distanceToDrop = calculateDistance(lat, lng, order.dropLat, order.dropLng);

        const MIN_DISTANCE_KM = 15;
        if (distanceToPickup > MIN_DISTANCE_KM && distanceToDrop > MIN_DISTANCE_KM) {
          return;
        }

        let driverStatus = order.driverStatus;
        if (distanceToPickup <= 0.2 && order.driverStatus === "going_to_pickup") {
          driverStatus = "arrived_pickup";
          await Order.update(
            { driverStatus: "arrived_pickup", driverLastLocationAt: new Date() },
            { where: { id: orderId } },
          );
        }

        const payload = {
          lat: Number(lat),
          lng: Number(lng),
          driverId: socket.userId,
          orderId,
          driverStatus,
          distanceToPickup: parseFloat(distanceToPickup.toFixed(2)),
          distanceToDrop: parseFloat(distanceToDrop.toFixed(2)),
          updatedAt: Date.now(),
        };

        io.to(`order:${orderId}`).emit("order:location", payload);
      } catch (error) {
        logger.error(`[Socket] driver:location error: ${error.message}`);
      }
    });

    // ── Order Tracking Rooms ──────────────────────────────────────
    socket.on("order:track", ({ orderId }) => {
      socket.join(`order:${orderId}`);
    });

    socket.on("order:untrack", ({ orderId }) => {
      socket.leave(`order:${orderId}`);
    });

    // ── Order Matching Analytics (NEW) ────────────────────────────
    socket.on('order:offer:seen', ({ orderId }) => {
      logger.info(`[Socket] Driver ${socket.userId} saw offer for order ${orderId}`);
    });

    // ── Chat Engine ───────────────────────────────────────────────
    socket.on("chat:send", async (payload, callback) => {
      try {
        const { orderId, message, senderRole } = payload;
        if (!message?.trim() || !orderId) {
          return callback?.({ success: false, error: "Invalid message data" });
        }

        socket.join(`order:${orderId}`);

        const msg = await ChatMessage.create({
          orderId,
          senderId: socket.userId,
          senderRole: senderRole || "customer",
          message: message.trim(),
        });

        const response = {
          id: msg.id,
          orderId,
          senderId: socket.userId,
          senderRole: msg.senderRole,
          message: msg.message,
          createdAt: msg.createdAt,
        };

        io.to(`order:${orderId}`).emit("message", response);

        setImmediate(async () => {
          try {
            const order = await Order.findByPk(orderId, {
              attributes: ["id", "customerId"],
              include: [
                { model: User, as: "customer", attributes: ["id", "name"] },
                { 
                  model: Driver, 
                  as: "driver", 
                  attributes: ["id"],
                  include: [{ model: User, as: "user", attributes: ["id", "name"] }] 
                },
              ],
            });

            if (!order) return;
            const { sendNotification } = require("../utils/notifications");

            if (senderRole === "customer" && order.driver?.user?.id) {
              await sendNotification(order.driver.user.id, {
                title: "New Message",
                body: `${order.customer?.name || "Customer"}: ${message}`,
                type: "chat",
                data: { orderId, senderId: socket.userId },
              });
            }

            if (senderRole === "driver" && order.customer?.id) {
              await sendNotification(order.customer.id, {
                title: "Driver Message",
                body: `${order.driver?.user?.name || "Driver"}: ${message}`,
                type: "chat",
                data: { orderId, senderId: socket.userId },
              });
            }
          } catch (notificationError) {
            logger.error("Asynchronous push notification breakdown:", notificationError);
          }
        });

        callback?.({ success: true, data: response });
      } catch (err) {
        logger.error("Chat send error:", err);
        callback?.({ success: false, error: "Chat failed to route safely" });
      }
    });
    
    socket.on("chat:read", async ({ orderId }) => {
      try {
        await ChatMessage.update(
          { isRead: true },
          { where: { orderId, senderId: { [Op.ne]: socket.userId }, isRead: false } },
        );
        io.to(`order:${orderId}`).emit("chat:read", { orderId, readBy: socket.userId });
      } catch (err) {
        logger.error("Chat read error:", err.message);
      }
    });

    // ── Support Ticket System ─────────────────────────────────────
    socket.on('support:join', ({ ticketId }) => {
      if (!ticketId) return;
      socket.join(`support:${ticketId}`);
    });

    socket.on('support:leave', ({ ticketId }) => {
      if (!ticketId) return;
      socket.leave(`support:${ticketId}`);
    });

    socket.on('support:admin:subscribe', () => {
      socket.join('support:admins');
    });

    socket.on('support:message', async ({ ticketId, message, senderType }) => {
      try {
        if (!ticketId || !message?.trim()) return;

        const msg = await SupportMessage.create({
          ticketId,
          senderId: socket.userId,
          senderType,
          message: message.trim(),
        });

        io.to(`support:${ticketId}`).emit('support:message', {
          id: msg.id, ticketId, senderId: socket.userId, senderType, message: msg.message, createdAt: msg.createdAt
        });

        if (senderType === 'admin') {
          await SupportTicket.update({ status: 'waiting_on_user' }, { where: { id: ticketId } });
        } else {
          await SupportTicket.update({ status: 'in_progress' }, { where: { id: ticketId, status: 'waiting_on_user' } });
        }
      } catch (e) {
        logger.error('[Socket] support:message error:', e.message);
      }
    });

    // ── Disconnect Safeguard ──────────────────────────────────────
    socket.on("disconnect", async () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      
      // FIX: Ensure we do not kick out a driver who is actively completing an ongoing order
      const activeOrder = await Order.findOne({
        where: {
          driverId: socket.userId,
          status: { [Op.in]: ["accepted", "picked_up", "in_transit"] }
        }
      });

      if (!activeOrder) {
        await Driver.update(
          { isOnline: false, isAvailable: false },
          { where: { userId: socket.userId } }
        ).catch(() => {});
      }
    });
  });

  setIo(io);
  logger.info("Socket.IO initialized");
  return io;
};

const getIo = () => io;

module.exports = { initSocket, getIo };
