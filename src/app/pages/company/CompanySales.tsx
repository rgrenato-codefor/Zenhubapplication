import { useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, TrendingUp, ShoppingBag, Download, Calendar, MapPin,
} from "../../components/shared/icons";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyUnit } from "../../context/CompanyContext";
import { useCompanyPlan } from "../../hooks/useCompanyPlan";
import { PlanGate } from "../../components/shared/PlanGate";

export default function CompanySales() {
  const { company, clients, appointments, therapists, revenueData, unitRevenueData } = usePageData();
  const { selectedUnitId, selectedUnit, companyUnits } = useCompanyUnit();
  const primaryColor = company?.color || "#0D9488";

  const { planConfig, hasModule, isLoading } = useCompanyPlan(company?.plan);
  if (isLoading || !hasModule("sales")) {
    return <PlanGate module="sales" planConfig={planConfig} primaryColor={primaryColor} isLoading={isLoading} />;
  }

  // ── Filter all data by selected unit ─────────────────────────────────────
  /**
   * Resolve unit for an appointment:
   *   1. appointment.unitId if present
   *   2. fallback to therapist's unitId (handles appointments saved without unitId)
   */
  const getAptUnitId = (a: typeof appointments[number]) => {
    if ((a as any).unitId) return (a as any).unitId as string;
    const t = therapists.find((th) => th.id === a.therapistId);
    return (t as any)?.unitId as string | undefined;
  };

  const companyAppointments = selectedUnitId
    ? appointments.filter((a) => getAptUnitId(a) === selectedUnitId)
    : appointments;

  const unitTherapists = selectedUnitId
    ? therapists.filter((t) => (t as any).unitId === selectedUnitId)
    : therapists;

  const completedSales = companyAppointments.filter((a) => a.status === "completed");
  const totalRevenue = completedSales.reduce((acc, a) => acc + a.price, 0);
  const avgTicket = companyAppointments.length > 0
    ? companyAppointments.reduce((a, b) => a + b.price, 0) / companyAppointments.length
    : 0;

  // ── Occupancy rate ────────────────────────────────────────────────────────
  // Rate = confirmed+completed appointments this month / (therapists × working days × 6 slots/day)
  const occupancyRate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based

    // Count working days (Mon–Fri) in the current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let workingDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow !== 0 && dow !== 6) workingDays++;
    }

    // Booked slots this month (confirmed or completed)
    const bookedThisMonth = companyAppointments.filter((a) => {
      if (!a.date) return false;
      const [y, m] = a.date.split("-").map(Number);
      return y === year && m === month + 1 &&
        (a.status === "confirmed" || a.status === "completed");
    }).length;

    // Capacity: 6 sessions per therapist per working day
    const SLOTS_PER_DAY = 6;
    const totalCapacity = unitTherapists.length * workingDays * SLOTS_PER_DAY;

    return totalCapacity > 0
      ? Math.min(100, Math.round((bookedThisMonth / totalCapacity) * 100))
      : 0;
  }, [companyAppointments, unitTherapists]);

  const salesByTherapist = unitTherapists
    .map((t) => ({
      name: t.name.split(" ")[0],
      sessions: companyAppointments.filter((a) => a.therapistId === t.id).length,
      revenue: companyAppointments.filter((a) => a.therapistId === t.id).reduce((acc, a) => acc + a.price, 0),
      color: primaryColor,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // ── Revenue chart data derived from real appointments ─────────────────────
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

  const activeRevenueData = useMemo(() => {
    // Demo mode: use static mock data (per-unit if available)
    if (revenueData.length > 0) {
      if (selectedUnitId && unitRevenueData[selectedUnitId]?.length)
        return unitRevenueData[selectedUnitId];
      return revenueData;
    }
    // Real user: compute from filtered appointments
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

  const unitLabel = selectedUnit?.name ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Vendas</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-gray-500 text-sm">Análise financeira do período</p>
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
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none">
            <option>Março 2026</option>
            <option>Fevereiro 2026</option>
            <option>Janeiro 2026</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: DollarSign, title: "Receita do Mês", value: `R$ ${totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, trend: unitLabel ? `Unid. ${unitLabel}` : "+12%", sub: "sessões concluídas", color: "#059669" },
          { icon: ShoppingBag, title: "Total de Sessões", value: companyAppointments.length.toString(), trend: "+8%", sub: "vs. mês anterior", color: primaryColor },
          { icon: TrendingUp, title: "Ticket Médio", value: `R$ ${avgTicket.toFixed(2)}`, trend: "+3%", sub: "por sessão", color: "#8B5CF6" },
          { icon: Calendar, title: "Taxa de Ocupação", value: `${occupancyRate}%`, trend: occupancyRate >= 70 ? "Alta demanda" : occupancyRate >= 40 ? "Demanda média" : "Baixa demanda", sub: "das vagas disponíveis", color: "#D97706" },
        ].map((kpi) => (
          <div key={kpi.title} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${kpi.color}20` }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{kpi.trend}</span>
            </div>
            <p className="text-sm text-gray-500">{kpi.title}</p>
            <p className="text-xl text-gray-900 mt-0.5" style={{ fontWeight: 700 }}>{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-1">
            Receita Mensal
            {unitLabel && (
              <span className="ml-2 text-sm text-gray-400" style={{ fontWeight: 400 }}>— {unitLabel}</span>
            )}
          </h3>
          <p className="text-gray-400 text-xs mb-4">Histórico de receita</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={activeRevenueData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis key="x" dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis key="y" stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip key="tooltip" contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]} />
              <Area key="area" type="monotone" dataKey="revenue" stroke={primaryColor} strokeWidth={2} fill={primaryColor} fillOpacity={0.12} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-1">
            Sessões por Terapeuta
            {unitLabel && (
              <span className="ml-2 text-sm text-gray-400" style={{ fontWeight: 400 }}>— {unitLabel}</span>
            )}
          </h3>
          <p className="text-gray-400 text-xs mb-4">Este mês</p>
          {salesByTherapist.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-gray-300">
              <p className="text-sm">Nenhum dado para esta unidade</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={salesByTherapist} barSize={30}>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis key="x" dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <YAxis key="y" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip key="tooltip" contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }} />
                <Bar key="bar" dataKey="sessions" fill={primaryColor} radius={[4, 4, 0, 0]} name="Sessões" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-gray-900">
            Últimas Transações
            {unitLabel && (
              <span className="ml-2 text-sm text-gray-400" style={{ fontWeight: 400 }}>— {unitLabel}</span>
            )}
          </h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
            {companyAppointments.length} registros
          </span>
        </div>
        {companyAppointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma transação encontrada{unitLabel ? ` para ${unitLabel}` : ""}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {["Data", "Terapeuta", "Valor", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-400 px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companyAppointments.slice(0, 10).map((apt) => {
                const therapist = therapists.find((t) => t.id === apt.therapistId);
                const statusColors: Record<string, string> = {
                  completed: "bg-emerald-50 text-emerald-700",
                  confirmed: "bg-blue-50 text-blue-700",
                  pending: "bg-amber-50 text-amber-700",
                  cancelled: "bg-red-50 text-red-600",
                };
                const statusLabel: Record<string, string> = {
                  completed: "Concluído", confirmed: "Confirmado",
                  pending: "Pendente", cancelled: "Cancelado",
                };
                return (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-600">
                      {new Date(apt.date + "T12:00:00").toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">{therapist?.name ?? "—"}</td>
                    <td className="px-6 py-3 text-sm text-gray-900" style={{ fontWeight: 600 }}>R$ {apt.price.toFixed(2)}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[apt.status] || "bg-gray-50 text-gray-600"}`}>
                        {statusLabel[apt.status] ?? apt.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}