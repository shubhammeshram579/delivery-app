import api from './api';

// ── Auth ──────────────────────────────────────────────────
export const authService = {
  registerAdmin:        (data)  => api.post('/auth/registerAdmin', data),
  register:        (data)  => api.post('/auth/register', data),
  login:           (data)  => api.post('/auth/login', data),
  verifyEmail:     (data)  => api.post('/auth/verify-email', data),
  resendOtp:       (email) => api.post('/auth/resend-otp', { email }),
  logout:          ()      => api.post('/auth/logout'),
  getMe:           ()      => api.get('/auth/me'),
  forgotPassword:   (email) => api.post('/auth/forgot-password', { email }),
  verifyResetOtp:   (data)  => api.post('/auth/verify-reset-otp', data),
  resetPassword:    (data)  => api.post('/auth/reset-password', data),
  resendResetOtp:   (email) => api.post('/auth/resend-reset-otp', { email }),

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
  generateDeliveryOtp:  (id)            => api.post(`/orders/${id}/delivery-otp`),
  verifyDeliveryOtp:    (id, otp)       => api.post(`/orders/${id}/verify-delivery-otp`, { otp }),
  getLiveLocation: (id) => api.get(`/orders/${id}/live-location`)
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
  // uploadImage: (formData) =>
  //   api.post('/uploads/image', formData, {
  //     headers: { 'Content-Type': 'multipart/form-data' },
  //   }), 
  updateAvatar: (data) => api.post('/users/avatar', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),  
};

// ── Drivers ───────────────────────────────────────────────
export const driverService = {
  getProfile:    ()            => api.get('/drivers/profile'),
  // Register driver profile on first login
  registerProfile: (data)      => api.post('/drivers/register', data),
  getEarnings:   ()            => api.get('/drivers/earnings'),
  toggleAvailability: (isAvailable) => api.patch('/drivers/availability', { isAvailable }),
  updateProfile: (data) => api.put('/drivers/profile', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
 
};

// ── Admin ─────────────────────────────────────────────────
export const adminService = {
  getDashboard:       ()       => api.get('/admin/dashboard'),
  getRevenueAnalytics:(days)   => api.get('/admin/analytics/revenue', { params: { days } }),
  getUsers:           (params) => api.get('/admin/users', { params }),
  toggleUserStatus:   (id)     => api.patch(`/admin/users/${id}/toggle`),
  verifyDriver:        (id, payload) => api.patch(`/admin/drivers/${id}/verify`, payload),
  // verifyDriver:       (id)     => api.patch(`/admin/drivers/${id}/verify`),
  getOrders:          (params) => api.get('/admin/orders', { params }),
  
 exportOrdersCsv: (params) => 
  api.get('/admin/orders/exportcsv', { 
    params,
    responseType: 'blob',
  }),
};


// ── Chat ──────────────────────────────────────────────────
export const chatService = {
  getMessages:    (orderId) => api.get(`/chat/${orderId}`),
  sendMessage:    (orderId, data) => api.post(`/chat/${orderId}`, data),
  markRead:       (orderId) => api.patch(`/chat/${orderId}/read`),
  getConversations: () => api.get('/chat/conversations/list'),
};


// supportService

export const supportService = {
  // ── Customer/Driver ─────────────────────────────────────
  sendMessage: (data)              => api.post('/support/message', data),
  createTicket: (data)              => api.post('/support/tickets', data),
  getTickets: (params)              => api.get('/support/tickets', { params }),
  getTicketById: (id)                => api.get(`/support/tickets/${id}`),
  replyToTicket: (id, message)       => api.post(`/support/tickets/${id}/reply`, { message }),

  // ── Admin ────────────────────────────────────────────────
  assignTicket: (id)                 => api.patch(`/support/tickets/${id}/assign`),
  updateTicket: (id, data)           => api.patch(`/support/tickets/${id}`, data),
  getStats: ()                        => api.get('/support/stats'),
};


export const matchingService = {
  acceptOffer: (orderId) => api.post(`/matching/orders/${orderId}/offer/accept`),
  rejectOffer: (orderId) => api.post(`/matching/orders/${orderId}/offer/reject`)
}