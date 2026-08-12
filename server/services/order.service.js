const axios = require("axios");

const { Op } = require("sequelize");

const { sequelize } = require("../config/database");

const { Order, Driver, User, Payment, Earnings } = require("../models");

const {
  cacheSet,
  cacheGet,
  cacheDel,
  cacheDelByPattern,
} = require("../config/redis");

const { sendEmail } = require("../utils/email");

const {
  NotFoundError,
  ValidationError,
  AuthorizationError,
} = require("../middleware/error.middleware");

const {orderEscalationQueue} = require("../utils/orderWorker")
const { sendNotification } = require("../utils/notifications");
const {notifyAdmins} = require("../utils/adminNotification");


const {getRazorpay} = require("../services/payment.service")

// let _razorpay = null;
// const getRazorpay = () => {
//   if (!_razorpay) {
//     const Razorpay = require('razorpay');
//     _razorpay = new Razorpay({
//       key_id: process.env.RAZORPAY_KEY_ID,
//       key_secret: process.env.RAZORPAY_KEY_SECRET,
//     });
//   }
//   return _razorpay;
// };

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PLATFORM_FEE_PERCENT = 0.15;

// ─────────────────────────────────────────────
// Price Calculation
// ─────────────────────────────────────────────

const calculatePrice = (distanceKm, weightKg, orderType) => {
  const basePrice = 20;
  const distanceFee = distanceKm * 8;
  
  // No weight calculation for passenger rides
  const weightFee = orderType === "passenger" ? 0 : (Number(weightKg) || 0) * 5;

  const deliveryFee = distanceFee + weightFee;
  const totalAmount = basePrice + deliveryFee;

  return {
    basePrice,
    deliveryFee: parseFloat(deliveryFee.toFixed(2)),
    totalAmount: parseFloat(totalAmount.toFixed(2)),
  };
};

// ─────────────────────────────────────────────
// Haversine Distance
// ─────────────────────────────────────────────

const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;

  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// ─────────────────────────────────────────────
// Route Info
// ─────────────────────────────────────────────

const getRouteInfo = async (pickupLat, pickupLng, dropLat, dropLng) => {
  try {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      throw new Error("No API key");
    }

    const resp = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          origins: `${pickupLat},${pickupLng}`,

          destinations: `${dropLat},${dropLng}`,

          key: process.env.GOOGLE_MAPS_API_KEY,

          mode: "driving",
        },

        timeout: 5000,
      },
    );

    const element = resp.data.rows[0]?.elements[0];

    if (element?.status !== "OK") {
      throw new Error("No route");
    }

    return {
      distanceKm: element.distance.value / 1000,

      durationMin: Math.ceil(element.duration.value / 60),
    };
  } catch {
    const distanceKm = calculateDistance(
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
    );

    return {
      distanceKm: parseFloat(distanceKm.toFixed(2)),

      durationMin: Math.ceil(distanceKm * 3),
    };
  }
};

// ─────────────────────────────────────────────
// Find Nearest Driver
// ─────────────────────────────────────────────

const findNearestDriver = async (pickupLat, pickupLng,orderType) => {

  let allowedVehicles = [];
  if (orderType === 'passenger') {
    allowedVehicles = ['car']; // Only cars allowed for passengers
  } else {
    allowedVehicles = ['bike', 'scooter', 'van', 'truck']; // Car is disabled for package delivery
  }

  const drivers = await Driver.findAll({
    where: {
      isOnline: true,

      isAvailable: true,

      isVerified: true,
      vehicleType: {
        [Op.in]: allowedVehicles // Filters based on our business rule
      },

      currentLat: {
        [Op.ne]: null,
      },

      currentLng: {
        [Op.ne]: null,
      },
    },

    include: [
      {
        model: User,

        as: "user",

        attributes: ["id", "name", "phone", "avatar"],
      },
    ],
  });

  if (!drivers.length) {
    return null;
  }

  const driversWithDistance = drivers.map((d) => ({
    driver: d,

    distance: calculateDistance(
      d.currentLat,
      d.currentLng,
      pickupLat,
      pickupLng,
    ),
  }));

  driversWithDistance.sort((a, b) => a.distance - b.distance);

  return driversWithDistance[0].driver;
};

