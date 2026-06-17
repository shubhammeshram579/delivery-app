const { User, Driver, Order, Payment, Earnings } = require('../models');
const { Op, fn, col } = require('sequelize');
const { cacheSet, cacheGet } = require('../config/redis');
const { NotFoundError,ValidationError } = require('../middleware/error.middleware');


const getDashboardStats = async (req, res) => {
  const cacheKey = 'admin:dashboard';
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  const [
    totalUsers, totalDrivers, totalOrders,
    activeOrders, totalRevenue, pendingDriverVerification,
  ] = await Promise.all([
    User.count({ where: { role: 'customer' } }),
    Driver.count(),
    Order.count(),
    Order.count({ where: { status: { [Op.in]: ['pending', 'accepted', 'picked_up', 'in_transit'] } } }),
    Payment.sum('amount', { where: { status: 'success' } }),
    Driver.count({ where: { isVerified: false } }),
  ]);

  const data = {
    totalUsers,
    totalDrivers,
    totalOrders,
    activeOrders,
    totalRevenue: totalRevenue || 0,
    pendingDriverVerification,
  };
  await cacheSet(cacheKey, data, 300);
  res.json({ success: true, data });
};

const getRevenueAnalytics = async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const data = await Payment.findAll({
    attributes: [
      [fn('DATE', col('paidAt')), 'date'],
      [fn('SUM', col('amount')), 'revenue'],
      [fn('COUNT', col('id')), 'count'],
    ],
    where: { status: 'success', paidAt: { [Op.gte]: since } },
    group: [fn('DATE', col('paidAt'))],
    order: [[fn('DATE', col('paidAt')), 'ASC']],
    raw: true,
  });

  res.json({ success: true, data });
};


const getAllUsers = async (req, res) => {
  const { page = 1, limit = 20, role, search } = req.query;
  
  // 1. Build the base user filtering condition
  const where = { role: role || { [Op.ne]: 'admin' } };
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // 2. Dynamically handle inclusion profiles
  const include = [];

  // If the admin is filtering explicitly for drivers, eagerly load their document data
  if (role === 'driver') {
    include.push({
      model: Driver,
      as: 'driverProfile', 
    });
  }

  // 3. Execute query with dynamic inclusions
  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password', 'refreshToken'] },
    include, // Injected dynamically here
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  res.json({ 
    success: true, 
    data: { 
      users: rows, 
      total: count, 
      page: parseInt(page) 
    } 
  });
};

const toggleUserStatus = async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) throw new NotFoundError('User');
  await user.update({ isActive: !user.isActive });
  res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'deactivated'}` });
};

const verifyDriver = async (req, res) => {
  
    const userId = req.params.id;
    const { licenseStatus, aadhaarStatus, vehicleDocumentStatus, rejectionReason } = req.body;

    // 1. Find the driver by their linked userId with correct where clause syntax
    const driver = await Driver.findOne({ where: { userId } });
    if (!driver) {
      throw new NotFoundError('Driver profile not found');
    }

    // 2. Validate incoming enum status values early
    const statusOptions = ['pending', 'approved', 'rejected'];
    if (
      (licenseStatus && !statusOptions.includes(licenseStatus)) ||
      (aadhaarStatus && !statusOptions.includes(aadhaarStatus)) ||
      (vehicleDocumentStatus && !statusOptions.includes(vehicleDocumentStatus))
    ) {
      throw new ValidationError('Invalid status type provided for verification update.');
    }

    // 3. Update specified field values locally on the instance
    if (licenseStatus) driver.licenseStatus = licenseStatus;
    if (aadhaarStatus) driver.aadhaarStatus = aadhaarStatus;
    if (vehicleDocumentStatus) driver.vehicleDocumentStatus = vehicleDocumentStatus;

    // 4. Evaluate compliance status rules
    const hasRejections = 
      driver.licenseStatus === 'rejected' || 
      driver.aadhaarStatus === 'rejected' || 
      driver.vehicleDocumentStatus === 'rejected';

    if (hasRejections) {
      if (!rejectionReason) {
        throw new ValidationError('A reason must be logged for profile rejection.');
      }
      driver.rejectionReason = rejectionReason;
      driver.isVerified = false;
    } else {
      // If everything passes verification completely, toggle active system states
      const allApproved = 
        driver.licenseStatus === 'approved' && 
        driver.aadhaarStatus === 'approved' && 
        driver.vehicleDocumentStatus === 'approved';
      
      if (allApproved) {
        driver.isVerified = true;
        driver.rejectionReason = null; // Clear out any stale warnings
      }
    }

    // 5. Persist all state alterations down to the database
    await driver.save();

    // 6. Return a clean HTTP response packet back to the frontend client
    return res.status(200).json({
      success: true,
      message: driver.isVerified 
        ? 'Driver verified successfully and activated.' 
        : 'Driver document statuses updated successfully.',
      data: { driver }
    });
};

const getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const where = status ? { status } : {};

  const { count, rows } = await Order.findAndCountAll({
    where,
    include: [
      { model: User, as: 'customer', attributes: ['id', 'name', 'email', 'phone'] },
      {
        model: Driver,
        as: 'driver',
        required: false,
        include: [{ model: User, as: 'user', attributes: ['id', 'name', 'phone'] }],
      },
      { model: Payment, as: 'payment', attributes: ['status', 'amount'], required: false },
    ],
    order: [['createdAt', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit),
  });

  res.json({ success: true, data: { orders: rows, total: count } });
};

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
  getAllUsers,
  toggleUserStatus,
  verifyDriver,
  getAllOrders,
  
};
