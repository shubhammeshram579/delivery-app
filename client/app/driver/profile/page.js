// 'use client';
// import { useSelector } from 'react-redux';
// import { selectUser } from '../../../redux/slices/authSlice';
// import { useRequireAuth } from '../../../components/shared/AuthGuard';
// import { DashboardLayout } from '../../../components/shared/Layout';
// // import { driverService } from '../../../services/index';
// import { useEffect, useState } from 'react';

// export default function DriverProfilePage() {
//   useRequireAuth('driver');
//   const user = useSelector(selectUser);

//   // const [users, setUsers] = useState([])

//   // console.log("useSta" ,users)




//   // useEffect(() => {
//   //   const  fatchUsers = async () => {

//   //   const res = await driverService.getProfile();

//   //   setUsers(res.data.data.driver)

//   //   }

//   //   fatchUsers()

//   // },[])

//   // console.log(user);
//   return (
//     <DashboardLayout role="driver" title="Profile">
//       <div className="max-w-xl">
//         <div className="card p-6">
//           <div className="flex items-center gap-4 mb-6">
//             <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 text-2xl font-bold">
//               {user?.name?.[0]}
//             </div>
//             <div>
//               <p className="font-semibold text-gray-900">{user?.name}</p>
//               <p className="text-sm text-gray-500">{user?.email}</p>
//               <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Driver</span>
//             </div>
//           </div>
//           <div className="space-y-3 text-sm">
//             <div className="flex justify-between py-2 border-b border-gray-50">
//               <span className="text-gray-500">Email</span>
//               <span className="font-medium">{user?.email}</span>
//             </div>
//             <div className="flex justify-between py-2 border-b border-gray-50">
//               <span className="text-gray-500">Phone</span>
//               <span className="font-medium">{user?.phone}</span>
//             </div>
//             <div className="flex justify-between py-2">
//               <span className="text-gray-500">Email Verified</span>
//               <span className={user?.isEmailVerified ? 'text-green-600 font-medium' : 'text-red-500'}>
//                 {user?.isEmailVerified ? '✓ Verified' : 'Not verified'}
//               </span>
//             </div>
//           </div>
//         </div>
//       </div>
//     </DashboardLayout>
//   );
// }


'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '../../../redux/slices/authSlice';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { driverService } from '../../../services/index'; // Uncommented & integrated

