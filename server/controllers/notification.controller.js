const notificationService = require("../services/notification.service");
const asyncHandler = require("../utils/asyncHandler");

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await notificationService.getNotifications(req.user.id);
  
  res.status(200).json({
    success: true,
    data: { notifications },
  });
});

const markAllAsRead = asyncHandler(async (req, res) => {
  const updatedCount = await notificationService.markAllAsRead(req.user.id);

  res.status(200).json({
    success: true,
    message: "Notifications marked as read",
    data: { updatedCount },
  });
});

const markAsReadById = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsReadById(req.params.id, req.user.id);

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  res.status(200).json({
    success: true,
    message: "Notification marked as read",
    data: notification,
  });
});

const deleteNotification = asyncHandler(async (req, res) => {
  const deleted = await notificationService.deleteNotification(req.params.id, req.user.id);

  if (!deleted) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  res.status(200).json({
    success: true,
    message: "Notification deleted successfully",
  });
});


module.exports = {
    getNotifications,
    markAllAsRead,
    markAsReadById,
    deleteNotification

}