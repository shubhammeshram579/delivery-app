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
import { User, Lock, Camera, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  useRequireAuth('customer');
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Using 'values' instead of 'defaultValues' ensures the form resets when redux user data loads asynchronously
  const { 
    register: regProfile, 
    handleSubmit: hsProfile, 
    formState: { errors: profileErrors } 
  } = useForm({ 
    values: { name: user?.name || '', phone: user?.phone || '' } 
  });

  const { 
    register: regPass, 
    handleSubmit: hsPass, 
    reset: resetPass, 
    watch, 
    formState: { errors: passErrors } 
  } = useForm();

  // Watch field to validate password match live on client side
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
      await userService.updateAvatar(formData); // Ensure your frontend api layer accepts FormData
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
      <div className="max-w-2xl mx-auto px-4 py-6">
        
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-900 p-1.5 rounded-xl w-fit">
          <button 
            onClick={() => setTab('profile')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'profile' ? 'bg-white shadow-sm text-gray-900 dark:bg-primary-600/80 dark:text-gray-300' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-400'}`}
          >
            <User className="w-4 h-4" /> Profile Details
          </button>
          <button 
            onClick={() => setTab('password')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === 'password' ? 'bg-white shadow-sm text-gray-900 dark:bg-primary-600/80 dark:text-gray-300' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-400'}`}
          >
            <Lock className="w-4 h-4" /> Password & Security
          </button>
        </div>

        {/* Global Error Banner */}
        {error && <div className="mb-4"><ErrorAlert message={error} /></div>}

        {/* Tab 1: Profile Form */}
        {tab === 'profile' && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm">
            
            {/* Interactive Avatar Header */}
            <div className="flex items-center gap-5 mb-8 pb-6 border-b border-gray-100 dark:border-gray-500">
              <div className="relative group">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
                ) : (
                  <div className="w-20 h-20 bg-primary-50 border border-primary-100 rounded-full flex items-center justify-center text-primary-600 text-2xl font-bold uppercase">
                    {user?.name?.[0] || 'U'}
                  </div>
                )}
                <button 
                  type="button"
                  disabled={loading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-primary-600 text-white rounded-full shadow-md hover:bg-primary-700 transition-colors disabled:bg-gray-400"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleAvatarUpload} 
                  className="hidden" 
                  accept="image/*"
                />
              </div>
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-300">{user?.name || 'Customer Profile'}</h3>
                <p className="text-sm text-gray-500 mb-1.5">{user?.email}</p>
                <span className="text-xs font-medium bg-gray-100 dark:bg-primary-600/80 dark:text-gray-400 text-gray-700 px-2.5 py-1 rounded-md uppercase tracking-wider">
                  {user?.role}
                </span>
              </div>
            </div>

            {/* Input Form Fields */}
            <form onSubmit={hsProfile(updateProfile)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">Full Name</label>
                <input 
                  className={`w-full px-3.5 dark:bg-gray-950 dark:border-gray-700 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${profileErrors.name ? 'border-red-500' : 'border-gray-300'}`} 
                  {...regProfile('name', { required: 'Name is required' })} 
                />
                {profileErrors.name && <p className="text-xs text-red-500 mt-1">{profileErrors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">Phone Number</label>
                <input 
                  type="tel"
                  className={`w-full px-3.5 dark:bg-gray-950 dark:border-gray-700 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${profileErrors.phone ? 'border-red-500' : 'border-gray-300'}`} 
                  {...regProfile('phone', { required: 'Phone number is required' })} 
                />
                {profileErrors.phone && <p className="text-xs text-red-500 mt-1">{profileErrors.phone.message}</p>}
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Password Form */}
        {tab === 'password' && (
          <div className="bg-white dark:bg-gray-900 dark:border-gray-700 border border-gray-200 rounded-2xl p-6 shadow-sm">
            <form onSubmit={hsPass(changePassword)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">Current Password</label>
                <input 
                  type="password" 
                  className={`w-full px-3.5 dark:bg-gray-950 dark:border-gray-700 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${passErrors.currentPassword ? 'border-red-500' : 'border-gray-300'}`} 
                  {...regPass('currentPassword', { required: 'Current password is required' })} 
                />
                {passErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{passErrors.currentPassword.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">New Password</label>
                <input 
                  type="password" 
                  className={`w-full px-3.5 dark:bg-gray-950 dark:border-gray-700 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${passErrors.newPassword ? 'border-red-500' : 'border-gray-300'}`} 
                  {...regPass('newPassword', { 
                    required: 'New password is required', 
                    minLength: { value: 6, message: 'Password must be at least 6 characters' } 
                  })} 
                />
                {passErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passErrors.newPassword.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-400 mb-1.5">Confirm New Password</label>
                <input 
                  type="password" 
                  className={`w-full px-3.5 dark:bg-gray-950 dark:border-gray-700 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all ${passErrors.confirm ? 'border-red-500' : 'border-gray-300'}`} 
                  {...regPass('confirm', { 
                    required: 'Please confirm your password',
                    validate: value => value === newPasswordValue || 'The passwords do not match'
                  })} 
                />
                {passErrors.confirm && <p className="text-xs text-red-500 mt-1">{passErrors.confirm.message}</p>}
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-600 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Updating Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
