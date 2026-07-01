"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

import {
  registerAdmin, // Make sure to add this asyncThunk to your authSlice
  selectAuthLoading,
  selectAuthError,
  clearError,
} from "../../../redux/slices/authSlice";

import { LoadingSpinner, ErrorAlert } from "../../../components/ui";

// ─────────────────────────────────────────────
// Clean Admin Validation Schema
// ─────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, "Name required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Invalid phone"),
  password: z
    .string()
    .min(8, "Min 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Must contain uppercase, lowercase and number",
    ),
});

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function AdminRegisterPage() {
  const dispatch = useDispatch();
  const router = useRouter();

  const loading = useSelector(selectAuthLoading);
  const error = useSelector(selectAuthError);
  const [showPass, setShowPass] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);


const onSubmit = async (data) => {
    const result = await dispatch(registerAdmin(data));

    if (registerAdmin.fulfilled.match(result)) {
      // Redirect to OTP verification screen with email parameter
      router.push("/verify-otp?email=" + data.email);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        
        {/* Admin Branding Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-black">DeliverPro <span className="text-primary-600 font-medium text-lg">Admin</span></span>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Register Administrative Authority
          </h2>
          <p className="text-sm text-gray-500 mb-6">Create an internal administrator console credential</p>

          <ErrorAlert message={error} />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                placeholder="Admin Personnel Name"
                className={`input-field ${errors.name ? "border-red-400" : ""}`}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Corporate Email
              </label>
              <input
                type="email"
                placeholder="admin@deliveryapp.com"
                className={`input-field ${errors.email ? "border-red-400" : ""}`}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Phone Number
              </label>
              <input
                placeholder="+91 90000 00000"
                className={`input-field ${errors.phone ? "border-red-400" : ""}`}
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.phone.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Secure Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  className={`input-field pr-10 ${errors.password ? "border-red-400" : ""}`}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-6 shadow-sm"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Provisioning Admin Access...
                </>
              ) : (
                "Register Admin"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Looking for standard login?{" "}
            <Link
              href="/login"
              className="text-primary-600 font-medium hover:underline"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}