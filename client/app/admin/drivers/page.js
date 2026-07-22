'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { LoadingSpinner, EmptyState, Pagination } from '../../../components/ui';
import { adminService } from '../../../services/index';
import { Eye, ShieldAlert, ShieldCheck, X, Search, Filter, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import AIFraudCheck from '../../../components/ai/AIFraudCheck';

export default function AdminDriversPage() {
  useRequireAuth('admin');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isVerified, setIsVerified] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [reviewPayload, setReviewPayload] = useState({
    licenseStatus: 'pending',
    licenseExpiry: '',
    aadhaarStatus: 'pending',
    vehicleDocumentStatus: 'pending',
    vehicleDocumentExpiry: '',
    rejectionReason: ''
  });
  const [submitting, setSubmitting] = useState(false);


  console.log("users",users)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ 
        role: 'driver', 
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        isVerified: isVerified !== '' ? isVerified : undefined
      });
      
      const { users, totalItems, totalPages } = res.data.data;
      setUsers(users);
      setTotalItems(totalItems);
      setTotalPages(totalPages);
    } catch (e) {
      console.error(e);
      toast.error('Could not fetch drivers registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    load(); 
  }, [page, pageSize, debouncedSearch, isVerified]);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1); 
  };

  const openReviewModal = (user) => {
    setSelectedUser(user);
    const d = user.driverProfile || {};
    setReviewPayload({
      licenseStatus: d.licenseStatus || 'pending',
      licenseExpiry: d.licenseExpiryDate ? new Date(d.licenseExpiryDate).toISOString().split('T')[0] : '',
      aadhaarStatus: d.aadhaarStatus || 'pending',
      vehicleDocumentStatus: d.vehicleDocumentStatus || 'pending',
      vehicleDocumentExpiry: d.vehicleRegistrationExpiryDate ? new Date(d.vehicleRegistrationExpiryDate).toISOString().split('T')[0] : '',
      rejectionReason: d.rejectionReason || ''
    });
  };

  const submitVerificationReview = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminService.verifyDriver(selectedUser.id, reviewPayload);
      toast.success('Driver compliance records updated successfully.');
      setSelectedUser(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving compliance updates.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper function to flag if a date is expired or expiring within 7 days
  const getDateStatusClass = (dateString) => {
    if (!dateString) return 'text-slate-400';
    const expiry = new Date(dateString);
    const today = new Date();
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-600 dark:bg-primary-600/20 font-semibold bg-red-50 px-1.5 py-0.5 rounded';
    if (diffDays <= 7) return 'text-amber-600 font-semibold dark:bg-primary-600/20 bg-amber-50 px-1.5 py-0.5 rounded';
    return 'text-slate-500';
  };

  return (
    <DashboardLayout role="admin" title="Drivers Verification Portal">
      <div className="flex flex-col sm:flex-row gap-3 mb-5 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            placeholder="Search driver profiles..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} 
            className="input-field pl-9 w-full bg-white border border-slate-200 p-2 rounded-xl text-sm" 
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary-600" />
          <select
            value={isVerified}
            onChange={(e) => { setIsVerified(e.target.value); setPage(1); }}
            className="input-field w-auto capitalize bg-white border border-slate-200 p-2 rounded-xl text-sm"
          >
            <option value="">All Verification Status</option>
            <option value="true">Approved</option>
            <option value="false">Pending / Rejected</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden bg-white rounded-xl border border-slate-200  shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700">
              <tr>
                {['Name','Email', 'Vehicle', 'License Expiry', 'RC Expiry', 'Status', 'Fraud Analysis', 'Action'].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 dark:text-gray-300  uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100  dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="py-12"><LoadingSpinner /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="py-12"><EmptyState icon={Eye} title="No registration files found" /></td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800 transition">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-gray-300">{u.name}</div>
                    <div className="text-xs text-slate-400">{u.phone}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-500">{u.email}</td>
                  <td className="px-6 py-4 text-slate-500">{u?.driverProfile?.vehicleType || '—'}</td>
                  
                  {/* Inline Expiry Checks directly in the main table */}
                  <td className="px-6 py-4 text-xs whitespace-nowrap">
                    <span className={getDateStatusClass(u.driverProfile?.licenseExpiryDate)}>
                      {u.driverProfile?.licenseExpiryDate ? new Date(u.driverProfile.licenseExpiryDate).toLocaleDateString() : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs whitespace-nowrap ">
                    <span className={getDateStatusClass(u.driverProfile?.vehicleRegistrationExpiryDate)}>
                      {u.driverProfile?.vehicleRegistrationExpiryDate ? new Date(u.driverProfile.vehicleRegistrationExpiryDate).toLocaleDateString() : '—'}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    {u.driverProfile?.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold dark:bg-green-600/20 dark:border-gray-700 bg-green-50 text-green-700 px-2.5 py-1 rounded-md border border-green-200">✓ Approved</span>
                    ) : u.driverProfile?.rejectionReason ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold dark:bg-red-600/20 dark:border-gray-700 bg-red-50 text-red-700 px-2.5 py-1 rounded-md border border-red-200">⚠ Rejected</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold dark:bg-red-600/20 dark:border-gray-700 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200">🕒 Pending</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4">
                    <AIFraudCheck driverId={u.id} />
                  </td>

                  <td className="px-6 py-4">
                    <button 
                      onClick={() => openReviewModal(u)} 
                      className="inline-flex items-center gap-1 dark:bg-primary-600/20 bg-slate-100 text-primary-600 hover:bg-primary-600 hover:text-white font-medium text-xs py-1.5 px-3 rounded-md transition shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5" /> Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 dark:border-gray-700">
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

      {/* COMPLIANCE REVIEW MODAL WINDOW WITH EXPIRY INPUTS */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col">
            
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Reviewing: {selectedUser.name}</h3>
                <p className="text-xs text-slate-500">Verify system record metadata against physical documents</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={submitVerificationReview} className="overflow-y-auto p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* LICENSE CARD DOC WITH EXPIRY CONTROL */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Driving License</span>
                    {selectedUser.driverProfile?.licenseUrl ? (
                      <a href={selectedUser.driverProfile.licenseUrl} target="_blank" rel="noreferrer" className="block relative aspect-video border rounded overflow-hidden bg-black group">
                        <img src={selectedUser.driverProfile.licenseUrl} alt="DL" className="w-full h-full object-contain" />
                      </a>
                    ) : (
                      <div className="aspect-video bg-slate-100 rounded border flex items-center justify-center text-xs text-slate-400">No Document</div>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" /> Expiry Date
                    </label>
                    <input 
                      type="date"
                      value={reviewPayload.licenseExpiry}
                      onChange={(e) => setReviewPayload(p => ({ ...p, licenseExpiry: e.target.value }))}
                      className="w-full text-xs border border-slate-200 p-1.5 rounded bg-white focus:outline-slate-900"
                    />
                  </div>

                  <select 
                    value={reviewPayload.licenseStatus} 
                    onChange={(e) => setReviewPayload(p => ({ ...p, licenseStatus: e.target.value }))}
                    className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-slate-900"
                  >
                    <option value="pending">🕒 Pending</option>
                    <option value="approved">✅ Approve</option>
                    <option value="rejected">❌ Reject</option>
                  </select>
                </div>

                {/* AADHAAR CARD DOC (No Expiry Needed for Identity Cards) */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-500 block mb-1">Aadhaar National ID</span>
                    {selectedUser.driverProfile?.aadhaarUrl ? (
                      <a href={selectedUser.driverProfile.aadhaarUrl} target="_blank" rel="noreferrer" className="block relative aspect-video border rounded overflow-hidden bg-black group">
                        <img src={selectedUser.driverProfile.aadhaarUrl} alt="Aadhaar" className="w-full h-full object-contain" />
                      </a>
                    ) : (
                      <div className="aspect-video bg-slate-100 rounded border flex items-center justify-center text-xs text-slate-400">No Document</div>
                    )}
                  </div>
                  
                  <div className="text-slate-400 text-[11px] italic pt-5">
                    Permanent Government ID. No explicit expiration evaluation required.
                  </div>

                  <select 
                    value={reviewPayload.aadhaarStatus} 
                    onChange={(e) => setReviewPayload(p => ({ ...p, aadhaarStatus: e.target.value }))}
                    className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-slate-900"
                  >
                    <option value="pending">🕒 Pending</option>
                    <option value="approved">✅ Approve</option>
                    <option value="rejected">❌ Reject</option>
                  </select>
                </div>

                {/* RC BOOK CARD DOC WITH EXPIRY CONTROL */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-xs font-bold uppercase text-slate-500 block mb-1">RC Book (Vehicle Doc)</span>
                    {selectedUser.driverProfile?.vehicleDocumentUrl ? (
                      <a href={selectedUser.driverProfile.vehicleDocumentUrl} target="_blank" rel="noreferrer" className="block relative aspect-video border rounded overflow-hidden bg-black group">
                        <img src={selectedUser.driverProfile.vehicleDocumentUrl} alt="RC" className="w-full h-full object-contain" />
                      </a>
                    ) : (
                      <div className="aspect-video bg-slate-100 rounded border flex items-center justify-center text-xs text-slate-400">No Document</div>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                      <Calendar className="h-3 w-3" /> Expiry Date
                    </label>
                    <input 
                      type="date"
                      value={reviewPayload.vehicleDocumentExpiry}
                      onChange={(e) => setReviewPayload(p => ({ ...p, vehicleDocumentExpiry: e.target.value }))}
                      className="w-full text-xs border border-slate-200 p-1.5 rounded bg-white focus:outline-slate-900"
                    />
                  </div>

                  <select 
                    value={reviewPayload.vehicleDocumentStatus} 
                    onChange={(e) => setReviewPayload(p => ({ ...p, vehicleDocumentStatus: e.target.value }))}
                    className="w-full border rounded-md p-1.5 text-xs bg-white focus:outline-slate-900"
                  >
                    <option value="pending">🕒 Pending</option>
                    <option value="approved">✅ Approve</option>
                    <option value="rejected">❌ Reject</option>
                  </select>
                </div>

              </div>

              {/* Rejection Log Input */}
              {(reviewPayload.licenseStatus === 'rejected' || 
                reviewPayload.aadhaarStatus === 'rejected' || 
                reviewPayload.vehicleDocumentStatus === 'rejected') && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-red-700 uppercase flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5" /> Internal Rejection Audit Context Reason
                  </label>
                  <textarea
                    required
                    value={reviewPayload.rejectionReason}
                    onChange={(e) => setReviewPayload(p => ({ ...p, rejectionReason: e.target.value }))}
                    placeholder="Provide a clear description of the issue to help the driver fix it..."
                    className="w-full border border-red-200 bg-red-50/20 rounded-lg p-2.5 text-sm focus:outline-red-500 h-20"
                  />
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2 bg-white sticky bottom-0">
                <button 
                  type="button" 
                  onClick={() => setSelectedUser(null)} 
                  className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs py-2 px-4 rounded-lg transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs py-2 px-5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <LoadingSpinner /> : <ShieldCheck className="h-3.5 w-3.5" />} Save Review Decision
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}