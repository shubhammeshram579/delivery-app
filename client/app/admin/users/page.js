'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { LoadingSpinner, StatusBadge, Pagination, ConfirmDialog } from '../../../components/ui';
import { adminService } from '../../../services';
import { format } from 'date-fns';
import { Search, ToggleLeft, ToggleRight, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
  useRequireAuth('admin');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State configurations mapped directly to upgraded API structure
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Defaults to 25 rows per page
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(''); // Handles global, 'active', or 'inactive' filter
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ 
        page, 
        limit: pageSize, 
        search: search || undefined,
        status: status || undefined 
      });
      
      // Destructure directly from the optimized backend response metadata mapping
      const { users, totalItems, totalPages } = res.data.data;
      setUsers(users);
      setTotalItems(totalItems);
      setTotalPages(totalPages);
    } catch (e) { 
      console.error(e); 
      toast.error('Failed to load user records');
    } finally { 
      setLoading(false); 
    }
  };

  // Triggers API synchronization cleanly whenever navigation, selection, or status filter updates
  useEffect(() => { 
    load(); 
  }, [page, pageSize, search, status]);

  const toggle = async (id) => {
    try {
      await adminService.toggleUserStatus(id);
      toast.success('User status updated');
      load();
    } catch { 
      toast.error('Failed to update status'); 
    }
    setConfirm(null);
  };

  // Safe handler logic when user adjusts row capacity limits
  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1); // Safely resets index loop to avoid offset out of bounds errors
  };

  return (
    <DashboardLayout role="admin" title="Users">
      {/* Top Controls Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 justify-between">
        {/* Left Side: Search Bar */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            placeholder="Search users..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-9" 
          />
        </div>

        {/* Right Side: Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary-600" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            // className="bg-primary-600 text-white text-sm font-medium rounded-lg border border-primary-700 px-3 py-2 cursor-pointer focus:outline-none focus:border-primary-800"
            className="input-field w-auto capitalize"
          >
            <option value="" >All Statuses</option>
            <option value="true" >Active Only</option>
            <option value="false" >Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Main Records Table Card UI */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Name', 'Email', 'Phone', 'Role', 'Joined', 'Status', 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={7} className="py-12"><LoadingSpinner /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">No users found matching parameters.</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3 text-gray-500">{u.phone}</td>
                <td className="px-4 py-3"><span className="badge bg-gray-100 text-gray-700 capitalize">{u.role}</span></td>
                <td className="px-4 py-3 text-gray-400">{u.createdAt ? format(new Date(u.createdAt), 'dd MMM yyyy') : '—'}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.isActive ? 'bg-primary-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setConfirm(u)} className="p-1.5 hover:bg-gray-100 rounded">
                    {u.isActive ? <ToggleRight className="h-6 w-10 text-primary-600" /> : <ToggleLeft className="h-6 w-10 text-gray-400" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Real-World Dynamic Pagination Panel Integration */}
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination 
            page={page} 
            totalPages={totalPages} 
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage} 
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      </div>

      {/* Confirmation State Windows */}
      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={() => toggle(confirm?.id)}
        title={confirm?.isActive ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${confirm?.isActive ? 'deactivate' : 'activate'} ${confirm?.name}?`}
        confirmText={confirm?.isActive ? 'Deactivate' : 'Activate'}
        variant={confirm?.isActive ? 'danger' : 'primary'} />
    </DashboardLayout>
  );
}
