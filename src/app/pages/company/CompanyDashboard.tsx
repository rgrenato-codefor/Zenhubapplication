import React from "react";
import {
  Users, CalendarDays, DollarSign, TrendingUp, Star,
  ArrowUpRight, CheckCircle, AlertCircle, MoreHorizontal, MapPin,
  Building2, ChevronRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import {
  revenueData, weeklyData, therapists, clients, appointments,
  companies, unitRevenueData, unitWeeklyData,
} from "../../data/mockData";
import { useCompanyUnit } from "../../context/CompanyContext";
import { unitStore } from "../../store/unitStore";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  confirmed: { label: "Confirmado", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle },
  pending: { label: "Pendente", color: "text-amber-600 bg-amber-50", icon: AlertCircle },
  completed: { label: "Concluído", color: "text-blue-600 bg-blue-50", icon: CheckCircle },
};

// Cores padrão para unidades no comparativo
const UNIT_COLORS = ["#7C3AED", "#0D9488", "#D97706", "#DC2626", "#059669", "#3B82F6"];

export default function CompanyDashboard() {
  const { user } = useAuth();
  const { selectedUnitId, selectedUnit, companyUnits, setSelectedUnitId } = useCompanyUnit();
  const company = companies.find((c) => c.id === user?.companyId);
  const primaryColor = company?.color || "#0D9488";

  const isAllUnits = !selectedUnitId;
  const hasMultipleUnits = companyUnits.length > 1;

  // ── All company data (unfiltered) ────────────────────────────────────────
  const allTherapists = therapists.filter((t) => t.companyId === user?.companyId);
  const allClients = clients.filter((c) => c.companyId === user?.companyId);
  const allAppointments = appointments.filter((a) => a.companyId === user?.companyId);

  // ── Filtered by selected unit ─────────────────────────────────────────────
  const companyTherapists = isAllUnits
    ? allTherapists
    : allTherapists.filter((t) => (t as any).unitId === selectedUnitId);

  const companyAppointments = isAllUnits
    ? allAppointments
    : allAppointments.filter((a) => (a as any).unitId === selectedUnitId);

  const todayAppointments = companyAppointments.filter((a) => a.date === "2026-03-05");

  // ── Chart data based on selection ─────────────────────────────────────────
  const activeRevenueData =
    selectedUnitId && unitRevenueData[selectedUnitId]
      ? unitRevenueData[selectedUnitId]
      : revenueData;

  const activeWeeklyData =
    selectedUnitId && unitWeeklyData[selectedUnitId]
      ? unitWeeklyData[selectedUnitId]
      : weeklyData;

  // ── Revenue from appointments (derived) ───────────────────────────────────
  const monthRevenue = companyAppointments
    .filter((a) => a.status === "completed" || a.status === "confirmed")
    .reduce((sum, a) => sum + a.price, 0);

  // ── Per-unit stats for comparison section ─────────────────────────────────
  const unitStats = companyUnits.map((unit, idx) => {
    const unitTherapists = allTherapists.filter((t) => (t as any).unitId === unit.id);
    const unitAppointments = allAppointments.filter((a) => (a as any).unitId === unit.id);
    const unitRevenue = unitAppointments
      .filter((a) => a.status === "completed" || a.status === "confirmed")
      .reduce((sum, a) => sum + a.price, 0);
    const totalRevenue = allAppointments
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
            title: "Terapeutas",
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
                    { label: "Terapeutas", value: therapistsCount },
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
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }}
                  formatter={(v: number, name: string) => [`R$ ${v.toLocaleString("pt-BR")}`, name]}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
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
              <defs>
                <linearGradient id="compRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }}
                formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]}
              />
              <Area key="revenue-area" type="monotone" dataKey="revenue" stroke={primaryColor} strokeWidth={2} fill="url(#compRevGrad)" isAnimationActive={false} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }} />
              <Bar key="sessions-bar" dataKey="sessions" fill={primaryColor} radius={[4, 4, 0, 0]} isAnimationActive={false} />
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
              const status = statusConfig[apt.status];
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
            <h3 className="text-gray-900">Terapeutas Destaque</h3>
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
              <p className="text-sm text-gray-400 text-center py-4">Nenhum terapeuta nesta unidade</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}