"use client";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Package,
  ArrowRight,
  IndianRupee,
  Clock,
  Ruler,
} from "lucide-react";
import {
  createOrder,
  selectOrdersLoading,
  selectCurrentOrder,
} from "..//..//..//../redux/slices/orderSlice";
import { DashboardLayout } from "..//..//..//../components/shared/Layout";
import { LoadingSpinner, ErrorAlert } from "..//..//..//../components/ui";
import { useRequireAuth } from "..//..//..//../components/shared/AuthGuard";
import { useGoogleMaps } from "..//..//..//../hooks";

// const schema = z.object({
//   pickupAddress: z.string().min(5, 'Enter pickup address'),
//   dropAddress: z.string().min(5, 'Enter drop address'),
//   paymentMethod: z.enum(["cash", "online"]),
//   receiverName: z.string().min(2),
//   receiverPhone: z.string().min(10),
//   packageWeight: z.coerce.number().min(0.1, 'Min 0.1 kg').max(100, 'Max 100 kg'),
//   packageDescription: z.string().max(500).optional(),
//   deliveryInstructions: z.string().max(200).optional(),
//   packageValue: z.coerce.number().min(0)
// });

const schema = z.object({
  pickupAddress: z.string().min(5, "Enter pickup address"),

  dropAddress: z.string().min(5, "Enter drop address"),

  receiverName: z.string().min(2, "Enter receiver name"),

  receiverPhone: z.string().regex(/^[6-9]\d{9}$/, "Invalid phone number"),

  // receiverAlternatePhone: z.string().optional(),

  receiverAlternatePhone: z
  .string()
  .regex(/^[6-9]\d{9}$/, "Invalid phone number")
  .optional()
  .or(z.literal("")),


  paymentMethod: z.enum(["cash", "online"]),

  packageWeight: z.coerce
    .number()
    .min(0.1, "Min 0.1 kg")
    .max(100, "Max 100 kg"),

  packageCategory: z.enum([
    "documents",
    "electronics",
    "food",
    "clothes",
    "other",
  ]),

  packageValue: z.coerce.number().min(0),

  isFragile: z.boolean().optional(),

  packageDescription: z.string().max(500).optional(),

  deliveryInstructions: z.string().max(500).optional(),
});