// ─────────────────────────────────────────────
// Create Order
// ─────────────────────────────────────────────

const createOrder = async (customerId, orderData) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      packageWeight,
      paymentMethod,
      orderType
    } = orderData;

    // 1. Validations
    if (!orderType || !['passenger', 'delivery'].includes(orderType)) {
      throw new ValidationError(400, "Valid orderType ('passenger' or 'delivery') is required");
    }

    // Normalize receiverEmail: convert empty strings or whitespace to null
    if (typeof orderData.receiverEmail === 'string' && !orderData.receiverEmail.trim()) {
      orderData.receiverEmail = null;
    }

    if (orderType === "delivery") {
      if (!orderData.receiverName) throw new ValidationError(400, "Receiver name required");
      if (!orderData.receiverPhone) throw new ValidationError(400, "Receiver phone required");
      if (!orderData.receiverEmail) throw new ValidationError(400, "Receiver email required");

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(orderData.receiverEmail)) {
        throw new ValidationError(400, "Must be a valid email address");
      }
    } else if (orderType === "passenger") {
      if (!orderData.passengerCount || orderData.passengerCount < 1 || orderData.passengerCount > 4) {
        throw new ValidationError(400, "Passenger count must be between 1 and 4");
      }
      // Ensure passenger order clears out any receiver details if sent
      orderData.receiverEmail = null;
    }

    // 2. Route & Pricing calculation
    let routeInfo;
    try {
      routeInfo = await getRouteInfo(pickupLat, pickupLng, dropLat, dropLng);
    } catch (routeErr) {
      console.error("[CreateOrder Error] getRouteInfo failed:", routeErr.message);
      throw new ValidationError(500, "Failed to calculate route distance. Please check Google Maps API key / billing.");
    }

    const pricing = calculatePrice(routeInfo.distanceKm, packageWeight, orderType);
    const nearestDriver = await findNearestDriver(pickupLat, pickupLng, orderType);

    // 3. Create Order
    const order = await Order.create(
      {
        customerId,
        ...orderData,
        orderType,
        paymentMethod,
        distance: routeInfo.distanceKm,
        estimatedTime: routeInfo.durationMin,
        ...pricing,
        driverId: nearestDriver?.id || null,
        status: "pending", 
        acceptedAt: null,
      },
      { transaction }
    );

    // 4. Create Payment Record
    const paymentProviderMap = { online: "razorpay", cash: "cod" };
    await Payment.create(
      {
        orderId: order.id,
        customerId,
        amount: pricing.totalAmount,
        method: paymentProviderMap[paymentMethod] || "cod",
        status: paymentMethod === "cash" ? "pending_cash_collection" : "pending",
      },
      { transaction }
    );

    // 5. Update Driver Availability
    if (nearestDriver) {
      await nearestDriver.update({ isAvailable: false }, { transaction });
    }

    // 6. Admin Notification (if no driver)
    if (!nearestDriver) {
      try {
        await notifyAdmins({
          title: "⚠️ Driver Not Found",
          body: `No nearby drivers available for Order #${order.orderNumber || order.id}`,
          type: "system",
          data: { orderId: order.id },
        });
      } catch (notifyErr) {
        console.warn("[CreateOrder Warning] Failed to notify admins:", notifyErr.message);
      }
    }

    // 7. COMMIT DATABASE TRANSACTION FIRST
    await transaction.commit();

    // -------------------------------------------------------------
    // POST-COMMIT OPERATIONS (Wrap in separate try/catch so DB isn't affected)
    // -------------------------------------------------------------
    try {
      if (nearestDriver) {
        await orderEscalationQueue.add(
          "checkOrderAcceptance", 
          { orderId: order.id }, 
          { delay: 5 * 60 * 1000 }
        );
      }

      await cacheDelByPattern(`orders:customer:${customerId}*`);
      await cacheDelByPattern(`orders:driver:*`);
    } catch (postCommitErr) {
      // Order is already successfully created in DB! Do NOT break the API response for non-critical queue/cache errors.
      console.error("[CreateOrder Post-Commit Non-Fatal Error]:", postCommitErr.message);
    }

    return order;

  } catch (error) {
    // SAFE ROLLBACK CHECK: Only roll back if transaction is NOT yet committed
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("[CreateOrder Error]:", error);
    throw error;
  }
};
// ─────────────────────────────────────────────
// Get Orders
// ─────────────────────────────────────────────

