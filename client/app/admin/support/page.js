"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  LifeBuoy,
  ChevronRight,
  ArrowLeft,
  UserPlus,
  Send,
} from "lucide-react";
import { supportService } from "../../../services/index";
import { useSocket } from "../../../hooks/useSocket";
import { LoadingSpinner } from "../../../components/ui";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";

import { useRequireAuth } from "../../../components/shared/AuthGuard";
import { DashboardLayout } from "../../../components/shared/Layout";

const PRIORITY_STYLE = {
  critical: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  high: { bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  normal: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  low: { bg: "bg-gray-100", text: "text-gray-600", dot: "bg-gray-400" },
};

const STATUS_LABEL = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_user: "Waiting on User",
  resolved: "Resolved",
  closed: "Closed",
};

// ==========================================
// MAIN EXPORT PAGE
// ==========================================
export default function AdminSupportPage() {
  useRequireAuth("admin");
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  const { socket } = useSocket();

  const queryFilters = useMemo(
    () => ({
      status: statusFilter,
      priority: priorityFilter,
    }),
    [statusFilter, priorityFilter],
  );

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsRes, statsRes] = await Promise.all([
        supportService.getTickets({ limit: 50, ...queryFilters }),
        supportService.getStats(),
      ]);
      setTickets(
        ticketsRes.data?.data?.tickets || ticketsRes.data?.tickets || [],
      );
      setStats(statsRes.data?.data || statsRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [queryFilters]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Real-time new ticket alerts
  useEffect(() => {
    if (!socket?.current) return;
    socket.current.emit("support:admin:subscribe");

    const handler = (data) => {
      toast(`New ${data.priority} ticket: ${data.subject}`, {
        icon:
          data.priority === "critical"
            ? "🔴"
            : data.priority === "high"
              ? "🟠"
              : "🟡",
        duration: 6000,
      });
      loadTickets();
    };

    socket.current.on("support:new-ticket", handler);
    return () => {
      socket.current?.off("support:new-ticket", handler);
    };
  }, [socket, loadTickets]);

  return (
    <DashboardLayout role="admin" title="Support Center">
      {selectedId ? (
        // Render Details inside the exact same Layout
        <TicketDetail
          ticketId={selectedId}
          onBack={() => {
            setSelectedId(null);
            loadTickets();
          }}
        />
      ) : (
        // Otherwise render main Ticket List
        <div className="space-y-5">
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <StatCard label="Open" value={stats.open} color="blue" />
              <StatCard
                label="In Progress"
                value={stats.inProgress}
                color="purple"
              />
              <StatCard label="Waiting" value={stats.waiting} color="yellow" />
              <StatCard label="Critical" value={stats.critical} color="red" />
              <StatCard label="High" value={stats.high} color="orange" />
              <StatCard
                label="Resolved (7d)"
                value={stats.resolvedThisWeek}
                color="green"
              />
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field w-auto text-sm"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-field w-auto text-sm"
            >
              <option value="">All Priority</option>
              {["critical", "high", "normal", "low"].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <LoadingSpinner text="Loading tickets..." />
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center">
                <LifeBuoy className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-400">No tickets found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {tickets.map((t) => {
                  const p = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.normal;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 dark:hover:bg-gray-800 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.dot}`}
                      />
                      <div className="w-9 h-9 dark:bg-primary-600/20 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold flex-shrink-0">
                        {t.user?.name?.[0] || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-400 truncate">
                            {t.subject}
                          </p>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold dark:bg-primary-600/20 uppercase ${p.bg} ${p.text}`}
                          >
                            {t.priority}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.user?.name} ({t.userType}) · #{t.ticketNumber} ·{" "}
                          {t.createdAt
                            ? formatDistanceToNow(new Date(t.createdAt), {
                                addSuffix: true,
                              })
                            : ""}
                        </p>
                      </div>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-primary-600/20 dark:text-gray-400 rounded-full text-gray-600 flex-shrink-0">
                        {STATUS_LABEL[t.status] || t.status}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================
function StatCard({ label, value, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-700/20",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-700/20",
    yellow: "bg-yellow-50 text-yellow-700 dark:bg-yellow-700/20",
    red: "bg-red-50 text-red-700 dark:bg-red-700/20",
    orange: "bg-orange-50 text-orange-700 dark:bg-orange-700/20",
    green: "bg-green-50 text-green-700 dark:bg-green-700/20",
  };
  return (
    <div className={`rounded-xl p-3 ${colors[color]}`}>
      <p className="text-xl font-bold">{value ?? 0}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}

function TicketDetail({ ticketId, onBack }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { socket } = useSocket();
  const endRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supportService.getTicketById(ticketId);
      const ticketData = res.data?.data?.ticket || res.data?.ticket;
      setTicket(ticketData);
      setMessages(ticketData?.messages || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Real-time messages sync
  useEffect(() => {
    if (!socket?.current) return;
    socket.current.emit("support:join", { ticketId });

    const handler = (msg) => {
      if (String(msg.ticketId) !== String(ticketId)) return;
      setMessages((prev) => {
        const checkExists = prev.some(
          (m) => m.id === msg.id || (m.tempId && m.tempId === msg.tempId),
        );
        if (checkExists) return prev;
        return [...prev, msg];
      });
    };

    socket.current.on("support:message", handler);
    return () => {
      socket.current?.off("support:message", handler);
      socket.current?.emit("support:leave", { ticketId });
    };
  }, [ticketId, socket]);

  const send = async () => {
    if (!input.trim()) return;
    const currentText = input;
    setInput("");
    setSending(true);

    const tempId = `temp-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        tempId,
        senderType: "admin",
        message: currentText,
        createdAt: new Date(),
      },
    ]);

    try {
      if (socket?.current?.connected) {
        socket.current.emit("support:message", {
          ticketId,
          message: currentText,
          senderType: "admin",
          tempId,
        });
      } else {
        await supportService.replyToTicket(ticketId, currentText);
      }
    } catch (err) {
      console.error(err);
      toast.error("Message delivery failed");
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const assignToMe = async () => {
    try {
      await supportService.assignTicket(ticketId);
      toast.success("Ticket assigned to you");
      load();
    } catch {
      toast.error("Failed to assign");
    }
  };

  const updateStatus = async (status) => {
    try {
      await supportService.updateTicket(ticketId, { status });
      toast.success(`Marked as ${STATUS_LABEL[status]}`);
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  const updatePriority = async (priority) => {
    try {
      await supportService.updateTicket(ticketId, { priority });
      toast.success("Priority updated");
      load();
    } catch {
      toast.error("Failed to update");
    }
  };

  if (loading) return <LoadingSpinner text="Loading ticket..." />;
  if (!ticket) return null;

  const p = PRIORITY_STYLE[ticket.priority] || PRIORITY_STYLE.normal;

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div
        className="lg:col-span-2 card flex flex-col"
        style={{ height: "600px" }}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-gray-100 rounded-lg "
          >
            <ArrowLeft className="h-4 w-4 text-gray-500" />
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-300">
              {ticket.subject}
            </p>
            <p className="text-xs text-gray-400">#{ticket.ticketNumber}</p>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.bg} ${p.text}`}
          >
            {ticket.priority}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50 dark:bg-gray-900">
          {ticket.aiSummary && (
            <div className="p-3 bg-blue-50  border border-blue-100 rounded-lg text-xs text-blue-700">
              <p className="font-semibold mb-1">AI Summary</p>
              {ticket.aiSummary}
            </div>
          )}
          {messages.map((m, i) => (
            <div
              key={m.id || i}
              className={`flex ${m.senderType === "admin" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm ${
                  m.senderType === "admin"
                    ? "bg-primary-600 text-white rounded-tr-sm"
                    : m.senderType === "ai"
                      ? "bg-purple-50 text-purple-800 border border-purple-100 rounded-tl-sm"
                      : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                }`}
              >
                {m.senderType !== "admin" && (
                  <p className="text-[10px] font-semibold opacity-60 mb-0.5 uppercase">
                    {m.senderType}
                  </p>
                )}
                {m.message}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())
            }
            placeholder="Type your reply..."
            className="input-field flex-1 text-sm"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="btn-primary px-4 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-3">
            Ticket Info
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Customer/Driver</p>
              <p className="font-medium">
                {ticket.user?.name} ({ticket.userType})
              </p>
              <p className="text-xs text-gray-500">{ticket.user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Category</p>
              <p className="capitalize">{ticket.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Source</p>
              <p>
                {ticket.source === "ai_escalated"
                  ? "🤖 AI Escalated"
                  : "👤 User Initiated"}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Assigned To</p>
              <p>{ticket.assignedAdmin?.name || "Unassigned"}</p>
            </div>
          </div>

          {!ticket.assignedAdmin && (
            <button
              onClick={assignToMe}
              className="btn-secondary w-full mt-4 text-sm flex items-center justify-center gap-2"
            >
              <UserPlus className="h-3.5 w-3.5" /> Assign to Me
            </button>
          )}
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-3">
            Update Priority
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {["low", "normal", "high", "critical"].map((pr) => (
              <button
                key={pr}
                onClick={() => updatePriority(pr)}
                className={`text-xs py-2 rounded-lg font-medium capitalize dark:border-gray-700 border-2 transition-colors ${
                  ticket.priority === pr
                    ? `${PRIORITY_STYLE[pr].bg} ${PRIORITY_STYLE[pr].text} border-current`
                    : "border-gray-200 text-gray-500"
                }`}
              >
                {pr}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-3">
            Update Status
          </h3>
          <div className="space-y-2">
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <button
                key={k}
                onClick={() => updateStatus(k)}
                className={`w-full text-left text-xs py-2 px-3 rounded-lg transition-colors ${
                  ticket.status === k
                    ? "bg-primary-50 text-primary-700 font-medium"
                    : "hover:bg-gray-50 text-gray-600"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
