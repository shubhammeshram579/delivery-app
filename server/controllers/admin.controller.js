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
  // 1. Extract parameters and set default fallback values safely
  const { page = 1, limit = 10, role, search, status, isVerified } = req.query;
  
  // Parse inputs to integers to prevent offset strings or NaN issues
  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));

  // 2. Build the base user filtering condition
  const where = { 
    role: role || { [Op.ne]: 'admin' } 
  };
  
  // Dynamically add global user active status filtering if provided
  if (status) {
    where.isActive = status === 'active'; 
  }
  
  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // 3. Dynamically handle inclusion profiles & verification filters
  const include = [];

  if (role === 'driver') {
    const driverWhere = {};
    
    // Check if filtering by verified status ('true' or 'false' from frontend)
    if (isVerified !== undefined && isVerified !== '') {
      driverWhere.isVerified = isVerified === 'true';
    }

    include.push({
      model: Driver,
      as: 'driverProfile',
      // If filtering by verification, force an INNER JOIN, otherwise keep LEFT OUTER JOIN
      required: isVerified !== undefined && isVerified !== '',
      where: Object.keys(driverWhere).length > 0 ? driverWhere : undefined
    });
  }

  // 4. Calculate offset window criteria
  const offset = (parsedPage - 1) * parsedLimit;

  // 5. Execute query with dynamic limitations & conditions
  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password', 'refreshToken'] },
    include, 
    order: [['createdAt', 'DESC']],
    limit: parsedLimit,
    offset: offset,
  });

  // 6. Calculate total pages dynamically based on filtered total records
  const totalPages = Math.ceil(count / parsedLimit);

  // 7. Return metadata exactly mapped to what your UI expects
  res.json({ 
    success: true, 
    data: { 
      users: rows, 
      totalItems: count,          
      totalPages: totalPages || 1, 
      page: parsedPage,           
      pageSize: parsedLimit       
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
  // 1. Extract parameters and set real-world defaults
  const { page = 1, limit = 25, status, search } = req.query;

  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));
  const offset = (parsedPage - 1) * parsedLimit;

  // 2. Build the base order filtering condition (e.g., filter by Order status)
  const where = status ? { status } : {};

  // 3. Define the nested search conditions if a search query exists
  let customerWhere = null;
  let driverUserWhere = null;

  if (search) {
    // Condition applied to Customer (User model)
    customerWhere = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ]
    };

    // Condition applied to Driver's User profile
    driverUserWhere = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ]
    };
  }

  // 4. Execute findAndCountAll with conditional inclusions
  // Note: We use subQuery: false if filtering by deep inclusions to ensure correct limits/offsets
  const { count, rows } = await Order.findAndCountAll({
    where,
    subQuery: false, 
    include: [
      { 
        model: User, 
        as: 'customer', 
        attributes: ['id', 'name', 'email', 'phone'],
        where: search ? customerWhere : undefined,
        required: search ? false : true // Make optional during search to allow driver matches
      },
      {
        model: Driver,
        as: 'driver',
        required: false,
        include: [{ 
          model: User, 
          as: 'user', 
          attributes: ['id', 'name', 'phone'],
          where: search ? driverUserWhere : undefined,
          required: search ? false : true
        }],
      },
      { 
        model: Payment, 
        as: 'payment', 
        attributes: ['status', 'amount'], 
        required: false 
      },
    ],
    // 5. If global search is active, ensure we find orders matching EITHER customer OR driver attributes
    ...(search && {
      where: {
        ...where,
        [Op.or]: [
          { '$customer.name$': { [Op.iLike]: `%${search}%` } },
          { '$customer.email$': { [Op.iLike]: `%${search}%` } },
          { '$driver.user.name$': { [Op.iLike]: `%${search}%` } }
        ]
      }
    }),
    order: [['createdAt', 'DESC']],
    limit: parsedLimit,
    offset: offset,
  });

  // 6. Calculate total pages for your frontend template UI track
  const totalPages = Math.ceil(count / parsedLimit);

  res.json({ 
    success: true, 
    data: { 
      orders: rows, 
      totalItems: count,
      totalPages: totalPages || 1,
      page: parsedPage,
      pageSize: parsedLimit
    } 
  });
};

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
  getAllUsers,
  toggleUserStatus,
  verifyDriver,
  getAllOrders,
  
};
