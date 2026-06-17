const { sequelize } = require('../config/database');
const { Driver, User, Earnings } = require('../models');
const { Op } = require('sequelize');
const { cacheGet, cacheSet } = require('../config/redis');
const { NotFoundError, ValidationError } = require('../middleware/error.middleware');

const getDriverProfile = async (userId) => {
  const driver = await Driver.findOne({
    where: { userId },
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'email', 'phone', 'avatar'] }],
  });
  if (!driver) throw new NotFoundError('Driver profile not found');
  return driver;
};

// const updateDriverProfile = async (currentUser, updateFields, fileUrls) => {
//   const {
//     name,
//     phone,
//     vehicleType,
//     vehicleNumber,
//     licenseNumber,
//     aadhaarNumber
//   } = updateFields;

//   const driver = await Driver.findOne({ where: { userId: currentUser.id } });
//   if (!driver) throw new NotFoundError('Driver profile not found');

//   // Validate Enum options early
//   const allowedVehicles = ['bike', 'scooter', 'car', 'van', 'truck'];
//   if (vehicleType && !allowedVehicles.includes(vehicleType)) {
//     throw new ValidationError(`Invalid vehicle type. Choose from: ${allowedVehicles.join(', ')}`);
//   }

//   // Prevent identity/vehicle duplicates
//   if (vehicleNumber || licenseNumber || aadhaarNumber) {
//     const duplicateCheck = await Driver.findOne({
//       where: {
//         userId: { [Op.ne]: currentUser.id },
//         [Op.or]: [
//           vehicleNumber ? { vehicleNumber } : null,
//           licenseNumber ? { licenseNumber } : null,
//           aadhaarNumber ? { aadhaarNumber } : null
//         ].filter(Boolean)
//       }
//     });
//     if (duplicateCheck) {
//       throw new ValidationError('Vehicle number, License number, or Aadhaar number is already in use by another account.');
//     }
//   }

//   // Use a transactional pipeline block
//   const transaction = await sequelize.transaction();
//   let securityResetRequired = false;

//   try {
//     // Update structural user values
//     await User.update(
//       {
//         name: name || currentUser.name,
//         phone: phone || currentUser.phone,
//         avatar: fileUrls.avatar || currentUser.avatar,
//       },
//       { where: { id: currentUser.id }, transaction }
//     );

//     const driverUpdates = {
//       vehicleType: vehicleType || driver.vehicleType,
//       vehicleNumber: vehicleNumber || driver.vehicleNumber,
//     };

//     // Evaluate updates against storage configurations to manage validation conditions
//     if (licenseNumber && licenseNumber !== driver.licenseNumber) {
//       driverUpdates.licenseNumber = licenseNumber;
//       driverUpdates.licenseStatus = 'pending';
//       securityResetRequired = true;
//     }
//     if (fileUrls.licenseUrl) {
//       driverUpdates.licenseUrl = fileUrls.licenseUrl;
//       driverUpdates.licenseStatus = 'pending';
//       securityResetRequired = true;
//     }

//     if (aadhaarNumber && aadhaarNumber !== driver.aadhaarNumber) {
//       driverUpdates.aadhaarNumber = aadhaarNumber;
//       driverUpdates.aadhaarStatus = 'pending';
//       securityResetRequired = true;
//     }
//     if (fileUrls.aadhaarUrl) {
//       driverUpdates.aadhaarUrl = fileUrls.aadhaarUrl;
//       driverUpdates.aadhaarStatus = 'pending';
//       securityResetRequired = true;
//     }

//     if (fileUrls.vehicleDocumentUrl) {
//       driverUpdates.vehicleDocumentUrl = fileUrls.vehicleDocumentUrl;
//       driverUpdates.vehicleDocumentStatus = 'pending';
//       securityResetRequired = true;
//     }

//     if (securityResetRequired) {
//       driverUpdates.isVerified = false;
//       driverUpdates.rejectionReason = null;
//     }

//     await Driver.update(driverUpdates, { where: { userId: currentUser.id }, transaction });
//     await transaction.commit();

//     const freshProfile = await getDriverProfile(currentUser.id);
//     return { profile: freshProfile, securityResetRequired };

//   } catch (error) {
//     await transaction.rollback();
//     throw error;
//   }
// };

const updateDriverProfile = async (currentUser, updateFields, fileUrls) => {
  const {
    name,
    phone,
    vehicleType,
    vehicleNumber,
    licenseNumber,
    aadhaarNumber,
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

  // Duplicate check
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
    // Update User table
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

    // License Number
    if (licenseNumber && licenseNumber !== driver.licenseNumber) {
      driverUpdates.licenseNumber = licenseNumber;
      driverUpdates.licenseStatus = "pending";
      securityResetRequired = true;
    }

    // License Image
    if (fileUrls.licenseUrl) {
      driverUpdates.licenseUrl = fileUrls.licenseUrl;
      driverUpdates.licenseStatus = "pending";
      securityResetRequired = true;
    }

    // Aadhaar Number
    if (aadhaarNumber && aadhaarNumber !== driver.aadhaarNumber) {
      driverUpdates.aadhaarNumber = aadhaarNumber;
      driverUpdates.aadhaarStatus = "pending";
      securityResetRequired = true;
    }

    // Aadhaar Image
    if (fileUrls.aadhaarUrl) {
      driverUpdates.aadhaarUrl = fileUrls.aadhaarUrl;
      driverUpdates.aadhaarStatus = "pending";
      securityResetRequired = true;
    }

    // Vehicle Document
    if (fileUrls.vehicleDocumentUrl) {
      driverUpdates.vehicleDocumentUrl = fileUrls.vehicleDocumentUrl;
      driverUpdates.vehicleDocumentStatus = "pending";
      securityResetRequired = true;
    }

    // Reset verification if sensitive information changed
    if (securityResetRequired) {
      driverUpdates.isVerified = false;
      driverUpdates.rejectionReason = null;
    }

    // Final values after update
    const finalDriver = {
      vehicleType: driverUpdates.vehicleType,
      vehicleNumber: driverUpdates.vehicleNumber,
      licenseNumber:
        driverUpdates.licenseNumber || driver.licenseNumber,
      aadhaarNumber:
        driverUpdates.aadhaarNumber || driver.aadhaarNumber,
      licenseUrl:
        driverUpdates.licenseUrl || driver.licenseUrl,
      aadhaarUrl:
        driverUpdates.aadhaarUrl || driver.aadhaarUrl,
      vehicleDocumentUrl:
        driverUpdates.vehicleDocumentUrl ||
        driver.vehicleDocumentUrl,
    };

    // Check profile completion
    driverUpdates.profileCompleted =
      !!finalDriver.vehicleType &&
      !!finalDriver.vehicleNumber &&
      !!finalDriver.licenseNumber &&
      !!finalDriver.aadhaarNumber &&
      !!finalDriver.licenseUrl &&
      !!finalDriver.aadhaarUrl &&
      !!finalDriver.vehicleDocumentUrl;

    // Update Driver table
    await Driver.update(driverUpdates, {
      where: {
        userId: currentUser.id,
      },
      transaction,
    });

    await transaction.commit();

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