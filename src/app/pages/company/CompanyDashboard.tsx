import { useState, useMemo } from "react";
import {
  ArrowUpRight, CheckCircle, AlertCircle, MoreHorizontal, MapPin,
  Building2, ChevronRight, Star, Users, CalendarDays, DollarSign, TrendingUp,
} from "../../components/shared/icons";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyUnit } from "../../context/CompanyContext";

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

  // ── Filtered by selected unit ─────────────────────────────────────────────
  const companyTherapists = isAllUnits
    ? allTherapists
    : allTherapists.filter((t) => (t as any).unitId === selectedUnitId);

  /**
   * Resolve which unit an appointment belongs to:
   *   1. Use appointment.unitId if present
   *   2. Fallback: infer from the therapist's unitId
   * This handles appointments saved before the unitId field was added.
   */
  const getAppointmentUnitId = (a: typeof appointments[number]) => {
    if ((a as any).unitId) return (a as any).unitId as string;
    const t = allTherapists.find((t) => t.id === a.therapistId);
    return (t as any)?.unitId as string | undefined;
  };

  const companyAppointments = isAllUnits
    ? appointments
    : appointments.filter((a) => getAppointmentUnitId(a) === selectedUnitId);

  const todayAppointments = companyAppointments.filter((a) => a.date === new Date().toISOString().split("T")[0]);

  // ── Revenue from appointments (derived) ───────────────────────────────────
  const monthRevenue = companyAppointments
    .filter((a) => a.status === "completed" || a.status === "confirmed")
    .reduce((sum, a) => sum + a.price, 0);

  // ── Chart data: derive from real appointments when no static data ─────────
  /**
   * Build last-7-months labels (e.g. ["Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar"])
   * using a fixed reference date so the list is always stable.
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
        monthNum: d.getMonth() + 1, // 1-based
      });
    }
    return result;
  }, []);

  const activeRevenueData = useMemo(() => {
    // 1. Demo mode with pre-built mock data → prefer unit-specific then general
    if (revenueData.length > 0) {
      if (selectedUnitId && unitRevenueData[selectedUnitId]?.length)
        return unitRevenueData[selectedUnitId];
      return revenueData;
    }
    // 2. Real user → derive from filtered appointments
    const byKey: Record<string, number> = {};
    last7Months.forEach(({ month }) => (byKey[month] = 0));
    companyAppointments
      .filter((a) => a.status === "completed" || a.status === "confirmed")
      .forEach((a) => {
        if (!a.date) return;
        const [y, m] = a.date.split("-").map(Number);
        const entry = last7Months.find((lm) => lm.year === y && lm.monthNum === m);
        if (entry) byKey[entry.month] = (byKey[entry.month] ?? 0) + (a.price || 0);
      });
    return last7Months.map(({ month }) => ({ month, revenue: byKey[month] }));
  }, [revenueData, unitRevenueData, selectedUnitId, companyAppointments, last7Months]);

  const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const activeWeeklyData = useMemo(() => {
    // 1. Demo mode
    if (weeklyData.length > 0) {
      if (selectedUnitId && unitWeeklyData[selectedUnitId]?.length)
        return unitWeeklyData[selectedUnitId];
      return weeklyData;
    }
    // 2. Real user → count sessions per weekday from filtered appointments
    const byDay: Record<string, number> = {};
    WEEK_DAYS.forEach((d) => (byDay[d] = 0));
    companyAppointments.forEach((a) => {
      if (!a.date) return;
      const [y, m, d] = a.date.split("-").map(Number);
      const label = WEEK_DAYS[new Date(y, m - 1, d).getDay()];
      byDay[label] = (byDay[label] ?? 0) + 1;
    });
    return WEEK_DAYS.map((day) => ({ day, sessions: byDay[day] }));
  }, [weeklyData, unitWeeklyData, selectedUnitId, companyAppointments]);

  // ── Per-unit stats for comparison section ─────────────────────────────────
  const unitStats = companyUnits.map((unit, idx) => {
    const unitTherapists = allTherapists.filter((t) => (t as any).unitId === unit.id);
    // Use same therapist-fallback logic for unit appointment resolution
    const unitAppointments = appointments.filter((a) => {
      if ((a as any).unitId) return (a as any).unitId === unit.id;
      const t = allTherapists.find((th) => th.id === a.therapistId);
      return (t as any)?.unitId === unit.id;
    });
    const unitRevenue = unitAppointments
      .filter((a) => a.status === "completed" || a.status === "confirmed")
      .reduce((sum, a) => sum + a.price, 0);
    const totalRevenue = appointments
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Olá, {user?.name?.split(" ")[0]}! 👋</h1>
          <div className="flex items-center gap-2 mt-0.5">
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
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white text-sm"
          style={{ background: primaryColor }}
        >
          <div className="w-2 h-2 rounded-full bg-white/70 animate-pulse" />
          <span>{todayAppointments.length} sessões hoje</span>
        </div>
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
            trend: "+1 este mês",
          },
          {
            title: "Clientes",
            value: allClients.length,
            icon: Users,
            color: "#3B82F6",
            sub: "cadastrados",
            trend: "+5 este mês",
          },
          {
            title: "Sessões",
            value: companyAppointments.filter((a) => a.status === "confirmed" || a.status === "completed").length,
            icon: CalendarDays,
            color: "#8B5CF6",
            sub: "agendadas",
            trend: "esta semana",
          },
          {
            title: "Receita do Mês",
            value: `R$ ${monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
            icon: DollarSign,
            color: "#059669",
            sub: "",
            trend: isAllUnits ? "+12% vs mês anterior" : `Unidade ${selectedUnit?.name}`,
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
            <p className="text-xs text-emerald-600 mt-1">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* ── Unit Comparison (all units view only) ─────────────────────────── */}
      {isAllUnits && hasMultipleUnits && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-gray-900">Comparativo por Unidade</h3>
              <p className="text-gray-400 text-xs mt-0.5">Visão geral de todas as unidades · mês atual</p>
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
                {/* Header */}
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

                {/* Stats row */}
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

                {/* Revenue share bar */}
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

                {/* Status badge */}
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
            <p className="text-gray-700 text-sm mb-4" style={{ fontWeight: 600 }}>Receita mensal — todas as unidades</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={revenueData.map((d) => ({
                  month: d.month,
                  ...companyUnits.reduce((acc, unit, idx) => {
                    const uData = unitRevenueData[unit.id];
                    const match = uData?.find((u) => u.month === d.month);
                    return { ...acc, [unit.name]: match?.revenue ?? 0 };
                  }, {}),
                }))}
                barSize={14}
              >
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis key="x" dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis key="y" stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  key="tooltip"
                  contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }}
                  formatter={(v: number, name: string) => [`R$ ${v.toLocaleString("pt-BR")}`, name]}
                />
                <Legend key="legend" wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                {companyUnits.map((unit, idx) => (
                  <Bar
                    key={unit.id}
                    dataKey={unit.name}
                    fill={UNIT_COLORS[idx % UNIT_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                    stackId="a"
                    isAnimationActive={false}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
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
                Receita Mensal
                {selectedUnit && (
                  <span className="ml-2 text-sm text-gray-400" style={{ fontWeight: 400 }}>
                    — {selectedUnit.name}
                  </span>
                )}
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Últimos 7 meses</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activeRevenueData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis key="x" dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis key="y" stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                key="tooltip"
                contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }}
                formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]}
              />
              <Area key="area" type="monotone" dataKey="revenue" stroke={primaryColor} strokeWidth={2} fill={primaryColor} fillOpacity={0.12} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Weekly sessions */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-1">
            Esta Semana
            {selectedUnit && (
              <span className="ml-1 text-xs text-gray-400" style={{ fontWeight: 400 }}>· {selectedUnit.name}</span>
            )}
          </h3>
          <p className="text-gray-400 text-xs mb-4">Sessões por dia</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activeWeeklyData} barSize={20}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis key="x" dataKey="day" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis key="y" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip key="tooltip" contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }} />
              <Bar key="bar" dataKey="sessions" fill={primaryColor} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Today's appointments + Top therapists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Agenda de Hoje</h3>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
              {todayAppointments.length} sessões
            </span>
          </div>
          <div className="space-y-3">
            {todayAppointments.map((apt) => {
              const therapist = allTherapists.find((t) => t.id === apt.therapistId);
              const client = allClients.find((c) => c.id === apt.clientId);
              const status = statusConfig[apt.status] ?? statusConfig.confirmed;
              const aptUnit = companyUnits.find((u) => u.id === (apt as any).unitId);
              return (
                <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-xl text-white text-xs shrink-0"
                    style={{ background: primaryColor, fontWeight: 700 }}
                  >
                    {apt.time}
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
            {todayAppointments.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma sessão hoje</p>
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
                    <p className="text-xs text-gray-500">{therapist.monthSessions} sessões</p>
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