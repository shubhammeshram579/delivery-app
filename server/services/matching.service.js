// const { Order, Driver, User, AssignmentHistory } = require('../models');
// const { Op } = require('sequelize');
// const { cacheSet, cacheDel } = require('../config/redis');
// const { sendNotification } = require('../utils/notifications');
// const { NotFoundError, ValidationError, AuthorizationError } = require('../middleware/error.middleware');
// const logger = require('../utils/logger');

// const OFFER_TIMEOUT_SECONDS = 60;
// const MAX_RETRY_ATTEMPTS    = 5; 
// const MAX_MATCH_RADIUS_KM   = 15;

// // ── Haversine distance ────────────────────────────────────
// const distanceKm = (lat1, lng1, lat2, lng2) => {
//   if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) return 9999;
//   const R = 6371;
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLng = ((lng2 - lng1) * Math.PI) / 180;
//   const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
//   return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// };

// // ═══════════════════════════════════════════════════════
// // findNearbyDrivers()
// // ═══════════════════════════════════════════════════════
// const findNearbyDrivers = async (order) => {
//   // Safe fallback if JSONB array is null/empty
//   const rejectedIds = Array.isArray(order.rejectedDriverIds) ? order.rejectedDriverIds : [];

//   const driverQueryConditions = {
//     isOnline: true,
//     isAvailable: true,
//     isVerified: true,
//     // Use an invalid placeholder UUID if empty to avoid broken SQL syntax
//     id: { [Op.notIn]: rejectedIds.length ? rejectedIds : ['00000000-0000-0000-0000-000000000000'] },
//     currentLat: { [Op.ne]: null },
//     currentLng: { [Op.ne]: null },
//   };

//   // Enforce vehicle matching restrictions if designated on the order
//   if (order.vehicleType) {
//     driverQueryConditions.vehicleType = order.vehicleType;
//   }

//   const candidates = await Driver.findAll({
//     where: driverQueryConditions,
//     include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone', 'avatar'] }],
//   });

//   return candidates
//     .map((d) => ({
//       driver: d,
//       distance: distanceKm(d.currentLat, d.currentLng, order.pickupLat, order.pickupLng),
//     }))
//     .filter((c) => c.distance <= MAX_MATCH_RADIUS_KM);
// };

// // ═══════════════════════════════════════════════════════
// // calculateDriverScore()
// // ═══════════════════════════════════════════════════════
// const calculateDriverScore = ({ distance, driver }) => {
//   const distanceScore = Math.max(0, 100 - (distance / MAX_MATCH_RADIUS_KM) * 100);
//   const ratingScore = ((driver.rating || 0) / 5) * 100;
//   const acceptanceScore = driver.acceptanceRate ?? 100;
  
//   const activeOrders = driver.currentActiveOrders || 0;
//   const workloadScore = Math.max(0, 100 - (activeOrders / 3) * 100);

//   const finalScore =
//     distanceScore * 0.40 +
//     ratingScore * 0.20 +
//     acceptanceScore * 0.20 +
//     workloadScore * 0.20;

//   return {
//     finalScore: parseFloat(finalScore.toFixed(2)),
//     breakdown: {
//       distance: parseFloat(distance.toFixed(2)),
//       distanceScore: parseFloat(distanceScore.toFixed(1)),
//       ratingScore: parseFloat(ratingScore.toFixed(1)),
//       acceptanceScore: parseFloat(acceptanceScore.toFixed(1)),
//       workloadScore: parseFloat(workloadScore.toFixed(1)),
//     },
//   };
// };

// // ═══════════════════════════════════════════════════════
// // assignBestDriver()
// // ═══════════════════════════════════════════════════════
// const assignBestDriver = async (orderId, { triggeredBy = 'system_auto', adminId = null } = {}) => {
//   const order = await Order.findByPk(orderId);
//   if (!order) throw new NotFoundError('Order');

