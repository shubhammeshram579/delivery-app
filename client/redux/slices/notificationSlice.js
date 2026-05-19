import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    list: [],
    unreadCount: 0,
  },
  reducers: {
    addNotification: (state, { payload }) => {
      state.list.unshift({
        ...payload,
        id: Date.now(),
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      state.unreadCount += 1;
    },
    setNotifications: (state, { payload }) => {
      state.list = payload;
      state.unreadCount = payload.filter((n) => !n.isRead).length;
    },
    markAllRead: (state) => {
      state.list = state.list.map((n) => ({ ...n, isRead: true }));
      state.unreadCount = 0;
    },
  },
});

export const { addNotification, setNotifications, markAllRead } = notificationSlice.actions;
export const selectNotifications = (state) => state.notifications.list;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export default notificationSlice.reducer;
