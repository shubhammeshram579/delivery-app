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

const { sendNotification } = require("../utils/notifications");

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

const PLATFORM_FEE_PERCENT = 0.15;

// ─────────────────────────────────────────────
// Price Calculation
// ─────────────────────────────────────────────

const calculatePrice = (distanceKm, weightKg) => {
  const basePrice = 20;

  const distanceFee = distanceKm * 8;

  const weightFee = weightKg * 5;

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

const findNearestDriver = async (pickupLat, pickupLng) => {
  const drivers = await Driver.findAll({
    where: {
      isOnline: true,

      isAvailable: true,

      isVerified: true,

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
    } = orderData;

    if (!orderData.receiverName) {
      throw new ApiError(400, "Receiver name required");
    }

    if (!orderData.receiverPhone) {
      throw new ApiError(400, "Receiver phone required");
    }

    const routeInfo = await getRouteInfo(
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
    );

    const pricing = calculatePrice(routeInfo.distanceKm, packageWeight);

    const nearestDriver = await findNearestDriver(pickupLat, pickupLng);

    const order = await Order.create(
      {
        customerId,

        ...orderData,

        paymentMethod,

        distance: routeInfo.distanceKm,

        estimatedTime: routeInfo.durationMin,

        ...pricing,

        driverId: nearestDriver?.id || null,

        status: nearestDriver ? "accepted" : "pending",

        acceptedAt: nearestDriver ? new Date() : null,
      },
      {
        transaction,
      },
    );

    const paymentProviderMap = {
      online: "razorpay",
      cash: "cod",
    };

    await Payment.create(
      {
        orderId: order.id,
        customerId,
        amount: pricing.totalAmount,
        method: paymentProviderMap[paymentMethod],
        status:
          paymentMethod === "cash" ? "pending_cash_collection" : "pending",
      },

      {
        transaction,
      },
    );

    if (nearestDriver) {
      await nearestDriver.update(
        {
          isAvailable: false,
        },

        {
          transaction,
        },
      );
    }

    await transaction.commit();

    await cacheDelByPattern(`orders:customer:${customerId}*`);

    await cacheDelByPattern(`orders:driver:*`);

    return order;
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
};

// ─────────────────────────────────────────────
// Get Orders
// ─────────────────────────────────────────────

const getOrders = async ({ role, userId, page = 1, limit = 10, status }) => {
  page = Number(page);

  limit = Number(limit);

  const offset = (page - 1) * limit;

  const cacheKey = `orders:${role}:${userId}:p${page}:l${limit}:s${status || "all"}`;

  const cached = await cacheGet(cacheKey);

  if (cached) {
    return cached;
  }

  const where = {};

  // Customer Orders
  if (role === "customer") {
    where.customerId = userId;
  }

  // Driver Orders
  if (role === "driver") {
    const driver = await Driver.findOne({
      where: {
        userId,
      },
    });

    if (!driver) {
      throw new NotFoundError("Driver profile");
    }

    where[Op.or] = [
      {
        driverId: driver.id,
      },

      {
        status: "pending",
      },
    ];
  }

  // Filter by status
  if (status) {
    where.status = status;
  }

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
// Accept Order
// ─────────────────────────────────────────────

const acceptOrder = async (orderId, driverUserId) => {
  const transaction = await sequelize.transaction();

  try {
    const driver = await Driver.findOne({
      where: {
        userId: driverUserId,
      },

      transaction,
    });

    if (!driver) {
      throw new NotFoundError("Driver profile");
    }

    // Profile completion check
    if (!driver.profileCompleted) {
      throw new NotFoundError(
        "Please complete your profile before accepting orders."
      );
    }

    // Admin verification check
    if (!driver.isVerified) {
      throw new NotFoundError(
        "Your profile is under review. Please wait for admin approval to start accepting orders."
      );
    }
    

    if (!driver.isAvailable) {
      throw new ValidationError("You are already on delivery");
    }

    const order = await Order.findByPk(orderId, {
      transaction,
      // lock: true,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw new NotFoundError("Order");
    }

    if (order.status !== "pending") {
      throw new ValidationError("Order already accepted");
    }

    await order.update(
      {
        driverId: driver.id,

        status: "accepted",
        driverStatus: 'going_to_pickup',

        acceptedAt: new Date(),
      },

      {
        transaction,
      },
    );

    await driver.update(
      {
        isAvailable: false,
      },

      {
        transaction,
      },
    );

    await transaction.commit();

    await cacheDelByPattern(`orders:*`);

    await sendNotification(order.customerId, {
      title: "Driver Assigned",

      body: `Your order #${order.orderNumber} has been accepted.`,

      type: "order",

      data: {
        orderId,
      },
    });

    return order;
  } catch (error) {
    await transaction.rollback();

    throw error;
  }
};

// const updateOrderStatus = async (
//   orderId,
//   driverUserId,
//   status,
//   extras = {},
// ) => {
//   const transaction = await sequelize.transaction();

//   try {
//     // Find Driver
//     const driver = await Driver.findOne({
//       where: {
//         userId: driverUserId,
//       },

//       transaction,
//     });

//     if (!driver) {
//       throw new NotFoundError("Driver profile");
//     }

//     // Find Order
//     const order = await Order.findByPk(orderId, {
//       transaction,

//       // lock: true,
//       lock: transaction.LOCK.UPDATE,
//     });

//     if (!order) {
//       throw new NotFoundError("Order");
//     }

//     // Ownership Check
//     if (String(order.driverId) !== String(driver.id)) {
//       throw new AuthorizationError("Not your order");
//     }

//     // Status Transition Rules
//     const VALID_TRANSITIONS = {
//       accepted: ["picked_up", "cancelled"],

//       picked_up: ["in_transit"],

//       in_transit: ["delivered"],
//     };

//     // Invalid Transition
//     if (!VALID_TRANSITIONS[order.status]?.includes(status)) {
//       throw new ValidationError(
//         `Cannot transition from ${order.status} to ${status}`,
//       );
//     }

//     const updateData = {
//       status,
//     };

//     // Picked Up
//     if (status === "picked_up") {
//       updateData.pickedUpAt = new Date();
//     }

//     // In Transit
//     if (status === "in_transit") {
//       updateData.inTransitAt = new Date();
//     }

//     // Delivered
//     if (status === "delivered") {
//       // Prevent Duplicate Earnings
//       const existingEarning = await Earnings.findOne({
//         where: {
//           orderId: order.id,
//         },

//         transaction,
//       });

//       if (existingEarning) {
//         throw new ValidationError("Earnings already processed");
//       }

//       updateData.deliveredAt = new Date();

//       // Fee Calculation
//       const platformFee = parseFloat(
//         (order.deliveryFee * PLATFORM_FEE_PERCENT).toFixed(2),
//       );

//       const netEarning = parseFloat(
//         (order.deliveryFee - platformFee).toFixed(2),
//       );

//       // Create Earnings
//       await Earnings.create(
//         {
//           driverId: driver.id,

//           orderId: order.id,

//           amount: order.deliveryFee,

//           platformFee,

//           netEarning,
//         },

//         {
//           transaction,
//         },
//       );

//       // Update Driver Stats
//       await driver.increment(
//         {
//           totalDeliveries: 1,

//           totalEarnings: netEarning,
//         },

//         {
//           transaction,
//         },
//       );

//       // Check Active Orders
//       const activeOrders = await Order.count({
//         where: {
//           driverId: driver.id,

//           status: {
//             [Op.in]: ["accepted", "picked_up", "in_transit"],
//           },
//         },

//         transaction,
//       });

//       // Driver Available
//       if (activeOrders <= 1) {
//         await driver.update(
//           {
//             isAvailable: true,
//           },

//           {
//             transaction,
//           },
//         );
//       }
//     }

//     // Delivery Proof
//     if (extras.deliveryProofImage) {
//       updateData.deliveryProofImage = extras.deliveryProofImage;
//     }

//     // Update Order
//     await order.update(updateData, {
//       transaction,
//     });

//     // Commit
//     await transaction.commit();

//     // Clear Cache
//     await cacheDelByPattern(`orders:customer:${order.customerId}*`);

//     await cacheDelByPattern(`orders:driver:*`);

//     // Notification
//     await sendNotification(order.customerId, {
//       title: `Order ${status.replace(/_/g, " ")}`,

//       body: `Your order #${order.orderNumber} is now ${status.replace(/_/g, " ")}.`,

//       type: "order",

//       data: {
//         orderId,
//       },
//     });

//     return order;
//   } catch (error) {
//     await transaction.rollback();

//     throw error;
//   }
// };

const updateOrderStatus = async (
  orderId,
  driverUserId,
  status,
  extras = {},
) => {
  const transaction = await sequelize.transaction();

  try {
    // Find Driver
    const driver = await Driver.findOne({
      where: {
        userId: driverUserId,
      },
      transaction,
    });

    if (!driver) {
      throw new NotFoundError("Driver profile");
    }

    // Find Order
    const order = await Order.findByPk(orderId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw new NotFoundError("Order");
    }

    // Ownership Check
    if (String(order.driverId) !== String(driver.id)) {
      throw new AuthorizationError("Not your order");
    }

    // Status Transition Rules
    const VALID_TRANSITIONS = {
      accepted: ["picked_up", "cancelled"],
      picked_up: ["in_transit"],
      in_transit: ["delivered"],
    };

    // Invalid Transition
    if (!VALID_TRANSITIONS[order.status]?.includes(status)) {
      throw new ValidationError(
        `Cannot transition from ${order.status} to ${status}`,
      );
    }

    // Base data update dictionary
    const updateData = {
      status,
    };

    // ── 👇 NEW: AUTO-MAP HIGH LEVEL STATUS TO DRIVER STATUS ──
    const STATUS_TO_DRIVER_STATUS = {
      accepted: "going_to_pickup",
      picked_up: "picked_up",
      in_transit: "in_transit",
      delivered: "delivered",
    };

    if (STATUS_TO_DRIVER_STATUS[status]) {
      updateData.driverStatus = STATUS_TO_DRIVER_STATUS[status];
    }
    // ─────────────────────────────────────────────────────────

    // Picked Up
    if (status === "picked_up") {
      updateData.pickedUpAt = new Date();
    }

    // In Transit
    if (status === "in_transit") {
      updateData.inTransitAt = new Date(); 
      // Note: Make sure 'inTransitAt' exists in your actual db migration tracking timestamps!
    }

    // Delivered
    if (status === "delivered") {
      // Prevent Duplicate Earnings
      const existingEarning = await Earnings.findOne({
        where: {
          orderId: order.id,
        },
        transaction,
      });

      if (existingEarning) {
        throw new ValidationError("Earnings already processed");
      }

      updateData.deliveredAt = new Date();

      // Fee Calculation
      const platformFee = parseFloat(
        (order.deliveryFee * PLATFORM_FEE_PERCENT).toFixed(2),
      );

      const netEarning = parseFloat(
        (order.deliveryFee - platformFee).toFixed(2),
      );

      // Create Earnings
      await Earnings.create(
        {
          driverId: driver.id,
          orderId: order.id,
          amount: order.deliveryFee,
          platformFee,
          netEarning,
        },
        {
          transaction,
        },
      );

      // Update Driver Stats
      await driver.increment(
        {
          totalDeliveries: 1,
          totalEarnings: netEarning,
        },
        {
          transaction,
        },
      );

      // Check Active Orders
      const activeOrders = await Order.count({
        where: {
          driverId: driver.id,
          status: {
            [Op.in]: ["accepted", "picked_up", "in_transit"],
          },
        },
        transaction,
      });

      // Driver Available
      if (activeOrders <= 1) {
        await driver.update(
          {
            isAvailable: true,
          },
          {
            transaction,
          },
        );
      }
    }

    // Delivery Proof
    if (extras.deliveryProofImage) {
      updateData.deliveryProofImage = extras.deliveryProofImage;
    }

    // 👇 Update Order (This updates both 'status' and our new 'driverStatus' simultaneously)
    await order.update(updateData, {
      transaction,
    });

    // Commit
    await transaction.commit();

    // Clear Cache
    await cacheDelByPattern(`orders:customer:${order.customerId}*`);
    await cacheDelByPattern(`orders:driver:*`);

    // Notification
    await sendNotification(order.customerId, {
      title: `Order ${status.replace(/_/g, " ")}`,
      body: `Your order #${order.orderNumber} is now ${status.replace(/_/g, " ")}.`,
      type: "order",
      data: {
        orderId,
      },
    });

    return order;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

// ─────────────────────────────────────────────
// Cancel Order
// ─────────────────────────────────────────────

const cancelOrder = async (orderId, userId, reason) => {
  if (!reason) {
    throw new ValidationError("Cancellation reason required");
  }

  const transaction = await sequelize.transaction();

  try {
    // Find Order
    const order = await Order.findOne({
      where: {
        id: orderId,

        customerId: userId,
      },

      transaction,

      // lock: true,
      lock: transaction.LOCK.UPDATE,
    });

    if (!order) {
      throw new NotFoundError("Order");
    }

    // Status Validation
    if (!["pending", "accepted"].includes(order.status)) {
      throw new ValidationError("Order cannot be cancelled at this stage");
    }

    // Update Order
    await order.update(
      {
        status: "cancelled",

        cancelledAt: new Date(),

        cancelReason: reason,
      },

      {
        transaction,
      },
    );

    // Driver Handling
    if (order.driverId) {
      const driver = await Driver.findByPk(order.driverId, {
        transaction,
      });

      if (driver) {
        // Check Active Orders
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
            {
              isAvailable: true,
            },

            {
              transaction,
            },
          );
        }

        // Notify Driver
        await sendNotification(driver.userId, {
          title: "Order Cancelled",

          body: `Order #${order.orderNumber} was cancelled by customer.`,

          type: "order",

          data: {
            orderId,
          },
        });
      }
    }

    // Commit
    await transaction.commit();

    // Clear Cache
    await cacheDelByPattern(`orders:customer:${userId}*`);

    await cacheDelByPattern(`orders:driver:*`);

    return order;
  } catch (error) {
    await transaction.rollback();

    throw error;
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

  try {
    const { order, driver } = await validateDriverOrder(
      orderId,
      driverUserId,
      transaction,
    );

    if (order.status !== "in_transit") {
      throw new ValidationError("Order must be in transit to upload proof");
    }

    if (!order.deliveryOtpVerified) {
      throw new ValidationError(
          "Receiver OTP verification required first"
      );
    }

    const existingEarning = await Earnings.findOne({
      where: { orderId: order.id },
      transaction,
    });

    if (existingEarning) {
      throw new ValidationError("Earnings already processed");
    }

    if (!file) {
      throw new ValidationError("Delivery proof image is required");
    }

    const proofUrl = file?.path || null;

    const platformFee = parseFloat(
      (order.deliveryFee * PLATFORM_FEE_PERCENT).toFixed(2),
    );

    const netEarning = parseFloat((order.deliveryFee - platformFee).toFixed(2));

    await order.update(
      {
        deliveryProofImage: proofUrl,
        status: "delivered",
        driverStatus:"delivered",
        deliveredAt: new Date(),
      },
      { transaction },
    );

    await Earnings.create(
      {
        driverId: driver.id,
        orderId: order.id,
        amount: order.deliveryFee,
        platformFee,
        netEarning,
      },
      { transaction },
    );

    await driver.increment(
      {
        totalDeliveries: 1,
        totalEarnings: netEarning,
      },
      { transaction },
    );

    await driver.update({ isAvailable: true }, { transaction });

    await transaction.commit();

    await cacheDelByPattern(`orders:*`);

    await sendNotification(order.customerId, {
      title: "📦 Order Delivered!",
      body: `Your order #${order.orderNumber} has been delivered.`,
      type: "order",
      data: { orderId: order.id },
    });

    return order;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const markCashCollected = async (orderId, driverUserId) => {
  const transaction = await sequelize.transaction();

  try {
    const { order } = await validateDriverOrder(
      orderId,
      driverUserId,
      transaction,
    );

    if (order.paymentMethod !== "cash") {
      throw new ValidationError("This order uses online payment");
    }

    if (order.cashCollected) {
      throw new ValidationError("Cash already marked as collected");
    }

    await order.update(
      {
        cashCollected: true,
        cashCollectedAt: new Date(),
      },
      { transaction },
    );

    await Payment.update(
      {
        status: "success",
        method: "cod",
        paidAt: new Date(),
      },
      {
        where: { orderId: order.id },
        transaction,
      },
    );

    await transaction.commit();
    await cacheDelByPattern(`orders:*`);

    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
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

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  await cacheSet(`delivery-otp:${order.id}`, otp, 600);

  console.log(`delevery:otp ${otp}`)

  // Send SMS to receiver phone
  // Twilio / MSG91

  return true;
};

const verifyDeliveryOtp = async (orderId, driverUserId, otp) => {
  const transaction = await sequelize.transaction();

  try {
    const { order, driver } = await validateDriverOrder(
      orderId,
      driverUserId,
      transaction,
    );

    const storedOtp = await cacheGet(`delivery-otp:${order.id}`);

    if (!storedOtp || storedOtp !== otp) {
      throw new ValidationError("Invalid OTP");
    }

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



// const getOrderLiveLocationService = async (orderId) => {
//   const order = await Order.findByPk(orderId);

//   if (!order) {
//     throw new Error('Order not found');
//   }

//   if (!order.driverId) {
//     return null;
//   }

//   const driver = await Driver.findByPk(order.driverId);

//   if (!driver) {
//     return null;
//   }

//   return {
//     lat: driver.currentLat,
//     lng: driver.currentLng,
//     isOnline: driver.isOnline,
//     updatedAt: driver.lastLocationUpdate,
//     driverStatus: order.driverStatus,
//   };
// };


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
