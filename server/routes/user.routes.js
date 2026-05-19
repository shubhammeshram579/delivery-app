// const express = require('express');
// const router = express.Router();
// const { protect } = require('../middleware/auth.middleware');
// const { uploadAvatar } = require('../middleware/upload.middleware');
// const { Notification } = require('../models');

// router.use(protect);

// // Update profile
// router.patch('/profile', async (req, res) => {
//   const { name, phone } = req.body;
//   const updated = {};
//   if (name) updated.name = name;
//   if (phone) updated.phone = phone;
//   await req.user.update(updated);
//   res.json({ success: true, message: 'Profile updated', data: { user: req.user } });
// });

// // Upload avatar
// router.post('/avatar', uploadAvatar.single('avatar'), async (req, res) => {
//   if (!req.file) throw new Error('No file uploaded');
//   await req.user.update({ avatar: req.file.path });
//   res.json({ success: true, data: { avatar: req.file.path } });
// });

// // Change password
// router.patch('/password', async (req, res) => {
//   const { currentPassword, newPassword } = req.body;
//   const { User } = require('../models');
//   const user = await User.scope('withPassword').findByPk(req.user.id);
//   const isMatch = await user.comparePassword(currentPassword);
//   if (!isMatch) {
//     const { ValidationError } = require('../middleware/error.middleware');
//     throw new ValidationError('Current password is incorrect');
//   }
//   await user.update({ password: newPassword });
//   res.json({ success: true, message: 'Password changed successfully' });
// });

// // Get notifications
// router.get('/notifications', async (req, res) => {
//   const notifications = await Notification.findAll({
//     where: { userId: req.user.id },
//     order: [['createdAt', 'DESC']],
//     limit: 50,
//   });
//   res.json({ success: true, data: { notifications } });
// });

// // Mark all notifications read
// router.patch('/notifications/read', async (req, res) => {
//   await Notification.update(
//     { isRead: true, readAt: new Date() },
//     { where: { userId: req.user.id, isRead: false } }
//   );
//   res.json({ success: true, message: 'Notifications marked as read' });
// });

// module.exports = router;


const express = require('express');

const router = express.Router();

const { protect } = require('../middleware/auth.middleware');

const {
  uploadAvatar,
} = require('../middleware/upload.middleware');

const asyncHandler = require('../utils/asyncHandler');

const {
  ValidationError,
  ConflictError,
} = require('../middleware/error.middleware');

const {
  Notification,
  User,
} = require('../models');


// Protect all routes
router.use(protect);


// ─────────────────────────────────────────────
// Update Profile
// ─────────────────────────────────────────────

router.patch(
  '/profile',

  asyncHandler(async (req, res) => {

    const {
      name,
      phone,
    } = req.body;

    const updated = {};

    if (name) {
      updated.name = name.trim();
    }

    if (phone) {

      const existingPhone =
        await User.findOne({
          where: { phone },
        });

      if (
        existingPhone &&
        existingPhone.id !== req.user.id
      ) {

        throw new ConflictError(
          'Phone already in use'
        );
      }

      updated.phone = phone;
    }

    await req.user.update(updated);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: req.user,
      },
    });
  })
);


// ─────────────────────────────────────────────
// Upload Avatar
// ─────────────────────────────────────────────

router.post(
  '/avatar',

  uploadAvatar.single('avatar'),

  asyncHandler(async (req, res) => {

    if (!req.file) {

      throw new ValidationError(
        'No file uploaded'
      );
    }

    await req.user.update({
      avatar: req.file.path,
    });

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: req.file.path,
      },
    });
  })
);


// ─────────────────────────────────────────────
// Change Password
// ─────────────────────────────────────────────

router.patch(
  '/password',

  asyncHandler(async (req, res) => {

    const {
      currentPassword,
      newPassword,
    } = req.body;

    if (
      !currentPassword ||
      !newPassword
    ) {

      throw new ValidationError(
        'All fields are required'
      );
    }

    if (
      newPassword.length < 6
    ) {

      throw new ValidationError(
        'Password must be at least 6 characters'
      );
    }

    if (
      currentPassword === newPassword
    ) {

      throw new ValidationError(
        'New password must be different'
      );
    }

    const user =
      await User.scope(
        'withPassword'
      ).findByPk(req.user.id);

    const isMatch =
      await user.comparePassword(
        currentPassword
      );

    if (!isMatch) {

      throw new ValidationError(
        'Current password incorrect'
      );
    }

    await user.update({
      password: newPassword,
    });

    res.status(200).json({
      success: true,
      message:
        'Password changed successfully',
    });
  })
);


// ─────────────────────────────────────────────
// Get Notifications
// ─────────────────────────────────────────────

router.get(
  '/notifications',

  asyncHandler(async (req, res) => {

    const notifications =
      await Notification.findAll({
        where: {
          userId: req.user.id,
        },

        order: [
          ['createdAt', 'DESC'],
        ],

        limit: 50,
      });

    res.status(200).json({
      success: true,
      data: {
        notifications,
      },
    });
  })
);


// ─────────────────────────────────────────────
// Mark Notifications Read
// ─────────────────────────────────────────────

router.patch(
  '/notifications/read',

  asyncHandler(async (req, res) => {

    const [updatedCount] =
      await Notification.update(
        {
          isRead: true,
          readAt: new Date(),
        },
        {
          where: {
            userId: req.user.id,
            isRead: false,
          },
        }
      );

    res.status(200).json({
      success: true,
      message:
        'Notifications marked as read',
      data: {
        updatedCount,
      },
    });
  })
);

// notification read id
router.patch(
  '/notifications/read/:id',

  asyncHandler(async (req, res) => {

    const { id } = req.params;

    const notification =
      await Notification.findOne({
        where: {
          id,
          userId: req.user.id,
        },
      });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await notification.update({
      isRead: true,
      readAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  })
);


router.delete(
  '/notifications/:id',

  asyncHandler(async (req, res) => {

    const { id } = req.params;

    const notification =
      await Notification.findOne({
        where: {
          id,
          userId: req.user.id,
        },
      });

    // not found
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // delete
    await notification.destroy();

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully',
    });
  })
);


module.exports = router;
