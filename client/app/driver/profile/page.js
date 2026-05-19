'use client';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../redux/slices/authSlice';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
// import { driverService } from '../../../services/index';
import { useEffect, useState } from 'react';

export default function DriverProfilePage() {
  useRequireAuth('driver');
  const user = useSelector(selectUser);

  // const [users, setUsers] = useState([])

  // console.log("useSta" ,users)




  // useEffect(() => {
  //   const  fatchUsers = async () => {

  //   const res = await driverService.getProfile();

  //   setUsers(res.data.data.driver)

  //   }

  //   fatchUsers()

  // },[])

  // console.log(user);
  return (
    <DashboardLayout role="driver" title="Profile">
      <div className="max-w-xl">
        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-2xl font-bold">
              {user?.name?.[0]}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Driver</span>
            </div>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-50">
              <span className="text-gray-500">Phone</span>
              <span className="font-medium">{user?.phone}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Email Verified</span>
              <span className={user?.isEmailVerified ? 'text-green-600 font-medium' : 'text-red-500'}>
                {user?.isEmailVerified ? '✓ Verified' : 'Not verified'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
