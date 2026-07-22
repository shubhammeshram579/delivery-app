'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Truck, ArrowLeft } from 'lucide-react';
import { authService } from '../../services';
import { LoadingSpinner, ErrorAlert } from '../../components/ui';
import toast from 'react-hot-toast';

export default function VerifyResetOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef([]);

  // Redirect back if no email in URL
  useEffect(() => {
    if (!email) router.replace('/forgot-password');
  }, [email, router]);

  // Countdown for resend button
  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[i] = val.slice(-1);
    setOtp(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputs.current[5]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authService.verifyResetOtp({ email, otp: code });
      const { resetToken } = res.data;
      // Move to reset password page, carrying the secure resetToken
      router.push(`/reset-password?token=${resetToken}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await authService.resendResetOtp(email);
      toast.success('New OTP sent to your email');
      setResendTimer(30);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-primary-700 dark:via-gray-900  dark:to-gray-800  flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-300">DeliverPro</span>
        </div>

        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-300 mb-2">Enter verification code</h2>
          <p className="text-sm text-gray-500 mb-6">
            We've sent a 6-digit code to <strong>{email}</strong>
          </p>

          {error && <div className="mb-4 text-left"><ErrorAlert message={error} /></div>}

          <form onSubmit={handleSubmit}>
            <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-11 h-12 text-center text-lg font-bold border-2 dark:text-gray-800 dark:bor border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                />
              ))}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <><LoadingSpinner size="sm" /> Verifying...</> : 'Verify OTP'}
            </button>
          </form>

          <button
            onClick={resend}
            disabled={resendTimer > 0}
            className="text-sm mt-4 block mx-auto disabled:text-gray-400 disabled:cursor-not-allowed text-primary-600 hover:underline"
          >
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
          </button>

          <Link href="/forgot-password" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mt-6">
            <ArrowLeft className="h-3.5 w-3.5" /> Use a different email
          </Link>
        </div>
      </div>
    </div>
  );
}