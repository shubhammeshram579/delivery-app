import api from './api';

// ── Auth ──────────────────────────────────────────────────
export const authService = {
  register:        (data)  => api.post('/auth/register', data),
  login:           (data)  => api.post('/auth/login', data),
  verifyEmail:     (data)  => api.post('/auth/verify-email', data),
  resendOtp:       (email) => api.post('/auth/resend-otp', { email }),
  logout:          ()      => api.post('/auth/logout'),
  forgotPassword:  (email) => api.post('/auth/forgot-password', { email }),
  resetPassword:   (data)  => api.post('/auth/reset-password', data),
  getMe:           ()      => api.get('/auth/me'),
};

// ── Orders ────────────────────────────────────────────────
export const orderService = {
  getOrders:    (params)         => api.get('/orders', { params }),
  getOrder:     (id)             => api.get(`/orders/${id}`),
  createOrder:  (data)           => api.post('/orders', data),
  acceptOrder:  (id)             => api.patch(`/orders/${id}/accept`),
  updateStatus: (id, status)     => api.patch(`/orders/${id}/status`, { status }),
  cancelOrder:  (id, reason)     => api.patch(`/orders/${id}/cancel`, { reason }),
  rateOrder:    (id, data)       => api.post(`/orders/${id}/rate`, data),


  // New
  uploadDeliveryProof: (id, formData) =>
    api.post(`/orders/${id}/delivery-proof`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  markCashCollected:  (id)            => api.patch(`/orders/${id}/cash-collected`),
  generatePickupOtp:  (id)            => api.post(`/orders/${id}/pickup-otp`),
  verifyPickupOtp:    (id, otp)       => api.post(`/orders/${id}/verify-pickup-otp`, { otp }),
};

// ── Payments ──────────────────────────────────────────────
export const paymentService = {
  createRazorpayOrder: (orderId) => api.post(`/payments/order/${orderId}`),
  verifyPayment:       (data)    => api.post('/payments/verify', data),
};

// ── Users ─────────────────────────────────────────────────
export const userService = {
  updateProfile:        (data)     => api.patch('/users/profile', data),
  changePassword:       (data)     => api.patch('/users/password', data),
  getNotifications:     ()         => api.get('/users/notifications'),
  markNotificationsRead:()         => api.patch('/users/notifications/read'),
  markOneNotificationRead: (id)    => api.patch(`/users/notifications/read/${id}`),
  deleteNotification: (id)         => api.delete(`/users/notifications/${id}`),
  // Upload uses /uploads/image endpoint (multipart)
  uploadImage: (formData) =>
    api.post('/uploads/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// ── Drivers ───────────────────────────────────────────────
export const driverService = {
  getProfile:    ()            => api.get('/drivers/profile'),
  // Register driver profile on first login
  registerProfile: (data)      => api.post('/drivers/register', data),
  getEarnings:   ()            => api.get('/drivers/earnings'),
  toggleAvailability: (isAvailable) =>
    api.patch('/drivers/availability', { isAvailable }),
};

// ── Admin ─────────────────────────────────────────────────
export const adminService = {
  getDashboard:       ()       => api.get('/admin/dashboard'),
  getRevenueAnalytics:(days)   => api.get('/admin/analytics/revenue', { params: { days } }),
  getUsers:           (params) => api.get('/admin/users', { params }),
  toggleUserStatus:   (id)     => api.patch(`/admin/users/${id}/toggle`),
  verifyDriver:       (id)     => api.patch(`/admin/drivers/${id}/verify`),
  getOrders:          (params) => api.get('/admin/orders', { params }),
};


// ── Chat ──────────────────────────────────────────────────
export const chatService = {
  getMessages:    (orderId) => api.get(`/chat/${orderId}`),
  sendMessage:    (orderId, data) => api.post(`/chat/${orderId}`, data),
  markRead:       (orderId) => api.patch(`/chat/${orderId}/read`),
  getConversations: () => api.get('/chat/conversations/list'),
};