//   const attempts = order.assignmentAttempts || 0;
//   if (attempts >= MAX_RETRY_ATTEMPTS) {
//     await notifyAdminAssignmentFailed(order);
//     return { success: false, reason: 'max_attempts_exceeded' };
//   }

//   const candidates = await findNearbyDrivers(order);
//   if (candidates.length === 0) {
//     await notifyAdminAssignmentFailed(order);
//     return { success: false, reason: 'no_candidates' };
//   }

//   const scored = candidates.map((c) => ({
//     ...c,
//     ...calculateDriverScore({ distance: c.distance, driver: c.driver }),
//   }));
//   scored.sort((a, b) => b.finalScore - a.finalScore);
//   const best = scored[0];

//   await AssignmentHistory.create({
//     orderId: order.id,
//     driverId: best.driver.id,
//     triggeredBy,
//     adminId,
//     score: best.finalScore,
//     scoreBreakdown: best.breakdown,
//     status: 'offered',
//   });

//   const expiresAt = new Date(Date.now() + OFFER_TIMEOUT_SECONDS * 1000);
//   await order.update({
//     pendingDriverId: best.driver.id,
//     pendingAssignmentExpiresAt: expiresAt,
//     assignmentAttempts: attempts + 1,
//   });

//   await cacheSet(`assignment-timeout:${order.id}`, best.driver.id, OFFER_TIMEOUT_SECONDS);

//   const { getIo } = require('../sockets');
//   const io = getIo();
//   if (io) {
//     io.to(`user:${best.driver.user.id}`).emit('order:offer', {
//       orderId: order.id,
//       orderNumber: order.orderNumber,
//       pickupAddress: order.pickupAddress,
//       dropAddress: order.dropAddress,
//       distance: best.distance,
//       deliveryFee: order.deliveryFee,
//       expiresInSeconds: OFFER_TIMEOUT_SECONDS,
//     });
//   }

//   await sendNotification(best.driver.user.id, {
//     title: '🚚 New delivery request',
//     body: `Order #${order.orderNumber} — ${best.distance.toFixed(1)}km away`,
//     type: 'order',
//     data: { orderId: order.id, expiresInSeconds: OFFER_TIMEOUT_SECONDS },
//   });

//   setTimeout(() => {
//     handleOfferTimeout(order.id, best.driver.id).catch((e) =>
//       logger.error('[Matching] Timeout handler error:', e.message)
//     );
//   }, OFFER_TIMEOUT_SECONDS * 1000);

//   return {
//     success: true,
//     offeredTo: { driverId: best.driver.id, name: best.driver.user.name, score: best.finalScore, distance: best.distance },
//   };
// };

// // ═══════════════════════════════════════════════════════
// // acceptOffer()
// // ═══════════════════════════════════════════════════════
// const acceptOffer = async (orderId, driverUserId) => {
//   const order = await Order.findByPk(orderId);
//   if (!order) throw new NotFoundError('Order');

//   const driver = await Driver.findOne({ where: { userId: driverUserId } });
//   if (!driver) throw new NotFoundError('Driver profile');

//   if (String(order.pendingDriverId) !== String(driver.id)) {
//     throw new ValidationError('This offer is no longer valid or was not sent to you');
//   }
//   if (order.pendingAssignmentExpiresAt && new Date() > new Date(order.pendingAssignmentExpiresAt)) {
//     throw new ValidationError('This offer has expired');
//   }

//   await order.update({
//     driverId: driver.id,
//     status: 'accepted',
//     driverStatus: 'assigned',
//     acceptedAt: new Date(),
//     pendingDriverId: null,
//     pendingAssignmentExpiresAt: null,
//   });

//   await driver.update({
//     isAvailable: false,
//     currentActiveOrders: (driver.currentActiveOrders || 0) + 1,
//     totalAssignmentsOffered: (driver.totalAssignmentsOffered || 0) + 1,
//     totalAssignmentsAccepted: (driver.totalAssignmentsAccepted || 0) + 1,
//   });
//   await recalculateAcceptanceRate(driver.id);

