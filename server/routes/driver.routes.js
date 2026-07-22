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