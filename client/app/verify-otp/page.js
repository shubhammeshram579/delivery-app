'use client';
import { useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Truck } from 'lucide-react';
import { authService } from '../../services';
import { LoadingSpinner, ErrorAlert } from '../../components/ui';
import toast from 'react-hot-toast';

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const inputs = useRef([]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter all 6 digits'); return; }
    setLoading(true);
    setError(null);
    try {
      await authService.verifyEmail({ email, otp: code });
      toast.success('Email verified! Please login.');
      router.push('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    try {
      await authService.resendOtp(email);
      toast.success('New OTP sent to your email');
    } catch (err) {
      toast.error('Failed to resend OTP');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 dark:from-primary-700 dark:via-gray-900  dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900 dark:text-gray-300">DeliverPro</span>
        </div>
        <div className="card p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-300 mb-2">Verify your email</h2>
          <p className="text-sm text-gray-500 mb-6">Enter the 6-digit code sent to <strong>{email}</strong></p>
          <ErrorAlert message={error} />
          <form onSubmit={handleSubmit} className="mt-6">
            <div className="flex gap-2 justify-center mb-6">
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
                  className="w-11 h-12 text-center text-lg font-bold dark:text-gray-800  border-2 border-gray-300 rounded-lg focus:outline-none focus:border-primary-500 transition-colors"
                />
              ))}
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <><LoadingSpinner size="sm" /> Verifying...</> : 'Verify Email'}
            </button>
          </form>
          <button onClick={resend} className="text-sm text-primary-600 hover:underline mt-4 block mx-auto">
            Resend OTP
          </button>
        </div>
      </div>
    </div>
  );
}