//   await AssignmentHistory.update(
//     { status: 'accepted', respondedAt: new Date() },
//     { where: { orderId, driverId: driver.id, status: 'offered' } }
//   );

//   await cacheDel(`assignment-timeout:${order.id}`);

//   await sendNotification(order.customerId, {
//     title: 'Driver assigned!',
//     body: `Your order #${order.orderNumber} has been accepted`,
//     type: 'order',
//     data: { orderId },
//   });

//   return order;
// };

// // ═══════════════════════════════════════════════════════
// // rejectOffer()
// // ═══════════════════════════════════════════════════════
// const rejectOffer = async (orderId, driverUserId) => {
//   const order = await Order.findByPk(orderId);
//   if (!order) throw new NotFoundError('Order');

//   const driver = await Driver.findOne({ where: { userId: driverUserId } });
//   if (!driver || String(order.pendingDriverId) !== String(driver.id)) {
//     throw new ValidationError('This offer is no longer valid');
//   }

//   await recordRejectionAndRetry(order, driver, 'rejected');
//   return { success: true };
// };

// // ── Shared fallback engine logic ──────────────────────────
// const recordRejectionAndRetry = async (order, driver, status) => {
//   await driver.update({
//     totalAssignmentsOffered: (driver.totalAssignmentsOffered || 0) + 1,
//     totalAssignmentsRejected: (driver.totalAssignmentsRejected || 0) + 1,
//   });
//   await recalculateAcceptanceRate(driver.id);

//   await AssignmentHistory.update(
//     { status, respondedAt: new Date() },
//     { where: { orderId: order.id, driverId: driver.id, status: 'offered' } }
//   );

//   const currentRejected = Array.isArray(order.rejectedDriverIds) ? order.rejectedDriverIds : [];
//   const updatedRejectedIds = [...currentRejected, driver.id];

//   await order.update({
//     rejectedDriverIds: updatedRejectedIds,
//     pendingDriverId: null,
//     pendingAssignmentExpiresAt: null,
//   });

//   await cacheDel(`assignment-timeout:${order.id}`);

//   // Cascade directly into checking the next optimal driver
//   await assignBestDriver(order.id, { triggeredBy: 'system_auto' });
// };

// // ═══════════════════════════════════════════════════════
// // handleOfferTimeout()
// // ═══════════════════════════════════════════════════════
// const handleOfferTimeout = async (orderId, driverId) => {
//   const order = await Order.findByPk(orderId);
//   if (!order || String(order.pendingDriverId) !== String(driverId)) return;

//   const driver = await Driver.findByPk(driverId);
//   if (!driver) return;

//   logger.info(`[Matching] Offer timed out for driver ${driverId} on order ${orderId}`);
//   await recordRejectionAndRetry(order, driver, 'timed_out');
// };

// // ═══════════════════════════════════════════════════════
// // driverCancelOrder()
// // ═══════════════════════════════════════════════════════
// const driverCancelOrder = async (orderId, driverUserId, reason) => {
//   const order = await Order.findByPk(orderId);
//   if (!order) throw new NotFoundError('Order');

//   const driver = await Driver.findOne({ where: { userId: driverUserId } });
//   if (!driver || String(order.driverId) !== String(driver.id)) {
//     throw new AuthorizationError('Not your order');
//   }

//   if (!['accepted', 'picked_up'].includes(order.status)) {
//     throw new ValidationError('Cannot cancel order at this stage');
//   }

//   await AssignmentHistory.create({
//     orderId: order.id,
//     driverId: driver.id,
//     triggeredBy: 'initial_accept',
//     status: 'cancelled_by_driver',
//     cancelReason: reason,
//     offeredAt: order.acceptedAt,
//     respondedAt: new Date(),
//   });

