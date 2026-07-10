const { User, Driver, Order, Payment } = require('../models');
const { Op, fn, col } = require('sequelize');
const { cacheSet, cacheGet } = require('../config/redis');
const { NotFoundError, ValidationError } = require('../middleware/error.middleware');

const getDashboardStats = async () => {
  const cacheKey = 'admin:dashboard';
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

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
  return data;
};

const getRevenueAnalytics = async (days) => {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return await Payment.findAll({
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
};

const getAllUsers = async (queryParams) => {
  const { page = 1, limit = 10, role, search, status, isVerified } = queryParams;
  
  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));
  const offset = (parsedPage - 1) * parsedLimit;

  const where = { 
    role: role || { [Op.ne]: 'admin' } 
  };
  
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

  const include = [];

  if (role === 'driver') {
    const driverWhere = {};
    if (isVerified !== undefined && isVerified !== '') {
      driverWhere.isVerified = isVerified === 'true';
    }

    include.push({
      model: Driver,
      as: 'driverProfile',
      required: isVerified !== undefined && isVerified !== '',
      where: Object.keys(driverWhere).length > 0 ? driverWhere : undefined
    });
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    attributes: { exclude: ['password', 'refreshToken'] },
    include, 
    order: [['createdAt', 'DESC']],
    limit: parsedLimit,
    offset,
  });

  const totalPages = Math.ceil(count / parsedLimit);

  return { 
    users: rows, 
    totalItems: count,          
    totalPages: totalPages || 1, 
    page: parsedPage,           
    pageSize: parsedLimit       
  };
};

const toggleUserStatus = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw new NotFoundError('User');
  
  await user.update({ isActive: !user.isActive });
  return { 
    message: `User ${user.isActive ? 'activated' : 'deactivated'}` 
  };
};

const verifyDriver = async (userId, body) => {
  const { licenseStatus, aadhaarStatus, vehicleDocumentStatus, rejectionReason } = body;

  const driver = await Driver.findOne({ where: { userId } });
  if (!driver) {
    throw new NotFoundError('Driver profile not found');
  }

  const statusOptions = ['pending', 'approved', 'rejected'];
  if (
    (licenseStatus && !statusOptions.includes(licenseStatus)) ||
    (aadhaarStatus && !statusOptions.includes(aadhaarStatus)) ||
    (vehicleDocumentStatus && !statusOptions.includes(vehicleDocumentStatus))
  ) {
    throw new ValidationError('Invalid status type provided for verification update.');
  }

  // Current date tracking boundary (YYYY-MM-DD format verification)
  const todayDateString = new Date().toISOString().split('T')[0];

  // 1. Evaluate Regulatory Document Status Updates
  if (licenseStatus) {
    // Override manual approval if the database records show the license has already expired
    if (licenseStatus === 'approved' && driver.licenseExpiryDate && driver.licenseExpiryDate < todayDateString) {
      throw new ValidationError('Cannot approve profile: Driving License has already expired.');
    }
    driver.licenseStatus = licenseStatus;
  }

  if (aadhaarStatus) {
    driver.aadhaarStatus = aadhaarStatus;
  }

  if (vehicleDocumentStatus) {
    // Override manual approval if RC Book or Insurance coverage validation timelines have passed
    if (vehicleDocumentStatus === 'approved') {
      if (driver.vehicleRegistrationExpiryDate && driver.vehicleRegistrationExpiryDate < todayDateString) {
        throw new ValidationError('Cannot approve profile: Vehicle Registration (RC Book) has expired.');
      }
      if (driver.insuranceExpiryDate && driver.insuranceExpiryDate < todayDateString) {
        throw new ValidationError('Cannot approve profile: Vehicle Insurance coverage timeline has expired.');
      }
    }
    driver.vehicleDocumentStatus = vehicleDocumentStatus;
  }

  // 2. Structural State Resolution Logic
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
    const allApproved = 
      driver.licenseStatus === 'approved' && 
      driver.aadhaarStatus === 'approved' && 
      driver.vehicleDocumentStatus === 'approved';
    
    if (allApproved) {
      driver.isVerified = true;
      driver.rejectionReason = null;
    }
  }

  await driver.save();
  return driver;
};

const getAllOrders = async (queryParams) => {
  const { page = 1, limit = 25, status, search } = queryParams;

  const parsedPage = Math.max(1, parseInt(page, 10));
  const parsedLimit = Math.max(1, parseInt(limit, 10));
  const offset = (parsedPage - 1) * parsedLimit;

  const where = status ? { status } : {};

  let customerWhere = null;
  let driverUserWhere = null;

  if (search) {
    customerWhere = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ]
    };

    driverUserWhere = {
      [Op.or]: [
        { name: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } }
      ]
    };
  }

  const { count, rows } = await Order.findAndCountAll({
    where,
    subQuery: false, 
    include: [
      { 
        model: User, 
        as: 'customer', 
        attributes: ['id', 'name', 'email', 'phone'],
        where: search ? customerWhere : undefined,
        required: search ? false : true 
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
    offset,
  });

  const totalPages = Math.ceil(count / parsedLimit);

  return { 
    orders: rows, 
    totalItems: count,
    totalPages: totalPages || 1,
    page: parsedPage,
    pageSize: parsedLimit
  };
};

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
  getAllUsers,
  toggleUserStatus,
  verifyDriver,
  getAllOrders
};