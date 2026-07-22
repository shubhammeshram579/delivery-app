const User = require('./User');
const Driver = require('./Driver');
const Order = require('./Order');
const Payment = require('./Payment');
const Location = require('./Location');
const Earnings = require('./Earnings');
const Notification = require('./Notification');
const ChatMessage = require('./ChatMessage');
const {SupportTicket,SupportMessage} = require('./Support')
const AssignmentHistory = require("./Matching")


// User <-> Driver
User.hasOne(Driver, {
  foreignKey: 'userId',
  as: 'driverProfile',
  onDelete: 'CASCADE',
  onUpdate: 'CASCADE',
});

Driver.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user',
});

// User (customer) -> Orders
User.hasMany(Order, { foreignKey: 'customerId', as: 'customerOrders', constraints: false });
Order.belongsTo(User, { foreignKey: 'customerId', as: 'customer', constraints: false });

// Driver -> Orders
Driver.hasMany(Order, { foreignKey: 'driverId', as: 'driverOrders', constraints: false });
Order.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver', constraints: false });

// Order <-> Payment
Order.hasOne(Payment, { foreignKey: 'orderId', as: 'payment', constraints: false });
Payment.belongsTo(Order, { foreignKey: 'orderId', as: 'order', constraints: false });

// Order -> Locations
Order.hasMany(Location, { foreignKey: 'orderId', as: 'locationHistory', constraints: false });
Location.belongsTo(Order, { foreignKey: 'orderId', constraints: false });

// Driver -> Earnings
Driver.hasMany(Earnings, { foreignKey: 'driverId', as: 'earnings', constraints: false });
Earnings.belongsTo(Driver, { foreignKey: 'driverId', constraints: false });

// Order -> Earnings
Order.hasOne(Earnings, { foreignKey: 'orderId', as: 'earning', constraints: false });
Earnings.belongsTo(Order, { foreignKey: 'orderId', constraints: false });

// User -> Notifications
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', constraints: false });
Notification.belongsTo(User, { foreignKey: 'userId', constraints: false });

// Order -> ChatMessages
Order.hasMany(ChatMessage, { foreignKey: 'orderId', as: 'messages', constraints: false });
ChatMessage.belongsTo(Order, { foreignKey: 'orderId', constraints: false });


//  other associations (after requiring SupportTicket/SupportMessage):
 
SupportTicket.hasMany(SupportMessage, { foreignKey: 'ticketId', as: 'messages', constraints: false });
SupportMessage.belongsTo(SupportTicket, { foreignKey: 'ticketId', constraints: false });

User.hasMany(SupportTicket, { foreignKey: 'userId', as: 'supportTickets', constraints: false });
SupportTicket.belongsTo(User, { foreignKey: 'userId', as: 'user', constraints: false });

User.hasMany(SupportTicket, { foreignKey: 'assignedAdminId', as: 'assignedTickets', constraints: false });
SupportTicket.belongsTo(User, { foreignKey: 'assignedAdminId', as: 'assignedAdmin', constraints: false });


// matching driver 
Order.hasMany(AssignmentHistory, { foreignKey: 'orderId', as: 'assignmentHistory', constraints: false });
AssignmentHistory.belongsTo(Order, { foreignKey: 'orderId', constraints: false });

Driver.hasMany(AssignmentHistory, { foreignKey: 'driverId', as: 'assignmentAttempts', constraints: false });
AssignmentHistory.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver', constraints: false });


module.exports = {
  User, Driver, Order, Payment,Location, Earnings, Notification, ChatMessage,SupportTicket,SupportMessage,AssignmentHistory
};