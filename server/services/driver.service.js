const cron = require('node-cron');
const { sequelize } = require('../config/database');
const { Driver, User, Earnings } = require('../models');
const { Op } = require('sequelize');
const { cacheGet, cacheSet } = require('../config/redis');
const { NotFoundError, ValidationError } = require('../middleware/error.middleware');
const {sendNotification} = require("../utils/notifications")
const {notifyAdmins} = require("../utils/adminNotification")


// Run every day at midnight (00:00)
cron.schedule('0 0 * * *', async () => {
  console.log('Running daily document expiration checks...');

  const targets = [30, 7]; // Days remaining triggers

  for (const days of targets) {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    const dateString = targetDate.toISOString().split('T')[0]; // Format matches DATEONLY ('YYYY-MM-DD')

    // Find drivers matching target dates on any document
    const driversToNotify = await Driver.findAll({
      where: {
        [Op.or]: [
          { licenseExpiryDate: dateString },
          { insuranceExpiryDate: dateString },
          { vehicleRegistrationExpiryDate: dateString }
        ]
      }
    });

    for (const driver of driversToNotify) {
      let documentName = '';
      if (driver.licenseExpiryDate === dateString) documentName = 'Driving License';
      else if (driver.insuranceExpiryDate === dateString) documentName = 'Vehicle Insurance';
      else if (driver.vehicleRegistrationExpiryDate === dateString) documentName = 'Vehicle Registration (RC)';

      // 1. Notify the Driver
      await sendNotification(driver.userId, {
        title: `⚠️ Document Expiry Warning`,
        body: `Your ${documentName} will expire in ${days} days. Please update your document details to avoid suspension.`,
        type: "system"
      });

      // 2. Notify the Admin Dashboard / System
      await notifyAdmins({
        title: `🚨 Driver Document Expiring Soon`,
        body: `Driver Profile ID: ${driver.id}'s ${documentName} expires in ${days} days.`,
        type: "system",
        data: { driverId: driver.id }
      });
    }
  }
});

const getDriverProfile = async (userId) => {
  const driver = await Driver.findOne({
    where: { userId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'avatar'] }],
  });
  if (!driver) throw new NotFoundError('Driver profile not found');
  return driver;
};


