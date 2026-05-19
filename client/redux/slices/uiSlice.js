import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    theme: 'light',
    globalLoading: false,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarOpen = !state.sidebarOpen; },
    setSidebarOpen: (state, { payload }) => { state.sidebarOpen = payload; },
    setGlobalLoading: (state, { payload }) => { state.globalLoading = payload; },
    setTheme: (state, { payload }) => { state.theme = payload; },
  },
});

export const { toggleSidebar, setSidebarOpen, setGlobalLoading, setTheme } = uiSlice.actions;
export default uiSlice.reducer;
