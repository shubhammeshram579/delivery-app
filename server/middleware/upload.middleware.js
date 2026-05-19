const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { ValidationError } = require('./error.middleware');

const createStorage = (folder) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `delivery-app/${folder}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    },
  });

const fileFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError('Only JPG, PNG and WEBP images are allowed'), false);
  }
};

const uploadAvatar = multer({
  storage: createStorage('avatars'),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const uploadDeliveryProof = multer({
  storage: createStorage('delivery-proofs'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadDocuments = multer({
  storage: createStorage('documents'),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = { uploadAvatar, uploadDeliveryProof, uploadDocuments };
