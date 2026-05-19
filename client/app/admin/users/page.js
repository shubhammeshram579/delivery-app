'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { LoadingSpinner, StatusBadge, Pagination, ConfirmDialog } from '../../../components/ui';
import { adminService } from '../../../services';
import { format } from 'date-fns';
import { Search, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  useRequireAuth('admin');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ page, limit: 15, search: search || undefined });
      setUsers(res.data.data.users);
      setTotal(res.data.data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, search]);

  const toggle = async (id) => {
    try {
      await adminService.toggleUserStatus(id);
      toast.success('User status updated');
      load();
    } catch { toast.error('Failed'); }
    setConfirm(null);
  };

  return (
    <DashboardLayout role="admin" title="Users">
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="input-field pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Email', 'Phone', 'Role', 'Joined', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="py-12"><LoadingSpinner /></td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                <td className="px-4 py-3"><span className="badge bg-gray-100 text-gray-700 capitalize">{u.role}</span></td>
                <td className="px-4 py-3 text-gray-400">{format(new Date(u.createdAt), 'dd MMM yyyy')}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setConfirm(u)} className="p-1.5 hover:bg-gray-100 rounded">
                    {u.isActive ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination page={page} totalPages={Math.ceil(total / 15)} onPageChange={setPage} />
        </div>
      </div>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => toggle(confirm?.id)}
        title={confirm?.isActive ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${confirm?.isActive ? 'deactivate' : 'activate'} ${confirm?.name}?`}
        confirmText={confirm?.isActive ? 'Deactivate' : 'Activate'}
        variant={confirm?.isActive ? 'danger' : 'primary'} />
    </DashboardLayout>
  );
}
