// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import Cookies from 'js-cookie';
// import { authService } from '../../services';

// // ── Async Thunks ──────────────────────────────────────────
// export const loginUser = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
//   try {
//     const { data } = await authService.login(credentials);
//     const { user, accessToken, refreshToken } = data.data;
//     Cookies.set('accessToken', accessToken, { expires: 7, secure: true, sameSite: 'lax' });
//     Cookies.set('refreshToken', refreshToken, { expires: 30, secure: true, sameSite: 'lax' });
//     return { user, accessToken, refreshToken };
//   } catch (err) {
//     return rejectWithValue(err.response?.data?.message || 'Login failed');
//   }
// });

// export const registerUser = createAsyncThunk('auth/register', async (data, { rejectWithValue }) => {
//   try {
//     const res = await authService.register(data);
//     const { user, accessToken, refreshToken } = res.data.data;
//     Cookies.set('accessToken', accessToken, { expires: 7, secure: true, sameSite: 'lax' });
//     Cookies.set('refreshToken', refreshToken, { expires: 30, secure: true, sameSite: 'lax' });
//     return { user, accessToken, refreshToken };
//   } catch (err) {
//     return rejectWithValue(err.response?.data?.message || 'Registration failed');
//   }
// });

// export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
//   try {
//     const { data } = await authService.getMe();
//     return data.data.user;
//   } catch (err) {
//     return rejectWithValue(err.response?.data?.message);
//   }
// });

// export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
//   try { await authService.logout(); } catch (_) {}
//   Cookies.remove('accessToken');
//   Cookies.remove('refreshToken');
//   dispatch(logout());
// });

// // ── Slice ─────────────────────────────────────────────────
// const authSlice = createSlice({
//   name: 'auth',
//   initialState: {
//     user: null,
//     accessToken: Cookies.get('accessToken') || null,
//     refreshToken: Cookies.get('refreshToken') || null,
//     isAuthenticated: !!Cookies.get('accessToken'),
//     loading: false,
//     error: null,
//     isInitialized: false,
//   },
//   reducers: {
//     logout: (state) => {
//       state.user = null;
//       state.accessToken = null;
//       state.refreshToken = null;
//       state.isAuthenticated = false;
//     },
//     setTokens: (state, { payload }) => {
//       state.accessToken = payload.accessToken;
//       state.refreshToken = payload.refreshToken;
//     },
//     clearError: (state) => { state.error = null; },
//   },
//   extraReducers: (builder) => {
//     const setLoading = (state) => { state.loading = true; state.error = null; };
//     const setError = (state, { payload }) => { state.loading = false; state.error = payload; };

//     builder
//       .addCase(loginUser.pending, setLoading)
//       .addCase(loginUser.fulfilled, (state, { payload }) => {
//         state.loading = false;
//         state.user = payload.user;
//         state.accessToken = payload.accessToken;
//         state.refreshToken = payload.refreshToken;
//         state.isAuthenticated = true;
//       })
//       .addCase(loginUser.rejected, setError)

//       .addCase(registerUser.pending, setLoading)
//       .addCase(registerUser.fulfilled, (state, { payload }) => {
//         state.loading = false;
//         state.user = payload.user;
//         state.accessToken = payload.accessToken;
//         state.isAuthenticated = true;
//       })
//       .addCase(registerUser.rejected, setError)

//       .addCase(fetchMe.pending, setLoading)
//       .addCase(fetchMe.fulfilled, (state, { payload }) => {
//         state.loading = false;
//         state.user = payload;
//         state.isAuthenticated = true;
//         state.isInitialized = true;
//       })
//       .addCase(fetchMe.rejected, (state) => {
//         state.loading = false;
//         state.isAuthenticated = false;
//         state.isInitialized = true;
//       });
//   },
// });

// export const { logout, setTokens, clearError } = authSlice.actions;
// export default authSlice.reducer;

// // Selectors
// export const selectUser = (state) => state.auth.user;
// export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
// export const selectAuthLoading = (state) => state.auth.loading;
// export const selectAuthError = (state) => state.auth.error;
// export const selectUserRole = (state) => state.auth.user?.role;


import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import Cookies from 'js-cookie';
import { authService } from '../../services';

// ── Helpers ───────────────────────────────────────────────
const clearAuthCookies = () => {
  Cookies.remove('accessToken');
  Cookies.remove('refreshToken');
};

const saveAuthCookies = (accessToken, refreshToken) => {
  Cookies.set('accessToken', accessToken, { expires: 7, secure: false, sameSite: 'lax' });
  if (refreshToken) {
    Cookies.set('refreshToken', refreshToken, { expires: 30, secure: false, sameSite: 'lax' });
  }
};

// ── Async Thunks ──────────────────────────────────────────
export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authService.login(credentials);
      const { user, accessToken, refreshToken } = data.data;
      saveAuthCookies(accessToken, refreshToken);
      return { user, accessToken, refreshToken };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const registerAdmin = createAsyncThunk(
  'auth/registerAdmin',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await authService.registerAdmin(formData);
      const { user, accessToken, refreshToken } = data.data;
      saveAuthCookies(accessToken, refreshToken);
      return { user, accessToken, refreshToken };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (formData, { rejectWithValue }) => {
    try {
      const { data } = await authService.register(formData);
      const { user, accessToken, refreshToken } = data.data;
      saveAuthCookies(accessToken, refreshToken);
      return { user, accessToken, refreshToken };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await authService.getMe();
      return data.data.user;
    } catch (err) {
      // Token is invalid/expired — clear cookies so user goes to login
      clearAuthCookies();
      return rejectWithValue(err.response?.data?.message || 'Session expired');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logout',
  async (_, { dispatch }) => {
    try {
      await authService.logout();
    } catch (_) {
      // Ignore logout API errors
    } finally {
      clearAuthCookies();
      dispatch(logout());
    }
  }
);

// ── Slice ─────────────────────────────────────────────────
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    accessToken: Cookies.get('accessToken') || null,
    refreshToken: Cookies.get('refreshToken') || null,
    // Don't trust cookie alone — fetchMe will verify with server
    isAuthenticated: false,
    loading: false,
    error: null,
    isInitialized: false,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
    },
    setTokens: (state, { payload }) => {
      state.accessToken = payload.accessToken;
      state.refreshToken = payload.refreshToken;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user = payload.user;
        state.accessToken = payload.accessToken;
        state.refreshToken = payload.refreshToken;
        state.isAuthenticated = true;
        state.isInitialized = true;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
        state.isAuthenticated = false;
      })

      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user = payload.user;
        state.accessToken = payload.accessToken;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(registerUser.rejected, (state, { payload }) => {
        state.loading = false;
        state.error = payload;
      })

      // Fetch Me (on page load)
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.user = payload;
        state.isAuthenticated = true;
        state.isInitialized = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        // Server rejected token — clear everything
        state.loading = false;
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.isInitialized = true;
      });
  },
});

export const { logout, setTokens, clearError } = authSlice.actions;
export default authSlice.reducer;

// ── Selectors ─────────────────────────────────────────────
export const selectUser            = (state) => state?.auth?.user ?? null;
export const selectIsAuthenticated = (state) => state?.auth?.isAuthenticated ?? false;
export const selectAuthLoading     = (state) => state?.auth?.loading ?? false;
export const selectAuthError       = (state) => state?.auth?.error ?? null;
export const selectUserRole        = (state) => state?.auth?.user?.role ?? null;
export const selectIsInitialized   = (state) => state?.auth?.isInitialized ?? false;