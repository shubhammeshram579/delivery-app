'use client';

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { z } from 'zod';
import { selectUser } from '../../../redux/slices/authSlice';
import { useRequireAuth } from '../../../components/shared/AuthGuard';
import { DashboardLayout } from '../../../components/shared/Layout';
import { driverService } from '../../../services/index';

// Today's date boundary string comparison helper (YYYY-MM-DD format)
const todayDateString = new Date().toISOString().split('T')[0];

// Driver Profile Validation Schema
const driverProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long.').trim(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit phone number.'),
  vehicleType: z.enum(['bike', 'scooter', 'car', 'van', 'truck'], {
    errorMap: () => ({ message: 'Please select a valid vehicle type.' }),
  }),
  vehicleNumber: z
    .string()
    .toUpperCase()
    .regex(/^[A-Z]{2}-\d{2}-[A-Z]{1,2}-\d{4}$/, 'Format must match standard patterns (e.g., MH-12-XX-XXXX).'),
  licenseNumber: z.string().min(5, 'Driver license registration identification number is required.'),
  licenseExpiryDate: z.string().refine((val) => val >= todayDateString, {
    message: 'Driving License has already expired or date is invalid.',
  }),
  aadhaarNumber: z.string().length(12, 'National identity card must contain exactly 12 numeric digits.'),
  vehicleRegistrationExpiryDate: z.string().refine((val) => val >= todayDateString, {
    message: 'Vehicle Registration (RC Book) has already expired.',
  }),
  insuranceExpiryDate: z.string().refine((val) => val >= todayDateString, {
    message: 'Vehicle Insurance validity date must be a future date.',
  }),
});

