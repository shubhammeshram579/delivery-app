// 'use client';
// import { useState } from 'react';
// import { useForm } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { z } from 'zod';
// import { useDispatch, useSelector } from 'react-redux';
// import { useRouter } from 'next/navigation';
// import Link from 'next/link';
// import { Truck, Eye, EyeOff } from 'lucide-react';
// import { registerUser, selectAuthLoading, selectAuthError, clearError } from '../../redux/slices/authSlice';
// import { LoadingSpinner, ErrorAlert } from '../../components/ui';
// import { useEffect } from 'react';

// const schema = z.object({
//   name: z.string().min(2, 'Name must be at least 2 characters'),
//   email: z.string().email('Invalid email'),
//   phone: z.string().min(10, 'Enter valid phone number'),
//   password: z.string()
//     .min(8, 'Min 8 characters')
//     .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Must have uppercase, lowercase and number'),
//   role: z.enum(['customer', 'driver']),
// });

// export default function RegisterPage() {
//   const dispatch = useDispatch();
//   const router = useRouter();
//   const loading = useSelector(selectAuthLoading);
//   const error = useSelector(selectAuthError);
//   const [showPass, setShowPass] = useState(false);

//   const { register, handleSubmit, formState: { errors } } = useForm({
//     resolver: zodResolver(schema),
//     defaultValues: { role: 'customer' },
//   });

//   useEffect(() => () => dispatch(clearError()), [dispatch]);

//   const onSubmit = async (data) => {
//     const result = await dispatch(registerUser(data));
//     if (registerUser.fulfilled.match(result)) {
//       router.push('/verify-otp?email=' + data.email);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
//       <div className="w-full max-w-md">
//         <div className="flex items-center justify-center gap-3 mb-8">
//           <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
//             <Truck className="h-5 w-5 text-white" />
//           </div>
//           <span className="text-2xl font-bold text-gray-900">DeliverPro</span>
//         </div>

//         <div className="card p-8">
//           <h2 className="text-xl font-bold text-gray-900 mb-1">Create account</h2>
//           <p className="text-sm text-gray-500 mb-6">Sign up to get started</p>

//           <ErrorAlert message={error} />

//           <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
//               <input placeholder="John Doe" className={`input-field ${errors.name ? 'border-red-400' : ''}`} {...register('name')} />
//               {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
//               <input type="email" placeholder="you@example.com" className={`input-field ${errors.email ? 'border-red-400' : ''}`} {...register('email')} />
//               {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
//               <input placeholder="+91 90000 00000" className={`input-field ${errors.phone ? 'border-red-400' : ''}`} {...register('phone')} />
//               {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
//               <div className="relative">
//                 <input type={showPass ? 'text' : 'password'} placeholder="••••••••" className={`input-field pr-10 ${errors.password ? 'border-red-400' : ''}`} {...register('password')} />
//                 <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
//                   {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//                 </button>
//               </div>
//               {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1.5">I am a</label>
//               <div className="grid grid-cols-2 gap-3">
//                 {['customer', 'driver'].map((r) => (
//                   <label key={r} className="relative flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 border-gray-200 transition-all">
//                     <input type="radio" value={r} className="sr-only" {...register('role')} />
//                     <span className="text-sm font-medium capitalize text-gray-700">{r}</span>
//                   </label>
//                 ))}
//               </div>
//             </div>

//             <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
//               {loading ? <><LoadingSpinner size="sm" /> Creating account...</> : 'Create Account'}
//             </button>
//           </form>

//           <p className="text-center text-sm text-gray-500 mt-6">
//             Already have an account?{' '}
//             <Link href="/login" className="text-primary-600 font-medium hover:underline">Sign in</Link>
//           </p>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useState, useEffect } from "react";

import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { z } from "zod";

import { useDispatch, useSelector } from "react-redux";

import { useRouter } from "next/navigation";

import Link from "next/link";

import { Truck, Eye, EyeOff } from "lucide-react";

import {
  registerUser,
  selectAuthLoading,
  selectAuthError,
  clearError,
} from "../../redux/slices/authSlice";

import { LoadingSpinner, ErrorAlert } from "../../components/ui";

// ─────────────────────────────────────────────
// Validation Schema
// ─────────────────────────────────────────────

const schema = z
  .object({
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

    role: z.enum(["customer", "driver"]),

    vehicleType: z.string().optional(),

    vehicleNumber: z.string().optional(),

    licenseNumber: z.string().optional(),
  })

  .superRefine((data, ctx) => {
    if (data.role === "driver") {
      if (!data.vehicleType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,

          path: ["vehicleType"],

          message: "Vehicle type required",
        });
      }

      if (!data.vehicleNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,

          path: ["vehicleNumber"],

          message: "Vehicle number required",
        });
      }

      if (!data.licenseNumber) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,

          path: ["licenseNumber"],

          message: "License number required",
        });
      }
    }
  });

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function RegisterPage() {
  const dispatch = useDispatch();

  const router = useRouter();

  const loading = useSelector(selectAuthLoading);

  const error = useSelector(selectAuthError);

  const [showPass, setShowPass] = useState(false);

  const {
    register,

    handleSubmit,

    watch,

    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),

    defaultValues: {
      role: "customer",
    },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const onSubmit = async (data) => {
    const result = await dispatch(registerUser(data));

    if (registerUser.fulfilled.match(result)) {
      router.push("/verify-otp?email=" + data.email);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg">
            <Truck className="h-5 w-5 text-white" />
          </div>

          <span className="text-2xl font-bold text-gray-900">DeliverPro</span>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">
            Create account
          </h2>

          <p className="text-sm text-gray-500 mb-6">Sign up to get started</p>

          <ErrorAlert message={error} />

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>

              <input
                placeholder="John Doe"
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
                Email
              </label>

              <input
                type="email"
                placeholder="you@example.com"
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
                Password
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
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

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                I am a
              </label>

              <div className="grid grid-cols-2 gap-3">
                {["customer", "driver"].map((r) => (
                  <label
                    key={r}
                    className="relative flex items-center justify-center gap-2 p-3 border-2 rounded-lg cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50 border-gray-200 transition-all"
                  >
                    <input
                      type="radio"
                      value={r}
                      className="sr-only"
                      {...register("role")}
                    />

                    <span className="text-sm font-medium capitalize text-gray-700">
                      {r}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Driver Fields */}
            {selectedRole === "driver" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vehicle Type
                  </label>

                  <select
                    className={`input-field ${errors.vehicleType ? "border-red-400" : ""}`}
                    {...register("vehicleType")}
                  >
                    <option value="">Select Vehicle</option>

                    <option value="bike">Bike</option>

                    <option value="scooter">Scooter</option>

                    <option value="car">Car</option>

                    <option value="van">Van</option>

                    <option value="truck">Truck</option>
                  </select>

                  {errors.vehicleType && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.vehicleType.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vehicle Number
                  </label>

                  <input
                    placeholder="MH12AB1234"
                    className={`input-field ${errors.vehicleNumber ? "border-red-400" : ""}`}
                    {...register("vehicleNumber")}
                  />

                  {errors.vehicleNumber && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.vehicleNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    License Number
                  </label>

                  <input
                    placeholder="DL-XXXXXXXX"
                    className={`input-field ${errors.licenseNumber ? "border-red-400" : ""}`}
                    {...register("licenseNumber")}
                  />

                  {errors.licenseNumber && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.licenseNumber.message}
                    </p>
                  )}
                </div>
              </>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-primary-600 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