const getOrders = async ({ role, userId, page = 1, limit = 10, status, orderNumber }) => {
  page = Number(page);
  limit = Number(limit);
  const offset = (page - 1) * limit;

  // Cache key construction
  const cacheKey = `orders:${role}:${userId}:p${page}:l${limit}:s${status || "all"}:n${orderNumber || "all"}`;
  const cached = await cacheGet(cacheKey);
  if (cached) {
    return cached;
  }

  // Build the base conditions array to safely handle combining AND/OR clauses
  const andConditions = [];

  // 1. Role-based filtering
  if (role === "customer") {
    andConditions.push({ customerId: userId });
  } else if (role === "driver") {
    const driver = await Driver.findOne({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundError("Driver profile not found");
    }

  // ── 👇 FULLY DYNAMIC EXACT-MATCH VEHICLE BLOCK ──
    if (driver.vehicleType === "car") {
      // Car drivers strictly see passenger rides assigned to them or pending
      andConditions.push({
        [Op.or]: [
          { driverId: driver.id }, 
          { 
            status: "pending",
            orderType: "passenger" 
          }
        ]
      });
    } else {
      // Bikes, Scooters, Vans, and Trucks see pending packages 
      // that EXACTLY match their specific vehicle capacities!
      andConditions.push({
        [Op.or]: [
          { driverId: driver.id }, 
          { 
            status: "pending", 
            orderType: "delivery",
            vehicleType: driver.vehicleType // 👈 Matches 'bike', 'scooter', 'van', or 'truck' exactly
          }
        ]
      });
    }
  }

  // 2. Filter by status (Handles driver specific filtering smoothly)
  if (status) {
    andConditions.push({ status: status });
  }

  // 3. Filter by partial orderNumber (Postgres case-insensitive search)
  if (orderNumber) {
    andConditions.push({
      orderNumber: {
        [Op.iLike]: `%${orderNumber}%`
      }
    });
  }

  // Combine all conditions into the final where clause
  const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

  // Database Query
  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: "customer",
        attributes: ["id", "name", "phone", "avatar"],
      },
      {
        model: Driver,
        as: "driver",
        required: false,
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "phone", "avatar"],
          },
        ],
      },
      {
        model: Payment,
        as: "payment",
        required: false,
        attributes: ["status", "method", "amount"],
      },
    ],
    order: [["createdAt", "DESC"]],
    limit,
    offset,
    distinct: true, // Crucial when using findAndCountAll with 'include' to get correct pagination counts
  });

  const result = {
    orders: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };

  await cacheSet(cacheKey, result, 60);

  return result;
};


// ─────────────────────────────────────────────
// Accept Order (With Real-World Proximity Checking)
// ─────────────────────────────────────────────

