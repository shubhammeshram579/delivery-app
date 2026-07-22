'use client';

import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { selectUser, fetchMe } from '../../../redux/slices/authSlice';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { ErrorAlert } from '../../../components/ui';
import { userService } from '../../../services';
import toast from 'react-hot-toast';
import { User, Lock, Camera, Loader2, Eye, EyeOff } from 'lucide-react';

export default function ProfilePage() {
  useRequireAuth('customer');
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Password Visibility Toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile Form Hook
  const { 
    register: regProfile, 
    handleSubmit: hsProfile, 
    formState: { errors: profileErrors } 
  } = useForm({ 
    values: { name: user?.name || '', phone: user?.phone || '' } 
  });

  // Security Form Hook
  const { 
    register: regPass, 
    handleSubmit: hsPass, 
    reset: resetPass, 
    watch, 
    formState: { errors: passErrors } 
  } = useForm();

  // Live Password Match Validation
  const newPasswordValue = watch("newPassword");

  const updateProfile = async (data) => {
    setLoading(true); 
    setError(null);
    try {
      await userService.updateProfile(data);
      await dispatch(fetchMe());
      toast.success('Profile updated successfully');
    } catch (e) { 
      setError(e.response?.data?.message || 'Failed to update profile'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setLoading(true);
    setError(null);
    try {
      await userService.updateAvatar(formData);
      await dispatch(fetchMe());
      toast.success('Avatar updated successfully');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (data) => {
    setLoading(true); 
    setError(null);
    try {
      await userService.changePassword({ 
        currentPassword: data.currentPassword, 
        newPassword: data.newPassword 
      });
      toast.success('Password changed successfully');
      resetPass();
    } catch (e) { 
      setError(e.response?.data?.message || 'Failed to change password'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <DashboardLayout role="customer" title="Profile Settings">
      <div className="max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-6 pb-20 sm:pb-8">
        
        {/* Navigation Tabs */}
        <div className="flex gap-1.5 mb-6 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl w-full sm:w-fit overflow-x-auto scrollbar-none border border-gray-200 dark:border-gray-800">
          <button 
            type="button"
            onClick={() => setTab('profile')} 
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              tab === 'profile' 
                ? 'bg-white dark:bg-primary-600 text-gray-900 dark:text-white shadow-sm font-semibold' 
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <User className="w-4 h-4 shrink-0" /> Profile Details
          </button>
          <button 
            type="button"
            onClick={() => setTab('password')} 
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              tab === 'password' 
                ? 'bg-white dark:bg-primary-600 text-gray-900 dark:text-white shadow-sm font-semibold' 
                : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Lock className="w-4 h-4 shrink-0" /> Password & Security
          </button>
        </div>

        {/* Global Error Banner */}
        {error && <div className="mb-4"><ErrorAlert message={error} /></div>}

        {/* Tab 1: Profile Details */}
        {tab === 'profile' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm">
            
            {/* Interactive Avatar Header */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-5 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
              <div className="relative group shrink-0">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover border border-gray-200 dark:border-gray-700 shadow-sm" />
                ) : (
                  <div className="w-20 h-20 sm:w-22 sm:h-22 bg-primary-50 dark:bg-primary-950/50 border border-primary-200 dark:border-primary-800 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-400 text-2xl font-bold uppercase shadow-sm">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}
                <button 
                  type="button"
                  disabled={loading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full shadow-md hover:bg-primary-700 active:scale-95 transition-all disabled:bg-gray-400"
                  aria-label="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>

              <div className="space-y-1 w-full">
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-100 truncate">{user?.name || 'Customer Profile'}</h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                <div className="pt-1">
                  <span className="text-[10px] sm:text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-md uppercase tracking-wider inline-block">
                    {user?.role || 'Customer'}
                  </span>
                </div>
              </div>
            </div>

            {/* Input Form Fields */}
            <form onSubmit={hsProfile(updateProfile)} className="space-y-4 sm:space-y-5" noValidate>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input 
                  type="text"
                  className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${profileErrors.name ? 'border-red-500' : 'border-gray-200'}`} 
                  {...regProfile('name', { required: 'Full name is required' })} 
                />
                {profileErrors.name && <p className="text-xs text-red-500 mt-1">{profileErrors.name.message}</p>}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input 
                  type="tel"
                  inputMode="tel"
                  className={`w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${profileErrors.phone ? 'border-red-500' : 'border-gray-200'}`} 
                  {...regProfile('phone', { 
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message: 'Please enter a valid 10-digit phone number'
                    }
                  })} 
                />
                {profileErrors.phone && <p className="text-xs text-red-500 mt-1">{profileErrors.phone.message}</p>}
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Security & Password */}
        {tab === 'password' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 shadow-sm">
            <form onSubmit={hsPass(changePassword)} className="space-y-4 sm:space-y-5" noValidate>
              
              {/* Current Password */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPassword ? "text" : "password"} 
                    className={`w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${passErrors.currentPassword ? 'border-red-500' : 'border-gray-200'}`} 
                    {...regPass('currentPassword', { required: 'Current password is required' })} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{passErrors.currentPassword.message}</p>}
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? "text" : "password"} 
                    className={`w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${passErrors.newPassword ? 'border-red-500' : 'border-gray-200'}`} 
                    {...regPass('newPassword', { 
                      required: 'New password is required', 
                      minLength: { value: 6, message: 'Password must be at least 6 characters long' } 
                    })} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passErrors.newPassword.message}</p>}
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    className={`w-full pl-3.5 pr-10 py-2.5 bg-gray-50 dark:bg-gray-950 dark:text-gray-100 dark:border-gray-800 border rounded-xl text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${passErrors.confirm ? 'border-red-500' : 'border-gray-200'}`} 
                    {...regPass('confirm', { 
                      required: 'Please confirm your new password',
                      validate: value => value === newPasswordValue || 'Passwords do not match'
                    })} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passErrors.confirm && <p className="text-xs text-red-500 mt-1">{passErrors.confirm.message}</p>}
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white font-medium px-6 py-2.5 rounded-xl hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{loading ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
