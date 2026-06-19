// 'use client';
// import { useEffect } from 'react';
// import { useSelector } from 'react-redux';
// import { useRouter } from 'next/navigation';
// import { selectIsAuthenticated, selectUserRole } from '../../redux/slices/authSlice';
// // import LoadingSpinner from './LoadingSpinner';
// import {LoadingSpinner} from '..//../components/ui'

// export function withAuth(Component, { requiredRole } = {}) {
//   return function ProtectedPage(props) {
//     const isAuthenticated = useSelector(selectIsAuthenticated);
//     const role = useSelector(selectUserRole);
//     const router = useRouter();

//     useEffect(() => {
//       if (!isAuthenticated) {
//         router.replace('/login');
//         return;
//       }
//       if (requiredRole && role !== requiredRole && role !== 'admin') {
//         router.replace('/login');
//       }
//     }, [isAuthenticated, role, router]);

//     if (!isAuthenticated) return <LoadingSpinner fullscreen />;
//     if (requiredRole && role !== requiredRole && role !== 'admin') return <LoadingSpinner fullscreen />;

//     return <Component {...props} />;
//   };
// }




// export function useRequireAuth(requiredRole) {
//   const isAuthenticated = useSelector((state) => state?.auth?.isAuthenticated ?? false);
//   const role = useSelector((state) => state?.auth?.user?.role ?? null);
//   const router = useRouter();

//   useEffect(() => {
//     if (!isAuthenticated) {
//       router.replace('/');
//       return;
//     }
//     if (requiredRole && role && role !== requiredRole && role !== 'admin') {
//       // Redirect to their own dashboard
//       if (role === 'customer') router.replace('/customer/dashboard');
//       else if (role === 'driver') router.replace('/driver/dashboard');
//       else if (role === 'admin') router.replace('/admin/dashboard');
//     }
//   }, [isAuthenticated, role, requiredRole, router]);

//   return { isAuthenticated, role };
// }



'use client';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '../../components/ui';

export function withAuth(Component, { requiredRole } = {}) {
  return function ProtectedPage(props) {
    const isAuthenticated = useSelector((state) => state?.auth?.isAuthenticated ?? false);
    const isInitialized   = useSelector((state) => state?.auth?.isInitialized ?? false);
    const role            = useSelector((state) => state?.auth?.user?.role ?? null);
    const router = useRouter();

    useEffect(() => {
      // KEY FIX: wait until auth check has finished before redirecting
      if (!isInitialized) return;

      if (!isAuthenticated) {
        router.replace('/login');
        return;
      }
      if (requiredRole && role !== requiredRole && role !== 'admin') {
        router.replace('/login');
      }
    }, [isInitialized, isAuthenticated, role, router]);

    // Still checking auth — show spinner, don't redirect yet
    if (!isInitialized) return <LoadingSpinner fullscreen />;
    if (!isAuthenticated) return <LoadingSpinner fullscreen />;
    if (requiredRole && role !== requiredRole && role !== 'admin') return <LoadingSpinner fullscreen />;

    return <Component {...props} />;
  };
}

export function useRequireAuth(requiredRole) {
  const isAuthenticated = useSelector((state) => state?.auth?.isAuthenticated ?? false);
  const isInitialized   = useSelector((state) => state?.auth?.isInitialized ?? false);
  const role            = useSelector((state) => state?.auth?.user?.role ?? null);
  const router = useRouter();

  useEffect(() => {
    // KEY FIX: don't make any redirect decision until fetchMe() has resolved
    if (!isInitialized) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (requiredRole && role && role !== requiredRole && role !== 'admin') {
      if (role === 'customer') router.replace('/customer/dashboard');
      else if (role === 'driver') router.replace('/driver/dashboard');
      else if (role === 'admin') router.replace('/admin/dashboard');
    }
  }, [isInitialized, isAuthenticated, role, requiredRole, router]);

  return { isAuthenticated, isInitialized, role };
}
