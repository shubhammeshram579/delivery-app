const driverService = require('../services/driver.service');

const getProfile = async (req, res) => {
  const driverData = await driverService.getDriverProfile(req.user.id);
  res.status(200).json({
    success: true,
    data: { driver: driverData }
  });
};

const updateProfile = async (req, res) => {
  // Extract files loaded into Cloudinary by Multer middleware
  const files = req.files || {};
  const fileUrls = {
    avatar: files['avatar']?.[0]?.path,
    licenseUrl: files['licenseDoc']?.[0]?.path,
    aadhaarUrl: files['aadhaarDoc']?.[0]?.path,
    vehicleDocumentUrl: files['vehicleDoc']?.[0]?.path,
  };

  // Process update through the service layer
  const updatedDriver = await driverService.updateDriverProfile(req.user, req.body, fileUrls);

  res.status(200).json({
    success: true,
    message: updatedDriver.securityResetRequired
      ? 'Profile updated successfully. Critical documents altered; pending admin re-verification.'
      : 'Profile updated successfully.',
    data: { driver: updatedDriver.profile }
  });
};

const toggleAvailability = async (req, res) => {
  const { isAvailable } = req.body;
  const result = await driverService.updateAvailability(req.user.id, isAvailable);
  
  res.status(200).json({
    success: true,
    message: result.message
  });
};

const getEarningsSummary = async (req, res) => {
  const earningsData = await driverService.getEarnings(req.user.id);
  res.status(200).json({
    success: true,
    data: earningsData
  });
};

module.exports = {
  getProfile,
  updateProfile,
  toggleAvailability,
  getEarningsSummary
};