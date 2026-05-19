// 'use client';
// import { Provider } from 'react-redux';
// import { store } from '../../redux/store';
// import { useEffect } from 'react';
// import { useDispatch } from 'react-redux';
// import { fetchMe } from '../../redux/slices/authSlice';
// import { useSocket } from '../../hooks/useSocket';
// import Cookies from 'js-cookie';

// // Initializes auth state on app load and connects socket
// function AppInit() {
//   const dispatch = useDispatch();
//   useSocket(); // global socket connection

//   useEffect(() => {
//     const token = Cookies.get('accessToken');
//     if (token) dispatch(fetchMe());
//   }, [dispatch]);

//   return null;
// }

// export function Providers({ children }) {
//   return (
//     <Provider store={store}>
//       <AppInit />
//       {children}
//     </Provider>
//   );
// }


'use client';
import { Provider } from 'react-redux';
import { store } from '../../redux/store';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { fetchMe } from '../../redux/slices/authSlice';
import Cookies from 'js-cookie';

// AppInit handles auth only — socket is initialized per-page
function AppInit() {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = Cookies.get('accessToken');
    if (token) dispatch(fetchMe());
  }, [dispatch]);

  return null;
}

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <AppInit />
      {children}
    </Provider>
  );
}