//   await driver.update({
//     isAvailable: true,
//     currentActiveOrders: Math.max(0, (driver.currentActiveOrders || 1) - 1),
//   });

//   const currentRejected = Array.isArray(order.rejectedDriverIds) ? order.rejectedDriverIds : [];
//   const updatedRejectedIds = [...currentRejected, driver.id];

//   await order.update({
//     driverId: null,
//     status: 'pending',
//     wasDriverCancelled: true,
//     driverCancelReason: reason,
//     rejectedDriverIds: updatedRejectedIds,
//     acceptedAt: null,
//   });

//   await sendNotification(order.customerId, {
//     title: 'Finding a new driver',
//     body: `Your previous driver had to cancel. We're matching a new one now.`,
//     type: 'order',
//     data: { orderId },
//   });

//   const result = await assignBestDriver(order.id, { triggeredBy: 'system_auto' });
//   return { order, reassignmentResult: result };
// };

// // ═══════════════════════════════════════════════════════
// // adminAssignDriver()
// // ═══════════════════════════════════════════════════════
// const adminAssignDriver = async (orderId, driverId, adminId) => {
//   const order = await Order.findByPk(orderId);
//   if (!order) throw new NotFoundError('Order');

//   const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
//   if (!driver) throw new NotFoundError('Driver');

//   await AssignmentHistory.create({
//     orderId: order.id,
//     driverId: driver.id,
//     triggeredBy: 'admin_manual',
//     adminId,
//     status: 'accepted',
//     offeredAt: new Date(),
//     respondedAt: new Date(),
//   });

//   await order.update({
//     driverId: driver.id,
//     status: 'accepted',
//     driverStatus: 'assigned',
//     acceptedAt: new Date(),
//     pendingDriverId: null,
//     pendingAssignmentExpiresAt: null,
//   });

//   await driver.update({
//     isAvailable: false,
//     currentActiveOrders: (driver.currentActiveOrders || 0) + 1,
//   });

//   await sendNotification(driver.user.id, {
//     title: 'New assignment',
//     body: `Order #${order.orderNumber} manually assigned to you by administration.`,
//     type: 'order',
//     data: { orderId },
//   });

//   return order;
// };

// // ═══════════════════════════════════════════════════════
// // getAssignmentCandidates()
// // ═══════════════════════════════════════════════════════
// const getAssignmentCandidates = async (orderId) => {
//   const order = await Order.findByPk(orderId);
//   if (!order) throw new NotFoundError('Order');

//   const candidates = await findNearbyDrivers(order);
//   const scored = candidates.map((c) => ({
//     driverId: c.driver.id,
//     name: c.driver.user.name,
//     phone: c.driver.user.phone,
//     avatar: c.driver.user.avatar,
//     vehicleType: c.driver.vehicleType,
//     rating: c.driver.rating,
//     distance: parseFloat(c.distance.toFixed(2)),
//     currentActiveOrders: c.driver.currentActiveOrders || 0,
//     ...calculateDriverScore({ distance: c.distance, driver: c.driver }),
//   }));
  
//   return scored.sort((a, b) => b.finalScore - a.finalScore);
// };

// // ═══════════════════════════════════════════════════════
// // notifyAdminAssignmentFailed()
// // ═══════════════════════════════════════════════════════
// const notifyAdminAssignmentFailed = async (order) => {
//   const admins = await User.findAll({ where: { role: 'admin' }, attributes: ['id'] });
//   for (const admin of admins) {
//     await sendNotification(admin.id, {
//       title: '⚠️ Matching Failed',
//       body: `Order #${order.orderNumber} requires intervention. Max retries hit or zero nearby drivers.`,
//       type: 'order',
//       data: { orderId: order.id, requiresManualAssignment: true },
//     });
//   }
//   logger.warn(`[Matching] Order ${order.id} flagged for manual dispatch.`);
// };

