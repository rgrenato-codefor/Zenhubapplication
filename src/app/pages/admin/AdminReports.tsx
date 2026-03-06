import { useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, Download, Building2 } from "lucide-react";
import { useData } from "../../context/DataContext";

export default function AdminReports() {
  const { allAdminCompanies, loading } = useData();

  // ── Revenue ranking ───────────────────────────────────────────────────────
  const ranked = useMemo(
    () =>
      [...allAdminCompanies]
        .filter((c) => (c.monthRevenue || 0) > 0)
        .sort((a, b) => (b.monthRevenue || 0) - (a.monthRevenue || 0)),
    [allAdminCompanies]
  );

  const maxRevenue = ranked.length > 0 ? ranked[0].monthRevenue || 1 : 1;

  // ── Plan breakdown bar chart ──────────────────────────────────────────────
  const planBreakdown = useMemo(() => {
    const counts: Record<string, number> = { Starter: 0, Business: 0, Premium: 0 };
    allAdminCompanies.forEach((c) => {
      if (counts[c.plan] !== undefined) counts[c.plan]++;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allAdminCompanies]);

  // ── Status breakdown ──────────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const active = allAdminCompanies.filter((c) => c.status === "active").length;
    const inactive = allAdminCompanies.filter((c) => c.status !== "active").length;
    return [
      { name: "Ativas", value: active },
      { name: "Inativas", value: inactive },
    ];
  }, [allAdminCompanies]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white">Relatórios</h1>
          <p className="text-gray-400 text-sm mt-0.5">Análises consolidadas da plataforma</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">
          <Download className="w-4 h-4" /> Exportar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan breakdown */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Empresas por Plano</h3>
          <p className="text-gray-400 text-xs mb-4">Distribuição de assinaturas</p>
          {loading ? (
            <div className="flex items-center justify-center h-[220px] text-gray-500 text-sm">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={planBreakdown} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "0.75rem", color: "#F9FAFB" }}
                  formatter={(v: number) => [v, "Empresas"]}
                />
                <Bar dataKey="value" fill="#7C3AED" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Status das Empresas</h3>
          <p className="text-gray-400 text-xs mb-4">Ativas vs. inativas</p>
          {loading ? (
            <div className="flex items-center justify-center h-[220px] text-gray-500 text-sm">Carregando...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={statusData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "0.75rem", color: "#F9FAFB" }}
                  formatter={(v: number) => [v, "Empresas"]}
                />
                <Bar dataKey="value" fill="#0D9488" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Revenue ranking */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-white mb-4">Ranking de Empresas por Receita do Mês</h3>
        {loading ? (
          <p className="text-center text-gray-500 text-sm py-8">Carregando dados...</p>
        ) : ranked.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma receita registrada este mês</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ranked.map((company, idx) => {
              const pct = ((company.monthRevenue || 0) / maxRevenue) * 100;
              return (
                <div key={company.id} className="flex items-center gap-4">
                  <span className="text-gray-500 text-sm w-5">{idx + 1}</span>
                  <div className="flex items-center gap-2 w-48 shrink-0">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs"
                      style={{ background: company.color || "#7C3AED", fontWeight: 700 }}
                    >
                      {(company.logo || company.name).charAt(0)}
                    </div>
                    <span className="text-sm text-gray-300 truncate">{company.name}</span>
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: company.color || "#7C3AED" }}
                    />
                  </div>
                  <span className="text-sm text-white w-32 text-right" style={{ fontWeight: 600 }}>
                    R$ {(company.monthRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total de Empresas",
            value: allAdminCompanies.length,
            icon: Building2,
            color: "#7C3AED",
          },
          {
            label: "Empresas Ativas",
            value: allAdminCompanies.filter((c) => c.status === "active").length,
            icon: TrendingUp,
            color: "#0D9488",
          },
          {
            label: "Receita Total do Mês",
            value: `R$ ${allAdminCompanies.reduce((s, c) => s + (c.monthRevenue || 0), 0).toLocaleString("pt-BR")}`,
            icon: TrendingUp,
            color: "#F59E0B",
          },
          {
            label: "Receita Total Acumulada",
            value: `R$ ${(allAdminCompanies.reduce((s, c) => s + (c.totalRevenue || 0), 0) / 1000).toFixed(0)}k`,
            icon: TrendingUp,
            color: "#3B82F6",
          },
        ].map((card) => (
          <div key={card.label} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${card.color}20` }}
            >
              <card.icon className="w-4 h-4" style={{ color: card.color }} />
            </div>
            <p className="text-gray-400 text-xs">{card.label}</p>
            <p className="text-xl text-white mt-1" style={{ fontWeight: 700 }}>
              {loading ? "—" : card.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
