"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../redux/slices/authSlice";
import { selectUser } from "../../redux/slices/authSlice";
import {
  selectUnreadCount,
  markAllRead,
  setNotifications,
} from "../../redux/slices/notificationSlice";
import {
  LayoutDashboard,
  Package,
  MapPin,
  MessageSquare,
  Wallet,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  Bell,
  Menu,
  X,
  Truck,
  User,
  ChevronRight,
  LifeBuoy,
  PlusCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import Image from "next/image";
import NotificationDropdown from "../notificationDropdown";
import { userService } from "../../services/index";
import SupportWidget from "../support/SupportWidget";
import AIAdminAssistant from "../ai/AIAdminAssistant";
import ThemeToggle from "./ThemeToggle";

// ── Navigation configs ────────────────────────────────────

const NAV = {
  customer: [
    { href: "/customer/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customer/orders", label: "My Orders", icon: Package },
    { href: "/customer/orders/new", label: "New Order", icon: PlusCircle },
    { href: "/customer/support", label: "Support", icon: LifeBuoy },
    { href: "/customer/profile", label: "Profile", icon: User },
  ],
  driver: [
    { href: "/driver/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/driver/orders", label: "Available", icon: Package },
    { href: "/driver/earnings", label: "Earnings", icon: Wallet },
    { href: "/driver/support", label: "Support", icon: LifeBuoy },
    { href: "/driver/profile", label: "Profile", icon: User },
  ],
  admin: [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/drivers", label: "Drivers", icon: Truck },
    { href: "/admin/orders", label: "Orders", icon: Package },
    { href: "/admin/support", label: "Support", icon: LifeBuoy },
  ],
};

// ── Bottom Navigation for Mobile (Customer & Driver) ──────
export function BottomNav({ role }) {
  const pathname = usePathname();
  const nav = NAV[role] || NAV.customer;

  // Don't render bottom navigation for admins on mobile
  if (role === "admin") return null;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 px-2 py-1 pb-safe shadow-lg">
      <div className="flex items-center justify-around">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== `/${role}/dashboard` && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[64px] rounded-xl transition-all duration-200 ${
                active
                  ? "text-primary-600 dark:text-primary-400 font-semibold"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`h-5 w-5 transition-transform duration-200 ${
                    active ? "scale-110 text-primary-600 dark:text-primary-400" : ""
                  }`}
                />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-600 dark:bg-primary-400 rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-1 truncate max-w-[68px]">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

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
      <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100 text-lg">
            DeliverPro
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
              {label}
              {active && (
                <ChevronRight className="h-3 w-3 ml-auto text-primary-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
            {user?.avatar ? (
              <Image
                src={user.avatar}
                alt={user.name}
                width={32}
                height={32}
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-primary-100 dark:bg-primary-500/20 flex items-center justify-center text-primary-700 dark:text-primary-400 text-sm font-semibold">
                {user?.name?.[0]}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {user?.role}
            </p>
          </div>
        </div>
        <button
          onClick={() => dispatch(logoutUser())}
          className="w-full flex items-center gap-3 mb-14 sm:mb-0 px-3 py-2.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
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
      <aside className="hidden lg:flex flex-col w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile toggle (Only shown for Admin or if Drawer is preferred) */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-3 left-4 z-40 p-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border border-gray-200 dark:border-gray-800 rounded-lg shadow-sm"
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Mobile drawer */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-900 z-50 lg:hidden shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </button>
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}

// ── Topbar ───────────────────────────────────────────────
export function Topbar({ title }) {
  const dispatch = useDispatch();
  const router = useRouter();

  const unread = useSelector(selectUnreadCount);
  const user = useSelector(selectUser);
  const notifications = useSelector((state) => state.notifications.list);

  const [openNotifications, setOpenNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoadingNotifications(true);
        const res = await userService.getNotifications();
        const notificationData = res?.data?.data?.notifications || [];
        dispatch(setNotifications(notificationData));
      } catch (error) {
        console.log("Notification fetch error", error);
      } finally {
        setLoadingNotifications(false);
      }
    };

    fetchNotifications();
  }, [dispatch]);

  const handleMarkRead = async (id) => {
    try {
      await userService.markOneNotificationRead(id);
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      dispatch(setNotifications(updated));
    } catch (error) {
      console.log(error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
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
      const updated = notifications.filter((n) => n.id !== id);
      dispatch(setNotifications(updated));
    } catch (error) {
      console.log(error);
    }
  };

  const handleNotificationNavigation = (notification) => {
    handleMarkRead(notification.id);
    const role = user?.role;
    const type = notification?.type?.toLowerCase();
    const data = notification?.data || {};

    switch (type) {
      case "support":
        router.push(`/${role}/support`);
        break;

      case "system":
        if (role === "admin") {
          router.push("/admin/drivers");
        } else {
          router.push(`/${role}/dashboard`);
        }
        break;

      case "chat":
        if (data.orderId) {
          if (role === "admin") {
            router.push(`/admin/orders`);
          } else {
            router.push(`/${role}/orders/${data.orderId}`);
          }
        } else {
          router.push(`/${role}/dashboard`);
        }
        break;

      case "order":
      case "payment":
        if (role === "driver" && data.orderId) {
          router.push(`/driver/orders/${data.orderId}`);
        } else if (role === "customer" && data.orderId) {
          router.push(`/customer/orders/${data.orderId}`);
        } else if (role === "admin") {
          router.push(`/admin/orders`);
        } else {
          router.push(`/${role}/orders`);
        }
        break;

      default:
        router.push(`/${role}/dashboard`);
        break;
    }
  };

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6 pl-14 lg:pl-6 sticky top-0 z-20">
      {/* TITLE */}
      <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h1>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-1">
        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setOpenNotifications((prev) => !prev)}
            className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />

            {unread > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          <NotificationDropdown
            open={openNotifications}
            onClose={() => setOpenNotifications(false)}
            notifications={notifications}
            loading={loadingNotifications}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onDelete={handleDeleteNotification}
            onOpenNotification={handleNotificationNavigation}
          />
        </div>
      </div>
    </header>
  );
}

// ── DashboardLayout ───────────────────────────────────────
export function DashboardLayout({ children, role, title }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar role={role} />

      {/* pb-20 on mobile prevents content from being hidden behind the bottom bar */}
      <div className="lg:ml-60 flex flex-col min-h-screen pb-20 lg:pb-0">
        <Topbar title={title} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Floating Support or AI Assistant */}
      <div className="mb-14 lg:mb-0">
        {role === "admin" ? <AIAdminAssistant /> : <SupportWidget />}
      </div>

      {/* App-like Bottom Navigation */}
      <BottomNav role={role} />
    </div>
  );
}