// // ── Rate calculator ───────────────────────────────────────
// const recalculateAcceptanceRate = async (driverId) => {
//   const driver = await Driver.findByPk(driverId);
//   if (!driver || !driver.totalAssignmentsOffered) return;
//   const rate = (driver.totalAssignmentsAccepted / driver.totalAssignmentsOffered) * 100;
//   await driver.update({ acceptanceRate: parseFloat(rate.toFixed(1)) });
// };

// module.exports = {
//   findNearbyDrivers,
//   calculateDriverScore,
//   assignBestDriver,
//   acceptOffer,
//   rejectOffer,
//   driverCancelOrder,
//   adminAssignDriver,
//   getAssignmentCandidates,
//   notifyAdminAssignmentFailed,
// };


const { Order, Driver, User, AssignmentHistory } = require('../models');
const { Op } = require('sequelize');
const { cacheSet, cacheDel } = require('../config/redis');
const { sendNotification } = require('../utils/notifications');
// Import the new admin notification helper utility
const { notifyAdmins } = require('../utils/adminNotification');
const { NotFoundError, ValidationError, AuthorizationError } = require('../middleware/error.middleware');
const logger = require('../utils/logger');

const OFFER_TIMEOUT_SECONDS = 60;
const MAX_RETRY_ATTEMPTS    = 5; 
const MAX_MATCH_RADIUS_KM   = 15;

