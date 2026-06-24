const { User } = require("../models");
const { ValidationError, ConflictError } = require("../middleware/error.middleware");

const updateProfile = async (user, { name, phone }) => {
  const updated = {};

  if (name) {
    updated.name = name.trim();
  }

  if (phone) {
    const existingPhone = await User.findOne({ where: { phone } });
    if (existingPhone && existingPhone.id !== user.id) {
      throw new ConflictError("Phone already in use");
    }
    updated.phone = phone;
  }

  return await user.update(updated);
};

const updateAvatar = async (user, filePath) => {
  if (!filePath) {
    throw new ValidationError("No file uploaded");
  }
  return await user.update({ avatar: filePath });
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new ValidationError("All fields are required");
  }
  if (newPassword.length < 6) {
    throw new ValidationError("Password must be at least 6 characters");
  }
  if (currentPassword === newPassword) {
    throw new ValidationError("New password must be different");
  }

  const user = await User.scope("withPassword").findByPk(userId);
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    throw new ValidationError("Current password incorrect");
  }

  return await user.update({ password: newPassword });
};

module.exports = {
  updateProfile,
  updateAvatar,
  changePassword,
};