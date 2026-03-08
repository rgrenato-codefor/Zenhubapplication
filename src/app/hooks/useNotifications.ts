/**
 * useNotifications — derives real notifications from DataContext data.
 * No mock/static content; everything is derived from appointments,
 * session records, therapists, clients and admin platform lists.
 */
import { useMemo, useState, useCallback } from "react";
import { useData } from "../context/DataContext";

export type NotifIcon =
  | "calendar"
  | "dollar"
  | "check"
  | "users"
  | "building"
  | "alert"
  | "sparkles"
  | "clock";

export interface AppNotification {
  id: string;
  icon: NotifIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  sub: string;
  timeLabel: string; // "14h30", "amanhã 10h", "há 2 h"…
  read: boolean;
  sortKey: number; // unix ms for ordering
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function tomorrowStr() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function sevenDaysAgoStr() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function fmtDate(dateStr: string) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

function timeAgo(dateStr: string, timeStr?: string): string {
  const now = Date.now();
  const dt = new Date(timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00`);
  const diff = now - dt.getTime();
  if (diff < 0) {
    // future
    const min = Math.abs(Math.floor(diff / 60000));
    const h = Math.floor(min / 60);
    const d = Math.floor(h / 24);
    if (d > 0) return `em ${d} d`;
    if (h > 0) return `em ${h} h`;
    return `em ${min} min`;
  }
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min atrás`;
  if (h < 24) return `${h} h atrás`;
  if (d === 1) return "ontem";
  if (d < 7) return `${d} d atrás`;
  return `${Math.floor(d / 7)} sem atrás`;
}

function whenLabel(dateStr: string, timeStr: string): string {
  const td = todayStr();
  const tm = tomorrowStr();
  if (dateStr === td) return `hoje ${timeStr}`;
  if (dateStr === tm) return `amanhã ${timeStr}`;
  return `${fmtDate(dateStr)} ${timeStr}`;
}

function sortKey(dateStr: string, timeStr?: string): number {
  return new Date(timeStr ? `${dateStr}T${timeStr}:00` : `${dateStr}T00:00:00`).getTime();
}

function fmtBRL(n: number) {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export type NotifVariant = "therapist" | "company" | "admin" | "client";

export function useNotifications(variant: NotifVariant) {
  const data = useData();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
  }, []);

  const markAllRead = useCallback((ids: string[]) => {
    setReadIds((prev) => new Set([...prev, ...ids]));
  }, []);

  const raw = useMemo((): AppNotification[] => {
    const td = todayStr();
    const tm = tomorrowStr();
    const sevenAgo = sevenDaysAgoStr();
    const notifs: AppNotification[] = [];

    // ── THERAPIST ────────────────────────────────────────────────────────────
    if (variant === "therapist") {
      const therapistId = data.myTherapist?.id;
      const myApps = data.appointments.filter((a) => a.therapistId === therapistId);

      // 1. Upcoming sessions (today + tomorrow first)
      let upcoming = myApps
        .filter(
          (a) =>
            (a.date === td || a.date === tm) &&
            a.status !== "cancelled" &&
            a.status !== "completed"
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
        .slice(0, 3);

      // Fallback: next future sessions if none today/tomorrow
      if (upcoming.length === 0) {
        upcoming = myApps
          .filter(
            (a) => a.date >= td && a.status !== "cancelled" && a.status !== "completed"
          )
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(0, 2);
      }

      upcoming.forEach((a) => {
        const client = data.clients.find((c) => c.id === a.clientId);
        const therapy = data.therapies.find((t) => t.id === a.therapyId);
        notifs.push({
          id: `t_upcoming_${a.id}`,
          icon: "calendar",
          iconBg: "bg-violet-100",
          iconColor: "text-violet-600",
          title: "Sessão agendada",
          sub: `${client?.name ?? "Cliente"} · ${therapy?.name ?? "Terapia"} · ${whenLabel(a.date, a.time)}`,
          timeLabel: timeAgo(a.date, a.time),
          read: false,
          sortKey: sortKey(a.date, a.time),
        });
      });

      // 2. Pending (awaiting confirmation)
      const pending = myApps
        .filter((a) => a.status === "pending")
        .slice(0, 2);
      pending.forEach((a) => {
        const client = data.clients.find((c) => c.id === a.clientId);
        notifs.push({
          id: `t_pending_${a.id}`,
          icon: "alert",
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
          title: "Aguardando confirmação",
          sub: `${client?.name ?? "Cliente"} · ${fmtDate(a.date)} às ${a.time}`,
          timeLabel: timeAgo(a.date),
          read: false,
          sortKey: sortKey(a.date),
        });
      });

      // 3. Recent completed sessions (last 7 days)
      const recentDone = myApps
        .filter(
          (a) =>
            a.status === "completed" &&
            a.date >= sevenAgo
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 2);
      recentDone.forEach((a) => {
        const therapy = data.therapies.find((t) => t.id === a.therapyId);
        notifs.push({
          id: `t_done_${a.id}`,
          icon: "check",
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-600",
          title: "Sessão concluída",
          sub: `${therapy?.name ?? "Terapia"} · ${fmtBRL(a.price)}`,
          timeLabel: timeAgo(a.date),
          read: true,
          sortKey: sortKey(a.date),
        });
      });

      // 4. Comissões a receber — somente sessões de empresa deste terapeuta
      //    ainda não pagas. Sessões autônomas não entram (não há empresa devedora).
      const unpaidCompany = data.sessionRecords.filter(
        (r) => r.therapistId === therapistId && !!r.companyId && !r.paidByCompany,
      );
      if (unpaidCompany.length > 0) {
        const total = unpaidCompany.reduce((s, r) => s + (r.therapistEarned ?? 0), 0);
        notifs.push({
          id: "t_unpaid",
          icon: "dollar",
          iconBg: "bg-yellow-100",
          iconColor: "text-yellow-600",
          title: "Comissões a receber",
          sub: `${unpaidCompany.length} sessão(ões) · ${fmtBRL(total)}`,
          timeLabel: "hoje",
          read: false,
          sortKey: Date.now(),
        });
      }
    }

    // ── COMPANY ──────────────────────────────────────────────────────────────
    if (variant === "company") {
      const apps = data.appointments;

      // 1. Pending sessions awaiting confirmation
      const pendingApps = apps
        .filter((a) => a.status === "pending")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);
      pendingApps.forEach((a) => {
        const client = data.clients.find((c) => c.id === a.clientId);
        const therapy = data.therapies.find((t) => t.id === a.therapyId);
        notifs.push({
          id: `c_pending_${a.id}`,
          icon: "alert",
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
          title: "Sessão aguardando confirmação",
          sub: `${client?.name ?? "Cliente"} · ${therapy?.name ?? "Terapia"} · ${fmtDate(a.date)} ${a.time}`,
          timeLabel: timeAgo(a.date),
          read: false,
          sortKey: sortKey(a.date),
        });
      });

      // 2. Upcoming sessions today/tomorrow
      const todaySessions = apps.filter(
        (a) =>
          (a.date === td || a.date === tm) &&
          a.status !== "cancelled" &&
          a.status !== "completed"
      );
      const todayFallback = todaySessions.slice(0, 1);

      todayFallback.forEach((a) => {
        const label = a.date === td ? "hoje" : a.date === tm ? "amanhã" : fmtDate(a.date);
        const count = apps.filter(
          (x) => x.date === a.date && x.status !== "cancelled" && x.status !== "completed"
        ).length;
        notifs.push({
          id: `c_today_${a.date}`,
          icon: "calendar",
          iconBg: "bg-violet-100",
          iconColor: "text-violet-600",
          title: `${count} sessão(ões) ${label}`,
          sub: `Próxima: ${a.time} · ${data.therapists.find((t) => t.id === a.therapistId)?.name ?? "Terapeuta"}`,
          timeLabel: timeAgo(a.date, a.time),
          read: count === 0,
          sortKey: sortKey(a.date, a.time),
        });
      });

      // 3. Therapists without recent sessions (inactive)
      const activeTherapistIds = new Set(
        apps
          .filter((a) => a.status === "completed" && a.date >= sevenAgo)
          .map((a) => a.therapistId)
      );
      const inactiveTherapists = data.therapists
        .filter((t) => t.status === "active" && !activeTherapistIds.has(t.id))
        .slice(0, 1);
      inactiveTherapists.forEach((t) => {
        notifs.push({
          id: `c_inactive_${t.id}`,
          icon: "users",
          iconBg: "bg-blue-100",
          iconColor: "text-blue-600",
          title: "Terapeuta sem sessões recentes",
          sub: `${t.name} · nenhuma sessão nos últimos 7 dias`,
          timeLabel: "7 d atrás",
          read: true,
          sortKey: Date.now() - 7 * 86400000,
        });
      });

      // 4. Unpaid commissions
      const unpaid = data.sessionRecords.filter((r) => !r.paidByCompany);
      if (unpaid.length > 0) {
        const total = unpaid.reduce(
          (s, r) => s + (r.therapistEarned ?? (r as any).therapistEarning ?? 0),
          0
        );
        notifs.push({
          id: "c_commission",
          icon: "dollar",
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-600",
          title: "Comissões a pagar",
          sub: `${unpaid.length} sessão(ões) em aberto · ${fmtBRL(total)}`,
          timeLabel: "hoje",
          read: false,
          sortKey: Date.now(),
        });
      }

      // 5. Recently added therapists (last 2, sorted by name as proxy)
      const latestTherapists = [...data.therapists]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 1);
      latestTherapists.forEach((t) => {
        if (!t.createdAt) return;
        notifs.push({
          id: `c_newth_${t.id}`,
          icon: "sparkles",
          iconBg: "bg-indigo-100",
          iconColor: "text-indigo-600",
          title: "Novo terapeuta na equipe",
          sub: `${t.name} · ${t.specialty ?? "Terapeuta"}`,
          timeLabel: timeAgo(t.createdAt),
          read: true,
          sortKey: sortKey(t.createdAt),
        });
      });
    }

    // ── ADMIN ────────────────────────────────────────────────────────────────
    if (variant === "admin") {
      const companies = data.allAdminCompanies;
      const therapists = data.allAdminTherapists;

      // 1. Latest companies
      const latestCompanies = [...companies]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 2);
      latestCompanies.forEach((co) => {
        notifs.push({
          id: `a_co_${co.id}`,
          icon: "building",
          iconBg: "bg-violet-100",
          iconColor: "text-violet-400",
          title: "Nova empresa cadastrada",
          sub: `${co.name} · Plano ${co.plan}`,
          timeLabel: co.createdAt ? timeAgo(co.createdAt) : "recente",
          read: false,
          sortKey: co.createdAt ? sortKey(co.createdAt) : Date.now(),
        });
      });

      // 2. Latest therapists
      const latestTherapists = [...therapists]
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .slice(0, 2);
      latestTherapists.forEach((t) => {
        notifs.push({
          id: `a_th_${t.id}`,
          icon: "users",
          iconBg: "bg-blue-900",
          iconColor: "text-blue-300",
          title: "Novo terapeuta registrado",
          sub: `${t.name} · ${t.specialty ?? "Terapeuta"}`,
          timeLabel: t.createdAt ? timeAgo(t.createdAt) : "recente",
          read: false,
          sortKey: t.createdAt ? sortKey(t.createdAt) : Date.now() - 1000,
        });
      });

      // 3. Inactive companies
      const inactive = companies.filter((co) => co.status === "inactive").slice(0, 2);
      inactive.forEach((co) => {
        notifs.push({
          id: `a_inactive_${co.id}`,
          icon: "alert",
          iconBg: "bg-red-900",
          iconColor: "text-red-400",
          title: "Empresa inativa",
          sub: `${co.name} · plano ${co.plan}`,
          timeLabel: "atenção",
          read: true,
          sortKey: Date.now() - 2000,
        });
      });
    }

    // ── CLIENT ───────────────────────────────────────────────────────────────
    if (variant === "client") {
      const clientId = data.myClient?.id;
      const myApps = data.appointments.filter((a) => a.clientId === clientId);

      // 1. Upcoming sessions
      let upcoming = myApps
        .filter(
          (a) =>
            a.date >= td &&
            a.status !== "cancelled" &&
            a.status !== "completed"
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 2);

      upcoming.forEach((a) => {
        const therapist = data.therapists.find((t) => t.id === a.therapistId);
        const therapy = data.therapies.find((t) => t.id === a.therapyId);
        notifs.push({
          id: `cl_upcoming_${a.id}`,
          icon: "calendar",
          iconBg: "bg-purple-100",
          iconColor: "text-purple-600",
          title: "Sessão agendada",
          sub: `${therapy?.name ?? "Terapia"} · ${whenLabel(a.date, a.time)} · ${therapist?.name ?? "Terapeuta"}`,
          timeLabel: timeAgo(a.date, a.time),
          read: false,
          sortKey: sortKey(a.date, a.time),
        });
      });

      // 2. Pending confirmation
      const pending = myApps.filter((a) => a.status === "pending").slice(0, 1);
      pending.forEach((a) => {
        notifs.push({
          id: `cl_pending_${a.id}`,
          icon: "clock",
          iconBg: "bg-amber-100",
          iconColor: "text-amber-600",
          title: "Aguardando confirmação",
          sub: `Sessão de ${fmtDate(a.date)} às ${a.time} em análise`,
          timeLabel: timeAgo(a.date),
          read: false,
          sortKey: sortKey(a.date),
        });
      });

      // 3. Recent completed
      const done = myApps
        .filter(
          (a) =>
            a.status === "completed" &&
            a.date >= sevenAgo
        )
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 2);
      done.forEach((a) => {
        const therapy = data.therapies.find((t) => t.id === a.therapyId);
        notifs.push({
          id: `cl_done_${a.id}`,
          icon: "check",
          iconBg: "bg-emerald-100",
          iconColor: "text-emerald-600",
          title: "Sessão concluída",
          sub: `${therapy?.name ?? "Terapia"} · ${fmtBRL(a.price)}`,
          timeLabel: timeAgo(a.date),
          read: true,
          sortKey: sortKey(a.date),
        });
      });
    }

    // Apply dismissed + read overrides, deduplicate ids, sort newest first
    const seen = new Set<string>();
    return notifs
      .filter((n) => {
        if (dismissed.has(n.id)) return false;
        if (seen.has(n.id)) return false;
        seen.add(n.id);
        return true;
      })
      .map((n) => ({ ...n, read: n.read || readIds.has(n.id) }))
      .sort((a, b) => b.sortKey - a.sortKey)
      .slice(0, 8);
  }, [variant, data, dismissed, readIds]);

  const unreadCount = raw.filter((n) => !n.read).length;

  return { notifications: raw, unreadCount, dismiss, markAllRead };
}