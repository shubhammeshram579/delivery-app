// workers/orderWorker.js
const { Queue, Worker } = require('bullmq');
const IORedis = require('ioredis');

// 1. FIXED: Import your Sequelize models and notification service
// (Adjust these paths to match where your actual folders live!)
const { Order, Driver } = require('../models'); 
const {notifyAdmins} = require("../utils/adminNotification");
const logger = require('../utils/logger'); // Highly recommended for tracking background tasks

// 2. FIXED: Added 'maxRetriesPerRequest: null' (BullMQ requirement)
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, 
});

// Define the queue launcher
const orderEscalationQueue = new Queue('orderEscalation', { connection: redisConnection });

// Define the processor that wakes up after 5 minutes
const orderWorker = new Worker('orderEscalation', async (job) => {
  const { orderId } = job.data;
  
  try {
    // Fetch fresh state from database after the 5-minute window expires
    const order = await Order.findByPk(orderId);
    
    if (!order) {
      if (typeof logger !== 'undefined') logger.warn(`Order #${orderId} not found during worker check.`);
      return;
    }

    // If the status is still pending, it means no driver accepted it within 5 minutes
    if (order.status === 'pending' && order.driverId) {
      await notifyAdmins({
        title: "⏳ SLA Breach: Driver Inactivity",
        body: `Assigned driver failed to accept Order #${order.orderNumber} within 5 minutes. Intervention required.`,
        type: "system",
        data: { orderId: order.id },
      });
      
      // Real-world fallback: Unassign this inactive driver so someone else can grab it
      await Driver.update({ isAvailable: true }, { where: { id: order.driverId } });
      await order.update({ driverId: null });
      
      // Optional: Trigger a new auto-assignment cycle
      // await lookForAlternativeDrivers(order);
    }
  } catch (error) {
    if (typeof logger !== 'undefined') {
      logger.error(`Error processing order escalation job ${job.id}:`, error);
    }
    throw error; // Let BullMQ know the job failed
  }
}, { connection: redisConnection });

// 3. BONUS: Production best practice monitoring tools
orderWorker.on('completed', (job) => console.log(`[Worker] Job ${job.id} checked successfully.`));
orderWorker.on('failed', (job, err) => console.error(`[Worker] Job ${job.id} failed: ${err.message}`));

// Export ONLY the queue launcher so your main app routes can push jobs into it
module.exports = { orderEscalationQueue };