"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LifeBuoy,
  Clock,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
} from "lucide-react";
import { supportService } from "../../../services/index";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

import { DashboardLayout } from "../../../components/shared/Layout";
import { useRequireAuth } from "../../../components/shared/AuthGuard";
import { LoadingSpinner } from "../../../components/ui";

const STATUS_MAP = {
  open: {
    label: "Reviewing Details",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: Clock,
  },
  in_progress: {
    label: "Admin is Working On It",
    color: "text-purple-600 bg-purple-50 border-purple-200",
    icon: AlertCircle,
  },
  waiting_on_user: {
    label: "Action Required (Check Chat)",
    color: "text-amber-600 bg-amber-50 border-amber-200",
    icon: MessageSquare,
  },
  resolved: {
    label: "Resolved",
    color: "text-green-600 bg-green-50 border-green-200",
    icon: CheckCircle2,
  },
  closed: {
    label: "Closed",
    color: "text-slate-500 bg-slate-50 border-slate-200",
    icon: CheckCircle2,
  },
};

export default function TicketStatusTracker() {
  useRequireAuth("customer"); // Adapts based on passing "customer" or "driver"

  const [activeTickets, setActiveTickets] = useState([]);
  const [pastTickets, setPastTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const syncStatuses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supportService.getTickets({ limit: 50 });
      const allTickets = res.data?.tickets || res.data?.data?.tickets || [];

      // Separate active review tracks from completed ones
      setActiveTickets(
        allTickets.filter((t) =>
          ["open", "in_progress", "waiting_on_user"].includes(t.status),
        ),
      );
      setPastTickets(
        allTickets.filter((t) => ["resolved", "closed"].includes(t.status)),
      );
    } catch {
      toast.error("Failed to sync status logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncStatuses();
  }, [syncStatuses]);

  //   if (loading) return <LoadingSpinner text="Loading orders..." />;

  return (
    <DashboardLayout role={"customer"} title="Support Requests Status">
      <div className="max-w-5xl mx-auto space-y-6 text-black">
        {/* SECTION 1: ACTIVE LIVE TRACKERS */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Under Investigation
          </h3>
          {loading ? (
            <LoadingSpinner text="Loading orders..." />
          ) : activeTickets.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 text-center shadow-xs">
              <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-800">
                All caught up!
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                You have no issues currently waiting on admin review.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeTickets.map((ticket) => {
                const config = STATUS_MAP[ticket.status] || STATUS_MAP.open;
                const StatusIcon = config.icon;

                return (
                  <div
                    key={ticket.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs relative overflow-hidden"
                  >
                    {/* Top strip branding accent */}
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          #{ticket.ticketNumber}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 pt-1">
                          {ticket.subject}
                        </h4>
                        <p className="text-xs text-slate-400">
                          Escalated{" "}
                          {formatDistanceToNow(new Date(ticket.createdAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>

                      {/* Prominent Current Status Pill */}
                      <div
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${config.color}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        {config.label}
                      </div>
                    </div>

                    {/* AI Context Summary generated during human handover */}
                    {ticket.aiSummary && (
                      <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                        <span className="font-bold block text-slate-800 mb-0.5">
                          Handover Reason:
                        </span>
                        {ticket.aiSummary}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: ARCHIVED & SOLVED ISSUES */}
        {pastTickets.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Recently Solved
            </h3>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
              {pastTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 flex justify-between items-center text-xs hover:bg-slate-50/50 transition-colors"
                >
                  <div className="min-w-0 pr-4">
                    <p className="font-semibold text-slate-800 truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-0.5">
                      Ticket #{ticket.ticketNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-slate-400">
                      {ticket.updatedAt
                        ? formatDistanceToNow(new Date(ticket.updatedAt), {
                            addSuffix: true,
                          })
                        : ""}
                    </span>
                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-lg font-medium">
                      Resolved
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
