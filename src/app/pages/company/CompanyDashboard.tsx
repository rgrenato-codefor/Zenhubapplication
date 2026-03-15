import type React from "react";
import { useState, useMemo } from "react";
import {
  ArrowUpRight, CheckCircle, AlertCircle, MoreHorizontal, MapPin,
  Building2, ChevronRight, Star, Users, CalendarDays, DollarSign, TrendingUp,
  ArrowUp, X,
} from "../../components/shared/icons";
import { SvgAreaChart, SvgBarChart } from "../../components/shared/CssCharts";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyUnit } from "../../context/CompanyContext";
import DateRangePicker, { buildRange, type DateRange } from "../../components/company/DateRangePicker";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed: { label: "Confirmado", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle },
  pending:   { label: "Pendente",   color: "text-amber-600 bg-amber-50",     icon: AlertCircle },
  completed: { label: "Concluído",  color: "text-blue-600 bg-blue-50",       icon: CheckCircle },
  cancelled: { label: "Cancelado",  color: "text-red-500 bg-red-50",         icon: AlertCircle },
};

// Cores padrão para unidades no comparativo
const UNIT_COLORS = ["#7C3AED", "#0D9488", "#D97706", "#DC2626", "#059669", "#3B82F6"];

export default function CompanyDashboard() {
  const { user } = useAuth();
  const {
    company, therapists: allTherapists, clients: allClients, appointments,
    revenueData, weeklyData, unitRevenueData, unitWeeklyData,
  } = usePageData();
  const { selectedUnitId, selectedUnit, companyUnits, setSelectedUnitId } = useCompanyUnit();
  const primaryColor = company?.color || "#0D9488";

  const isAllUnits = !selectedUnitId;
  const hasMultipleUnits = companyUnits.length > 1;

  /**
   * Resolve which unit an appointment belongs to:
   *   1. Appointment has its own unitId  (new appointments always have this)
   *   2. Fallback: infer from the therapist's unitId  (legacy company appointments)
   *   3. Single active unit → safe to attribute there
   *   4. Returns undefined for autonomous therapists — intentionally unassigned
   */
  const getAppointmentUnitId = (a: typeof appointments[number]) => {
    if ((a as any).unitId) return (a as any).unitId as string;
    const t = allTherapists.find((t) => t.id === a.therapistId);
    if ((t as any)?.unitId) return (t as any).unitId as string;
    if (companyUnits.length === 1) return companyUnits[0].id;
    return undefined; // autonomous therapist — does not belong to any unit
  };

  /** Same cascade logic for therapists. */
  const getTherapistUnitId = (t: typeof allTherapists[number]) => {
    if ((t as any).unitId) return (t as any).unitId as string;
    if (companyUnits.length === 1) return companyUnits[0].id;
    return undefined; // autonomous — not tied to any unit
  };

  // ── Date range filter ─────────────────────────────────────────────────────
  const [dateRange, setDateRange] = useState<DateRange>(() => buildRange("30d"));
  const todayStr = new Date().toISOString().split("T")[0];

  // ── Filtered by selected unit ─────────────────────────────────────────────
  const companyTherapists = isAllUnits
    ? allTherapists
    : allTherapists.filter((t) => getTherapistUnitId(t) === selectedUnitId);

  // Unit-filtered (all dates)
  const companyAppointments = isAllUnits
    ? appointments
    : appointments.filter((a) => getAppointmentUnitId(a) === selectedUnitId);

  // Always-today counter for the header badge
  const todayAppointments = companyAppointments.filter((a) => a.date === todayStr);

  // ── Date-range filtered appointments ─────────────────────────────────────
  const rangeAppointments = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return companyAppointments;
    return companyAppointments.filter(
      (a) => a.date >= dateRange.start && a.date <= dateRange.end
    );
  }, [companyAppointments, dateRange]);

  // ── KPI derivations from date range ──────────────────────────────────────
  const periodRevenue = rangeAppointments
    .filter((a) => a.status === "completed" || a.status === "confirmed")
    .reduce((sum, a) => sum + a.price, 0);

  const periodSessions = rangeAppointments.filter(
    (a) => a.status === "confirmed" || a.status === "completed"
  ).length;

  // ── Chart data: adapt to date range ──────────────────────────────────────
  /**
   * Build last-7-months labels for the default monthly trend view.
   */
  const last7Months = useMemo(() => {
    const result: { month: string; year: number; monthNum: number }[] = [];
    const ref = new Date(2026, 2, 1); // March 2026
    for (let i = 6; i >= 0; i--) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const abbr = d
        .toLocaleDateString("pt-BR", { month: "short" })
        .replace(".", "")
        .trim();
      result.push({
        month: abbr.charAt(0).toUpperCase() + abbr.slice(1),
        year: d.getFullYear(),
        monthNum: d.getMonth() + 1,
      });
    }
    return result;
  }, []);

  /**
   * Build chart groupings based on the selected date range length.
   *  ≤ 2 days  → by time block (Manhã / Tarde / Noite) — sessions only
   *  ≤ 14 days → by day (YYYY-MM-DD → DD/MM label)
   *  ≤ 90 days → by week
   *  > 90 days → by month
   */
  const { activeRevenueData, revenueChartLabel, revenueValueKey } = useMemo(() => {
    // Demo mode → keep static data
    if (revenueData.length > 0) {
      const data = selectedUnitId && unitRevenueData[selectedUnitId]?.length
        ? unitRevenueData[selectedUnitId]
        : revenueData;
      return { activeRevenueData: data, revenueChartLabel: "Últimos 7 meses", revenueValueKey: "revenue" };
    }

    const apts = rangeAppointments.filter(
      (a) => a.status === "completed" || a.status === "confirmed"
    );

    const start = dateRange.start;
    const end   = dateRange.end;
    if (!start || !end) {
      return {
        activeRevenueData: last7Months.map(({ month }) => ({ month, revenue: 0 })),
        revenueChartLabel: "Últimos 7 meses",
        revenueValueKey: "revenue",
      };
    }

    const startD = new Date(start + "T00:00:00");
    const endD   = new Date(end   + "T00:00:00");
    const diffDays = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1;

    if (diffDays <= 2) {
      // Group by time block
      const blocks = [
        { label: "Manhã",   min: "06:00", max: "11:59" },
        { label: "Tarde",   min: "12:00", max: "17:59" },
        { label: "Noite",   min: "18:00", max: "23:59" },
        { label: "Madrugada", min: "00:00", max: "05:59" },
      ];
      const data = blocks.map(({ label, min, max }) => ({
        month: label,
        revenue: apts
          .filter((a) => a.time >= min && a.time <= max)
          .reduce((s, a) => s + (a.price || 0), 0),
      }));
      return { activeRevenueData: data, revenueChartLabel: "Receita por turno", revenueValueKey: "revenue" };
    }

    if (diffDays <= 31) {
      // Group by day
      const days: Record<string, number> = {};
      for (let i = 0; i < diffDays; i++) {
        const d = new Date(startD);
        d.setDate(startD.getDate() + i);
        const iso = d.toISOString().split("T")[0];
        days[iso] = 0;
      }
      apts.forEach((a) => {
        if (a.date in days) days[a.date] += a.price || 0;
      });
      const data = Object.entries(days).map(([iso, revenue]) => {
        const [, m, d] = iso.split("-");
        return { month: `${d}/${m}`, revenue };
      });
      return { activeRevenueData: data, revenueChartLabel: `Receita por dia (${dateRange.label})`, revenueValueKey: "revenue" };
    }

    if (diffDays <= 91) {
      // Group by week
      const weeks: { label: string; revenue: number }[] = [];
      let cursor = new Date(startD);
      let wIdx = 1;
      while (cursor <= endD) {
        const wEnd = new Date(cursor);
        wEnd.setDate(cursor.getDate() + 6);
        if (wEnd > endD) wEnd.setTime(endD.getTime());
        const label = `Sem ${wIdx}`;
        const wRevenue = apts
          .filter((a) => a.date >= cursor.toISOString().split("T")[0] && a.date <= wEnd.toISOString().split("T")[0])
          .reduce((s, a) => s + (a.price || 0), 0);
        weeks.push({ label, revenue: wRevenue });
        cursor.setDate(cursor.getDate() + 7);
        wIdx++;
      }
      return { activeRevenueData: weeks.map(w => ({ month: w.label, revenue: w.revenue })), revenueChartLabel: `Receita por semana (${dateRange.label})`, revenueValueKey: "revenue" };
    }

    // Group by month (long ranges)
    const monthMap: Record<string, number> = {};
    apts.forEach((a) => {
      if (!a.date) return;
      const [y, m] = a.date.split("-");
      const key = `${m}/${y.slice(2)}`;
      monthMap[key] = (monthMap[key] ?? 0) + (a.price || 0);
    });
    const data = Object.entries(monthMap).map(([month, revenue]) => ({ month, revenue }));
    return { activeRevenueData: data, revenueChartLabel: `Receita por mês (${dateRange.label})`, revenueValueKey: "revenue" };
  }, [revenueData, unitRevenueData, selectedUnitId, rangeAppointments, dateRange, last7Months]);

  const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const activeWeeklyData = useMemo(() => {
    if (weeklyData.length > 0) {
      if (selectedUnitId && unitWeeklyData[selectedUnitId]?.length)
        return unitWeeklyData[selectedUnitId];
      return weeklyData;
    }
    const byDay: Record<string, number> = {};
    WEEK_DAYS.forEach((d) => (byDay[d] = 0));
    rangeAppointments.forEach((a) => {
      if (!a.date) return;
      const [y, m, d] = a.date.split("-").map(Number);
      const label = WEEK_DAYS[new Date(y, m - 1, d).getDay()];
      byDay[label] = (byDay[label] ?? 0) + 1;
    });
    return WEEK_DAYS.map((day) => ({ day, sessions: byDay[day] }));
  }, [weeklyData, unitWeeklyData, selectedUnitId, rangeAppointments]);

  // ── Per-unit stats ────────────────────────────────────────────────────────
  const unitStats = companyUnits.map((unit, idx) => {
    // Use the same cascade helpers so numbers always match the KPI cards
    const unitTherapists = allTherapists.filter((t) => getTherapistUnitId(t) === unit.id);
    const unitAppointments = rangeAppointments.filter(
      (a) => getAppointmentUnitId(a) === unit.id
    );
    const unitRevenue = unitAppointments
      .filter((a) => a.status === "completed" || a.status === "confirmed")
      .reduce((sum, a) => sum + a.price, 0);
    const totalRevenue = rangeAppointments
      .filter((a) => a.status === "completed" || a.status === "confirmed")
      .reduce((sum, a) => sum + a.price, 0);
    return {
      unit,
      therapistsCount: unitTherapists.length,
      sessionsCount: unitAppointments.length,
      revenue: unitRevenue,
      revenuePct: totalRevenue > 0 ? Math.round((unitRevenue / totalRevenue) * 100) : 0,
      color: UNIT_COLORS[idx % UNIT_COLORS.length],
    };
  });

  // ── Unit label ─────────────────────────────────────────────────────────────
  const unitLabel = selectedUnit
    ? selectedUnit.name
    : hasMultipleUnits
    ? `${companyUnits.length} unidades`
    : null;

  // ── Plan change notification ───────────────────────────────────────────────
  const planChanged = !!(company as any)?.planChangedAt;
  const planChangedFrom = (company as any)?.planChangedFrom as string | undefined;
  const planChangedAt   = (company as any)?.planChangedAt  as string | undefined;
  const dismissKey = `zen_plan_notif_dismissed_${planChangedAt ?? ""}`;
  const [dismissedPlanNotif, setDismissedPlanNotif] = useState(
    () => typeof sessionStorage !== "undefined" && !!sessionStorage.getItem(dismissKey)
  );
  const showPlanNotif = planChanged && !dismissedPlanNotif;

  const handleDismissPlanNotif = () => {
    sessionStorage.setItem(dismissKey, "1");
    setDismissedPlanNotif(true);
  };

  return (
    <div className="space-y-6">
      {/* ── Plan-change notification banner ────────────────────────────── */}
      {showPlanNotif && (
        <div
          className="flex items-start gap-3 rounded-xl border px-4 py-3"
          style={{ background: "#F0FDF4", borderColor: "#86EFAC" }}
        >
          <ArrowUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-emerald-800" style={{ fontWeight: 600 }}>
              Seu plano foi atualizado para <strong>{company?.plan}</strong>
              {planChangedFrom && planChangedFrom !== company?.plan
                ? ` (anteriormente: ${planChangedFrom})`
                : ""}
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Novos módulos e limites já estão disponíveis. Explore o menu lateral para ver os recursos desbloqueados.
            </p>
          </div>
          <button
            onClick={handleDismissPlanNotif}
            className="text-emerald-500 hover:text-emerald-700 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-gray-900">Olá, {user?.name?.split(" ")[0]}! 👋</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-gray-500 text-sm">
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </p>
            {unitLabel && (
              <>
                <span className="text-gray-300">·</span>
                <div className="flex items-center gap-1 text-sm" style={{ color: primaryColor }}>
                  <MapPin className="w-3.5 h-3.5" />
                  <span style={{ fontWeight: 600 }}>{unitLabel}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right side: date range + sessions badge */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            primaryColor={primaryColor}
          />
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-sm shrink-0"
            style={{ background: primaryColor }}
          >
            <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
            <span className="whitespace-nowrap">{todayAppointments.length} sessões hoje</span>
          </div>
        </div>
      </div>

      {/* ── Date range summary strip ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>{rangeAppointments.length} atendimentos no período</span>
        <span className="text-gray-200">·</span>
        <span className="text-emerald-600" style={{ fontWeight: 600 }}>
          R$ {periodRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Profissionais",
            value: companyTherapists.length,
            icon: Star,
            color: primaryColor,
            sub: "ativos",
            trend: "no período",
          },
          {
            title: "Clientes",
            value: allClients.length,
            icon: Users,
            color: "#3B82F6",
            sub: "cadastrados",
            trend: "total cadastrados",
          },
          {
            title: "Sessões",
            value: periodSessions,
            icon: CalendarDays,
            color: "#8B5CF6",
            sub: "no período",
            trend: dateRange.label,
          },
          {
            title: "Receita do Período",
            value: `R$ ${periodRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
            icon: DollarSign,
            color: "#059669",
            sub: "",
            trend: dateRange.label,
          },
        ].map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${stat.color}20` }}>
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-gray-500 text-sm">{stat.title}</p>
            <p className="text-2xl text-gray-900 mt-0.5" style={{ fontWeight: 700 }}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1 truncate">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* ── Unit Comparison (all units view only) ─────────────────────────── */}
      {isAllUnits && hasMultipleUnits && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-gray-900">Comparativo por Unidade</h3>
              <p className="text-gray-400 text-xs mt-0.5">
                {dateRange.label} · todas as unidades
              </p>
            </div>
            <Building2 className="w-5 h-5 text-gray-300" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {unitStats.map(({ unit, therapistsCount, sessionsCount, revenue, revenuePct, color }) => (
              <button
                key={unit.id}
                onClick={() => setSelectedUnitId(unit.id)}
                className="text-left p-4 rounded-xl border border-gray-100 hover:border-violet-200 hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}20` }}
                    >
                      <MapPin className="w-4 h-4" style={{ color }} />
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{unit.name}</p>
                      {unit.isMain && (
                        <p className="text-xs" style={{ color, fontWeight: 600 }}>Principal</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[
                    { label: "Profissionais", value: therapistsCount },
                    { label: "Sessões", value: sessionsCount },
                    { label: "Receita", value: `R$ ${(revenue / 1000).toFixed(1)}k` },
                  ].map((s) => (
                    <div key={s.label} className="text-center p-2 bg-gray-50 rounded-lg">
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{s.value}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-400">Participação na receita</p>
                    <p className="text-xs" style={{ color, fontWeight: 700 }}>{revenuePct}%</p>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${revenuePct}%`, background: color }}
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={
                      unit.status === "active"
                        ? { background: "#ECFDF5", color: "#059669", fontWeight: 600 }
                        : { background: "#F3F4F6", color: "#6B7280", fontWeight: 600 }
                    }
                  >
                    {unit.status === "active" ? "Ativa" : "Inativa"}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Stacked revenue chart comparing units */}
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-gray-700 text-sm mb-4" style={{ fontWeight: 600 }}>Receita — todas as unidades</p>
            {(() => {
              const maxRev = Math.max(
                ...revenueData.map((d) =>
                  companyUnits.reduce((s, unit) => {
                    const uData = unitRevenueData[unit.id];
                    const match = uData?.find((u) => u.month === d.month);
                    return s + (match?.revenue ?? 0);
                  }, 0)
                ),
                1
              );
              return (
                <div className="space-y-2">
                  {revenueData.map((d) => (
                    <div key={d.month} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 w-8 shrink-0">{d.month}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
                        {companyUnits.map((unit, idx) => {
                          const match = unitRevenueData[unit.id]?.find((u) => u.month === d.month);
                          const rev = match?.revenue ?? 0;
                          const pct = maxRev > 0 ? (rev / maxRev) * 100 : 0;
                          return (
                            <div
                              key={unit.id}
                              className="h-full"
                              style={{ width: `${pct}%`, background: UNIT_COLORS[idx % UNIT_COLORS.length] }}
                              title={`${unit.name}: R$${rev.toLocaleString("pt-BR")}`}
                            />
                          );
                        })}
                      </div>
                      <span className="text-gray-400 w-16 text-right">
                        R${(companyUnits.reduce((s, unit) => {
                          const match = unitRevenueData[unit.id]?.find((u) => u.month === d.month);
                          return s + (match?.revenue ?? 0);
                        }, 0) / 1000).toFixed(1)}k
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue area */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-gray-900">
                Receita
                {selectedUnit && (
                  <span className="ml-2 text-sm text-gray-400" style={{ fontWeight: 400 }}>
                    — {selectedUnit.name}
                  </span>
                )}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">{revenueChartLabel}</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <SvgAreaChart
            data={activeRevenueData}
            valueKey={revenueValueKey}
            labelKey="month"
            color={primaryColor}
            height={200}
            formatY={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v.toFixed(0)}`}
          />
        </div>

        {/* Weekly sessions */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-1">
            Sessões por Dia
            {selectedUnit && (
              <span className="ml-1 text-xs text-gray-400" style={{ fontWeight: 400 }}>· {selectedUnit.name}</span>
            )}
          </h3>
          <p className="text-gray-400 text-xs mb-4">{dateRange.label}</p>
          <SvgBarChart
            data={activeWeeklyData}
            bars={[{ key: "sessions", color: primaryColor }]}
            labelKey="day"
            height={200}
          />
        </div>
      </div>

      {/* Period appointments + Top therapists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Period agenda */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-gray-900">
                {dateRange.preset === "today" ? "Agenda de Hoje" : "Atendimentos do Período"}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">{dateRange.label}</p>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {rangeAppointments.length} sessões
            </span>
          </div>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {rangeAppointments.slice(0, 20).map((apt) => {
              const therapist = allTherapists.find((t) => t.id === apt.therapistId);
              const client = allClients.find((c) => c.id === apt.clientId);
              const status = statusConfig[apt.status] ?? statusConfig.confirmed;
              const aptUnit = companyUnits.find((u) => u.id === (apt as any).unitId);
              return (
                <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-white text-xs shrink-0 flex-col gap-0"
                    style={{ background: primaryColor, fontWeight: 700 }}
                  >
                    {dateRange.preset !== "today" && dateRange.preset !== "yesterday" ? (
                      <>
                        <span className="text-[10px] opacity-80">{apt.date?.slice(5).replace("-", "/")}</span>
                        <span>{apt.time}</span>
                      </>
                    ) : (
                      <span>{apt.time}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{client?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{therapist?.name}</p>
                    {isAllUnits && aptUnit && (
                      <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5">
                        <MapPin className="w-3 h-3" /> {aptUnit.name}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${status.color}`}>
                    {status.label}
                  </span>
                </div>
              );
            })}
            {rangeAppointments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Nenhuma sessão no período</p>
            )}
            {rangeAppointments.length > 20 && (
              <p className="text-xs text-gray-400 text-center pt-2">
                + {rangeAppointments.length - 20} mais no período
              </p>
            )}
          </div>
        </div>

        {/* Top Therapists */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Profissionais Destaque</h3>
            <button className="text-xs flex items-center gap-1" style={{ color: primaryColor }}>
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {companyTherapists.map((therapist) => {
              const tUnit = companyUnits.find((u) => u.id === (therapist as any).unitId);
              // Count sessions in the selected period for this therapist
              const therapistPeriodSessions = rangeAppointments.filter(
                (a) => a.therapistId === therapist.id &&
                  (a.status === "confirmed" || a.status === "completed")
              ).length;
              return (
                <div key={therapist.id} className="flex items-center gap-3">
                  <img
                    src={therapist.avatar}
                    alt={therapist.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{therapist.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500 truncate">{therapist.specialty}</p>
                      {isAllUnits && tUnit && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded shrink-0"
                          style={{ background: `${primaryColor}15`, color: primaryColor, fontWeight: 600 }}
                        >
                          {tUnit.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>{therapist.rating}</span>
                    </div>
                    <p className="text-xs text-gray-500">{therapistPeriodSessions} sessões</p>
                  </div>
                </div>
              );
            })}
            {companyTherapists.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum profissional nesta unidade</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}