const { User } = require("../models");
const { sendNotification } = require("./notifications");

const notifyAdmins = async (payload) => {
  const admins = await User.findAll({
    where: {
      role: "admin",
    },
    attributes: ["id"],
  });

  await Promise.all(
    admins.map(admin =>
      sendNotification(admin.id, payload)
    )
  );
};

module.exports = {notifyAdmins}