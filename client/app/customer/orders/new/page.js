"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  MapPin,
  ArrowRight,
  IndianRupee,
  Clock,
  Ruler,
  User,
  Phone,
  Package,
  ShieldAlert,
  FileText,
  ChevronDown,
  Info,
  CheckCircle,
  Users,
} from "lucide-react";
import {
  createOrder,
  selectOrdersLoading,
} from "..//..//..//../redux/slices/orderSlice";
import { DashboardLayout } from "..//..//..//../components/shared/Layout";
import { LoadingSpinner, ErrorAlert } from "..//..//..//../components/ui";
import { useRequireAuth } from "..//..//..//../components/shared/AuthGuard";
import { useGoogleMaps } from "..//..//..//../hooks";

// ─────────────────────────────────────────────────────────
// Package categories — real-world delivery app categories
// ─────────────────────────────────────────────────────────
const PACKAGE_CATEGORIES = [
  {
    value: "documents",
    label: "📄 Documents",
    hint: "Letters, files, certificates",
  },
  {
    value: "electronics",
    label: "📱 Electronics",
    hint: "Phones, laptops, gadgets",
  },
  {
    value: "food",
    label: "🍱 Food & Grocery",
    hint: "Meals, groceries, beverages",
  },
  {
    value: "medicine",
    label: "💊 Medicine",
    hint: "Medicines, medical equipment",
  },
  {
    value: "clothes",
    label: "👕 Clothes & Fashion",
    hint: "Apparel, shoes, accessories",
  },
  {
    value: "furniture",
    label: "🛋️ Furniture",
    hint: "Small furniture, home items",
  },
  {
    value: "books",
    label: "📚 Books & Stationery",
    hint: "Books, notebooks, art supplies",
  },
  {
    value: "jewellery",
    label: "💍 Jewellery",
    hint: "Gold, silver, ornaments",
  },
  {
    value: "sports",
    label: "🏏 Sports Equipment",
    hint: "Sports gear and accessories",
  },
  {
    value: "automobile_parts",
    label: "🔧 Auto Parts",
    hint: "Vehicle parts and accessories",
  },
  { value: "passenger", label: "🧍 Passenger", hint: "passenger Vehicle" },
  { value: "other", label: "📦 Other", hint: "Anything not listed above" },
];

// {
//   value: "passenger",
//   label: "🧍 🚗 Passenger",
//   hint: "Passenger"
// },

const VEHICLE_TYPES = [
  {
    value: "bike",
    label: "🏍️ Bike",
    maxWeight: 15,
    baseMultiplier: 1.0,
    hint: "Up to 15 kg — Quick delivery",
  },
  {
    value: "scooter",
    label: "🛵 Scooter",
    maxWeight: 20,
    baseMultiplier: 1.1,
    hint: "Up to 20 kg — Better for fragile items",
  },
  {
    value: "car",
    label: "🚗 Car / SUV",
    maxWeight: 80,
    baseMultiplier: 2.0,
    hint: "Up to 80 kg — Bulk orders or passengers",
  },
  {
    value: "van",
    label: "🚐 Van",
    maxWeight: 300,
    baseMultiplier: 3.5,
    hint: "Up to 300 kg — Large items / appliances",
  },
  {
    value: "truck",
    label: "🚚 Truck",
    maxWeight: 1000,
    baseMultiplier: 5.0,
    hint: "Up to 1000 kg — Heavy freight / commercial shift",
  },
];

// ─────────────────────────────────────────────────────────
// Validation schema — every field properly validated
// ─────────────────────────────────────────────────────────

