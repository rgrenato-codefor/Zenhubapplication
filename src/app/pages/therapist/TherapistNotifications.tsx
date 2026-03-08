import { useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Bell, CheckCheck, X, CalendarDays, DollarSign,
  CheckCircle, AlertTriangle, Sparkles, Clock,
  Building2, Users, ChevronLeft,
} from "../../components/shared/icons";
import { useNotifications, type AppNotification, type NotifIcon } from "../../hooks/useNotifications";

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

// ── Time grouping (Instagram-style) ──────────────────────────────────────────

type Group = { label: string; items: AppNotification[] };

function groupByTime(notifications: AppNotification[]): Group[] {
  const now = Date.now();
  const H = 3600000;
  const D = 86400000;

  const groups: { key: string; label: string; maxAge: number }[] = [
    { key: "agora",    label: "Agora",        maxAge: H },
    { key: "hoje",     label: "Hoje",         maxAge: D },
    { key: "semana",   label: "Esta semana",  maxAge: 7 * D },
    { key: "anterior", label: "Anteriores",   maxAge: Infinity },
  ];

  const buckets: Record<string, AppNotification[]> = {};
  notifications.forEach((n) => {
    const age = Math.max(0, now - n.sortKey); // future items → age 0
    const group = groups.find((g) => age < g.maxAge) ?? groups[groups.length - 1];
    if (!buckets[group.key]) buckets[group.key] = [];
    buckets[group.key].push(n);
  });

  return groups
    .filter((g) => buckets[g.key]?.length)
    .map((g) => ({ label: g.label, items: buckets[g.key] }));
}

// ── Row component ─────────────────────────────────────────────────────────────

function NotifRow({
  n,
  onRead,
  onDismiss,
}: {
  n: AppNotification;
  onRead: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const Icon = ICON_MAP[n.icon];

  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-3.5 transition-colors cursor-pointer group ${
        n.read ? "bg-white" : "bg-violet-50/50"
      }`}
      onClick={() => !n.read && onRead(n.id)}
    >
      {/* Icon bubble */}
      <div className={`relative w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${n.iconBg}`}>
        <Icon className={`w-5 h-5 ${n.iconColor}`} />
        {!n.read && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-violet-600 border-2 border-white" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${n.read ? "text-gray-700" : "text-gray-900"}`}
          style={{ fontWeight: n.read ? 400 : 600 }}
        >
          {n.title}{" "}
          <span className="text-gray-500" style={{ fontWeight: 400 }}>
            {n.sub}
          </span>
        </p>
        <p className="text-xs text-violet-400 mt-0.5">{n.timeLabel}</p>
      </div>

      {/* Dismiss — visible on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-gray-100 text-gray-300 hover:text-gray-500 shrink-0"
        aria-label="Dispensar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TherapistNotifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, dismiss, markAllRead } = useNotifications("therapist");

  const groups = useMemo(() => groupByTime(notifications), [notifications]);

  const handleMarkAll  = () => markAllRead(notifications.map((n) => n.id));
  const handleMarkOne  = (id: string) => markAllRead([id]);

  return (
    <div className="max-w-lg mx-auto space-y-0 pb-8">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between py-4 px-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Notificações</h1>
              {unreadCount > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-violet-600 text-white"
                  style={{ fontSize: 11, fontWeight: 700 }}
                >
                  {unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 text-violet-500 hover:text-violet-700 transition-colors text-sm"
            style={{ fontWeight: 600 }}
          >
            <CheckCheck className="w-4 h-4" />
            Marcar todas
          </button>
        )}
      </div>

      {/* ── Notification feed ───────────────────────────────────────────── */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="w-16 h-16 rounded-full bg-violet-50 flex items-center justify-center mb-4">
            <Bell className="w-7 h-7 text-violet-200" />
          </div>
          <p className="text-gray-500" style={{ fontWeight: 600 }}>Sem notificações</p>
          <p className="text-gray-400 text-sm mt-1">Tudo em dia por aqui!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(({ label, items }) => (
            <div key={label}>
              {/* Section label */}
              <p
                className="text-xs text-gray-400 px-1 pb-1.5 pt-1"
                style={{ fontWeight: 600 }}
              >
                {label}
              </p>

              {/* Cards — rounded container like Instagram */}
              <div className="bg-white rounded-2xl overflow-hidden divide-y divide-gray-50 border border-gray-100">
                {items.map((n) => (
                  <NotifRow
                    key={n.id}
                    n={n}
                    onRead={handleMarkOne}
                    onDismiss={dismiss}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Mark all read footer */}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="w-full py-3 rounded-2xl bg-white border border-gray-100 text-violet-500 text-sm hover:bg-violet-50 transition-colors"
              style={{ fontWeight: 600 }}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
      )}
    </div>
  );
}