// ── Haversine distance ────────────────────────────────────
const distanceKm = (lat1, lng1, lat2, lng2) => {
  if (lat1 === null || lng1 === null || lat2 === null || lng2 === null) return 9999;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ═══════════════════════════════════════════════════════
// findNearbyDrivers()
// ═══════════════════════════════════════════════════════
const findNearbyDrivers = async (order) => {
  const rejectedIds = Array.isArray(order.rejectedDriverIds) ? order.rejectedDriverIds : [];

  const driverQueryConditions = {
    isOnline: true,
    isAvailable: true,
    isVerified: true,
    id: { [Op.notIn]: rejectedIds.length ? rejectedIds : ['00000000-0000-0000-0000-000000000000'] },
    currentLat: { [Op.ne]: null },
    currentLng: { [Op.ne]: null },
  };

  if (order.vehicleType) {
    driverQueryConditions.vehicleType = order.vehicleType;
  }

  const candidates = await Driver.findAll({
    where: driverQueryConditions,
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone', 'avatar'] }],
  });

  return candidates
    .map((d) => ({
      driver: d,
      distance: distanceKm(d.currentLat, d.currentLng, order.pickupLat, order.pickupLng),
    }))
    .filter((c) => c.distance <= MAX_MATCH_RADIUS_KM);
};

// ═══════════════════════════════════════════════════════
// calculateDriverScore()
// ═══════════════════════════════════════════════════════
const calculateDriverScore = ({ distance, driver }) => {
  const distanceScore = Math.max(0, 100 - (distance / MAX_MATCH_RADIUS_KM) * 100);
  const ratingScore = ((driver.rating || 0) / 5) * 100;
  const acceptanceScore = driver.acceptanceRate ?? 100;
  
  const activeOrders = driver.currentActiveOrders || 0;
  const workloadScore = Math.max(0, 100 - (activeOrders / 3) * 100);

  const finalScore =
    distanceScore * 0.40 +
    ratingScore * 0.20 +
    acceptanceScore * 0.20 +
    workloadScore * 0.20;

  return {
    finalScore: parseFloat(finalScore.toFixed(2)),
    breakdown: {
      distance: parseFloat(distance.toFixed(2)),
      distanceScore: parseFloat(distanceScore.toFixed(1)),
      ratingScore: parseFloat(ratingScore.toFixed(1)),
      acceptanceScore: parseFloat(acceptanceScore.toFixed(1)),
      workloadScore: parseFloat(workloadScore.toFixed(1)),
    },
  };
};

// ═══════════════════════════════════════════════════════
// assignBestDriver()
// ═══════════════════════════════════════════════════════
const assignBestDriver = async (orderId, { triggeredBy = 'system_auto', adminId = null } = {}) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new NotFoundError('Order');

  const attempts = order.assignmentAttempts || 0;
  if (attempts >= MAX_RETRY_ATTEMPTS) {
    await notifyAdminAssignmentFailed(order);
    return { success: false, reason: 'max_attempts_exceeded' };
  }

  const candidates = await findNearbyDrivers(order);
  if (candidates.length === 0) {
    await notifyAdminAssignmentFailed(order);
    return { success: false, reason: 'no_candidates' };
  }

  const scored = candidates.map((c) => ({
    ...c,
    ...calculateDriverScore({ distance: c.distance, driver: c.driver }),
  }));
  scored.sort((a, b) => b.finalScore - a.finalScore);
  const best = scored[0];

  await AssignmentHistory.create({
    orderId: order.id,
    driverId: best.driver.id,
    triggeredBy,
    adminId,
    score: best.finalScore,
    scoreBreakdown: best.breakdown,
    status: 'offered',
  });

  const expiresAt = new Date(Date.now() + OFFER_TIMEOUT_SECONDS * 1000);
  await order.update({
    pendingDriverId: best.driver.id,
    pendingAssignmentExpiresAt: expiresAt,
    assignmentAttempts: attempts + 1,
  });

  await cacheSet(`assignment-timeout:${order.id}`, best.driver.id, OFFER_TIMEOUT_SECONDS);

  const { getIo } = require('../sockets');
  const io = getIo();
  if (io) {
    io.to(`user:${best.driver.user.id}`).emit('order:offer', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      pickupAddress: order.pickupAddress,
      dropAddress: order.dropAddress,
      distance: best.distance,
      deliveryFee: order.deliveryFee,
      expiresInSeconds: OFFER_TIMEOUT_SECONDS,
    });
  }

  // Notifying DRIVER -> Uses standard sendNotification
  await sendNotification(best.driver.user.id, {
    title: '🚚 New delivery request',
    body: `Order #${order.orderNumber} — ${best.distance.toFixed(1)}km away`,
    type: 'order',
    data: { orderId: order.id, expiresInSeconds: OFFER_TIMEOUT_SECONDS },
  });

  setTimeout(() => {
    handleOfferTimeout(order.id, best.driver.id).catch((e) =>
      logger.error('[Matching] Timeout handler error:', e.message)
    );
  }, OFFER_TIMEOUT_SECONDS * 1000);

  return {
    success: true,
    offeredTo: { driverId: best.driver.id, name: best.driver.user.name, score: best.finalScore, distance: best.distance },
  };
};

// ═══════════════════════════════════════════════════════
// acceptOffer()
// ═══════════════════════════════════════════════════════
const acceptOffer = async (orderId, driverUserId) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new NotFoundError('Order');

  const driver = await Driver.findOne({ where: { userId: driverUserId } });
  if (!driver) throw new NotFoundError('Driver profile');

  if (String(order.pendingDriverId) !== String(driver.id)) {
    throw new ValidationError('This offer is no longer valid or was not sent to you');
  }
  if (order.pendingAssignmentExpiresAt && new Date() > new Date(order.pendingAssignmentExpiresAt)) {
    throw new ValidationError('This offer has expired');
  }

  await order.update({
    driverId: driver.id,
    status: 'accepted',
    driverStatus: 'assigned',
    acceptedAt: new Date(),
    pendingDriverId: null,
    pendingAssignmentExpiresAt: null,
  });

  await driver.update({
    isAvailable: false,
    currentActiveOrders: (driver.currentActiveOrders || 0) + 1,
    totalAssignmentsOffered: (driver.totalAssignmentsOffered || 0) + 1,
    totalAssignmentsAccepted: (driver.totalAssignmentsAccepted || 0) + 1,
  });
  await recalculateAcceptanceRate(driver.id);

  await AssignmentHistory.update(
    { status: 'accepted', respondedAt: new Date() },
    { where: { orderId, driverId: driver.id, status: 'offered' } }
  );

  await cacheDel(`assignment-timeout:${order.id}`);

  // Notifying CUSTOMER -> Uses standard sendNotification
  await sendNotification(order.customerId, {
    title: 'Driver assigned!',
    body: `Your order #${order.orderNumber} has been accepted`,
    type: 'order',
    data: { orderId },
  });

  return order;
};

