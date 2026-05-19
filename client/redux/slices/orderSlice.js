import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { orderService } from '../../services/index';

// ── Order Slice ───────────────────────────────────────────
export const fetchOrders = createAsyncThunk('orders/fetch', async (params, { rejectWithValue }) => {
  try {
    const { data } = await orderService.getOrders(params);
    return data.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch orders');
  }
});

export const fetchOrderById = createAsyncThunk('orders/fetchOne', async (id, { rejectWithValue }) => {
  try {
    const { data } = await orderService.getOrder(id);
    return data.data.order;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message);
  }
});

export const createOrder = createAsyncThunk('orders/create', async (orderData, { rejectWithValue }) => {
  try {
    const { data } = await orderService.createOrder(orderData);
    return data.data.order;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create order');
  }
});

const orderSlice = createSlice({
  name: 'orders',
  initialState: {
    list: [],
    currentOrder: null,
    pagination: null,
    loading: false,
    error: null,
    // Real-time tracking state
    driverLocation: null,
    trackingOrderId: null,
  },
  reducers: {
    updateDriverLocation: (state, { payload }) => {
      state.driverLocation = payload;
    },
    setTrackingOrder: (state, { payload }) => {
      state.trackingOrderId = payload;
    },
    updateOrderStatusRealtime: (state, { payload }) => {
      // Update order status from socket event
      const idx = state.list.findIndex((o) => o.id === payload.orderId);
      if (idx !== -1) state.list[idx].status = payload.status;
      if (state.currentOrder?.id === payload.orderId) {
        state.currentOrder.status = payload.status;
      }
    },
    clearCurrentOrder: (state) => { state.currentOrder = null; },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchOrders.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list = payload.orders;
        state.pagination = payload.pagination;
      })
      .addCase(fetchOrders.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(fetchOrderById.pending, (state) => { state.loading = true; })
      .addCase(fetchOrderById.fulfilled, (state, { payload }) => { state.loading = false; state.currentOrder = payload; })
      .addCase(fetchOrderById.rejected, (state, { payload }) => { state.loading = false; state.error = payload; })

      .addCase(createOrder.pending, (state) => { state.loading = true; })
      .addCase(createOrder.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.list.unshift(payload);
        state.currentOrder = payload;
      })
      .addCase(createOrder.rejected, (state, { payload }) => { state.loading = false; state.error = payload; });
  },
});

export const { updateDriverLocation, setTrackingOrder, updateOrderStatusRealtime, clearCurrentOrder, clearError } = orderSlice.actions;
export default orderSlice.reducer;

// Selectors
export const selectOrders = (state) => state.orders.list;
export const selectCurrentOrder = (state) => state.orders.currentOrder;
export const selectOrdersLoading = (state) => state.orders.loading;
export const selectDriverLocation = (state) => state.orders.driverLocation;
