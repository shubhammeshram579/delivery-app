'use client';
import { Provider } from 'react-redux';
import { store } from '../../redux/store';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMe, selectIsInitialized } from '../../redux/slices/authSlice';
import Cookies from 'js-cookie';

function AppInit({ children }) {
  const dispatch = useDispatch();
  const isInitialized = useSelector(selectIsInitialized);

  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (token) {
      dispatch(fetchMe());
    } else {
      // No token at all — mark initialized immediately, no need to call API
      dispatch({ type: 'auth/fetchMe/rejected' });
    }
  }, [dispatch]);

  // Block rendering entirely until we know login state
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return children;
}

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <AppInit>{children}</AppInit>
    </Provider>
  );
}