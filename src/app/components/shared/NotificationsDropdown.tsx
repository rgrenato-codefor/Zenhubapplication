import { useState, useRef, useEffect } from "react";
import { Bell, X, CheckCheck, CalendarDays, DollarSign, Star, Users, Building2, AlertTriangle, Sparkles } from "./icons";

export type NotifVariant = "therapist" | "company" | "admin" | "client";

interface Notif {
  id: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  time: string;
  read: boolean;
}

const MOCK: Record<NotifVariant, Notif[]> = {
  therapist: [
    { id: "t1", icon: CalendarDays, iconBg: "bg-violet-100", iconColor: "text-violet-600", title: "Nova sessão agendada", sub: "Cliente Ana Souza · amanhã 14h", time: "10 min", read: false },
    { id: "t2", icon: DollarSign,   iconBg: "bg-emerald-100", iconColor: "text-emerald-600", title: "Pagamento confirmado", sub: "Massagem Relaxante · R$ 120,00", time: "2 h", read: false },
    { id: "t3", icon: Star,         iconBg: "bg-yellow-100",  iconColor: "text-yellow-600",  title: "Avaliação recebida", sub: "5 estrelas — João M.", time: "1 d", read: true },
    { id: "t4", icon: Sparkles,     iconBg: "bg-indigo-100",  iconColor: "text-indigo-600",  title: "Perfil 100% preenchido", sub: "Seu perfil público está completo!", time: "2 d", read: true },
  ],
  company: [
    { id: "c1", icon: Users,       iconBg: "bg-blue-100",    iconColor: "text-blue-600",    title: "Novo terapeuta cadastrado", sub: "Marcos Silva entrou na equipe", time: "5 min", read: false },
    { id: "c2", icon: CalendarDays, iconBg: "bg-violet-100",  iconColor: "text-violet-600",  title: "Sessão encerrada", sub: "Sala 2 · Florais — Lúcia Rocha", time: "1 h", read: false },
    { id: "c3", icon: DollarSign,   iconBg: "bg-emerald-100", iconColor: "text-emerald-600", title: "Comissão registrada", sub: "Lúcia R. · R$ 80,00 pago", time: "3 h", read: true },
    { id: "c4", icon: Star,         iconBg: "bg-yellow-100",  iconColor: "text-yellow-600",  title: "Nova avaliação recebida", sub: "⭐ 5/5 · Massagem Terapêutica", time: "1 d", read: true },
  ],
  admin: [
    { id: "a1", icon: Building2,    iconBg: "bg-violet-100",  iconColor: "text-violet-600",  title: "Nova empresa cadastrada", sub: "Espaço Serenidade acabou de entrar", time: "2 min", read: false },
    { id: "a2", icon: Users,        iconBg: "bg-blue-100",    iconColor: "text-blue-600",    title: "Novo terapeuta", sub: "Dr. João Paz · modo autônomo", time: "30 min", read: false },
    { id: "a3", icon: AlertTriangle,iconBg: "bg-red-100",     iconColor: "text-red-500",     title: "Assinatura vencida", sub: "Clínica Yoga · Plano Pro", time: "1 h", read: false },
    { id: "a4", icon: DollarSign,   iconBg: "bg-emerald-100", iconColor: "text-emerald-600", title: "Plano atualizado", sub: "Equilíbrio Studio → Plano Business", time: "1 d", read: true },
  ],
  client: [
    { id: "cl1", icon: CalendarDays, iconBg: "bg-violet-100",  iconColor: "text-violet-600",  title: "Sessão amanhã", sub: "Massagem Relaxante · 14h00", time: "30 min", read: false },
    { id: "cl2", icon: Star,          iconBg: "bg-yellow-100",  iconColor: "text-yellow-600",  title: "Avaliação respondida", sub: "Sua nota foi respondida pelo terapeuta", time: "2 h", read: true },
    { id: "cl3", icon: Sparkles,      iconBg: "bg-pink-100",    iconColor: "text-pink-600",    title: "Promoção especial", sub: "20% off na próxima sessão", time: "1 d", read: true },
  ],
};