const acceptOrder = async (orderId, driverUserId) => {
  const transaction = await sequelize.transaction();

  try {
    const driver = await Driver.findOne({
      where: { userId: driverUserId },
      transaction,
    });

    if (!driver) {
      throw new NotFoundError("Driver profile");
    }

    if (!driver.profileCompleted) {
      throw new NotFoundError(
        "Please complete your profile before accepting orders."
      );
    }

    if (!driver.isVerified) {
      throw new NotFoundError(
        "Your profile is under review. Please wait for admin approval to start accepting orders."
      );
    }

    if (!driver.isAvailable) {
      throw new ValidationError("You are already on delivery");
    }

    if (driver.currentLat === null || driver.currentLng === null) {
      throw new ValidationError(
        "Could not fetch your current GPS location. Please turn on location services."
      );
    }

    const order = await Order.findByPk(orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "pending") {
      throw new ValidationError("Order already accepted");
    }

    if (order.orderType === "passenger" && driver.vehicleType !== "car") {
      throw new ValidationError(
        `Passenger rides can only be accepted by Car drivers. Your current vehicle registered is a ${driver.vehicleType}.`
      );
    }

    if (
      order.orderType === "delivery" &&
      order.vehicleType !== driver.vehicleType
    ) {
      throw new ValidationError(
        `This delivery order requires a ${order.vehicleType}. You cannot accept it with your ${driver.vehicleType}.`
      );
    }

    const driverToPickupDistance = calculateDistance(
      driver.currentLat,
      driver.currentLng,
      order.pickupLat,
      order.pickupLng
    );

    let maxAllowedPickupDistance = 5;

    if (driver.vehicleType === "bike" || driver.vehicleType === "scooter") {
      if (order.packageCategory === "food") {
        maxAllowedPickupDistance = 3;
      } else {
        maxAllowedPickupDistance = 5;
      }
    } else if (
      driver.vehicleType === "car" ||
      driver.vehicleType === "van"
    ) {
      maxAllowedPickupDistance = 10;
    } else if (driver.vehicleType === "truck") {
      maxAllowedPickupDistance = 50;
    }

    if (driverToPickupDistance > maxAllowedPickupDistance) {
      throw new ValidationError(
        `This order is too far away (${driverToPickupDistance.toFixed(
          1
        )} km). Your vehicle type (${
          driver.vehicleType
        }) is restricted to a maximum pickup range of ${maxAllowedPickupDistance} km.`
      );
    }

    await order.update(
      {
        driverId: driver.id,
        status: "accepted",
        driverStatus: "going_to_pickup",
        acceptedAt: new Date(),
      },
      { transaction }
    );

    await driver.update({ isAvailable: false }, { transaction });

    // Commit DB changes
    await transaction.commit();

    // Side effects post-commit
    try {
      await notifyAdmins({
        title: "🚚 Order Accepted",
        body: `${driver.vehicleType} driver accepted Order #${order.orderNumber}`,
        type: "order",
        data: {
          orderId,
          driverId: driver.id,
        },
      });

      await cacheDelByPattern(`orders:*`);

      const isPassenger = order.orderType === "passenger";
      await sendNotification(order.customerId, {
        title: isPassenger ? "Driver is on the way!" : "Driver Assigned",
        body: isPassenger
          ? `Your driver is heading to your location.`
          : `Your delivery order #${order.orderNumber} has been accepted by a ${driver.vehicleType} driver.`,
        type: "order",
        data: { orderId },
      });
    } catch (postCommitErr) {
      console.warn("[acceptOrder] Post-commit warning:", postCommitErr.message);
    }

    return order;
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
};



const updateOrderStatus = async (
  orderId,
  driverUserId,
  status,
  extras = {}
) => {
  const transaction = await sequelize.transaction();

  try {
    const driver = await Driver.findOne({
      where: { userId: driverUserId },
      transaction,
    });

    if (!driver) {
      throw new NotFoundError("Driver profile");
    }

    const order = await Order.findByPk(orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw new NotFoundError("Order");
    }

    if (String(order.driverId) !== String(driver.id)) {
      throw new AuthorizationError("Not your order");
    }

    const VALID_TRANSITIONS = {
      accepted: ["picked_up", "cancelled"],
      picked_up: ["in_transit"],
      in_transit: ["delivered"],
    };

    if (!VALID_TRANSITIONS[order.status]?.includes(status)) {
      throw new ValidationError(
        `Cannot transition from ${order.status} to ${status}`
      );
    }

    const updateData = { status };

    const STATUS_TO_DRIVER_STATUS = {
      accepted: "going_to_pickup",
      picked_up: "picked_up",
      in_transit: "in_transit",
      delivered: "delivered",
    };

    if (STATUS_TO_DRIVER_STATUS[status]) {
      updateData.driverStatus = STATUS_TO_DRIVER_STATUS[status];
    }

    if (status === "picked_up") {
      updateData.pickedUpAt = new Date();
    }

    if (status === "in_transit") {
      updateData.inTransitAt = new Date();
    }

    if (status === "delivered") {
      const existingEarning = await Earnings.findOne({
        where: { orderId: order.id },
        transaction,
      });

      if (existingEarning) {
        throw new ValidationError("Earnings already processed");
      }

      updateData.deliveredAt = new Date();

      const platformFee = parseFloat(
        (order.deliveryFee * PLATFORM_FEE_PERCENT).toFixed(2)
      );

      const netEarning = parseFloat(
        (order.deliveryFee - platformFee).toFixed(2)
      );

      await Earnings.create(
        {
          driverId: driver.id,
          orderId: order.id,
          amount: order.deliveryFee,
          platformFee,
          netEarning,
        },
        { transaction }
      );

      await driver.increment(
        {
          totalDeliveries: 1,
          totalEarnings: netEarning,
        },
        { transaction }
      );

      const activeOrders = await Order.count({
        where: {
          driverId: driver.id,
          status: {
            [Op.in]: ["accepted", "picked_up", "in_transit"],
          },
        },
        transaction,
      });

      if (activeOrders <= 1) {
        await driver.update(
          { isAvailable: true },
          { transaction }
        );
      }
    }

    if (extras.deliveryProofImage) {
      updateData.deliveryProofImage = extras.deliveryProofImage;
    }

    await order.update(updateData, { transaction });

    // Commit DB changes
    await transaction.commit();

    // Side effects post-commit
    try {
      await cacheDelByPattern(`orders:customer:${order.customerId}*`);
      await cacheDelByPattern(`orders:driver:*`);

      // Clear driver earnings cache so frontend updates immediately
      if (status === "delivered") {
        await cacheDelByPattern(`earnings:${driver.id}*`);
      }

      await sendNotification(order.customerId, {
        title: `Order ${status.replace(/_/g, " ")}`,
        body: `Your order #${order.orderNumber} is now ${status.replace(
          /_/g,
          " "
        )}.`,
        type: "order",
        data: { orderId },
      });
    } catch (postCommitErr) {
      console.warn("[updateOrderStatus] Post-commit warning:", postCommitErr.message);
    }

    return order;
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
};



const cancelOrder = async (orderId, userId, reason) => {
  if (!reason) {
    throw new ValidationError("Cancellation reason required");
  }

  const transaction = await sequelize.transaction();

  // Scope variables to carry data outside the transaction safely
  let refundTriggered = false;
  let refundId = null;
  let orderData = null;
  let driverUserIdToNotify = null;

  try {
    // 1. Find Order
    const order = await Order.findOne({
      where: { id: orderId, customerId: userId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw new NotFoundError("Order");
    }

    // 2. Status Validation
    if (!["pending", "accepted"].includes(order.status)) {
      throw new ValidationError("Order cannot be cancelled at this stage");
    }

    // 3. Update Order
    await order.update(
      {
        status: "cancelled",
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      { transaction }
    );

    // 4. Driver Handling
    if (order.driverId) {
      const driver = await Driver.findByPk(order.driverId, { transaction });
      if (driver) {
        const activeOrders = await Order.count({
          where: {
            driverId: driver.id,
            status: { [Op.in]: ["accepted", "picked_up", "in_transit"] },
          },
          transaction,
        });

        if (activeOrders <= 1) {
          await driver.update({ isAvailable: true }, { transaction });
        }

        // Store for post-commit notification (DO NOT CALL ASYNC NOTIFICATIONS INSIDE TRANSACTION)
        driverUserIdToNotify = driver.userId;
      }
    }

    // 5. Automated Refund Check
    if (order.paymentMethod === "online") {
      const payment = await Payment.findOne({
        where: { orderId, status: "success" },
        transaction,
      });

      if (payment) {
        try {
          const refund = await getRazorpay().payments.refund(
            payment.razorpayPaymentId,
            {
              amount: Math.round(payment.amount * 100),
              notes: { reason: "Order cancelled by user", orderId },
            }
          );

          await payment.update(
            {
              status: "refunded",
              refundId: refund.id,
              refundedAt: new Date(),
            },
            { transaction }
          );

          refundTriggered = true;
          refundId = refund.id;
        } catch (refundError) {
          console.error("Razorpay automatic refund failed:", refundError);
        }
      }
    }

    // Save order details to use post-commit
    orderData = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
    };

    // 6. COMMIT DB CHANGES
    await transaction.commit();
  } catch (error) {
    // SAFE ROLLBACK: Prevents "Transaction cannot be rolled back because it has been finished"
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }

  // ── SAFE ZONE: Operations after successful database commit ──
  try {
    // Notify Driver
    if (driverUserIdToNotify) {
      await sendNotification(driverUserIdToNotify, {
        title: "Order Cancelled",
        body: `Order #${orderData.orderNumber} was cancelled by customer.`,
        type: "order",
        data: { orderId },
      });
    }

    // Handle Refunds Notifications
    if (refundTriggered) {
      await notifyAdmins({
        title: "💰 Refund Initiated",
        body: `Automatic refund initiated for Cancelled Order #${orderData.orderNumber}.`,
        type: "payment",
        data: { orderId: orderData.id, refundId },
      });

      await sendNotification(orderData.customerId, {
        title: "Refund Initiated",
        body: `Your refund for Order #${orderData.orderNumber} has been initiated automatically.`,
        type: "payment",
        data: { orderId },
      });
    }

    // Admin Notification
    await notifyAdmins({
      title: "❌ Order Cancelled",
      body: `Customer cancelled Order #${orderData.orderNumber}`,
      type: "order",
      data: { orderId, reason },
    });

    // Cache Cleardown
    await cacheDelByPattern(`orders:customer:${userId}*`);
    await cacheDelByPattern(`orders:driver:*`);

    // Fetch and return updated order
    const updatedOrder = await Order.findByPk(orderId, {
      include: [{ model: Payment, as: "payment" }],
    });

    return updatedOrder;
  } catch (postCommitError) {
    console.error("Post-commit background tasks failed:", postCommitError);

    // Fallback response
    return await Order.findByPk(orderId);
  }
};

const validateDriverOrder = async (
  orderId,
  driverUserId,
  transaction = null,
) => {
  const driver = await Driver.findOne({
    where: { userId: driverUserId },
    transaction,
  });

  if (!driver) {
    throw new NotFoundError("Driver profile");
  }

  const order = await Order.findByPk(orderId, {
    transaction,
    lock: transaction ? true : undefined,
  });

  if (!order) {
    throw new NotFoundError("Order");
  }

  if (String(order.driverId) !== String(driver.id)) {
    throw new AuthorizationError("Not your order");
  }

  return { order, driver };
};


const uploadDeliveryProof = async (orderId, driverUserId, file) => {
  const transaction = await sequelize.transaction();

  let proofUrl = null;
  let orderData = null;

  try {
    const { order, driver } = await validateDriverOrder(
      orderId,
      driverUserId,
      transaction
    );

    if (order.status !== "in_transit") {
      throw new ValidationError("Order must be in transit to upload proof");
    }

    if (order.orderType === "delivery" && !order.deliveryOtpVerified) {
      throw new ValidationError("Receiver OTP verification required first");
    }

    if (order.paymentMethod === "cash" && !order.cashCollected) {
      throw new ValidationError(
        "Cash collection must be completed first before uploading proof"
      );
    }

    if (!file) {
      const errorMsg =
        order.orderType === "passenger"
          ? "Trip drop-off safety proof photo is required"
          : "Delivery proof image is required";
      throw new ValidationError(errorMsg);
    }

    proofUrl = file?.path || null;

    // Snapshot values needed post-commit
    orderData = {
      id: order.id,
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      orderType: order.orderType,
      driverId: driver.id,
    };

    await transaction.commit();
  } catch (error) {
    const isFinished = 
      typeof transaction.isFinished === 'function'
        ? transaction.isFinished()
        : Boolean(transaction.finished);

    if (!isFinished) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Rollback failed silently:", rollbackError.message);
      }
    }
    throw error;
  }

  // Delegate transition to updateOrderStatus which reliably processes status, earnings, and cache
  const updatedOrder = await updateOrderStatus(
    orderId,
    driverUserId,
    "delivered",
    { deliveryProofImage: proofUrl }
  );

  // ── Post-Commit Notifications ──
  try {
    const isPassenger = orderData.orderType === "passenger";
    const notificationTitle = isPassenger
      ? "🚗 Trip Completed Successfully!"
      : "📦 Order Delivered!";
    const notificationBody = isPassenger
      ? `Your ride #${orderData.orderNumber} has arrived safely.`
      : `Your order #${orderData.orderNumber} has been delivered.`;

    await notifyAdmins({
      title: notificationTitle,
      body: notificationBody,
      type: "order",
      data: { orderId: orderData.id },
    });

    await sendNotification(orderData.customerId, {
      title: notificationTitle,
      body: notificationBody,
      type: "order",
      data: { orderId: orderData.id },
    });
  } catch (postCommitError) {
    console.error("Post-commit notifications failed:", postCommitError);
  }

  return updatedOrder;
};


const markCashCollected = async (orderId, driverUserId) => {
  const transaction = await sequelize.transaction();

  let orderData = null;

  try {
    const { order, driver } = await validateDriverOrder(
      orderId,
      driverUserId,
      transaction
    );

    if (order.paymentMethod !== "cash" && order.paymentMethod !== "cod") {
      throw new ValidationError("This order uses online payment");
    }

    if (order.cashCollected) {
      throw new ValidationError("Cash already marked as collected");
    }

    // 1. Update order status
    await order.update(
      {
        cashCollected: true,
        cashCollectedAt: new Date(),
        // Optional: Update paymentStatus if present in your model schema
        paymentStatus: "paid", 
      },
      { transaction }
    );

    // 2. Update payment records
    await Payment.update(
      {
        status: "success",
        method: "cod",
        paidAt: new Date(),
      },
      {
        where: { orderId: order.id },
        transaction,
      }
    );

    // Snapshot complete data required for notification payloads
    orderData = {
      id: order.id,
      orderNumber: order.orderNumber || order.order_number || `#${order.id}`,
      totalAmount: order.totalAmount || order.grandTotal || order.amount || 0,
      driverName: driver?.name || driver?.fullName || `Driver #${driverUserId}`,
    };

    // 3. COMMIT TRANSACTION
    await transaction.commit();
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }

  // ── SAFE ZONE: Post-Commit Side Effects ──

  // 1. Invalidate Caches
  try {
    await cacheDelByPattern(`orders:*`);
  } catch (cacheErr) {
    console.error("[Cache] Invalidation error:", cacheErr);
  }

  // 2. Dispatch Admin Real-Time & Push Notification
  try {
    const notificationPayload = {
      title: "💰 Cash Collected by Driver",
      body: `${orderData.driverName} collected cash for Order ${orderData.orderNumber}. Amount: ₹${orderData.totalAmount}`,
      type: "payment",
      data: {
        orderId: String(orderData.id),
        amount: String(orderData.totalAmount),
        driverId: String(driverUserId),
        event: "CASH_COLLECTED",
      },
    };

    // Trigger Admin Notification
    await notifyAdmins(notificationPayload);

    // Optional: If you use Socket.IO directly in your app context
    if (global.io) {
      global.io.to("admin_room").emit("support:admin:notification", notificationPayload);
    }
  } catch (postCommitError) {
    // Log complete stack trace so you can debug FCM/Socket issues directly in production
    console.error("[Notification Error] Failed to send cash collection notification:", {
      error: postCommitError.message,
      stack: postCommitError.stack,
      orderId: orderData?.id,
    });
  }

  return true;
};

const generatePickupOtp = async (orderId, driverUserId) => {
  const { order } = await validateDriverOrder(orderId, driverUserId);

  const fullOrder = await Order.findByPk(orderId, {
    include: [
      {
        model: User,
        as: "customer",
        attributes: ["id", "name", "email"],
      },
    ],
  });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await cacheSet(`pickup-otp:${order.id}`, otp, 600);

  await sendEmail({
    to: fullOrder.customer.email,
    subject: "Pickup OTP — DeliverPro",
    template: "verify-email",
    data: {
      name: fullOrder.customer.name,
      otp,
    },
  });

  return true;
};

const verifyPickupOtp = async (orderId, driverUserId, otp) => {
  const { order } = await validateDriverOrder(orderId, driverUserId);

  if (order.status !== "accepted") {
    throw new ValidationError("Order is not ready for pickup");
  }

  const storedOtp = await cacheGet(`pickup-otp:${order.id}`);

  if (!storedOtp || storedOtp !== otp) {
    throw new ValidationError("Invalid or expired OTP");
  }

  await order.update({
    pickupOtpVerified: true,
    status: "picked_up",
    driverStatus: "picked_up",
    driverLastLocationAt:new Date(),
    pickedUpAt: new Date(),
  });

  await cacheDel(`pickup-otp:${order.id}`);

  return order;
};

const generateDeliveryOtp = async (orderId, driverUserId) => {
  const { order } = await validateDriverOrder(orderId, driverUserId);

  if (order.status !== "in_transit") {
    throw new ValidationError("Order must be in transit");
  }

  // ── Skip OTP generation if it's a passenger ──
  if (order.orderType === "passenger") {
    throw new ValidationError("Passenger rides do not require drop-off OTP verification.");
  }

  // ── Ensure receiver email exists ──
  if (!order.receiverEmail) {
    throw new ValidationError("Receiver email is missing for this order");
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in cache with 10-minute expiry (600s)
  await cacheSet(`delivery-otp:${order.id}`, otp, 600);

  // Send Email to receiver
  await sendEmail({
    to: order.receiverEmail,
    subject: "Delivery OTP — DeliverPro",
    template: "verify-email", // or your custom delivery email template
    data: {
      name: order.receiverName || "Customer",
      otp,
    },
  });

  return true;
};

const verifyDeliveryOtp = async (orderId, driverUserId, otp) => {
  const transaction = await sequelize.transaction();

  try {
    const { order } = await validateDriverOrder(
      orderId,
      driverUserId,
      transaction,
    );

    if (order.status !== "in_transit") {
      throw new ValidationError("Order must be in transit to complete delivery");
    }

    const storedOtp = await cacheGet(`delivery-otp:${order.id}`);

    if (!storedOtp || storedOtp !== otp) {
      throw new ValidationError("Invalid or expired OTP");
    }

    // Update order status to completed
    await order.update(
      {
        deliveryOtpVerified: true,
      },
      { transaction },
    );

    await cacheDel(`delivery-otp:${order.id}`);

    await transaction.commit();

    return order;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};



const getOrderLiveLocationService = async (orderId) => {
  const order = await Order.findByPk(orderId);

  if (!order) {
    throw new Error("Order not found");
  }

  if (!order.driverId) {
    return null;
  }

  // First try Redis
  const redisLocation = await cacheGet(
    `driver-location:${order.driverId}`
  );

  if (redisLocation) {
    return {
      lat: Number(redisLocation.lat),
      lng: Number(redisLocation.lng),
      isOnline: redisLocation.isOnline,
      updatedAt: redisLocation.updatedAt,
      driverStatus: order.driverStatus,
      source: "redis",
    };
  }

  // Fallback DB
  const driver = await Driver.findByPk(order.driverId);

  if (!driver) {
    return null;
  }

  return {
    lat: Number(driver.currentLat),
    lng: Number(driver.currentLng),
    isOnline: driver.isOnline,
    // updatedAt: driver.lastLocationUpdate,
    updatedAt: order.driverLastLocationAt,
    driverStatus: order.driverStatus,
    source: "database",
  };
};



module.exports = {
  createOrder,
  getOrders,
  acceptOrder,
  getRouteInfo,
  calculatePrice,
  findNearestDriver,
  updateOrderStatus,
  cancelOrder,

  // new api
  uploadDeliveryProof,
  markCashCollected,
  generatePickupOtp,
  verifyPickupOtp,

  generateDeliveryOtp,
  verifyDeliveryOtp,

  getOrderLiveLocationService
};
