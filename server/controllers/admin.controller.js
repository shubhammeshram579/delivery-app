const adminService = require('../services/admin.service');
const asyncHandler = require('../utils/asyncHandler'); // Import your handler

// Beautiful, clean, and safe from crashes
const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await adminService.getDashboardStats();
  return res.json({ success: true, data: stats });
});

const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const data = await adminService.getRevenueAnalytics(days);
  return res.json({ success: true, data });
});

const getAllUsers = asyncHandler(async (req, res) => {
  const result = await adminService.getAllUsers(req.query);
  return res.json({ success: true, data: result });
});

const toggleUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await adminService.toggleUserStatus(id);
  return res.json({ success: true, message: result.message });
});

const verifyDriver = asyncHandler(async (req, res) => {
  const userId = req.params.id;
  const driver = await adminService.verifyDriver(userId, req.body);
  
  return res.status(200).json({
    success: true,
    message: driver.isVerified 
      ? 'Driver verified successfully and activated.' 
      : 'Driver document statuses updated successfully.',
    data: { driver }
  });
});

const getAllOrders = asyncHandler(async (req, res) => {
  const result = await adminService.getAllOrders(req.query);
  return res.json({ success: true, data: result });
});

const exportOrdersCsv = asyncHandler(async (req, res) => {
  const csvData = await adminService.exportOrdersCsv(req.query);

  const filename = `orders_export_${Date.now()}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  res.status(200).send(csvData);
});

module.exports = {
  getDashboardStats,
  getRevenueAnalytics,
  getAllUsers,
  toggleUserStatus,
  verifyDriver,
  getAllOrders,
  exportOrdersCsv
};
