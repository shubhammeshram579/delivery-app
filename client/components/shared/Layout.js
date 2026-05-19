'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../../redux/slices/authSlice';
import { selectUser } from '../../redux/slices/authSlice';
import { selectUnreadCount,markAllRead,setNotifications } from '../../redux/slices/notificationSlice';
import {
  LayoutDashboard, Package, MapPin, MessageSquare, Wallet,
  Users, TrendingUp, Settings, LogOut, Bell, Menu, X,
  Truck, User, ChevronRight,
} from 'lucide-react';
import { useState,useEffect } from 'react';
import Image from 'next/image';
import NotificationDropdown from '../notificationDropdown';
import { userService } from '../../services/index';

// ── Navigation configs ────────────────────────────────────

const NAV = {
  customer: [
    { href: '/customer/dashboard',  label: 'Dashboard', icon: LayoutDashboard },
    { href: '/customer/orders',     label: 'My Orders', icon: Package },
    { href: '/customer/orders/new', label: 'New Order', icon: MapPin },
    { href: '/customer/chat',       label: 'Messages',  icon: MessageSquare },
    { href: '/customer/profile',    label: 'Profile',   icon: User },
  
  ],
  driver: [
    { href: '/driver/dashboard', label: 'Dashboard',       icon: LayoutDashboard },
    { href: '/driver/orders',    label: 'Available Orders', icon: Package },
    { href: '/driver/earnings',  label: 'Earnings',         icon: Wallet },
    { href: '/driver/chat',      label: 'Messages',         icon: MessageSquare },
    { href: '/driver/profile',   label: 'Profile',          icon: User },
   
  ],
  admin: [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users',     label: 'Users',     icon: Users },
    { href: '/admin/drivers',   label: 'Drivers',   icon: Truck },
    { href: '/admin/orders',    label: 'Orders',    icon: Package },
    { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  ],
};

// ── Sidebar ───────────────────────────────────────────────
export function Sidebar({ role }) {
  const pathname = usePathname();
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [open, setOpen] = useState(false);

  const nav = NAV[role] || NAV.customer;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">DeliverPro</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? 'text-primary-600' : 'text-gray-400'}`} />
              {label}
              {active && <ChevronRight className="h-3 w-3 ml-auto text-primary-400" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden flex-shrink-0">
            {user?.avatar
              ? <Image src={user.avatar} alt={user.name} width={32} height={32} className="object-cover" />
              : <div className="w-full h-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-semibold">{user?.name?.[0]}</div>
            }
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={() => dispatch(logoutUser())}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white border border-gray-200 rounded-lg shadow-sm"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden shadow-xl">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5 text-gray-500" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}

// ── Topbar ────────────────────────────────────────────────
// export function Topbar({ title }) {
//   const dispatch = useDispatch();
//   const unread = useSelector(selectUnreadCount);
//    const user = useSelector(selectUser);
//    const [openNotifications, setOpenNotifications] = useState(false);


//    const notifications = useSelector(
//   (state) => state.notifications.list
// );

// const [notificationList, setNotificationList] = useState(notifications);

// // sync redux notifications
// useEffect(() => {
//   setNotificationList(notifications);
// }, [notifications]);

// // mark single notification read
// const handleMarkRead = (id) => {
//   const updated = notificationList.map((n) =>
//     n.id === id
//       ? { ...n, isRead: true }
//       : n
//   );

//   setNotificationList(updated);

//   dispatch(setNotifications(updated));
// };

// // mark all notifications read
// const handleMarkAllRead = () => {
//   const updated = notificationList.map((n) => ({
//     ...n,
//     isRead: true,
//   }));

//   setNotificationList(updated);

//   dispatch(markAllRead());
// };

//     // role wise notification route
//   const notificationRoute = `/${user?.role}/notifications`;

//   return (
//     <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
//       <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
//       {/* <div className="flex items-center gap-2">
//         <Link  href={notificationRoute} className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
//           <Bell className="h-5 w-5 text-gray-600" />
//           {unread > 0 && (
//             <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
//               {unread > 9 ? '9+' : unread}
//             </span>
//           )}
//         </Link>

       
//       </div> */}

//       <div className="relative">
//       <button
//         onClick={() =>
//           setOpenNotifications((prev) => !prev)
//         }
//         className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
//       >
//         <Bell className="h-5 w-5 text-gray-600" />

//         {unread > 0 && (
//           <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
//             {unread > 9 ? '9+' : unread}
//           </span>
//         )}
//       </button>

//       <NotificationDropdown
//         open={openNotifications}
//         onClose={() => setOpenNotifications(false)}
//         notifications={notifications}
//         onMarkRead={handleMarkRead}
//         onMarkAllRead={handleMarkAllRead}
//       />
//     </div>

      
//     </header>
//   );
// }

export function Topbar({ title }) {
  const dispatch = useDispatch();

  const unread = useSelector(selectUnreadCount);

  const user = useSelector(selectUser);

  const notifications = useSelector(
    (state) => state.notifications.list
  );

  const [openNotifications, setOpenNotifications] =
    useState(false);

  const [loadingNotifications, setLoadingNotifications] =
    useState(false);

  // ================================
  // FETCH NOTIFICATIONS
  // ================================
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoadingNotifications(true);

        const res =
          await userService.getNotifications();

        const notificationData =
          res?.data?.data?.notifications || [];

        // save redux
        dispatch(
          setNotifications(notificationData)
        );

      } catch (error) {
        console.log(
          'Notification fetch error',
          error
        );
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [dispatch]);

  // ================================
  // MARK SINGLE READ
  // ================================
  const handleMarkRead = async (id) => {
    try {

      // OPTIONAL API
     await userService.markOneNotificationRead(id);

      const updated = notifications.map((n) =>
        n.id === id
          ? { ...n, isRead: true }
          : n
      );

      dispatch(setNotifications(updated));

    } catch (error) {
      console.log(error);
    }
  };

  // ================================
  // MARK ALL READ
  // ================================
  const handleMarkAllRead = async () => {
    try {

      // OPTIONAL API
      await userService.markNotificationsRead();

      const updated = notifications.map((n) => ({
        ...n,
        isRead: true,
      }));

      dispatch(setNotifications(updated));

      dispatch(markAllRead());

    } catch (error) {
      console.log(error);
    }
  };

  const handleDeleteNotification = async (id) => {
  try {

    await userService.deleteNotification(id);

    // remove from redux
    const updated = notifications.filter(
      (n) => n.id !== id
    );

    dispatch(setNotifications(updated));

  } catch (error) {
    console.log(error);
  }
};

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">

      {/* TITLE */}
      <h1 className="text-lg font-semibold text-gray-900">
        {title}
      </h1>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-2">

        {/* NOTIFICATION */}
        <div className="relative">

          <button
            onClick={() =>
              setOpenNotifications((prev) => !prev)
            }
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600" />

            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {/* DROPDOWN */}
          <NotificationDropdown
            open={openNotifications}
            onClose={() =>
              setOpenNotifications(false)
            }
            notifications={notifications}
            loading={loadingNotifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDelete={handleDeleteNotification}
          />
        </div>
      </div>
    </header>
  );
}

// ── DashboardLayout ───────────────────────────────────────
export function DashboardLayout({ children, role, title }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role} />
      <div className="lg:ml-60 flex flex-col min-h-screen">
        <Topbar title={title} />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
