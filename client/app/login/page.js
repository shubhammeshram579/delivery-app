'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Truck, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { loginUser, selectAuthLoading, selectAuthError, selectIsAuthenticated, selectUserRole, clearError } from '../../redux/slices/authSlice';
import { LoadingSpinner, ErrorAlert } from '../../components/ui';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (isAuthenticated && role) {
      // const routes = { customer: '/(customer)/dashboard', driver: '/(driver)/dashboard', admin: '/(admin)/dashboard' };
      const routes = {
        customer: '/customer/dashboard',
        driver:   '/driver/dashboard',
        admin:    '/admin/dashboard',
      };
      router.replace(routes[role] || '/');
    }
    return () => dispatch(clearError());
  }, [isAuthenticated, role, router, dispatch]);

  const onSubmit = (data) => dispatch(loginUser(data));

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">DeliverPro</span>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>

          <ErrorAlert message={error} />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className={`input-field ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                {...register('email')}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  className={`input-field pr-10 ${errors.password ? 'border-red-400 focus:ring-red-400' : ''}`}
                  {...register('password')}
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-primary-600 hover:underline">Forgot password?</Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <><LoadingSpinner size="sm" /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary-600 font-medium hover:underline">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
