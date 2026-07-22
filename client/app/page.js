// 'use client';
// import { useEffect } from 'react';
// import { useSelector } from 'react-redux';
// import { useRouter } from 'next/navigation';
// import { LoadingSpinner } from '../components/ui';

// export default function HomePage() {
//   const isAuthenticated = useSelector((state) => state?.auth?.isAuthenticated ?? false);
//   const role = useSelector((state) => state?.auth?.user?.role ?? null);
//   const router = useRouter();

//   useEffect(() => {
//     if (!isAuthenticated) {
//       router.replace('/login');
//       return;
//     }
//     if (role === 'customer') router.replace('/customer/dashboard');
//     else if (role === 'driver') router.replace('/driver/dashboard');
//     else if (role === 'admin') router.replace('/admin/dashboard');
//   }, [isAuthenticated, role, router]);

//   return <LoadingSpinner fullscreen text="Redirecting..." />;
// }


// 'use client';
// import { useEffect } from 'react';
// import { useSelector } from 'react-redux';
// import { useRouter } from 'next/navigation';

// export default function RootPage() {
//   const isAuthenticated = useSelector(s => s?.auth?.isAuthenticated ?? false);
//   const role            = useSelector(s => s?.auth?.user?.role ?? null);
//   const isInitialized   = useSelector(s => s?.auth?.isInitialized ?? false);
//   const router = useRouter();

//   useEffect(() => {
//     if (!isInitialized) return;
//     if (!isAuthenticated) {
//       router.replace('/home');
//       return;
//     }
//     if (role === 'admin')        router.replace('/admin/dashboard');
//     else if (role === 'driver')  router.replace('/driver/dashboard');
//     else                         router.replace('/customer/dashboard');
//   }, [isAuthenticated, role, isInitialized, router]);

//   return (
//     <div className="min-h-screen flex items-center justify-center">
//       <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
//     </div>
//   );
// }


'use client';
import Link from 'next/link';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Truck, Package, MapPin, Clock, Shield, Star, ChevronRight, CheckCircle, Zap, Users } from 'lucide-react';
import ThemeToggle from '../components/shared/ThemeToggle';

const features = [
  { icon: Zap,    title: 'Real-time Tracking',  desc: 'Track your delivery live on the map. Know exactly where your package is every second.',       color: 'bg-yellow-50 text-yellow-600'  },
  { icon: Shield, title: 'Secure Payments',      desc: 'Pay safely with Razorpay. UPI, cards and wallets all supported.',                              color: 'bg-green-50 text-green-600'    },
  { icon: Clock,  title: 'Fast Delivery',        desc: 'Verified drivers ensure your package reaches its destination in the shortest time.',           color: 'bg-blue-50 text-blue-600'      },
  { icon: MapPin, title: 'Wide Coverage',        desc: 'Operating across the city with hundreds of drivers ready to pick up your package.',            color: 'bg-purple-50 text-purple-600'  },
  { icon: Users,  title: 'Verified Drivers',     desc: 'All drivers are background-verified and trained for safe, professional delivery.',             color: 'bg-orange-50 text-orange-600'  },
  { icon: Star,   title: 'Rated 4.8 out of 5',  desc: 'Thousands of happy customers trust DeliverPro for their daily delivery needs.',                color: 'bg-pink-50 text-pink-600'      },
];

const steps = [
  { step: '01', title: 'Place Order',     desc: 'Enter pickup and drop address, package weight and get an instant price estimate.'  },
  { step: '02', title: 'Driver Assigned', desc: 'Nearest available verified driver accepts your order within minutes.'              },
  { step: '03', title: 'Live Tracking',   desc: 'Track your driver in real-time on the map with live ETA updates.'                  },
  { step: '04', title: 'Delivered',       desc: 'Package delivered safely. Rate your experience and view delivery proof photo.'     },
];

const stats = [
  { value: '50,000+', label: 'Orders Delivered' },
  { value: '2,000+',  label: 'Active Drivers'   },
  { value: '4.8',     label: 'Average Rating'   },
  { value: '15 min',  label: 'Avg Pickup Time'  },
];