export default function DriverProfilePage() {
  useRequireAuth('driver');
  const authUser = useSelector(selectUser);

  // Core API Profile State
  const [driverProfile, setDriverProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Client Validation Error Tracking State
  const [errors, setErrors] = useState({});

  // Expanded Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicleType: 'bike',
    vehicleNumber: '',
    licenseNumber: '',
    licenseExpiryDate: '',
    aadhaarNumber: '',
    vehicleRegistrationExpiryDate: '',
    insuranceExpiryDate: '',
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
          licenseExpiryDate: driver.licenseExpiryDate || '',
          aadhaarNumber: driver.aadhaarNumber || '',
          vehicleRegistrationExpiryDate: driver.vehicleRegistrationExpiryDate || '',
          insuranceExpiryDate: driver.insuranceExpiryDate || '',
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

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Handle local file selection & generate object URLs for instant previews
  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target;
    if (selectedFiles && selectedFiles[0]) {
      const file = selectedFiles[0];
      setFiles((prev) => ({ ...prev, [name]: file }));

      const objectUrl = URL.createObjectURL(file);
      setPreviews((prev) => {
        // Clean up memory if previous URL was a blob URL
        if (prev[name] && prev[name].startsWith('blob:')) {
          URL.revokeObjectURL(prev[name]);
        }
        return { ...prev, [name]: objectUrl };
      });
    }
  };

  // Process multi-part profile update submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });
    setErrors({});

    // Validate through Zod before submission execution
    const validationResult = driverProfileSchema.safeParse(formData);

    if (!validationResult.success) {
      const formattedErrors = {};
      validationResult.error.issues.forEach((issue) => {
        const pathKey = issue.path[0];
        if (!formattedErrors[pathKey]) {
          formattedErrors[pathKey] = issue.message;
        }
      });

      setErrors(formattedErrors);
      setSubmitting(false);
      setMessage({ type: 'error', text: 'Please review and fix highlighted form validation errors.' });

      // Auto-focus structural tab depending on field failures
      if (formattedErrors.name || formattedErrors.phone) {
        setActiveTab('personal');
      } else if (formattedErrors.vehicleType || formattedErrors.vehicleNumber) {
        setActiveTab('vehicle');
      } else if (
        formattedErrors.licenseNumber ||
        formattedErrors.licenseExpiryDate ||
        formattedErrors.aadhaarNumber ||
        formattedErrors.vehicleRegistrationExpiryDate ||
        formattedErrors.insuranceExpiryDate
      ) {
        setActiveTab('documents');
      }
      return;
    }

    try {
      const data = new FormData();

      Object.entries(validationResult.data).forEach(([key, value]) => {
        data.append(key, value);
      });

      Object.entries(files).forEach(([key, file]) => {
        if (file) data.append(key, file);
      });

      const response = await driverService.updateProfile(data);

      setDriverProfile(response.data.data.driver);
      setMessage({
        type: 'success',
        text: response.data.message || 'Profile updated successfully!',
      });

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Something went wrong updating your profile.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Verification Status Badge Component helper
  const StatusBadge = ({ status }) => {
    const styles = {
      approved: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800',
      pending: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
    };
    return (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${styles[status] || styles.pending}`}>
        {status ? status.toUpperCase() : 'PENDING'}
      </span>
    );
  };

  if (loading) {
    return (
      <DashboardLayout role="driver" title="Profile">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="driver" title="Profile Settings">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24 sm:pb-12 px-1 sm:px-0">
        
        {/* Status System Header */}
        <div className="card bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <div className="relative group shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary-600/10 dark:bg-primary-600/10 rounded-full overflow-hidden border-2 border-slate-200 dark:border-gray-700 flex items-center justify-center">
              {previews.avatar ? (
                <img src={previews.avatar} alt="Profile" className="object-cover w-full h-full" />
              ) : (
                <span className="text-2xl font-bold text-primary-600 ">{formData.name?.[0] || 'D'}</span>
              )}
            </div>
            <label className="absolute bottom-0 right-0 bg-primary-600  text-white dark:text-white rounded-full p-2 cursor-pointer shadow-md hover:scale-105 transition-transform">
              <input type="file" name="avatar" className="hidden" accept="image/*" onChange={handleFileChange} />
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </label>
          </div>

          <div className="flex-1 min-w-0 w-full">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-gray-100 truncate">{formData.name || 'Driver Partner'}</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 truncate">{driverProfile?.user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="text-xs font-medium bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 px-2.5 py-1 rounded-md">Driver Partner</span>
              {driverProfile?.isVerified ? (
                <span className="text-xs font-semibold bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-md flex items-center gap-1">✓ Verified Active</span>
              ) : (
                <span className="text-xs font-semibold bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-md flex items-center gap-1">⚠ Verification Pending</span>
              )}
            </div>
          </div>
        </div>

        {/* Global Action Message Status Alerts */}
        {message.text && (
          <div className={`p-3.5 sm:p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 ${message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-800' : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'}`}>
            <span className="shrink-0">{message.type === 'success' ? '✓' : '❌'}</span>
            <p className="leading-snug">{message.text}</p>
          </div>
        )}

        {/* Global Compliance Rejection Block Notification */}
        {driverProfile?.rejectionReason && (
          <div className="bg-red-50 dark:bg-red-950/30 border-l-4 border-red-500 p-3.5 sm:p-4 rounded-r-xl">
            <h4 className="text-xs sm:text-sm font-bold text-red-800 dark:text-red-300">Action Required: Correction Requested</h4>
            <p className="text-xs sm:text-sm text-red-700 dark:text-red-400 mt-0.5">{driverProfile.rejectionReason}</p>
          </div>
        )}

        {/* Touch-Friendly Tab Bar Navigation */}
        <div className="flex border-b border-slate-200 dark:border-gray-800 overflow-x-auto scrollbar-none -mx-1 px-1 touch-pan-x no-scrollbar">
          <div className="flex space-x-1 sm:space-x-2 min-w-full">
            {['personal', 'vehicle', 'documents'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-3.5 sm:px-5 font-medium text-xs sm:text-sm border-b-2 whitespace-nowrap transition-colors shrink-0 ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600 dark:border-primary-600 dark:text-primary-600 font-semibold'
                    : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)} Info
                {tab === 'personal' && (errors.name || errors.phone) && <span className="ml-1.5 text-red-500">•</span>}
                {tab === 'vehicle' && (errors.vehicleType || errors.vehicleNumber) && <span className="ml-1.5 text-red-500">•</span>}
                {tab === 'documents' && (errors.licenseNumber || errors.licenseExpiryDate || errors.aadhaarNumber || errors.vehicleRegistrationExpiryDate || errors.insuranceExpiryDate) && <span className="ml-1.5 text-red-500">•</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6" noValidate>
          
          {/* TAB 1: PERSONAL DETAILS */}
          {activeTab === 'personal' && (
            <div className="card bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-gray-100">Personal Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 rounded-lg border p-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${errors.name ? 'border-red-500' : 'border-slate-200 dark:border-gray-800'}`}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Phone Number</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 rounded-lg border p-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${errors.phone ? 'border-red-500' : 'border-slate-200 dark:border-gray-800'}`}
                  />
                  {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
                </div>
                <div className="space-y-1 sm:col-span-2 opacity-75">
                  <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Email Address (Immutable)</label>
                  <input
                    type="email"
                    value={driverProfile?.user?.email || ''}
                    disabled
                    className="w-full bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400 rounded-lg border border-slate-200 dark:border-gray-800 p-2.5 text-base sm:text-sm cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VEHICLE CRITERIA */}
          {activeTab === 'vehicle' && (
            <div className="card bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-gray-100">Vehicle Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Vehicle Type</label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 rounded-lg border p-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${errors.vehicleType ? 'border-red-500' : 'border-slate-200 dark:border-gray-800'}`}
                  >
                    {['bike', 'scooter', 'car', 'van', 'truck'].map((type) => (
                      <option key={type} value={type}>{type.toUpperCase()}</option>
                    ))}
                  </select>
                  {errors.vehicleType && <p className="text-xs text-red-500 mt-1">{errors.vehicleType}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Vehicle Plate Number</label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleInputChange}
                    className={`w-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 rounded-lg border p-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${errors.vehicleNumber ? 'border-red-500' : 'border-slate-200 dark:border-gray-800'}`}
                    placeholder="MH-12-XX-XXXX"
                  />
                  {errors.vehicleNumber && <p className="text-xs text-red-500 mt-1">{errors.vehicleNumber}</p>}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REGULATORY DOCUMENTS */}
          {activeTab === 'documents' && (
            <div className="space-y-4">
              
              {/* DRIVER LICENSE CONTAINER */}
              <div className="card bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-gray-100 text-sm sm:text-base">Driving License</h4>
                  <StatusBadge status={driverProfile?.licenseStatus} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">License Number</label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 rounded-lg border p-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${errors.licenseNumber ? 'border-red-500' : 'border-slate-200 dark:border-gray-800'}`}
                    />
                    {errors.licenseNumber && <p className="text-xs text-red-500 mt-1">{errors.licenseNumber}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Expiry Date</label>
                    <input
                      type="date"
                      name="licenseExpiryDate"
                      value={formData.licenseExpiryDate}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 rounded-lg border p-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${errors.licenseExpiryDate ? 'border-red-500' : 'border-slate-200 dark:border-gray-800'}`}
                    />
                    {errors.licenseExpiryDate && <p className="text-xs text-red-500 mt-1">{errors.licenseExpiryDate}</p>}
                  </div>
                  <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Upload Copy (JPG/PNG)</label>
                    <input
                      type="file"
                      name="licenseDoc"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 dark:file:bg-gray-800 dark:file:text-gray-200 hover:file:bg-slate-200"
                    />
                  </div>
                </div>
                {previews.licenseDoc && (
                  <div className="mt-2 w-32 h-20 sm:w-40 sm:h-24 border rounded-lg overflow-hidden bg-slate-50 dark:bg-gray-950 dark:border-gray-800">
                    <img src={previews.licenseDoc} alt="License Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* IDENTITY CARD REGISTRATION */}
              <div className="card bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-gray-100 text-sm sm:text-base">National Identity Card</h4>
                  <StatusBadge status={driverProfile?.aadhaarStatus} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">12-Digit Unique ID</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      name="aadhaarNumber"
                      maxLength={12}
                      value={formData.aadhaarNumber}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 rounded-lg border p-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${errors.aadhaarNumber ? 'border-red-500' : 'border-slate-200 dark:border-gray-800'}`}
                      placeholder="123456789012"
                    />
                    {errors.aadhaarNumber && <p className="text-xs text-red-500 mt-1">{errors.aadhaarNumber}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Upload Front Copy</label>
                    <input
                      type="file"
                      name="aadhaarDoc"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="w-full text-xs text-slate-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 dark:file:bg-gray-800 dark:file:text-gray-200 hover:file:bg-slate-200"
                    />
                  </div>
                </div>
                {previews.aadhaarDoc && (
                  <div className="mt-2 w-32 h-20 sm:w-40 sm:h-24 border rounded-lg overflow-hidden bg-slate-50 dark:bg-gray-950 dark:border-gray-800">
                    <img src={previews.aadhaarDoc} alt="Identity Card Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* VEHICLE REGISTRATION (RC) & INSURANCE */}
              <div className="card bg-white dark:bg-gray-900 rounded-xl p-4 sm:p-6 border border-slate-200 dark:border-gray-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <h4 className="font-semibold text-slate-900 dark:text-gray-100 text-sm sm:text-base">RC & Insurance Compliance</h4>
                  <StatusBadge status={driverProfile?.vehicleDocumentStatus} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">RC Book Expiry Date</label>
                    <input
                      type="date"
                      name="vehicleRegistrationExpiryDate"
                      value={formData.vehicleRegistrationExpiryDate}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 rounded-lg border p-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${errors.vehicleRegistrationExpiryDate ? 'border-red-500' : 'border-slate-200 dark:border-gray-800'}`}
                    />
                    {errors.vehicleRegistrationExpiryDate && <p className="text-xs text-red-500 mt-1">{errors.vehicleRegistrationExpiryDate}</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Insurance Expiry Date</label>
                    <input
                      type="date"
                      name="insuranceExpiryDate"
                      value={formData.insuranceExpiryDate}
                      onChange={handleInputChange}
                      className={`w-full bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-gray-100 rounded-lg border p-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400 ${errors.insuranceExpiryDate ? 'border-red-500' : 'border-slate-200 dark:border-gray-800'}`}
                    />
                    {errors.insuranceExpiryDate && <p className="text-xs text-red-500 mt-1">{errors.insuranceExpiryDate}</p>}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Upload RC Copy</label>
                  <input
                    type="file"
                    name="vehicleDoc"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full text-xs text-slate-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 dark:file:bg-gray-800 dark:file:text-gray-200 hover:file:bg-slate-200"
                  />
                </div>
                {previews.vehicleDoc && (
                  <div className="mt-2 w-32 h-20 sm:w-40 sm:h-24 border rounded-lg overflow-hidden bg-slate-50 dark:bg-gray-950 dark:border-gray-800">
                    <img src={previews.vehicleDoc} alt="Vehicle Doc Preview" className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

            </div>
          )}

          {/* Save Control Bar (Sticky on mobile screens) */}
          <div className=" bottom-14 sm:bottom-0 left-0 right-0 p-4 sm:p-0  backdrop-blur-md sm:backdrop-blur-none border-t sm:border-t-0 border-slate-200 dark:border-gray-800 flex justify-end z-20">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:mr-0 sm:w-auto px-6 py-3 sm:py-2.5 bg-primary-600 hover:bg-primary-700 text-white dark:bg-primary-600 dark:hover:bg-primary-700 dark:text-white font-medium rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white dark:border-slate-900 border-t-transparent"></div>
                  <span>Updating Profile...</span>
                </>
              ) : (
                <span>Save Changes & Update</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </DashboardLayout>
  );
}