export default function NewOrderPage() {
  useRequireAuth("customer");
  const dispatch = useDispatch();
  const router = useRouter();
  const loading = useSelector(selectOrdersLoading);
  const currentOrder = useSelector(selectCurrentOrder);

  const mapRef = useRef(null);
  const { map, mapLoaded, drawRoute } = useGoogleMaps(mapRef);

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [priceEstimate, setPriceEstimate] = useState(null);
  const [serverError, setServerError] = useState(null);

  // const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
  //   resolver: zodResolver(schema),
  //   defaultValues: { packageWeight: 1 },
  // });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      packageWeight: 1,
      packageValue: 0,
      paymentMethod: "cash",
      packageCategory: "documents",
      isFragile: false,
    },
  });

  // Navigate to order after creation
  // useEffect(() => {
  //   if (currentOrder) router.push(`/customer/orders/${currentOrder.id}`);
  // }, [currentOrder]);

  //   useEffect(() => {
  //   if (currentOrder?.id) {
  //     router.push(`/customer/orders/${currentOrder.id}`);
  //   }
  // }, [currentOrder, router]);

  // Initialize Google Maps autocomplete
  useEffect(() => {
    if (!mapLoaded || !window.google) return;

    const setupAutocomplete = (inputId, coordsSetter, fieldName) => {
      const input = document.getElementById(inputId);
      if (!input) return;

      // const autocomplete = new window.google.maps.places.Autocomplete(input, {
      //   componentRestrictions: { country: 'in' },
      //   fields: ['formatted_address', 'geometry'],
      // });

      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.error("Google Places library not loaded");
        return;
      }

      const autocomplete = new window.google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "in" },
        fields: ["formatted_address", "geometry"],
      });

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place.geometry) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        coordsSetter({ lat, lng });
        setValue(fieldName, place.formatted_address);

        // Draw route if both coords set
        if (fieldName === "dropAddress" && pickupCoords) {
          drawRoute(pickupCoords, { lat, lng });
        } else if (fieldName === "pickupAddress" && dropCoords) {
          drawRoute({ lat, lng }, dropCoords);
        }
      });
    };

    setupAutocomplete("pickupInput", setPickupCoords, "pickupAddress");
    setupAutocomplete("dropInput", setDropCoords, "dropAddress");
  }, [mapLoaded, pickupCoords, dropCoords, drawRoute, setValue]);

  // Estimate price when both coords and weight available
  const weight = watch("packageWeight");
  useEffect(() => {
    if (!pickupCoords || !dropCoords || !weight) return;

    // Simple client-side Haversine estimate
    const R = 6371;
    const dLat = ((dropCoords.lat - pickupCoords.lat) * Math.PI) / 180;
    const dLng = ((dropCoords.lng - pickupCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((pickupCoords.lat * Math.PI) / 180) *
        Math.cos((dropCoords.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const base = 20;
    const delivery = dist * 8 + weight * 5;
    setPriceEstimate({
      distance: dist.toFixed(1),
      eta: Math.ceil(dist * 3),
      base,
      delivery: delivery.toFixed(0),
      total: (base + delivery).toFixed(0),
    });
  }, [pickupCoords, dropCoords, weight]);

  //   const handelOrder = () => {
  //    if (currentOrder) router.push(`/customer/orders/${currentOrder.id}`);
  // }

  // const onSubmit = async (data) => {
  //   if (!pickupCoords || !dropCoords) {
  //     setServerError('Please select valid addresses from the suggestions');
  //     return;
  //   }
  //   setServerError(null);

  //   dispatch(createOrder({
  //     ...data,
  //     pickupLat: pickupCoords.lat,
  //     pickupLng: pickupCoords.lng,
  //     dropLat: dropCoords.lat,
  //     dropLng: dropCoords.lng,
  //   }));

  //   // handelOrder()

  // };

  const onSubmit = async (data) => {
    try {
      if (!pickupCoords || !dropCoords) {
        setServerError("Please select valid addresses from suggestions");
        return;
      }

      setServerError(null);

      await dispatch(
        createOrder({
          ...data,
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          dropLat: dropCoords.lat,
          dropLng: dropCoords.lng,
        }),
      ).unwrap();
    } catch (error) {
      setServerError(error?.message || "Failed to create order");
    }
  };

  return (
    <DashboardLayout role="customer" title="Place Order">
      <div className="max-w-4xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-3 space-y-4">
            <ErrorAlert message={serverError} />

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Pickup */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  Pickup Location
                </h3>
                <input
                  id="pickupInput"
                  placeholder="Enter pickup address"
                  className={`input-field ${errors.pickupAddress ? "border-red-400" : ""}`}
                  {...register("pickupAddress")}
                />
                {errors.pickupAddress && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.pickupAddress.message}
                  </p>
                )}
              </div>

              {/* Drop */}
              <div className="card p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <MapPin className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  Drop Location
                </h3>
                <input
                  id="dropInput"
                  placeholder="Enter drop address"
                  className={`input-field ${errors.dropAddress ? "border-red-400" : ""}`}
                  {...register("dropAddress")}
                />
                {errors.dropAddress && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.dropAddress.message}
                  </p>
                )}
              </div>

              <div className="card p-5">
                <h3 className="font-semibold mb-4">Receiver Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    placeholder="Receiver Name"
                    className="input-field"
                    {...register("receiverName")}
                  />

                  <input
                    placeholder="Receiver Phone"
                    className="input-field"
                    {...register("receiverPhone")}
                  />
                </div>

                <div className="mt-4">
                  <input
                    placeholder="Alternate Phone (Optional)"
                    className="input-field"
                    {...register("receiverAlternatePhone")}
                  />
                </div>
              </div>

              <div className="card p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-1">Weight (kg)</label>

                    <input
                      type="number"
                      step="0.1"
                      className="input-field"
                      {...register("packageWeight")}
                    />
                  </div>

                  <div>
                    <label className="block text-sm mb-1">
                      Package Value (₹)
                    </label>

                    <input
                      type="number"
                      className="input-field"
                      {...register("packageValue")}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm mb-1">Package Category</label>

                  <select
                    className="input-field"
                    {...register("packageCategory")}
                  >
                    <option value="documents">Documents</option>
                    <option value="electronics">Electronics</option>
                    <option value="food">Food</option>
                    <option value="clothes">Clothes</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="mt-4">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" {...register("isFragile")} />
                    Fragile Package
                  </label>
                </div>

                <div className="mt-4">
                  <input
                    placeholder="Package Description"
                    className="input-field"
                    {...register("packageDescription")}
                  />
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold mb-4">Payment Method</h3>

                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="cash"
                      {...register("paymentMethod")}
                    />
                    Cash on Delivery
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="online"
                      {...register("paymentMethod")}
                    />
                    Online Payment
                  </label>
                </div>
              </div>

              <div className="card p-5">
                <h3 className="font-semibold mb-4">Delivery Instructions</h3>

                <textarea
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Call before delivery, ring bell, leave with security, etc."
                  {...register("deliveryInstructions")}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" /> Placing order...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4" /> Place Order
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Map + Estimate */}
          <div className="lg:col-span-2 space-y-4">
            {/* Map */}
            <div className="card overflow-hidden h-64 lg:h-80">
              <div ref={mapRef} className="w-full h-full" />
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <LoadingSpinner text="Loading map..." />
                </div>
              )}
            </div>

            {/* Price estimate */}
            {priceEstimate && (
              <div className="card p-5 animate-in">
                <h3 className="font-semibold text-gray-800 mb-4">
                  Price Estimate
                </h3>
                <div className="space-y-2.5 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Ruler className="h-3.5 w-3.5" /> Distance
                    </span>
                    <span className="font-medium">
                      {priceEstimate.distance} km
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> Estimated ETA
                    </span>
                    <span className="font-medium">
                      {priceEstimate.eta} mins
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Base fare</span>
                    <span className="font-medium">₹{priceEstimate.base}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Delivery fee</span>
                    <span className="font-medium">
                      ₹{priceEstimate.delivery}
                    </span>
                  </div>
                  <div className="border-t border-gray-100 pt-2.5 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-primary-700 flex items-center">
                      <IndianRupee className="h-4 w-4" />
                      {priceEstimate.total}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  * Final price may vary slightly
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