// ═══════════════════════════════════════════════════════
// rejectOffer()
// ═══════════════════════════════════════════════════════
const rejectOffer = async (orderId, driverUserId) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new NotFoundError('Order');

  const driver = await Driver.findOne({ where: { userId: driverUserId } });
  if (!driver || String(order.pendingDriverId) !== String(driver.id)) {
    throw new ValidationError('This offer is no longer valid');
  }

  await recordRejectionAndRetry(order, driver, 'rejected');
  return { success: true };
};

// ── Shared fallback engine logic ──────────────────────────
const recordRejectionAndRetry = async (order, driver, status) => {
  await driver.update({
    totalAssignmentsOffered: (driver.totalAssignmentsOffered || 0) + 1,
    totalAssignmentsRejected: (driver.totalAssignmentsRejected || 0) + 1,
  });
  await recalculateAcceptanceRate(driver.id);

  await AssignmentHistory.update(
    { status, respondedAt: new Date() },
    { where: { orderId: order.id, driverId: driver.id, status: 'offered' } }
  );

  const currentRejected = Array.isArray(order.rejectedDriverIds) ? order.rejectedDriverIds : [];
  const updatedRejectedIds = [...currentRejected, driver.id];

  await order.update({
    rejectedDriverIds: updatedRejectedIds,
    pendingDriverId: null,
    pendingAssignmentExpiresAt: null,
  });

  await cacheDel(`assignment-timeout:${order.id}`);

  await assignBestDriver(order.id, { triggeredBy: 'system_auto' });
};

// ═══════════════════════════════════════════════════════
// handleOfferTimeout()
// ═══════════════════════════════════════════════════════
const handleOfferTimeout = async (orderId, driverId) => {
  const order = await Order.findByPk(orderId);
  if (!order || String(order.pendingDriverId) !== String(driverId)) return;

  const driver = await Driver.findByPk(driverId);
  if (!driver) return;

  logger.info(`[Matching] Offer timed out for driver ${driverId} on order ${orderId}`);
  await recordRejectionAndRetry(order, driver, 'timed_out');
};

// ═══════════════════════════════════════════════════════
// driverCancelOrder()
// ═══════════════════════════════════════════════════════
const driverCancelOrder = async (orderId, driverUserId, reason) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new NotFoundError('Order');

  const driver = await Driver.findOne({ where: { userId: driverUserId } });
  if (!driver || String(order.driverId) !== String(driver.id)) {
    throw new AuthorizationError('Not your order');
  }

  if (!['accepted', 'picked_up'].includes(order.status)) {
    throw new ValidationError('Cannot cancel order at this stage');
  }

  await AssignmentHistory.create({
    orderId: order.id,
    driverId: driver.id,
    triggeredBy: 'initial_accept',
    status: 'cancelled_by_driver',
    cancelReason: reason,
    offeredAt: order.acceptedAt,
    respondedAt: new Date(),
  });

  await driver.update({
    isAvailable: true,
    currentActiveOrders: Math.max(0, (driver.currentActiveOrders || 1) - 1),
  });

  const currentRejected = Array.isArray(order.rejectedDriverIds) ? order.rejectedDriverIds : [];
  const updatedRejectedIds = [...currentRejected, driver.id];

  await order.update({
    driverId: null,
    status: 'pending',
    wasDriverCancelled: true,
    driverCancelReason: reason,
    rejectedDriverIds: updatedRejectedIds,
    acceptedAt: null,
  });

  // Notifying CUSTOMER -> Uses standard sendNotification
  await sendNotification(order.customerId, {
    title: 'Finding a new driver',
    body: `Your previous driver had to cancel. We're matching a new one now.`,
    type: 'order',
    data: { orderId },
  });

  const result = await assignBestDriver(order.id, { triggeredBy: 'system_auto' });
  return { order, reassignmentResult: result };
};