const schema = z
  .object({
    pickupAddress: z
      .string()
      .min(5, "Select a pickup address from suggestions"),
    dropAddress: z.string().min(5, "Select a drop address from suggestions"),

    // Move structural validations to superRefine so they don't block passenger bookings
    receiverName: z.string().optional().or(z.literal("")),
    receiverPhone: z.string().optional().or(z.literal("")),
    receiverAlternatePhone: z.string().optional().or(z.literal("")),

    packageCategory: z.enum(
      [
        "documents",
        "electronics",
        "food",
        "medicine",
        "clothes",
        "furniture",
        "books",
        "jewellery",
        "sports",
        "automobile_parts",
        "passenger",
        "other",
      ],
      { errorMap: () => ({ message: "Select a package category" }) },
    ),

    packageWeight: z.coerce.number().optional().or(z.nan()),
    packageValue: z.coerce.number().optional().or(z.nan()),
    passengerCount: z.coerce.number().optional().or(z.nan()),
    isFragile: z.boolean().optional(),
    packageDescription: z.string().max(300, "Max 300 characters").optional(),
    deliveryInstructions: z.string().max(300, "Max 300 characters").optional(),

    paymentMethod: z.enum(["cash", "online"], {
      errorMap: () => ({ message: "Select a payment method" }),
    }),
    vehicleType: z.enum(["bike", "scooter", "car", "van", "truck"], {
      errorMap: () => ({ message: "Select a vehicle type" }),
    }),
  })
  .superRefine((data, ctx) => {
    // ─── CASE 1: PASSENGER BOOKING ──────────────────────────────────
    if (data.packageCategory === "passenger") {
      if (
        !data.passengerCount ||
        isNaN(data.passengerCount) ||
        data.passengerCount < 1 ||
        data.passengerCount > 4
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Passenger count must be between 1 and 4",
          path: ["passengerCount"],
        });
      }
      if (data.vehicleType !== "car") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only cars can be selected for passenger category rides",
          path: ["vehicleType"],
        });
      }
    }

    // ─── CASE 2: CARGO / DELIVERY BOOKING ────────────────────────────
    else {
      // 1. Validate Receiver Name
      if (!data.receiverName || data.receiverName.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Name must be at least 2 characters",
          path: ["receiverName"],
        });
      } else if (data.receiverName.length > 60) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Name too long",
          path: ["receiverName"],
        });
      } else if (!/^[a-zA-Z\s.'-]+$/.test(data.receiverName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Name should only contain letters",
          path: ["receiverName"],
        });
      }

      // 2. Validate Receiver Phone
      if (!data.receiverPhone || !/^[6-9]\d{9}$/.test(data.receiverPhone)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid 10-digit Indian mobile number",
          path: ["receiverPhone"],
        });
      }

      // 3. Validate Receiver Alternate Phone (Optional structure)
      if (
        data.receiverAlternatePhone &&
        data.receiverAlternatePhone !== "" &&
        !/^[6-9]\d{9}$/.test(data.receiverAlternatePhone)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid 10-digit mobile number",
          path: ["receiverAlternatePhone"],
        });
      }

      // 4. Validate Weight
      if (
        data.packageWeight === undefined ||
        isNaN(data.packageWeight) ||
        data.packageWeight < 0.1
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum weight is 0.1 kg",
          path: ["packageWeight"],
        });
      } else if (data.packageWeight > 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Maximum cargo weight limit is 1000 kg",
          path: ["packageWeight"],
        });
      }

      // 5. Validate Declared Value
      if (
        data.packageValue === undefined ||
        isNaN(data.packageValue) ||
        data.packageValue < 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Value cannot be negative",
          path: ["packageValue"],
        });
      } else if (data.packageValue > 500000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Value too high — contact us for high-value shipments",
          path: ["packageValue"],
        });
      }

      // 6. Check Capacity limits
      const selectedVehicle = VEHICLE_TYPES.find(
        (v) => v.value === data.vehicleType,
      );
      if (selectedVehicle && data.packageWeight > selectedVehicle.maxWeight) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Weight exceeds your selected ${selectedVehicle.label}'s capacity (${selectedVehicle.maxWeight}kg)`,
          path: ["vehicleType"],
        });
      }
    }
  });

// ─────────────────────────────────────────────────────────
// Field wrapper — consistent error + label layout
// ─────────────────────────────────────────────────────────
function Field({ label, required, error, children, hint }) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
          {hint && (
            <span className="ml-1 text-xs text-gray-400 font-normal">
              ({hint})
            </span>
          )}
        </label>
      )}
      {children}
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <ShieldAlert className="h-3 w-3 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

