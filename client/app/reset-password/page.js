'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Truck, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { authService } from '../../services';
import { LoadingSpinner, ErrorAlert } from '../../components/ui';

const schema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPass,        setShowPass]       = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    if (!resetToken) {
      setError('Reset session expired. Please start again.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authService.resetPassword({ resetToken, newPassword: data.password });
      setSuccess(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset session expired or invalid');
    } finally {
      setLoading(false);
    }
  };

  // No token — invalid access
  if (!resetToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="card p-8 text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Session Expired</h2>
            <p className="text-sm text-gray-500 mb-6">
              Your password reset session is invalid or has expired. Please start again.
            </p>
            <Link href="/forgot-password" className="btn-primary w-full inline-block text-center">
              Start Over
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">DeliverPro</span>
        </div>

        <div className="card p-8">
          {!success ? (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Create new password</h2>
              <p className="text-sm text-gray-500 mb-6">Your identity has been verified. Set a new password below.</p>

              {error && <div className="mb-4"><ErrorAlert message={error} /></div>}

              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`input-field pr-10 ${errors.confirmPassword ? 'border-red-400 focus:ring-red-400' : ''}`}
                      {...register('confirmPassword')}
                    />
                    <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <><LoadingSpinner size="sm" /> Resetting...</> : 'Reset Password'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Password Reset!</h2>
              <p className="text-sm text-gray-500">
                Your password has been changed successfully. Redirecting to login...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}