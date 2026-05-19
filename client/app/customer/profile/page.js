'use client';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm } from 'react-hook-form';
import { selectUser, fetchMe } from '../../../redux/slices/authSlice';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { ErrorAlert } from '../../../components/ui';
import { userService } from '../../../services';
import toast from 'react-hot-toast';
import { User, Lock } from 'lucide-react';

export default function ProfilePage() {
  useRequireAuth('customer');
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [tab, setTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { register: regProfile, handleSubmit: hsProfile } = useForm({ defaultValues: { name: user?.name, phone: user?.phone } });
  const { register: regPass, handleSubmit: hsPass, reset } = useForm();

  const updateProfile = async (data) => {
    setLoading(true); setError(null);
    try {
      await userService.updateProfile(data);
      await dispatch(fetchMe());
      toast.success('Profile updated');
    } catch (e) { setError(e.response?.data?.message || 'Failed to update'); }
    finally { setLoading(false); }
  };

  const changePassword = async (data) => {
    if (data.newPassword !== data.confirm) { setError('Passwords do not match'); return; }
    setLoading(true); setError(null);
    try {
      await userService.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed');
      reset();
    } catch (e) { setError(e.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <DashboardLayout role="customer" title="Profile">
      <div className="max-w-xl">
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
          {['profile', 'password'].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        <ErrorAlert message={error} />

        {tab === 'profile' && (
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-2xl font-bold">
                {user?.name?.[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{user?.name}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full capitalize">{user?.role}</span>
              </div>
            </div>
            <form onSubmit={hsProfile(updateProfile)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input className="input-field" {...regProfile('name')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input className="input-field" {...regProfile('phone')} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : 'Save Changes'}</button>
            </form>
          </div>
        )}

        {tab === 'password' && (
          <div className="card p-6">
            <form onSubmit={hsPass(changePassword)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
                <input type="password" className="input-field" {...regPass('currentPassword', { required: true })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                <input type="password" className="input-field" {...regPass('newPassword', { required: true, minLength: 8 })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <input type="password" className="input-field" {...regPass('confirm', { required: true })} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Changing...' : 'Change Password'}</button>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
