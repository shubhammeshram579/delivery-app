'use client';
import { useEffect, useState } from 'react';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { LoadingSpinner, EmptyState, Pagination } from '../../../components/ui';
import { adminService } from '../../../services/index';
import { Eye, ShieldAlert, ShieldCheck, X, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDriversPage() {
  useRequireAuth('admin');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-world state configurations matching updated API structure
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [isVerified, setIsVerified] = useState(''); // Options: '', 'true', 'false'

  // Modal tracking states
  const [selectedUser, setSelectedUser] = useState(null);
  const [reviewPayload, setReviewPayload] = useState({
    licenseStatus: 'pending',
    aadhaarStatus: 'pending',
    vehicleDocumentStatus: 'pending',
    rejectionReason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ 
        role: 'driver', 
        page,
        limit: pageSize,
        search: search || undefined,
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
  }, [page, pageSize, search, isVerified]);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1); 
  };

  const openReviewModal = (user) => {
    setSelectedUser(user);
    const d = user.driverProfile || {};
    setReviewPayload({
      licenseStatus: d.licenseStatus || 'pending',
      aadhaarStatus: d.aadhaarStatus || 'pending',
      vehicleDocumentStatus: d.vehicleDocumentStatus || 'pending',
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

  return (
    <DashboardLayout role="admin" title="Drivers Verification Portal">
      {/* Top Filter & Search Action Control Row */}
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
            // className="bg-white text-slate-700 text-sm font-medium rounded-xl border border-slate-200 px-3 py-2 cursor-pointer focus:outline-none focus:border-slate-400"
             className="input-field w-auto capitalize"
          >
            <option value="">All Verification Status</option>
            <option value="true">Approved</option>
            <option value="false">Pending / Rejected</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Name', 'Email', 'Phone', 'Onboarding Verification', 'Joined', 'Action'].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-12"><LoadingSpinner /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="py-12"><EmptyState icon={Eye} title="No registration files found" /></td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition">
                  <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                  <td className="px-6 py-4 text-slate-500">{u.email}</td>
                  <td className="px-6 py-4 text-slate-500">{u.phone}</td>
                  <td className="px-6 py-4">
                    {u.driverProfile?.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-md border border-green-200">✓ Approved</span>
                    ) : u.driverProfile?.rejectionReason ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-700 px-2.5 py-1 rounded-md border border-red-200">⚠ Rejected Fixes Req.</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md border border-amber-200">🕒 Awaiting Check</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => openReviewModal(u)} 
                      className="inline-flex items-center gap-1 bg-slate-100 text-primary-600 hover:bg-primary-600 hover:text-white font-medium text-xs py-1.5 px-3 rounded-md transition shadow-sm"
                    >
                      <Eye className="h-3.5 w-3.5" /> Review Docs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Panel */}
        <div className="px-4 py-3 border-t border-slate-100">
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

      {/* COMPLIANCE REVIEW MODAL WINDOW */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col animate-in fade-in-50 zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Reviewing: {selectedUser.name}</h3>
                <p className="text-xs text-slate-500">UID Cross Reference: {selectedUser.id}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Document Review Body */}
            <form onSubmit={submitVerificationReview} className="overflow-y-auto p-6 space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* LICENSE CARD DOC */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase text-slate-500">Driving License</span>
                    </div>
                    <p className="text-xs font-mono bg-white border px-2 py-1 rounded text-slate-700 mb-2 truncate">
                      No: {selectedUser.driverProfile?.licenseNumber || 'N/A'}
                    </p>
                    {selectedUser.driverProfile?.licenseUrl ? (
                      <a href={selectedUser.driverProfile.licenseUrl} target="_blank" rel="noreferrer" className="block relative aspect-video border rounded overflow-hidden bg-black group">
                        <img src={selectedUser.driverProfile.licenseUrl} alt="DL" className="w-full h-full object-contain group-hover:scale-105 transition" />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-[10px] text-white px-1.5 py-0.5 rounded">View Full Size</span>
                      </a>
                    ) : (
                      <div className="aspect-video bg-slate-100 rounded border flex items-center justify-center text-xs text-slate-400">No Document Uploaded</div>
                    )}
                  </div>
                  <select 
                    value={reviewPayload.licenseStatus} 
                    onChange={(e) => setReviewPayload(p => ({ ...p, licenseStatus: e.target.value }))}
                    className="mt-3 w-full border rounded-md p-1.5 text-xs bg-white focus:outline-slate-900"
                  >
                    <option value="pending">🕒 Pending</option>
                    <option value="approved">✅ Approve</option>
                    <option value="rejected">❌ Reject</option>
                  </select>
                </div>

                {/* AADHAAR CARD DOC */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase text-slate-500">Aadhaar National ID</span>
                    </div>
                    <p className="text-xs font-mono bg-white border px-2 py-1 rounded text-slate-700 mb-2 truncate">
                      No: {selectedUser.driverProfile?.aadhaarNumber ? `XXXX-XXXX-${selectedUser.driverProfile.aadhaarNumber.slice(-4)}` : 'N/A'}
                    </p>
                    {selectedUser.driverProfile?.aadhaarUrl ? (
                      <a href={selectedUser.driverProfile.aadhaarUrl} target="_blank" rel="noreferrer" className="block relative aspect-video border rounded overflow-hidden bg-black group">
                        <img src={selectedUser.driverProfile.aadhaarUrl} alt="Aadhaar" className="w-full h-full object-contain group-hover:scale-105 transition" />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-[10px] text-white px-1.5 py-0.5 rounded">View Full Size</span>
                      </a>
                    ) : (
                      <div className="aspect-video bg-slate-100 rounded border flex items-center justify-center text-xs text-slate-400">No Document Uploaded</div>
                    )}
                  </div>
                  <select 
                    value={reviewPayload.aadhaarStatus} 
                    onChange={(e) => setReviewPayload(p => ({ ...p, aadhaarStatus: e.target.value }))}
                    className="mt-3 w-full border rounded-md p-1.5 text-xs bg-white focus:outline-slate-900"
                  >
                    <option value="pending">🕒 Pending</option>
                    <option value="approved">✅ Approve</option>
                    <option value="rejected">❌ Reject</option>
                  </select>
                </div>

                {/* RC BOOK CARD DOC */}
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase text-slate-500">RC Book (Vehicle Doc)</span>
                    </div>
                    <p className="text-xs font-mono bg-white border px-2 py-1 rounded text-slate-700 mb-2 truncate">
                      Plate: {selectedUser.driverProfile?.vehicleNumber || 'N/A'}
                    </p>
                    {selectedUser.driverProfile?.vehicleDocumentUrl ? (
                      <a href={selectedUser.driverProfile.vehicleDocumentUrl} target="_blank" rel="noreferrer" className="block relative aspect-video border rounded overflow-hidden bg-black group">
                        <img src={selectedUser.driverProfile.vehicleDocumentUrl} alt="RC" className="w-full h-full object-contain group-hover:scale-105 transition" />
                        <span className="absolute bottom-1 right-1 bg-black/70 text-[10px] text-white px-1.5 py-0.5 rounded">View Full Size</span>
                      </a>
                    ) : (
                      <div className="aspect-video bg-slate-100 rounded border flex items-center justify-center text-xs text-slate-400">No Document Uploaded</div>
                    )}
                  </div>
                  <select 
                    value={reviewPayload.vehicleDocumentStatus} 
                    onChange={(e) => setReviewPayload(p => ({ ...p, vehicleDocumentStatus: e.target.value }))}
                    className="mt-3 w-full border rounded-md p-1.5 text-xs bg-white focus:outline-slate-900"
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
                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
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

              {/* Actions Footer Bar */}
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