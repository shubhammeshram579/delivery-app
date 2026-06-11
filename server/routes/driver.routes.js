// const express = require('express');
// const router = express.Router();
// const { protect, restrictTo } = require('../middleware/auth.middleware');
// const { Driver, User, Earnings } = require('../models');
// const { Op } = require('sequelize');
// const { cacheGet, cacheSet } = require('../config/redis');
// const { NotFoundError } = require('../middleware/error.middleware');

// router.use(protect, restrictTo('driver'));

// // Get driver profile
// router.get('/profile', async (req, res) => {
//   const driver = await Driver.findOne({
//     where: { userId: req.user.id },
//     include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'avatar'] }],
//   });
//   if (!driver) throw new NotFoundError('Driver profile');
//   res.json({ success: true, data: { driver } });
// });

// // Earnings summary
// router.get('/earnings', async (req, res) => {
//   const driver = await Driver.findOne({ where: { userId: req.user.id } });
//   if (!driver) throw new NotFoundError('Driver profile');

//   const cacheKey = `earnings:${driver.id}`;
//   const cached = await cacheGet(cacheKey);
//   if (cached) return res.json({ success: true, data: cached });

//   const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

//   const [total, thisMonth, recent] = await Promise.all([
//     Earnings.sum('netEarning', { where: { driverId: driver.id } }),
//     Earnings.sum('netEarning', {
//       where: { driverId: driver.id, createdAt: { [Op.gte]: startOfMonth } },
//     }),
//     Earnings.findAll({
//       where: { driverId: driver.id },
//       order: [['createdAt', 'DESC']],
//       limit: 20,
//     }),
//   ]);

//   const data = { total: total || 0, thisMonth: thisMonth || 0, recent };
//   await cacheSet(cacheKey, data, 300);
//   res.json({ success: true, data });
// });

// // Toggle availability
// router.patch('/availability', async (req, res) => {
//   const { isAvailable } = req.body;
//   await Driver.update({ isAvailable }, { where: { userId: req.user.id } });
//   res.json({ success: true, message: `Now ${isAvailable ? 'available' : 'unavailable'}` });
// });

// module.exports = router;


const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/driver.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { uploadDocuments } = require('../middleware/upload.middleware'); // Path to your cloudinary config file

// Secure all driver routes
router.use(protect, restrictTo('driver'));

// Profile management
router.get('/profile', ctrl.getProfile);

// Handle multiple file uploads for driver document updates
router.put(
  '/profile',
  uploadDocuments.fields([
    { name: 'avatar', maxCount: 1 },
    { name: 'licenseDoc', maxCount: 1 },
    { name: 'aadhaarDoc', maxCount: 1 },
    { name: 'vehicleDoc', maxCount: 1 }
  ]),
  ctrl.updateProfile
);

// Settings and performance
router.patch('/availability', ctrl.toggleAvailability);
router.get('/earnings', ctrl.getEarningsSummary);

module.exports = router;