const customerBenefits = ['Real-time GPS tracking', 'Secure online payment', 'Live chat with driver', 'Delivery proof photo'];
const driverBenefits   = ['Flexible working hours', 'Daily earnings dashboard', 'Instant order alerts', 'Performance ratings'];

export default function HomePage() {
  const isAuthenticated = useSelector(s => s?.auth?.isAuthenticated ?? false);
  const role            = useSelector(s => s?.auth?.user?.role ?? null);
  const isInitialized   = useSelector(s => s?.auth?.isInitialized ?? false);
  const router = useRouter();

  // If already logged in — redirect to their dashboard
  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) return;
    if (role === 'admin')       router.replace('/admin/dashboard');
    else if (role === 'driver') router.replace('/driver/dashboard');
    else                        router.replace('/customer/dashboard');
  }, [isAuthenticated, role, isInitialized, router]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">

      {/* Navbar */}
      <nav className="card sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Truck className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-gray-300 text-lg">DeliverPro</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#features"     className="hover:text-gray-900 dark:text-gray-300 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-gray-900 dark:text-gray-300 transition-colors">How it works</a>
            <a href="#join"         className="hover:text-gray-900 dark:text-gray-300 transition-colors">Join as Driver</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"    className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 transition-colors">Sign in</Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-4">Get Started</Link>
            <ThemeToggle />
          </div>
           
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <CheckCircle className="h-3.5 w-3.5" />
          Trusted by 50,000+ customers across the city
        </div>
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-gray-300 leading-tight mb-6">
          Deliver Anything,{' '}
          <span className="text-primary-600">Anywhere</span>
          <br />in Minutes
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Real-time delivery platform connecting customers with verified drivers.
          Track live, pay securely, delivered fast.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <Link href="/register" className="btn-primary text-base py-3 px-8 flex items-center justify-center gap-2">
            Send a Package <ChevronRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="btn-secondary text-base py-3 px-8">
            Sign In to Track
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-50 dark:bg-primary-600/10 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-300">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="card bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-300 mb-3">Everything you need</h2>
            <p className="text-gray-500 max-w-xl mx-auto">Built for real-world delivery. From small parcels to large packages, we handle it all.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="card p-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-300 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-300 mb-3">How it works</h2>
            <p className="text-gray-500">Get your package delivered in 4 simple steps</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s) => (
              <div key={s.step}>
                <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-white font-bold text-sm">{s.step}</span>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-300 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join section */}
      <section id="join" className="card bg-gray-50 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-300 mb-3">Join DeliverPro today</h2>
            <p className="text-gray-500">Choose how you want to use the platform</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">

            <div className="card p-8 border-2 border-primary-100">
              <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center mb-5">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-300 mb-2">Send a Package</h3>
              <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                Place delivery orders, track in real-time, chat with your driver and pay securely online.
              </p>
              <ul className="space-y-2 mb-6">
                {customerBenefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm bg-primary-600 hover:bg-primary-700 text-white transition-colors">
                Start as Customer <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="card p-8 border-2 border-gray-100">
              <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center mb-5">
                <Truck className="h-6 w-6 text-gray-700" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-300 mb-2">Deliver and Earn</h3>
              <p className="text-gray-500 text-sm mb-5 leading-relaxed">
                Join our verified driver network. Accept orders on your schedule and grow your income daily.
              </p>
              <ul className="space-y-2 mb-6">
                {driverBenefits.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm bg-gray-900 dark:bg-gray-800 hover:bg-gray-800 text-white transition-colors">
                Become a Driver <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary-600 dark:bg-primary-600/20 py-16">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-primary-100 mb-8">Join thousands of customers and drivers already using DeliverPro.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register" className="bg-white text-primary-700 font-semibold py-3 px-8 rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-2">
              Create Free Account <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/login" className="border border-primary-400 text-white font-medium py-3 px-8 rounded-lg hover:bg-primary-500 transition-colors">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-primary-600 rounded-md flex items-center justify-center">
              <Truck className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-white">DeliverPro</span>
          </div>
          <p className="text-sm">2024 DeliverPro. Fast, reliable, real-time delivery.</p>
          <div className="flex gap-6 text-sm">
            <Link href="/login"    className="hover:text-white transition-colors">Login</Link>
            <Link href="/register" className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}