// ═══════════════════════════════════════════════════════
// adminAssignDriver()
// ═══════════════════════════════════════════════════════
const adminAssignDriver = async (orderId, driverId, adminId) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new NotFoundError('Order');

  const driver = await Driver.findByPk(driverId, { include: [{ model: User, as: 'user' }] });
  if (!driver) throw new NotFoundError('Driver');

  await AssignmentHistory.create({
    orderId: order.id,
    driverId: driver.id,
    triggeredBy: 'admin_manual',
    adminId,
    status: 'accepted',
    offeredAt: new Date(),
    respondedAt: new Date(),
  });

  await order.update({
    driverId: driver.id,
    status: 'accepted',
    driverStatus: 'assigned',
    acceptedAt: new Date(),
    pendingDriverId: null,
    pendingAssignmentExpiresAt: null,
  });

  await driver.update({
    isAvailable: false,
    currentActiveOrders: (driver.currentActiveOrders || 0) + 1,
  });

  // Notifying DRIVER -> Uses standard sendNotification
  await sendNotification(driver.user.id, {
    title: 'New assignment',
    body: `Order #${order.orderNumber} manually assigned to you by administration.`,
    type: 'order',
    data: { orderId },
  });

  return order;
};

// ═══════════════════════════════════════════════════════
// getAssignmentCandidates()
// ═══════════════════════════════════════════════════════
const getAssignmentCandidates = async (orderId) => {
  const order = await Order.findByPk(orderId);
  if (!order) throw new NotFoundError('Order');

  const candidates = await findNearbyDrivers(order);
  const scored = candidates.map((c) => ({
    driverId: c.driver.id,
    name: c.driver.user.name,
    phone: c.driver.user.phone,
    avatar: c.driver.user.avatar,
    vehicleType: c.driver.vehicleType,
    rating: c.driver.rating,
    distance: parseFloat(c.distance.toFixed(2)),
    currentActiveOrders: c.driver.currentActiveOrders || 0,
    ...calculateDriverScore({ distance: c.distance, driver: c.driver }),
  }));
  
  return scored.sort((a, b) => b.finalScore - a.finalScore);
};

// ═══════════════════════════════════════════════════════
// notifyAdminAssignmentFailed()
// ═══════════════════════════════════════════════════════
const notifyAdminAssignmentFailed = async (order) => {
  // Clean abstraction: Using the notifyAdmins utility helper to message all admins
  await notifyAdmins({
    title: '⚠️ Matching Failed',
    body: `Order #${order.orderNumber} requires intervention. Max retries hit or zero nearby drivers.`,
    type: 'order',
    data: { orderId: order.id, requiresManualAssignment: true },
  });

  logger.warn(`[Matching] Order ${order.id} flagged for manual dispatch.`);
};

// ── Rate calculator ───────────────────────────────────────
const recalculateAcceptanceRate = async (driverId) => {
  const driver = await Driver.findByPk(driverId);
  if (!driver || !driver.totalAssignmentsOffered) return;
  const rate = (driver.totalAssignmentsAccepted / driver.totalAssignmentsOffered) * 100;
  await driver.update({ acceptanceRate: parseFloat(rate.toFixed(1)) });
};

module.exports = {
  findNearbyDrivers,
  calculateDriverScore,
  assignBestDriver,
  acceptOffer,
  rejectOffer,
  driverCancelOrder,
  adminAssignDriver,
  getAssignmentCandidates,
  notifyAdminAssignmentFailed,
};