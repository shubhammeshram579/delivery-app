"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Bell,
  Package,
  CreditCard,
  MessageSquare,
  Info,
  CheckCheck,
  Trash2,
} from "lucide-react";

import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG = {
  order: {
    icon: Package,
    bg: "bg-blue-50",
    color: "text-blue-600",
    label: "Orders",
  },

  payment: {
    icon: CreditCard,
    bg: "bg-green-50",
    color: "text-green-600",
    label: "Payments",
  },

  chat: {
    icon: MessageSquare,
    bg: "bg-purple-50",
    color: "text-purple-600",
    label: "Chats",
  },

  system: {
    icon: Info,
    bg: "bg-gray-50",
    color: "text-gray-600",
    label: "System",
  },
};

const FILTERS = ["all", "unread", "order", "payment", "chat", "system"];

export default function NotificationDropdown({
  open,
  onClose,
  notifications = [],
  onMarkRead,
  onMarkAllRead,
  onDelete,
}) {
  const ref = useRef();

  const [filter, setFilter] = useState("all");

  // close outside
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  // filtered notifications
  const filteredNotifications = useMemo(() => {
    if (filter === "all") return notifications;

    if (filter === "unread") {
      return notifications.filter((n) => !n.isRead);
    }

    return notifications.filter((n) => n.type === filter);
  }, [filter, notifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!open) return null;

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={onClose}
      />

      <div
        ref={ref}
        className="
          fixed lg:absolute
          top-16 right-2 lg:right-0
          w-[95%] sm:w-[420px]
          max-h-[85vh]
          bg-white
          rounded-2xl
          shadow-2xl
          border border-gray-200
          z-50
          flex flex-col
          overflow-hidden
        "
      >
        {/* Header */}
        <div className="px-4 py-3 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gray-700" />

              <h2 className="font-semibold text-gray-900">Notifications</h2>

              {unreadCount > 0 && (
                <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mt-4 overflow-x-auto scrollbar-hide">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors capitalize ${
                  filter === f
                    ? "bg-primary-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "unread" ? `Unread (${unreadCount})` : f}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotifications.length === 0 ? (
            <div className="py-14 text-center">
              <Bell className="w-10 h-10 text-gray-300 mx-auto mb-3" />

              <p className="text-sm font-medium text-gray-700">
                No notifications
              </p>

              <p className="text-xs text-gray-400 mt-1">You're all caught up</p>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;

              const Icon = cfg.icon;

              return (
                <div
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className={`flex gap-3 px-4 py-4 border-b cursor-pointer transition-colors ${
                    !n.isRead
                      ? "bg-blue-50/40 hover:bg-blue-50/60"
                      : "hover:bg-gray-50"
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}
                  >
                    <Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {n.title}
                        </p>

                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                          {n.body}
                        </p>
                      </div>

                      {/* {!n.isRead && (
                        <div className="w-2 h-2 rounded-full bg-primary-600 mt-2 flex-shrink-0" />
                      )} */}

                      <div className="flex items-center gap-2">
                        {!n.isRead && (
                          <div className="w-2 h-2 rounded-full bg-primary-600 flex-shrink-0" />
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();

                            onDelete(n.id);
                          }}
                          className="p-1 hover:bg-red-50 rounded-md transition-colors group"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.bg} ${cfg.color}`}
                      >
                        {cfg.label}
                      </span>

                      <span className="text-[11px] text-gray-400">
                        {formatDistanceToNow(new Date(n.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
