"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRequireAuth } from "../../../components/shared/AuthGuard";
import { DashboardLayout } from "../../../components/shared/Layout";
import {
  LoadingSpinner,
  StatusBadge,
  Pagination,
  EmptyState,
} from "../../../components/ui";
import { adminService } from "../../../services";
import {
  Package,
  Search,
  Filter,
  MoreVertical,
  Eye,
  RefreshCw,
  X,
  AlertTriangle,
  MapPin,
  CreditCard,
  ShieldCheck,
  Download,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

import AdminReassignModal from "../../../components/admin/AdminReassignModal";

const STATUSES = [
  "",
  "pending",
  "accepted",
  "in_transit",
  "delivered",
  "cancelled",
];

export default function AdminOrdersPage() {
  useRequireAuth("admin");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const [reassignOrderId, setReassignOrderId] = useState(null);
  const [activeDropdownId, setActiveDropdownId] = useState(null);
  const [selectedViewOrder, setSelectedViewOrder] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);

  const dropdownRef = useRef(null);

  // Close active action dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    adminService
      .getOrders({
        page,
        limit: pageSize,
        status: status || undefined,
        search: search || undefined,
      })
      .then((res) => {
        const { orders, totalItems, totalPages } = res.data.data;
        setOrders(orders || []);
        setTotalItems(totalItems || 0);
        setTotalPages(totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, pageSize, status, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleExportCsv = () => {
    setExportLoading(true);

    // By omitting page and limit, the backend defaults to exporting ALL records.
    // If you want to export paginated data instead, simply include: page, limit: pageSize
    const params = {
      status: status || undefined,
      search: search || undefined,
      page: page,       // <-- Commented out or omitted for ALL data by default
      limit: pageSize,  // <-- Omit limit to fetch ALL matching records
    };

    adminService
      .exportOrdersCsv(params)
      .then((res) => {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = window.URL.createObjectURL(blob);

        const fileName = params.limit
          ? `orders_page_${page}_limit_${pageSize}_${Date.now()}.csv`
          : `all_orders_${Date.now()}.csv`;

        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((err) => {
        console.error("CSV Export Error:", err);
      })
      .finally(() => setExportLoading(false));
  };

  return (
    <DashboardLayout role="admin" title="All Orders">
      {/* Top Filter and Search Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 justify-between">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search customer or driver..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="input-field pl-9 w-full"
          />
        </div>

        
        <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary-600" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="input-field w-auto capitalize"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s ? s.replace("_", " ") : "All Status"}
              </option>
            ))}
          </select>
        </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exportLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            {exportLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Orders Data Table Card UI */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b dark:bg-gray-900 dark:border-gray-700">
              <tr>
                {[
                  "Order",
                  "Customer",
                  "Driver",
                  "Amount",
                  "Status",
                  "Date",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wide"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <LoadingSpinner />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12">
                    <EmptyState icon={Package} title="No orders found" />
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="hover:bg-gray-50/80 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-400">
                      {o.orderNumber || o.id.slice(0, 8)}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-400">
                      <div className="flex flex-col">
                        <span>{o.customer?.name || "Unknown"}</span>
                        <span className="text-xs text-gray-400 font-normal">
                          {o.customer?.phone}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {o.driver?.user?.name ? (
                        <div className="flex flex-col">
                          <span>{o.driver.user.name}</span>
                          <span className="text-xs text-gray-400">
                            {o.driver.user.phone}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-400">
                      ₹{o.totalAmount}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {o.createdAt
                        ? format(new Date(o.createdAt), "dd MMM yy")
                        : "—"}
                    </td>

                    {/* Action Column with 3-Dot Dropdown */}
                    <td className="px-4 py-3 relative">
                      <div
                        className="inline-block"
                        ref={activeDropdownId === o.id ? dropdownRef : null}
                      >
                        <button
                          onClick={() =>
                            setActiveDropdownId(
                              activeDropdownId === o.id ? null : o.id,
                            )
                          }
                          className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>

                        {activeDropdownId === o.id && (
                          <div className="absolute right-4 mt-1 w-44 bg-white dark:bg-gray-900 dark:border-gray-700 border border-gray-100 rounded-lg shadow-lg py-1 z-50">
                            <button
                              onClick={() => {
                                setSelectedViewOrder(o);
                                setActiveDropdownId(null);
                              }}
                              className="w-full px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4 text-gray-400 dark:text-gray-300" />
                              View Details
                            </button>

                            <button
                              onClick={() => {
                                setReassignOrderId(o.id);
                                setActiveDropdownId(null);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs font-medium flex items-center gap-2 ${
                                o.status === "pending"
                                  ? "text-orange-600 hover:bg-orange-50 dark:hover:bg-gray-800"
                                  : "text-gray-300 cursor-not-allowed"
                              }`}
                              disabled={o.status !== "pending"}
                            >
                              <RefreshCw className="h-4 w-4" />
                              Reassign Driver
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination Panel Integration */}
        <div className="px-4 py-3 border-t dark:border-gray-700">
          <Pagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>

        {/* Driver Reassignment Modal */}
        <AdminReassignModal
          orderId={reassignOrderId}
          open={!!reassignOrderId}
          onClose={() => setReassignOrderId(null)}
          onAssigned={fetchOrders}
        />

        {/* View Order Slide-over Modal */}
        <AdminViewOrderModal
          order={selectedViewOrder}
          onClose={() => setSelectedViewOrder(null)}
        />
      </div>
    </DashboardLayout>
  );
}

// ==========================================
// VIEW ORDER DETAILS MODAL COMPONENT
// ==========================================
function AdminViewOrderModal({ order, onClose }) {
  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-gray-500/30 backdrop-blur-xs flex justify-end z-[100] transition-opacity">
      <div className="card w-full max-w-lg bg-white h-full flex flex-col shadow-2xl animate-slide-in overflow-y-auto">
        {/* Modal Header */}
        <div className="card px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-300">Order Deep-Dive</h2>
            <p className="text-xs font-mono text-gray-400">
              {order.orderNumber || order.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 flex-1">
          {/* Status & Urgent Alerts Banner */}
          <div className="card flex items-center justify-between bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">
                Current Status
              </span>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block font-medium">
                Type
              </span>
              <span className="text-sm font-semibold text-slate-700 capitalize">
                {order.orderType}
              </span>
            </div>
          </div>

          {/* Cancellation Alerts */}
          {order.wasDriverCancelled && (
            <div className="bg-amber-50 dark:bg-gray-900 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-800">
                  Driver Cancellation Recorded
                </h4>
                <p className="text-xs text-amber-700 mt-1">
                  A driver cancelled this order stating:{" "}
                  <span className="font-semibold">
                    "{order.driverCancelReason || "No reasons shared"}"
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Customer & Recipient Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4 bg-gray-50/50 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">
                Customer (Sender)
              </span>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-400 mt-1">
                {order.customer?.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {order.customer?.phone}
              </p>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                {order.customer?.email}
              </p>
            </div>

            <div className="card p-4 bg-gray-50/50 rounded-xl border border-gray-100">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Recipient (Receiver)
              </span>
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-400 mt-1">
                {order.receiverName}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {order.receiverPhone}
              </p>
              {order.receiverAlternatePhone && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Alt: {order.receiverAlternatePhone}
                </p>
              )}
            </div>
          </div>

          {/* Route Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Delivery Route Info
            </h4>
            <div className="space-y-4 relative pl-4 border-l-2 border-dashed border-gray-200">
              {/* Pickup Address */}
              <div className="relative">
                <MapPin className="h-4 w-4 text-green-500 absolute -left-[25px] bg-white  ring-4 ring-white" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-300">
                  Pickup Address
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">
                  {order.pickupAddress}
                </p>
              </div>
              {/* Drop-off Address */}
              <div className="relative">
                <MapPin className="h-4 w-4 text-red-500 absolute -left-[25px] bg-white  ring-4 ring-white" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-300">
                  Drop-off Address
                </span>
                <p className="text-xs text-gray-700 dark:text-gray-400 mt-0.5">
                  {order.dropAddress}
                </p>
              </div>
            </div>

            {/* Distance Parameters */}
            <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-gray-100">
              <div>
                <span className="text-xs text-gray-400 block">
                  Total Distance
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-400">
                  {order.distance} km
                </span>
              </div>
              <div>
                <span className="text-xs text-gray-400 block">
                  Estimated Duration
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-400">
                  {order.estimatedTime} mins
                </span>
              </div>
            </div>
          </div>

          {/* Driver details */}
          <div className="p-4 rounded-xl border border-gray-150 dark:border-gray-700">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wide mb-3">
              Assigned Driver
            </h4>
            {order.driver ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-gray-800 dark:text-gray-400">
                    {order.driver.user?.name || "Driver details missing"}
                  </span>
                  <span className="text-xs text-gray-500 font-mono uppercase bg-gray-100 px-2 py-0.5 rounded">
                    {order.driver.vehicleType} ({order.driver.vehicleNumber})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 pt-2 border-t border-gray-50">
                  <span>License: {order.driver.licenseNumber}</span>
                  <span>
                    Driver Status:{" "}
                    <span className="capitalize font-medium">
                      {order.driverStatus || "N/A"}
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                No driver is currently attached to this delivery.
              </p>
            )}
          </div>

          {/* Package Details */}
          <div className="p-4 bg-gray-50/50 dark:bg-gray-900 dark:border-gray-700 rounded-xl border border-gray-100 space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
              Package Description
            </h4>
            <div className="grid grid-cols-2 gap-y-3 text-xs">
              <div>
                <span className="text-gray-400 block">Category</span>
                <span className="font-semibold text-gray-800 capitalize">
                  {order.packageCategory}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Fragile Cargo</span>
                <span
                  className={`font-semibold ${order.isFragile ? "text-red-600" : "text-gray-800"}`}
                >
                  {order.isFragile ? "Yes ⚠️" : "No"}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Declared Value</span>
                <span className="font-semibold text-gray-800">
                  ₹{order.packageValue}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Declared Weight</span>
                <span className="font-semibold text-gray-800">
                  {order.packageWeight} kg
                </span>
              </div>
            </div>
            {order.packageDescription && (
              <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
                <span className="text-gray-400 block mb-0.5">Notes:</span>"
                {order.packageDescription}"
              </div>
            )}
          </div>

          {/* Payment & Security Section */}
          <div className="p-4 border border-gray-150 dark:border-gray-700 rounded-xl space-y-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-gray-400" />
              Pricing & Secure Audits
            </h4>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Base Fare</span>
                <span>₹{order.basePrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery Fee</span>
                <span>₹{order.deliveryFee}</span>
              </div>
              <div className="flex justify-between font-bold text-sm text-gray-900 pt-1.5 border-t border-gray-100">
                <span>Total Charge</span>
                <span>₹{order.totalAmount}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100 text-xs">
              <div>
                <span className="text-gray-400 block">Payment Method</span>
                <span className="font-semibold uppercase text-gray-700 dark:text-gray-400">
                  {order.paymentMethod}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Payment Status</span>
                <span
                  className={`font-semibold capitalize ${order.payment?.status === "success" ? "text-green-600" : "text-amber-600"}`}
                >
                  {order.payment?.status || "Unpaid"}
                </span>
              </div>
            </div>

            {/* OTP and Delivery Proof */}
            <div className="bg-emerald-50/50 dark:bg-gray-900 dark:border-gray-700 p-3.5 rounded-lg border border-emerald-100 flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="text-xs font-bold text-emerald-800 dark:text-green-500">
                  Verification Integrity
                </h5>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Delivery OTP Verification:{" "}
                  <span className="font-bold">
                    {order.deliveryOtpVerified ? "Verified" : "Unverified"}
                  </span>
                </p>
                {order.cashCollectedAt && (
                  <p className="text-[11px] text-emerald-700">
                    Cash collected at:{" "}
                    <span className="font-medium">
                      {format(new Date(order.cashCollectedAt), "PPp")}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Cloudinary Delivery Proof Image */}
            {order.deliveryProofImage && (
              <div className="pt-2">
                <span className="text-xs text-gray-400 block mb-2">
                  Delivery Proof Photo:
                </span>
                <a
                  href={order.deliveryProofImage}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg overflow-hidden border border-gray-200 hover:border-primary-500 transition-all group"
                >
                  <img
                    src={order.deliveryProofImage}
                    alt="Delivery Proof"
                    className="w-full h-32 object-cover group-hover:scale-[1.02] transition-transform duration-200"
                  />
                  <div className="bg-gray-50 py-1.5 text-center text-[10px] font-medium text-gray-500 group-hover:text-primary-600">
                    Click to Open Full Proof Image
                  </div>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
