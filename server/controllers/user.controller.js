const userService = require("../services/user.service");
const asyncHandler = require("../utils/asyncHandler");

const updateProfile = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateProfile(req.user, req.body);
  
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: { user: updatedUser },
  });
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const filePath = req.file ? req.file.path : null;
  await userService.updateAvatar(req.user, filePath);

  res.status(200).json({
    success: true,
    message: "Avatar uploaded successfully",
    data: { avatar: filePath },
  });
});

const changePassword = asyncHandler(async (req, res) => {
  await userService.changePassword(req.user.id, req.body);

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
});

module.exports = {
    updateProfile,
    uploadAvatar,
    changePassword

}