const ACCENT: Record<NotifVariant, { ring: string; badge: string; bg: string; btn: string; header: string }> = {
  therapist: { ring: "ring-violet-200",  badge: "bg-violet-600",  bg: "bg-white",       btn: "bg-violet-600 text-white hover:bg-violet-700",      header: "text-violet-700" },
  company:   { ring: "ring-blue-200",    badge: "bg-red-500",     bg: "bg-white",       btn: "bg-blue-600 text-white hover:bg-blue-700",          header: "text-blue-700" },
  admin:     { ring: "ring-gray-600",    badge: "bg-red-500",     bg: "bg-gray-900",    btn: "bg-violet-600 text-white hover:bg-violet-700",      header: "text-gray-100" },
  client:    { ring: "ring-purple-200",  badge: "bg-purple-600",  bg: "bg-white",       btn: "bg-purple-600 text-white hover:bg-purple-700",      header: "text-purple-700" },
};

interface Props {
  variant: NotifVariant;
  /** Extra classes for the trigger button */
  triggerClass?: string;
  /** Icon class for the Bell */
  bellClass?: string;
}

export function NotificationsDropdown({ variant, triggerClass = "", bellClass = "w-4 h-4" }: Props) {
  const [open, setOpen]   = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>(MOCK[variant]);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifs.filter((n) => !n.read).length;

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const markAllRead = () => setNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  const dismiss = (id: string) => setNotifs((prev) => prev.filter((n) => n.id !== id));

  const ac = ACCENT[variant];
  const isAdmin = variant === "admin";

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative ${triggerClass}`}
        aria-label="Notificações"
      >
        <Bell className={bellClass} />
        {unread > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full text-white ${ac.badge}`}
            style={{ fontSize: 10, fontWeight: 700 }}
          >
            {unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-2xl ring-1 z-[999] overflow-hidden ${ac.ring} ${ac.bg}`}
          style={{ minWidth: 300 }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isAdmin ? "border-gray-700 bg-gray-800" : "border-gray-100"}`}>
            <div className="flex items-center gap-2">
              <Bell className={`w-4 h-4 ${ac.header}`} />
              <span className={`text-sm ${ac.header}`} style={{ fontWeight: 700 }}>Notificações</span>
              {unread > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full text-white ${ac.badge}`} style={{ fontWeight: 600 }}>
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${isAdmin ? "text-gray-400 hover:text-gray-200 hover:bg-gray-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"}`}
              >
                <CheckCheck className="w-3.5 h-3.5" /> Marcar lidas
              </button>
            )}
          </div>

          {/* List */}
          <div className="divide-y max-h-72 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {notifs.length === 0 ? (
              <div className={`px-4 py-8 text-center text-sm ${isAdmin ? "text-gray-500" : "text-gray-400"}`}>
                Nenhuma notificação
              </div>
            ) : notifs.map((n) => {
              const Icon = n.icon;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 group transition-colors ${
                    n.read
                      ? isAdmin ? "bg-gray-900" : "bg-white"
                      : isAdmin ? "bg-gray-800/80" : "bg-violet-50/50"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${n.iconBg}`}>
                    <Icon className={`w-4 h-4 ${n.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${isAdmin ? "text-gray-200" : "text-gray-800"} ${!n.read ? "" : ""}`} style={{ fontWeight: n.read ? 400 : 600 }}>
                      {n.title}
                    </p>
                    <p className={`text-xs mt-0.5 truncate ${isAdmin ? "text-gray-500" : "text-gray-400"}`}>{n.sub}</p>
                    <p className={`text-xs mt-1 ${isAdmin ? "text-gray-600" : "text-gray-300"}`}>{n.time} atrás</p>
                  </div>
                  <button
                    onClick={() => dismiss(n.id)}
                    className={`opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 ${isAdmin ? "text-gray-600 hover:text-gray-400" : "text-gray-300 hover:text-gray-500"}`}
                    aria-label="Dispensar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {!n.read && (
                    <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${ac.badge}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className={`px-4 py-2.5 border-t ${isAdmin ? "border-gray-700 bg-gray-800" : "border-gray-100 bg-gray-50"}`}>
            <button
              onClick={() => { markAllRead(); setOpen(false); }}
              className={`w-full py-2 rounded-xl text-xs transition-colors ${ac.btn}`}
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
