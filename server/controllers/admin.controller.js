const adminService = require('../services/admin.service');

const getDashboardStats = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    return res.json({ success: true, data: stats });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getRevenueAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    const data = await adminService.getRevenueAnalytics(days);
    return res.json({ success: true, data });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const result = await adminService.getAllUsers(req.query);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.toggleUserStatus(id);
    return res.json({ success: true, message: result.message });
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const verifyDriver = async (req, res) => {
  try {
    const userId = req.params.id;
    const driver = await adminService.verifyDriver(userId, req.body);
    
    return res.status(200).json({
      success: true,
      message: driver.isVerified 
        ? 'Driver verified successfully and activated.' 
        : 'Driver document statuses updated successfully.',
      data: { driver }
    });
  } catch (error) {
    console.error(error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({ success: false, message: error.message });
  }
};

const getAllOrders = async (req, res) => {
  try {
    const result = await adminService.getAllOrders(req.query);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
  getAllUsers,
  toggleUserStatus,
  verifyDriver,
  getAllOrders
};