export default function NewOrderPage() {
  useRequireAuth("customer");
  const dispatch = useDispatch();
  const router = useRouter();
  const loading = useSelector(selectOrdersLoading);

  const mapRef = useRef(null);
  const { map, mapLoaded, drawRoute } = useGoogleMaps(mapRef);

  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropCoords, setDropCoords] = useState(null);
  const [priceEstimate, setPriceEstimate] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Keep coords in refs so autocomplete listeners don't go stale
  const pickupCoordsRef = useRef(null);
  const dropCoordsRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, touchedFields },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      packageWeight: 1,
      packageValue: 0,
      paymentMethod: "cash",
      packageCategory: "documents",
      vehicleType: "bike", // Safe fallback default
      isFragile: false,
    },
  });

  // ─────────────────────────────────────────────────────
  // Google Maps autocomplete setup
  //
  // FIX: original setup ran in useEffect with pickupCoords/dropCoords
  // as deps, causing the listeners to be re-registered on every coord
  // update — leading to multiple autocomplete instances and stale
  // closures. Fixed: run once on mapLoaded, read coords from refs.
  // ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !window.google?.maps?.places) return;

    const setupAutocomplete = (inputId, coordsRef, fieldName) => {
      const input = document.getElementById(inputId);
      if (!input) return;

      const ac = new window.google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: "in" },
        fields: ["formatted_address", "geometry"],
      });

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        if (!place.geometry) {
          setServerError(
            "Could not find that location. Please pick from the dropdown.",
          );
          return;
        }
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        coordsRef.current = { lat, lng };
        setValue(fieldName, place.formatted_address, { shouldValidate: true });

        // Update state for price calculation
        if (fieldName === "pickupAddress") setPickupCoords({ lat, lng });
        if (fieldName === "dropAddress") setDropCoords({ lat, lng });

        // Draw route if both coords are now available
        const pickup = pickupCoordsRef.current;
        const drop = dropCoordsRef.current;
        if (pickup && drop) drawRoute(pickup, drop);
      });
    };

    setupAutocomplete("pickupInput", pickupCoordsRef, "pickupAddress");
    setupAutocomplete("dropInput", dropCoordsRef, "dropAddress");
  }, [mapLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────
  // Price estimate — recalculate on coord or weight change
  // ─────────────────────────────────────────────────────
  const weight = watch("packageWeight");
  const category = watch("packageCategory");
  const isFragile = watch("isFragile");
  const vehicleType = watch("vehicleType"); // Watch the vehicle choice

  // useEffect(() => {
  //   if (!pickupCoords || !dropCoords || !weight || weight <= 0) {
  //     setPriceEstimate(null);
  //     return;
  //   }

  //   // Haversine distance
  //   const R    = 6371;
  //   const dLat = ((dropCoords.lat - pickupCoords.lat) * Math.PI) / 180;
  //   const dLng = ((dropCoords.lng - pickupCoords.lng) * Math.PI) / 180;
  //   const a =
  //     Math.sin(dLat / 2) ** 2 +
  //     Math.cos((pickupCoords.lat * Math.PI) / 180) *
  //       Math.cos((dropCoords.lat * Math.PI) / 180) *
  //       Math.sin(dLng / 2) ** 2;
  //   const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  //   // Same formula as original, plus fragile surcharge
  //   const base       = 20;
  //   const delivery   = dist * 8 + Number(weight) * 5;
  //   const fragile    = isFragile ? 15 : 0;
  //   const total      = base + delivery + fragile;

  //   // ETA: base 3 min/km, minimum 10 min
  //   const eta = Math.max(10, Math.ceil(dist * 3));

  //   setPriceEstimate({
  //     distance: dist.toFixed(1),
  //     eta,
  //     base,
  //     delivery:     delivery.toFixed(0),
  //     fragileFee:   fragile,
  //     total:        total.toFixed(0),
  //   });
  // }, [pickupCoords, dropCoords, weight, isFragile]);

  useEffect(() => {
    if (
      !pickupCoords ||
      !dropCoords ||
      !weight ||
      weight <= 0 ||
      !vehicleType
    ) {
      setPriceEstimate(null);
      return;
    }

    // Haversine calculation lines stay the same...
    const R = 6371;
    const dLat = ((dropCoords.lat - pickupCoords.lat) * Math.PI) / 180;
    const dLng = ((dropCoords.lng - pickupCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((pickupCoords.lat * Math.PI) / 180) *
        Math.cos((dropCoords.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Get multiplier for selected vehicle
    const vehicleConfig =
      VEHICLE_TYPES.find((v) => v.value === vehicleType) || VEHICLE_TYPES[0];

    const base = 20 * vehicleConfig.baseMultiplier;
    const delivery =
      (dist * 8 + Number(weight) * 5) * vehicleConfig.baseMultiplier;
    const fragile = isFragile ? 15 : 0;
    const total = base + delivery + fragile;
    const eta = Math.max(10, Math.ceil(dist * 3)); // (In real world, trucks move slower; you could adjust this multiplier too)

    setPriceEstimate({
      distance: dist.toFixed(1),
      eta,
      base: base.toFixed(0),
      delivery: delivery.toFixed(0),
      fragileFee: fragile,
      total: total.toFixed(0),
    });
  }, [pickupCoords, dropCoords, weight, isFragile, vehicleType]); // Added



  // Sync Package Category changes with Form Values and Fields
  useEffect(() => {
    if (category === "passenger") {
      setValue("vehicleType", "car");
      // Clear delivery fields so they don't pass stale data
      setValue("weight", undefined);
      setValue("declaredValue", undefined);
    } else {
      // Clear passenger count value if moving back to package delivery
      setValue("passengerCount", undefined);

      if (category === "furniture") {
        setValue("vehicleType", "truck");
      } else if (
        watch("vehicleType") === "car" ||
        watch("vehicleType") === "truck"
      ) {
        setValue("vehicleType", "bike"); // Reset to standard safe delivery item choice
      }
    }
  }, [category, setValue, watch]);

  // ─────────────────────────────────────────────────────
  // Submit
  //
  // FIX: original dispatch didn't navigate after success.
  // Now unwraps the action, gets orderId from result, navigates.
  // ─────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    if (!pickupCoords || !dropCoords) {
      setServerError(
        "Please select valid addresses from the dropdown suggestions.",
      );
      return;
    }

    setServerError(null);

    // Compute the exact orderType value requested by your API
    const orderType =
      data.packageCategory === "passenger" ? "passenger" : "delivery";

    try {
      const result = await dispatch(
        createOrder({
          ...data,
          orderType, // Send orderType directly inside payload data
          pickupLat: pickupCoords.lat,
          pickupLng: pickupCoords.lng,
          dropLat: dropCoords.lat,
          dropLng: dropCoords.lng,
        }),
      ).unwrap();

      // Navigate to the new order's detail page
      setOrderSuccess(true);
      const orderId = result?.id || result?.order?.id;
      if (orderId) {
        router.push(`/customer/orders/${orderId}`);
      } else {
        router.push("/customer/orders");
      }
    } catch (error) {
      setServerError(
        error?.message || "Failed to place order. Please try again.",
      );
    }
  };

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────
  return (
    <DashboardLayout role="customer" title="Place New Order">
      <div className="max-w-4xl mx-auto px-0 sm:px-0">
        <div className="grid lg:grid-cols-5 gap-4 lg:gap-6">
          {/* ── Form column ───────────────────────────── */}
          <div className="lg:col-span-3 space-y-4 order-2 lg:order-1">
            <ErrorAlert message={serverError} />

            <form
              id="new-order-form"
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 pb-2 sm:pb-0"
              noValidate
            >
              {/* ── Section 1: Pickup ────────────────── */}
              <div className="card p-4 sm:p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  Pickup Location
                </h3>
                <Field error={errors.pickupAddress?.message}>
                  <input
                    id="pickupInput"
                    placeholder="Search pickup address…"
                    autoComplete="off"
                    className={`input-field ${errors.pickupAddress ? "border-red-400 focus:ring-red-300" : ""}`}
                    {...register("pickupAddress")}
                  />
                </Field>
                {pickupCoords && (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Location confirmed
                  </p>
                )}
              </div>

              {/* ── Section 2: Drop ──────────────────── */}
              <div className="card p-4 sm:p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-3.5 w-3.5 text-red-600" />
                  </div>
                  Drop Location
                </h3>
                <Field error={errors.dropAddress?.message}>
                  <input
                    id="dropInput"
                    placeholder="Search drop address…"
                    autoComplete="off"
                    className={`input-field ${errors.dropAddress ? "border-red-400 focus:ring-red-300" : ""}`}
                    {...register("dropAddress")}
                  />
                </Field>
                {dropCoords && (
                  <p className="mt-1.5 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Location confirmed
                  </p>
                )}
              </div>

              {/* ── Section 3: Receiver (Hidden if Passenger Booking) ────────── */}
              {category !== "passenger" && (
                <div className="card p-4 sm:p-5">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" /> Receiver Details
                  </h3>
                  <div className="space-y-4">
                    <Field
                      label="Full Name"
                      required
                      error={errors.receiverName?.message}
                    >
                      <input
                        placeholder="e.g. Rahul Sharma"
                        className={`input-field ${errors.receiverName ? "border-red-400" : ""}`}
                        {...register("receiverName")}
                      />
                    </Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field
                        label="Mobile Number"
                        required
                        error={errors.receiverPhone?.message}
                      >
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">
                            +91
                          </span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="9876543210"
                            className={`input-field pl-10 ${errors.receiverPhone ? "border-red-400" : ""}`}
                            {...register("receiverPhone")}
                            onChange={(e) => {
                              // Allow only digits
                              e.target.value = e.target.value.replace(
                                /\D/g,
                                "",
                              );
                              register("receiverPhone").onChange(e);
                            }}
                          />
                        </div>
                      </Field>

                      <Field
                        label="Alternate Number"
                        hint="optional"
                        error={errors.receiverAlternatePhone?.message}
                      >
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 select-none">
                            +91
                          </span>
                          <input
                            type="tel"
                            inputMode="numeric"
                            maxLength={10}
                            placeholder="9876543210"
                            className={`input-field pl-10 ${errors.receiverAlternatePhone ? "border-red-400" : ""}`}
                            {...register("receiverAlternatePhone")}
                            onChange={(e) => {
                              e.target.value = e.target.value.replace(
                                /\D/g,
                                "",
                              );
                              register("receiverAlternatePhone").onChange(e);
                            }}
                          />
                        </div>
                      </Field>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Section 4: Package Details ────────── */}
              <div className="card p-4 sm:p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  {category === "passenger" ? (
                    <>
                      <Users className="h-4 w-4 text-gray-400" /> Passenger
                      Details
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 text-gray-400" /> Package
                      Details
                    </>
                  )}
                </h3>
                <div className="space-y-4">
                  {/* Category */}
                  <Field
                    label="Category"
                    required
                    error={errors.packageCategory?.message}
                  >
                    <div className="relative">
                      <select
                        className={`input-field appearance-none pr-8 ${errors.packageCategory ? "border-red-400" : ""}`}
                        {...register("packageCategory")}
                      >
                        {PACKAGE_CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                    {/* Category hint */}
                    {category && (
                      <p className="mt-1 text-xs text-gray-400">
                        {
                          PACKAGE_CATEGORIES.find((c) => c.value === category)
                            ?.hint
                        }
                      </p>
                    )}
                  </Field>

                  {category === "passenger" ? (
                    /* ── PASSENGER VIEW: Show Number of Persons Dropdown ── */
                    <Field
                      label="Number of Passengers"
                      required
                      error={errors.passengerCount?.message}
                    >
                      <div className="relative">
                        <select
                          className={`input-field appearance-none pr-8 ${errors.passengerCount ? "border-red-400" : ""}`}
                          {...register("passengerCount", {
                            valueAsNumber: true,
                          })}
                        >
                          <option value="1">1 Person</option>
                          <option value="2">2 Persons</option>
                          <option value="3">3 Persons</option>
                          <option value="4">4 Persons (Max)</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                      </div>
                    </Field>
                  ) : (
                    /* ── CARGO / DELIVERY VIEW: Show Weight, Value & Fragile Toggle ── */
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Weight */}
                        <Field
                          label="Weight"
                          required
                          error={errors.packageWeight?.message}
                        >
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              max="100"
                              placeholder="1.0"
                              className={`input-field pr-10 ${errors.packageWeight ? "border-red-400" : ""}`}
                              {...register("packageWeight", {
                                valueAsNumber: true,
                              })}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                              kg
                            </span>
                          </div>
                        </Field>

                        {/* Declared value */}
                        <Field
                          label="Declared Value"
                          required
                          hint="for insurance"
                          error={errors.packageValue?.message}
                        >
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                              ₹
                            </span>
                            <input
                              type="number"
                              min="0"
                              placeholder="0"
                              className={`input-field pl-7 ${errors.packageValue ? "border-red-400" : ""}`}
                              {...register("packageValue", {
                                valueAsNumber: true,
                              })}
                            />
                          </div>
                        </Field>
                      </div>

                      {/* Fragile toggle */}
                      <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                        <input
                          type="checkbox"
                          className="mt-0.5 w-4 h-4 accent-primary-600"
                          {...register("isFragile")}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            Fragile Package
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Handle with care · ₹15 surcharge · driver will be
                            notified
                          </p>
                        </div>
                      </label>
                    </>
                  )}

                  {/* Description (Dynamic Placeholders & Labels) */}
                  <Field
                    label={
                      category === "passenger"
                        ? "Ride Notes / Instructions"
                        : "Package Description"
                    }
                    hint="optional"
                    error={errors.packageDescription?.message}
                  >
                    <textarea
                      rows={2}
                      maxLength={300}
                      placeholder={
                        category === "passenger"
                          ? "e.g. Please carry one extra luggage bag, or wait near the gate corner"
                          : "e.g. 2 mobile phones in original box, 3 kg approx"
                      }
                      className={`input-field resize-none ${errors.packageDescription ? "border-red-400" : ""}`}
                      {...register("packageDescription")}
                    />
                    <p className="mt-1 text-xs text-gray-400 text-right">
                      {watch("packageDescription")?.length || 0}/300
                    </p>
                  </Field>
                </div>
              </div>

              {/* ── Section: Choose Vehicle Type ────────── */}
              <div className="card p-4 sm:p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-400" /> Vehicle Category
                </h3>

                <Field
                  label="Select Vehicle"
                  required
                  error={errors.vehicleType?.message}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {VEHICLE_TYPES.map((v) => {
                      const isTooHeavy = weight > v.maxWeight;
                      const selected = watch("vehicleType") === v.value;

                      // Apply custom business rules for enabling/disabling choices:
                      let isDisabled = isTooHeavy;

                      if (category === "furniture") {
                        // Rule 1: If furniture, ONLY truck is allowed
                        if (v.value !== "truck") isDisabled = true;
                      } else if (category === "passenger") {
                        // Rule 2: If passenger order: ONLY car can be chosen
                        if (v.value !== "car") isDisabled = true;
                      } else {
                        // Rule 3: If normal cargo/delivery order: car is strictly disabled
                        if (v.value === "car") isDisabled = true;
                      }

                      return (
                        <label
                          key={v.value}
                          className={`flex flex-col p-3 rounded-xl border-2 transition-all ${
                            isDisabled
                              ? "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"
                              : selected
                                ? "border-primary-500 bg-primary-50 cursor-pointer"
                                : "border-gray-200 hover:border-gray-300 cursor-pointer"
                          }`}
                        >
                          <input
                            type="radio"
                            value={v.value}
                            disabled={isDisabled}
                            className="sr-only"
                            {...register("vehicleType")}
                          />
                          <div className="flex justify-between items-center">
                            <span
                              className={`text-sm font-medium ${selected ? "text-primary-700" : "text-gray-800"}`}
                            >
                              {v.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 font-medium text-gray-500">
                              {v.value === "car" && category === "passenger"
                                ? "Max 4 Persons"
                                : `Max ${v.maxWeight}kg`}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400 mt-1">
                            {category === "furniture" && v.value !== "truck"
                              ? "Requires a truck for large furniture items"
                              : v.value === "car" && category !== "passenger"
                                ? "Disabled for package delivery orders"
                                : category === "passenger" && v.value !== "car"
                                  ? "Only cars can carry passengers"
                                  : v.hint}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </Field>
              </div>

              {/* ── Section 5: Delivery Instructions ─── */}
              <div className="card p-4 sm:p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" /> Delivery
                  Instructions
                  <span className="text-xs font-normal text-gray-400">
                    (optional)
                  </span>
                </h3>
                <Field error={errors.deliveryInstructions?.message}>
                  <textarea
                    rows={3}
                    maxLength={300}
                    placeholder="e.g. Call before arriving · Ring bell twice · Leave with security guard · Don't bend documents"
                    className="input-field resize-none"
                    {...register("deliveryInstructions")}
                  />
                  <p className="mt-1 text-xs text-gray-400 text-right">
                    {watch("deliveryInstructions")?.length || 0}/300
                  </p>
                </Field>
              </div>

              {/* ── Section 6: Payment Method ─────────── */}
              <div className="card p-4 sm:p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <IndianRupee className="h-4 w-4 text-gray-400" /> Payment
                  Method
                </h3>
                {errors.paymentMethod && (
                  <p className="text-xs text-red-500 mb-3">
                    {errors.paymentMethod.message}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: "cash",
                      label: "💵 Cash on Delivery",
                      desc: "Pay driver on arrival",
                    },
                    {
                      value: "online",
                      label: "💳 Pay Online",
                      desc: "UPI · Cards · Wallets",
                    },
                  ].map((opt) => {
                    const selected = watch("paymentMethod") === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex flex-col gap-0.5 p-3 sm:p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          selected
                            ? "border-primary-500 bg-primary-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <input
                          type="radio"
                          value={opt.value}
                          className="sr-only"
                          {...register("paymentMethod")}
                        />
                        <span
                          className={`text-sm font-medium leading-tight ${selected ? "text-primary-700" : "text-gray-800"}`}
                        >
                          {opt.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {opt.desc}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Submit — desktop only (mobile uses sticky bar below) ── */}
              <button
                type="submit"
                disabled={loading || orderSuccess}
                className="hidden sm:flex btn-primary w-full py-3.5 items-center justify-center gap-2 text-base disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" /> Placing Order…
                  </>
                ) : orderSuccess ? (
                  <>
                    <CheckCircle className="h-5 w-5" /> Order Placed!
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-5 w-5" /> Place Order
                  </>
                )}
              </button>

              {/* Address confirmation reminder */}
              {(!pickupCoords || !dropCoords) && (
                <p className="hidden sm:flex text-xs text-amber-600 text-center items-center justify-center gap-1 pb-2">
                  <Info className="h-3.5 w-3.5" />
                  Select addresses from the dropdown to enable order placement
                </p>
              )}
            </form>
          </div>

          {/* ── Right column — Map + Estimate ─────────── */}
          <div className="lg:col-span-2 space-y-4 order-1 lg:order-2 lg:sticky lg:top-4 self-start">
            {/* Map — taller on mobile so route is visible */}
            <div
              className="card overflow-hidden relative"
              style={{ height: "220px" }}
            >
              <div ref={mapRef} className="w-full h-full" />
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-xl">
                  <LoadingSpinner text="Loading map…" />
                </div>
              )}
              {mapLoaded && !pickupCoords && !dropCoords && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50/90 rounded-xl gap-2 pointer-events-none">
                  <MapPin className="h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">
                    Enter addresses to see route
                  </p>
                </div>
              )}
            </div>

            {/* Price estimate */}
            {priceEstimate ? (
              <div className="card p-4 sm:p-5">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Price Estimate
                </h3>
                <div className="space-y-2">
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
                      <Clock className="h-3.5 w-3.5" /> Est. Time
                    </span>
                    <span className="font-medium">{priceEstimate.eta} min</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Base fare</span>
                    <span>₹{priceEstimate.base}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Delivery fee</span>
                    <span>₹{priceEstimate.delivery}</span>
                  </div>
                  {priceEstimate.fragileFee > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Fragile surcharge</span>
                      <span>₹{priceEstimate.fragileFee}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-2 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-primary-700 flex items-center gap-0.5">
                      <IndianRupee className="h-4 w-4" />
                      {priceEstimate.total}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center mt-3">
                  * Final price confirmed after driver accepts
                </p>
              </div>
            ) : pickupCoords && !dropCoords ? (
              <div className="card p-4 text-center text-sm text-gray-400">
                Enter drop address to see price estimate
              </div>
            ) : null}

            {/* Package tips — shown based on selected category */}
            {category === "electronics" && (
              <div className="card p-4 bg-blue-50 border-blue-100">
                <p className="text-xs font-medium text-blue-800 mb-1 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Electronics tip
                </p>
                <p className="text-xs text-blue-600">
                  Enable "Fragile" for extra care. Pack in bubble wrap and mark
                  the declared value accurately for insurance.
                </p>
              </div>
            )}
            {category === "food" && (
              <div className="card p-4 bg-orange-50 border-orange-100">
                <p className="text-xs font-medium text-orange-800 mb-1 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Food delivery tip
                </p>
                <p className="text-xs text-orange-600">
                  Make sure the food is sealed properly. Add delivery
                  instructions for handling (e.g. "keep upright").
                </p>
              </div>
            )}
            {category === "medicine" && (
              <div className="card p-4 bg-green-50 border-green-100">
                <p className="text-xs font-medium text-green-800 mb-1 flex items-center gap-1">
                  <Info className="h-3.5 w-3.5" /> Medicine tip
                </p>
                <p className="text-xs text-green-600">
                  Ensure medicines are properly sealed. Add receiver's alternate
                  phone for faster handover.
                </p>
              </div>
            )}
            {category === "jewellery" && (
              <div className="card p-4 bg-yellow-50 border-yellow-100">
                <p className="text-xs font-medium text-yellow-800 mb-1 flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5" /> High-value item
                </p>
                <p className="text-xs text-yellow-700">
                  Enable Fragile and declare accurate value. OTP verification
                  will be required at both ends.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky bottom bar — mobile only ──────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
        {priceEstimate && (
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-xs text-gray-500">
              {priceEstimate.distance} km · {priceEstimate.eta} min
            </div>
            <div className="flex items-center gap-0.5 font-bold text-primary-700">
              <IndianRupee className="h-3.5 w-3.5" />
              <span>{priceEstimate.total}</span>
              <span className="text-xs font-normal text-gray-400 ml-1">
                est.
              </span>
            </div>
          </div>
        )}
        <button
          type="submit"
          form="new-order-form"
          disabled={loading || orderSuccess}
          className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base disabled:opacity-60"
        >
          {loading ? (
            <>
              <LoadingSpinner size="sm" /> Placing Order…
            </>
          ) : orderSuccess ? (
            <>
              <CheckCircle className="h-5 w-5" /> Order Placed!
            </>
          ) : (
            <>
              <ArrowRight className="h-5 w-5" /> Place Order
            </>
          )}
        </button>
        {(!pickupCoords || !dropCoords) && (
          <p className="text-xs text-amber-600 text-center mt-1.5 flex items-center justify-center gap-1">
            <Info className="h-3 w-3" /> Select both addresses first
          </p>
        )}
      </div>
      {/* Bottom padding so last form field isn't hidden behind sticky bar on mobile */}
      <div className="sm:hidden h-28" />
    </DashboardLayout>
  );
}
