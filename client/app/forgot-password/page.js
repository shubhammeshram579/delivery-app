// 'use client';
// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import Link from 'next/link';
// import { Truck, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
// import { authService } from '../../services';
// import { LoadingSpinner, ErrorAlert } from '../../components/ui';

// const schema = z.object({
//   email: z.string().email('Invalid email'),
// });

// export default function ForgotPasswordPage() {
//   const [loading, setLoading] = useState(false);
//   const [error,   setError]   = useState(null);
//   const [sent,    setSent]    = useState(false);

//   const { register, handleSubmit, formState: { errors }, getValues } = useForm({
//     resolver: zodResolver(schema),
//   });

//   const onSubmit = async (data) => {
//     setLoading(true);
//     setError(null);
//     try {
//       await authService.forgotPassword(data.email);
//       setSent(true);
//     } catch (err) {
//       setError(err.response?.data?.message || 'Something went wrong. Please try again.');
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
//       <div className="w-full max-w-md">
//         {/* Logo */}
//         <div className="flex items-center justify-center gap-3 mb-8">
//           <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
//             <Truck className="h-5 w-5 text-white" />
//           </div>
//           <span className="text-2xl font-bold text-gray-900">DeliverPro</span>
//         </div>

//         <div className="card p-8">
//           {!sent ? (
//             <>
//               <h2 className="text-xl font-bold text-gray-900 mb-1">Forgot password?</h2>
//               <p className="text-sm text-gray-500 mb-6">
//                 Enter your email and we'll send you a link to reset your password.
//               </p>

//               <ErrorAlert message={error} />

//               <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
//                   <div className="relative">
//                     <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
//                     <input
//                       type="email"
//                       placeholder="you@example.com"
//                       className={`input-field pl-10 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
//                       {...register('email')}
//                     />
//                   </div>
//                   {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
//                 </div>

//                 <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
//                   {loading ? <><LoadingSpinner size="sm" /> Sending...</> : 'Send Reset Link'}
//                 </button>
//               </form>
//             </>
//           ) : (
//             <div className="text-center py-4">
//               <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <CheckCircle className="h-7 w-7 text-green-600" />
//               </div>
//               <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
//               <p className="text-sm text-gray-500 mb-1">
//                 We've sent a password reset link to
//               </p>
//               <p className="text-sm font-medium text-gray-800 mb-6">{getValues('email')}</p>
//               <p className="text-xs text-gray-400">
//                 Didn't receive it? Check your spam folder or{' '}
//                 <button onClick={() => setSent(false)} className="text-primary-600 hover:underline font-medium">
//                   try again
//                 </button>
//               </p>
//             </div>
//           )}

//           <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mt-6">
//             <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }


'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Truck, ArrowLeft, Mail } from 'lucide-react';
import { authService } from '../../services';
import { LoadingSpinner, ErrorAlert } from '../../components/ui';

const schema = z.object({
  email: z.string().email('Invalid email'),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    try {
      await authService.forgotPassword(data.email);
      // Move to OTP verification page, carrying email in query param
      router.push(`/verify-reset-otp?email=${encodeURIComponent(data.email)}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-primary-700 dark:via-gray-900  dark:to-gray-800  flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-300">DeliverPro</span>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1 dark:text-gray-300">Forgot password?</h2>
          <p className="text-sm text-gray-500 mb-6">
            Enter your email and we'll send you a 6-digit verification code.
          </p>

          {error && <div className="mb-4"><ErrorAlert message={error} /></div>}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className={`input-field pl-10 ${errors.email ? 'border-red-400 focus:ring-red-400' : ''}`}
                  {...register('email')}
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <><LoadingSpinner size="sm" /> Sending OTP...</> : 'Send OTP'}
            </button>
          </form>

          <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm dark:text-primary-600 text-gray-500 hover:text-gray-700 mt-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}