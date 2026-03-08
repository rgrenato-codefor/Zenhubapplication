import { useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Bell, X, CheckCheck, CalendarDays, DollarSign,
  Users, Building2, AlertTriangle, Sparkles, CheckCircle, Clock,
} from "./icons";
import { useNotifications, type NotifVariant, type NotifIcon } from "../../hooks/useNotifications";

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<NotifIcon, React.ElementType> = {
  calendar: CalendarDays,
  dollar:   DollarSign,
  check:    CheckCircle,
  users:    Users,
  building: Building2,
  alert:    AlertTriangle,
  sparkles: Sparkles,
  clock:    Clock,
};

// ── Theme ─────────────────────────────────────────────────────────────────────

const THEME: Record<
  NotifVariant,
  {
    badge: string;
    headerBg: string;
    headerBorder: string;
    headerText: string;
    footerBg: string;
    footerBorder: string;
    panelBg: string;
    panelRing: string;
    rowBg: string;
    rowUnreadBg: string;
    titleText: string;
    subText: string;
    timeText: string;
    btnClass: string;
    emptyText: string;
    divideColor: string;
  }
> = {
  therapist: {
    badge:        "bg-violet-600",
    headerBg:     "bg-white",
    headerBorder: "border-gray-100",
    headerText:   "text-violet-700",
    footerBg:     "bg-gray-50",
    footerBorder: "border-gray-100",
    panelBg:      "bg-white",
    panelRing:    "ring-violet-100",
    rowBg:        "bg-white hover:bg-gray-50",
    rowUnreadBg:  "bg-violet-50/60 hover:bg-violet-50",
    titleText:    "text-gray-800",
    subText:      "text-gray-400",
    timeText:     "text-gray-300",
    btnClass:     "bg-violet-600 hover:bg-violet-700 text-white",
    emptyText:    "text-gray-400",
    divideColor:  "divide-gray-100",
  },
  company: {
    badge:        "bg-red-500",
    headerBg:     "bg-white",
    headerBorder: "border-gray-100",
    headerText:   "text-blue-700",
    footerBg:     "bg-gray-50",
    footerBorder: "border-gray-100",
    panelBg:      "bg-white",
    panelRing:    "ring-blue-100",
    rowBg:        "bg-white hover:bg-gray-50",
    rowUnreadBg:  "bg-blue-50/50 hover:bg-blue-50",
    titleText:    "text-gray-800",
    subText:      "text-gray-400",
    timeText:     "text-gray-300",
    btnClass:     "bg-blue-600 hover:bg-blue-700 text-white",
    emptyText:    "text-gray-400",
    divideColor:  "divide-gray-100",
  },
  admin: {
    badge:        "bg-red-500",
    headerBg:     "bg-gray-800",
    headerBorder: "border-gray-700",
    headerText:   "text-gray-100",
    footerBg:     "bg-gray-800",
    footerBorder: "border-gray-700",
    panelBg:      "bg-gray-900",
    panelRing:    "ring-gray-600",
    rowBg:        "bg-gray-900 hover:bg-gray-800",
    rowUnreadBg:  "bg-gray-800 hover:bg-gray-700",
    titleText:    "text-gray-200",
    subText:      "text-gray-500",
    timeText:     "text-gray-600",
    btnClass:     "bg-violet-600 hover:bg-violet-700 text-white",
    emptyText:    "text-gray-600",
    divideColor:  "divide-gray-700/60",
  },
  client: {
    badge:        "bg-purple-600",
    headerBg:     "bg-white",
    headerBorder: "border-gray-100",
    headerText:   "text-purple-700",
    footerBg:     "bg-gray-50",
    footerBorder: "border-gray-100",
    panelBg:      "bg-white",
    panelRing:    "ring-purple-100",
    rowBg:        "bg-white hover:bg-gray-50",
    rowUnreadBg:  "bg-purple-50/50 hover:bg-purple-50",
    titleText:    "text-gray-800",
    subText:      "text-gray-400",
    timeText:     "text-gray-300",
    btnClass:     "bg-purple-600 hover:bg-purple-700 text-white",
    emptyText:    "text-gray-400",
    divideColor:  "divide-gray-100",
  },
};

// ── Routes ────────────────────────────────────────────────────────────────────

const ALL_ROUTES: Partial<Record<NotifVariant, string>> = {
  therapist: "/terapeuta/notificacoes",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  variant: NotifVariant;
  triggerClass?: string;
  bellClass?: string;
}

export function NotificationsDropdown({
  variant,
  triggerClass = "",
  bellClass = "w-4 h-4",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { notifications, unreadCount, dismiss, markAllRead } = useNotifications(variant);
  const th = THEME[variant];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleMarkAll = () => markAllRead(notifications.map((n) => n.id));

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative ${triggerClass}`}
        aria-label="Notificações"
      >
        <Bell className={bellClass} />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-white ${th.badge}`}
            style={{ fontSize: 10, fontWeight: 700 }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* ── Panel ── */}
      {open && (
        <div
          className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl ring-1 z-[999] overflow-hidden ${th.panelBg} ${th.panelRing}`}
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b ${th.headerBg} ${th.headerBorder}`}
          >
            <div className="flex items-center gap-2">
              <Bell className={`w-4 h-4 ${th.headerText}`} />
              <span className={`text-sm ${th.headerText}`} style={{ fontWeight: 700 }}>
                Notificações
              </span>
              {unreadCount > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full text-white ${th.badge}`}
                  style={{ fontWeight: 600 }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${th.subText} hover:opacity-80`}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className={`divide-y max-h-72 overflow-y-auto ${th.divideColor}`} style={{ scrollbarWidth: "none" }}>
            {notifications.length === 0 ? (
              <div className={`px-4 py-10 text-center text-sm ${th.emptyText}`}>
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = ICON_MAP[n.icon];
                return (
                  <div
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 group transition-colors ${
                      n.read ? th.rowBg : th.rowUnreadBg
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${n.iconBg}`}
                    >
                      <Icon className={`w-4 h-4 ${n.iconColor}`} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs leading-snug ${th.titleText}`}
                        style={{ fontWeight: n.read ? 400 : 600 }}
                      >
                        {n.title}
                      </p>
                      <p className={`text-xs mt-0.5 truncate ${th.subText}`}>{n.sub}</p>
                      <p className={`text-xs mt-1 ${th.timeText}`}>{n.timeLabel}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <button
                        onClick={() => dismiss(n.id)}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity ${th.subText} hover:opacity-80`}
                        aria-label="Dispensar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      {!n.read && (
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1 ${th.badge}`} />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div
            className={`px-4 py-2.5 border-t ${th.footerBg} ${th.footerBorder}`}
          >
            <button
              onClick={() => {
                handleMarkAll();
                setOpen(false);
                const route = ALL_ROUTES[variant];
                if (route) navigate(route);
              }}
              className={`w-full py-2 rounded-xl text-xs transition-colors ${th.btnClass}`}
              style={{ fontWeight: 600 }}
            >
              Ver todas as notificações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}