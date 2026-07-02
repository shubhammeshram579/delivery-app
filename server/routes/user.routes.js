const express = require("express");
const router = express.Router();

const { protect } = require("../middleware/auth.middleware");
const { uploadAvatar } = require("../middleware/upload.middleware");

const userController = require("../controllers/user.controller");
const notificationController = require("../controllers/notification.controller");

// Protect all routes below this line
router.use(protect);

// Profile & Security Routes
router.patch("/profile", userController.updateProfile);
router.post("/avatar", uploadAvatar.single("avatar"), userController.uploadAvatar);
router.patch("/password", userController.changePassword);

// Notification Routes
router.get("/notifications", notificationController.getNotifications);
router.patch("/notifications/read", notificationController.markAllAsRead);
router.patch("/notifications/read/:id", notificationController.markAsReadById);
router.delete("/notifications/:id", notificationController.deleteNotification);

module.exports = router;