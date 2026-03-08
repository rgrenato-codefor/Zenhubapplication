import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Bell, CheckCheck, X, CalendarDays, DollarSign,
  CheckCircle, AlertCircle, Sparkles, Clock, AlertTriangle,
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

// ── Category filters ──────────────────────────────────────────────────────────

type Category = "all" | "unread" | "agenda" | "financeiro" | "alertas";

const CATEGORIES: { id: Category; label: string; icons?: NotifIcon[] }[] = [
  { id: "all",        label: "Todas" },
  { id: "unread",     label: "Não lidas" },
  { id: "agenda",     label: "Agenda",     icons: ["calendar", "clock", "check"] },
  { id: "financeiro", label: "Financeiro", icons: ["dollar"] },
  { id: "alertas",    label: "Alertas",    icons: ["alert", "sparkles", "users", "building"] },
];

// ── Relative date section header ──────────────────────────────────────────────

function sectionLabel(sortKey: number): string {
  const now = Date.now();
  const diff = now - sortKey;
  const diffH = diff / 3600000;
  const diffD = diff / 86400000;
  if (diffH < 0)     return "Em breve";
  if (diffH < 1)     return "Agora há pouco";
  if (diffH < 24)    return "Hoje";
  if (diffD < 2)     return "Ontem";
  if (diffD < 7)     return "Esta semana";
  return "Mais antigas";
}

const SECTION_ORDER = ["Em breve", "Agora há pouco", "Hoje", "Ontem", "Esta semana", "Mais antigas"];

// ── Component ─────────────────────────────────────────────────────────────────

export default function TherapistNotifications() {
  const navigate = useNavigate();
  const { notifications, unreadCount, dismiss, markAllRead } = useNotifications("therapist");

  const [activeCategory, setActiveCategory] = useState<Category>("all");

  // Filter by category
  const filtered = useMemo(() => {
    const cat = CATEGORIES.find((c) => c.id === activeCategory)!;
    return notifications.filter((n) => {
      if (activeCategory === "all")    return true;
      if (activeCategory === "unread") return !n.read;
      return cat.icons?.includes(n.icon) ?? true;
    });
  }, [notifications, activeCategory]);

  // Group by section label
  const grouped = useMemo(() => {
    const map: Record<string, AppNotification[]> = {};
    filtered.forEach((n) => {
      const label = sectionLabel(n.sortKey);
      if (!map[label]) map[label] = [];
      map[label].push(n);
    });
    return SECTION_ORDER.filter((s) => map[s]).map((s) => ({ section: s, items: map[s] }));
  }, [filtered]);

  const handleMarkAll = () => markAllRead(notifications.map((n) => n.id));
  const handleMarkOne = (id: string) => markAllRead([id]);

  // Count per category
  const countFor = (cat: Category) => {
    const def = CATEGORIES.find((c) => c.id === cat)!;
    return notifications.filter((n) => {
      if (cat === "all")    return true;
      if (cat === "unread") return !n.read;
      return def.icons?.includes(n.icon) ?? true;
    }).length;
  };

  return (
    <div className="space-y-5 pb-6">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 rounded-lg bg-white border border-violet-100 flex items-center justify-center text-gray-400 hover:text-violet-600 hover:border-violet-300 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-gray-900" style={{ fontWeight: 700 }}>Notificações</h1>
            {unreadCount > 0 && (
              <span
                className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-violet-600 text-white"
                style={{ fontSize: 11, fontWeight: 700 }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-gray-400 text-xs mt-0.5">
            {notifications.length} notificaç{notifications.length !== 1 ? "ões" : "ão"} no total
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs hover:bg-violet-100 transition-colors"
            style={{ fontWeight: 600 }}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas
          </button>
        )}
      </div>

      {/* ── Category tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {CATEGORIES.map((cat) => {
          const count = countFor(cat.id);
          const active = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border ${
                active
                  ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                  : "bg-white text-gray-500 border-gray-200 hover:border-violet-300 hover:text-violet-600"
              }`}
              style={{ fontWeight: active ? 600 : 400 }}
            >
              {cat.label}
              {count > 0 && (
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-4 px-1 rounded-full ${
                    active ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
                  }`}
                  style={{ fontSize: 10, fontWeight: 600 }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Notification list ─────────────────────────────────────────── */}
      {grouped.length === 0 ? (
        <div className="bg-white rounded-2xl border border-violet-100 p-10 flex flex-col items-center text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
            <Bell className="w-7 h-7 text-violet-200" />
          </div>
          <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>
            Nenhuma notificação
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {activeCategory !== "all"
              ? "Tente outro filtro para ver mais."
              : "Tudo em dia por aqui!"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ section, items }) => (
            <div key={section}>
              {/* Section divider */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-xs text-gray-400" style={{ fontWeight: 600 }}>{section}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Cards */}
              <div className="bg-white rounded-2xl border border-violet-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {items.map((n) => {
                  const Icon = ICON_MAP[n.icon];
                  return (
                    <div
                      key={n.id}
                      className={`group flex items-start gap-3 p-4 transition-colors cursor-pointer ${
                        n.read ? "hover:bg-gray-50" : "bg-violet-50/40 hover:bg-violet-50"
                      }`}
                      onClick={() => !n.read && handleMarkOne(n.id)}
                    >
                      {/* Unread dot */}
                      <div className="flex flex-col items-center gap-1 mt-1 shrink-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${n.iconBg}`}>
                          <Icon className={`w-4 h-4 ${n.iconColor}`} />
                        </div>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm text-gray-900 leading-snug"
                          style={{ fontWeight: n.read ? 400 : 600 }}
                        >
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.sub}</p>
                        <p className="text-xs text-gray-300 mt-1">{n.timeLabel}</p>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-gray-500 mt-0.5 shrink-0 p-0.5 rounded"
                        aria-label="Dispensar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer action ─────────────────────────────────────────────── */}
      {notifications.length > 0 && (
        <button
          onClick={() => {
            markAllRead(notifications.map((n) => n.id));
          }}
          className="w-full py-3 rounded-2xl border border-violet-100 bg-white text-violet-600 text-sm hover:bg-violet-50 transition-colors shadow-sm"
          style={{ fontWeight: 600 }}
        >
          Marcar todas como lidas
        </button>
      )}
    </div>
  );
}
