'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { LoadingSpinner, EmptyState } from '../../../components/ui';
import { adminService } from '../../../services/index';
import { CheckCircle, Truck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDriversPage() {
  useRequireAuth('admin');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  console.log("Users",users);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ role: 'driver', limit: 50 });
      setUsers(res.data.data.users);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const verify = async (driverId) => {
    try {
      await adminService.verifyDriver(driverId);
      toast.success('Driver verified');
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <DashboardLayout role="admin" title="Drivers">
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Name', 'Email', 'Phone', 'Joined', 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={5}><LoadingSpinner /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5}><EmptyState icon={Truck} title="No drivers yet" /></td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                <td className="px-4 py-3 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <button onClick={() => verify(u?.id)} className="btn-primary py-1 px-3 text-xs flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Verify
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}
