// ── store.js ──────────────────────────────────────────────
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import orderReducer from './slices/orderSlice';
import notificationReducer from './slices/notificationSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    orders: orderReducer,
    notifications: notificationReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});

export default store;