const updateDriverProfile = async (currentUser, updateFields, fileUrls) => {
  const {
    name,
    phone,
    vehicleType,
    vehicleNumber,
    licenseNumber,
    aadhaarNumber,
    licenseExpiryDate,
    insuranceExpiryDate,
    vehicleRegistrationExpiryDate,
  } = updateFields;

  const driver = await Driver.findOne({
    where: { userId: currentUser.id },
  });

  if (!driver) {
    throw new NotFoundError("Driver profile not found");
  }

  // Validate vehicle type
  const allowedVehicles = ["bike", "scooter", "car", "van", "truck"];
  if (vehicleType && !allowedVehicles.includes(vehicleType)) {
    throw new ValidationError(
      `Invalid vehicle type. Choose from: ${allowedVehicles.join(", ")}`
    );
  }

  // Validate that Expiry dates are future dates
  const today = new Date().toISOString().split('T')[0];
  if (licenseExpiryDate && licenseExpiryDate < today) {
    throw new ValidationError("Driver License has already expired.");
  }
  if (insuranceExpiryDate && insuranceExpiryDate < today) {
    throw new ValidationError("Insurance validity date must be in the future.");
  }
  if (vehicleRegistrationExpiryDate && vehicleRegistrationExpiryDate < today) {
    throw new ValidationError("Vehicle Registration (RC) has already expired.");
  }

  // Duplicate data check
  if (vehicleNumber || licenseNumber || aadhaarNumber) {
    const duplicate = await Driver.findOne({
      where: {
        userId: {
          [Op.ne]: currentUser.id,
        },
        [Op.or]: [
          vehicleNumber && { vehicleNumber },
          licenseNumber && { licenseNumber },
          aadhaarNumber && { aadhaarNumber },
        ].filter(Boolean),
      },
    });

    if (duplicate) {
      throw new ValidationError(
        "Vehicle number, License number or Aadhaar number already exists."
      );
    }
  }

  const transaction = await sequelize.transaction();
  let securityResetRequired = false;

  try {
    // Update User core table
    await User.update(
      {
        name: name || currentUser.name,
        phone: phone || currentUser.phone,
        avatar: fileUrls.avatar || currentUser.avatar,
      },
      {
        where: { id: currentUser.id },
        transaction,
      }
    );

    const driverUpdates = {
      vehicleType: vehicleType || driver.vehicleType,
      vehicleNumber: vehicleNumber || driver.vehicleNumber,
    };

    // License updates
    if (licenseNumber && licenseNumber !== driver.licenseNumber) {
      driverUpdates.licenseNumber = licenseNumber;
      securityResetRequired = true;
    }
    if (licenseExpiryDate && licenseExpiryDate !== driver.licenseExpiryDate) {
      driverUpdates.licenseExpiryDate = licenseExpiryDate;
      securityResetRequired = true;
    }
    if (fileUrls.licenseUrl) {
      driverUpdates.licenseUrl = fileUrls.licenseUrl;
      securityResetRequired = true;
    }
    if (securityResetRequired && (licenseNumber || licenseExpiryDate || fileUrls.licenseUrl)) {
      driverUpdates.licenseStatus = "pending";
    }

    // Aadhaar updates
    let aadhaarChanged = false;
    if (aadhaarNumber && aadhaarNumber !== driver.aadhaarNumber) {
      driverUpdates.aadhaarNumber = aadhaarNumber;
      aadhaarChanged = true;
    }
    if (fileUrls.aadhaarUrl) {
      driverUpdates.aadhaarUrl = fileUrls.aadhaarUrl;
      aadhaarChanged = true;
    }
    if (aadhaarChanged) {
      driverUpdates.aadhaarStatus = "pending";
      securityResetRequired = true;
    }

    // Vehicle Registration & Insurance updates
    let vehicleDocsChanged = false;
    if (vehicleRegistrationExpiryDate && vehicleRegistrationExpiryDate !== driver.vehicleRegistrationExpiryDate) {
      driverUpdates.vehicleRegistrationExpiryDate = vehicleRegistrationExpiryDate;
      vehicleDocsChanged = true;
    }
    if (fileUrls.vehicleDocumentUrl) {
      driverUpdates.vehicleDocumentUrl = fileUrls.vehicleDocumentUrl;
      vehicleDocsChanged = true;
    }
    if (vehicleDocsChanged) {
      driverUpdates.vehicleDocumentStatus = "pending";
      securityResetRequired = true;
    }

    // Insurance update (doesn't change status directly but requires a review state update)
    if (insuranceExpiryDate && insuranceExpiryDate !== driver.insuranceExpiryDate) {
      driverUpdates.insuranceExpiryDate = insuranceExpiryDate;
      securityResetRequired = true;
    }

    // Reset verification flag if any sensitive documentation changed
    if (securityResetRequired) {
      driverUpdates.isVerified = false;
      driverUpdates.verifiedBy = null;
      driverUpdates.verifiedAt = null;
      driverUpdates.rejectionReason = null;
    }

    // Collate properties to calculate comprehensive profile completion status
    const finalDriver = {
      vehicleType: driverUpdates.vehicleType,
      vehicleNumber: driverUpdates.vehicleNumber,
      licenseNumber: driverUpdates.licenseNumber || driver.licenseNumber,
      licenseUrl: driverUpdates.licenseUrl || driver.licenseUrl,
      licenseExpiryDate: driverUpdates.licenseExpiryDate || driver.licenseExpiryDate,
      aadhaarNumber: driverUpdates.aadhaarNumber || driver.aadhaarNumber,
      aadhaarUrl: driverUpdates.aadhaarUrl || driver.aadhaarUrl,
      vehicleDocumentUrl: driverUpdates.vehicleDocumentUrl || driver.vehicleDocumentUrl,
      vehicleRegistrationExpiryDate: driverUpdates.vehicleRegistrationExpiryDate || driver.vehicleRegistrationExpiryDate,
      insuranceExpiryDate: driverUpdates.insuranceExpiryDate || driver.insuranceExpiryDate,
    };

    driverUpdates.profileCompleted =
      !!finalDriver.vehicleType &&
      !!finalDriver.vehicleNumber &&
      !!finalDriver.licenseNumber &&
      !!finalDriver.licenseUrl &&
      !!finalDriver.licenseExpiryDate &&
      !!finalDriver.aadhaarNumber &&
      !!finalDriver.aadhaarUrl &&
      !!finalDriver.vehicleDocumentUrl &&
      !!finalDriver.vehicleRegistrationExpiryDate &&
      !!finalDriver.insuranceExpiryDate;

    // Persist changes
    await Driver.update(driverUpdates, {
      where: { userId: currentUser.id },
      transaction,
    });

    await transaction.commit();

    // Trigger System Event Notifications
    if (!driver.profileCompleted && driverUpdates.profileCompleted) {
      await notifyAdmins({
        title: "✅ Driver Profile Completed",
        body: `${currentUser.name} completed their driver profile and is ready for verification.`,
        type: "system",
        data: {
          driverId: driver.id,
          userId: currentUser.id,
          vehicleType: driverUpdates.vehicleType,
        },
      });
    }

    if (securityResetRequired) {
      await notifyAdmins({
        title: "📄 Driver Documents Updated",
        body: `${currentUser.name} updated verification documents. Admin review is required.`,
        type: "system",
        data: {
          driverId: driver.id,
          userId: currentUser.id,
          verificationStatus: "pending",
        },
      });
    }

    const freshProfile = await getDriverProfile(currentUser.id);

    return {
      profile: freshProfile,
      securityResetRequired,
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

const updateAvailability = async (userId, isAvailable) => {
  if (isAvailable === undefined) throw new ValidationError('Availability state is required');
  
  await Driver.update({ isAvailable }, { where: { userId } });
  return { message: `Now ${isAvailable ? 'available' : 'unavailable'}` };
};

const getEarnings = async (userId) => {
  const driver = await Driver.findOne({ where: { userId } });
  if (!driver) throw new NotFoundError('Driver profile not found');

  const cacheKey = `earnings:${driver.id}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const [total, thisMonth, recent] = await Promise.all([
    Earnings.sum('netEarning', { where: { driverId: driver.id } }),
    Earnings.sum('netEarning', {
      where: { driverId: driver.id, createdAt: { [Op.gte]: startOfMonth } },
    }),
    Earnings.findAll({
      where: { driverId: driver.id },
      order: [['createdAt', 'DESC']],
      limit: 20,
    }),
  ]);

  const earningsData = { total: total || 0, thisMonth: thisMonth || 0, recent };
  await cacheSet(cacheKey, earningsData, 300);
  return earningsData;
};

module.exports = {
  getDriverProfile,
  updateDriverProfile,
  updateAvailability,
  getEarnings
};