export default function DriverProfilePage() {
  useRequireAuth('driver');
  const authUser = useSelector(selectUser);

  // Core API Profile State
  const [driverProfile, setDriverProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicleType: 'bike',
    vehicleNumber: '',
    licenseNumber: '',
    aadhaarNumber: '',
  });

  // File Streams State
  const [files, setFiles] = useState({
    avatar: null,
    licenseDoc: null,
    aadhaarDoc: null,
    vehicleDoc: null,
  });

  // Previews for files
  const [previews, setPreviews] = useState({
    avatar: '',
    licenseDoc: '',
    aadhaarDoc: '',
    vehicleDoc: '',
  });

  // Fetch driver data from API on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await driverService.getProfile();
        const driver = res.data.data.driver;
        setDriverProfile(driver);

        // Populate Form States
        setFormData({
          name: driver.user?.name || authUser?.name || '',
          phone: driver.user?.phone || authUser?.phone || '',
          vehicleType: driver.vehicleType || 'bike',
          vehicleNumber: driver.vehicleNumber || '',
          licenseNumber: driver.licenseNumber || '',
          aadhaarNumber: driver.aadhaarNumber || '',
        });

        setPreviews({
          avatar: driver.user?.avatar || '',
          licenseDoc: driver.licenseUrl || '',
          aadhaarDoc: driver.aadhaarUrl || '',
          vehicleDoc: driver.vehicleDocumentUrl || '',
        });
      } catch (err) {
        setMessage({ type: 'error', text: 'Failed to load driver profile details.' });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [authUser]);

  // Handle standard text inputs
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle local file selection & generate object URLs for instant previews
  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      const file = selectedFiles[0];
      setFiles((prev) => ({ ...prev, [name]: file }));
      setPreviews((prev) => ({ ...prev, [name]: URL.createObjectURL(file) }));
    }
  };

  // Process multi-part profile update submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const data = new FormData();
      
      // Append text fields
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });

      // Append binary files if updated
      Object.entries(files).forEach(([key, file]) => {
        if (file) data.append(key, file);
      });

      // Pass directly to service layer (Must accept FormData payload)
      const response = await driverService.updateProfile(data);
      
      setDriverProfile(response.data.data.driver);
      setMessage({ 
        type: 'success', 
        text: response.data.message || 'Profile updated successfully!' 
      });
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setMessage({ 
        type: 'error', 
        text: err.response?.data?.message || 'Something went wrong updating your profile.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Verification Status Badge Component helper
  const StatusBadge = ({ status }) => {
    const styles = {
      approved: 'bg-green-100 text-green-700 border-green-200',
      pending: 'bg-amber-100 text-amber-700 border-amber-200',
      rejected: 'bg-red-100 text-red-700 border-red-200',
    };
    return (
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${styles[status] || styles.pending}`}>
        {status ? status.toUpperCase() : 'PENDING'}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout role="driver" title="Profile">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="driver" title="Profile Settings">
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        
        {/* Status System Header */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 bg-slate-100 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center">
                {previews.avatar ? (
                  <img src={previews.avatar} alt="Profile" className="object-cover w-full h-full" />
                ) : (
                  <span className="text-2xl font-bold text-primary-600 ">{formData.name?.[0]}</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-primary-600 text-white rounded-full p-1.5 cursor-pointer shadow-md hover:bg-primary-700 transition">
                <input type="file" name="avatar" className="hidden" accept="image/*" onChange={handleFileChange} />
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              </label>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{formData.name || 'Driver Partner'}</h2>
              <p className="text-sm text-slate-500">{driverProfile?.user?.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-semibold bg-slate-100 text-slate-800 px-2.5 py-0.5 rounded-md">Driver Partner</span>
                {driverProfile?.isVerified ? (
                  <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-0.5 rounded-md flex items-center gap-1">✓ Verified Active</span>
                ) : (
                  <span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-md flex items-center gap-1">⚠ Verification Pending</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Message Status Alerts */}
        {message.text && (
          <div className={`p-4 rounded-lg border text-sm flex items-start gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
            <span>{message.type === 'success' ? '✓' : '❌'}</span>
            <p>{message.text}</p>
          </div>
        )}

        {/* Global Compliance Rejection Block Notification */}
        {driverProfile?.rejectionReason && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
            <h4 className="text-sm font-bold text-red-800">Action Required: Correction Requested</h4>
            <p className="text-sm text-red-700 mt-0.5">{driverProfile.rejectionReason}</p>
          </div>
        )}

        {/* Custom Shadcn-like Tab System Navigation */}
        <div className="flex border-b border-slate-200 overflow-x-auto space-x-2">
          {['personal', 'vehicle', 'documents'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`py-2.5 px-4 font-medium text-sm border-b-2 whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)} Information
            </button>
          ))}
        </div>

        {/* Full Form Control Structure */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === 'personal' && (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Personal Management</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-slate-900" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Phone Connection</label>
                  <input type="text" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-slate-900" required />
                </div>
                <div className="space-y-1.5 opacity-60">
                  <label className="text-sm font-medium text-slate-700">Email (Immutable Account Anchor)</label>
                  <input type="email" value={driverProfile?.user?.email || ''} disabled className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm cursor-not-allowed" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLE CRITERIA */}
          {activeTab === 'vehicle' && (
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold text-slate-900">Fleet configuration</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Vehicle Type</label>
                  <select name="vehicleType" value={formData.vehicleType} onChange={handleInputChange} className="w-full rounded-lg border border-slate-200 p-2 text-sm bg-white focus:outline-slate-900">
                    {['bike', 'scooter', 'car', 'van', 'truck'].map((type) => (
                      <option key={type} value={type}>{type.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Vehicle Plate Number</label>
                  <input type="text" name="vehicleNumber" value={formData.vehicleNumber} onChange={handleInputChange} className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-slate-900" placeholder="MH-12-XX-XXXX" required />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGULATORY DOCUMENTS COMPLIANCE */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              
              {/* DRIVER LICENSE CONTAINER */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-slate-900 text-sm">Driving License Document</h4>
                  <StatusBadge status={driverProfile?.licenseStatus} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">License ID String</label>
                    <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleInputChange} className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-slate-900" required />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Upload License Copy (JPG/PNG)</label>
                    <input type="file" name="licenseDoc" accept="image/*" onChange={handleFileChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                  </div>
                </div>
                {previews.licenseDoc && (
                  <div className="mt-2 w-40 h-24 border rounded overflow-hidden bg-slate-50">
                    <img src={previews.licenseDoc} alt="License Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* AADHAAR CARD REGISTRATION */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-slate-900 text-sm">National Identity Card (Aadhaar)</h4>
                  <StatusBadge status={driverProfile?.aadhaarStatus} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">12-Digit Aadhaar Unique ID</label>
                    <input type="text" name="aadhaarNumber" maxLength={12} value={formData.aadhaarNumber} onChange={handleInputChange} className="w-full rounded-lg border border-slate-200 p-2 text-sm focus:outline-slate-900" placeholder="123456789012" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Upload Aadhaar Front Copy</label>
                    <input type="file" name="aadhaarDoc" accept="image/*" onChange={handleFileChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                  </div>
                </div>
                {previews.aadhaarDoc && (
                  <div className="mt-2 w-40 h-24 border rounded overflow-hidden bg-slate-50">
                    <img src={previews.aadhaarDoc} alt="Aadhaar Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* VEHICLE REGISTRATION (RC) */}
              <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold text-slate-900 text-sm">Vehicle Registration Certificate (RC Book)</h4>
                  <StatusBadge status={driverProfile?.vehicleDocumentStatus} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Upload RC Document Copy</label>
                  <input type="file" name="vehicleDoc" accept="image/*" onChange={handleFileChange} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                </div>
                {previews.vehicleDoc && (
                  <div className="mt-2 w-40 h-24 border rounded overflow-hidden bg-slate-50">
                    <img src={previews.vehicleDoc} alt="Vehicle Doc Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Persistent Save Control Bar */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={submitting}
              // className="bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm py-2.5 px-6 rounded-lg transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              className="btn-primary"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Syncing System Profiles...
                </>
              ) : (
                'Save Changes & Update'
              )}
            </button>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}