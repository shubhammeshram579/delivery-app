const { Notification } = require("../models");

const getNotifications = async (userId) => {
  return await Notification.findAll({
    where: { userId },
    order: [["createdAt", "DESC"]],
    limit: 50,
  });
};

const markAllAsRead = async (userId) => {
  const [updatedCount] = await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { userId, isRead: false } }
  );
  return updatedCount;
};

const markAsReadById = async (id, userId) => {
  const notification = await Notification.findOne({ where: { id, userId } });
  if (!notification) return null;

  return await notification.update({
    isRead: true,
    readAt: new Date(),
  });
};

const deleteNotification = async (id, userId) => {
  const notification = await Notification.findOne({ where: { id, userId } });
  if (!notification) return false;

  await notification.destroy();
  return true;
};

module.exports = {
  getNotifications,
  markAllAsRead,
  markAsReadById,
  deleteNotification,
};