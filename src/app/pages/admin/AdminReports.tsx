import { useMemo } from "react";
import { TrendingUp, Download, Building2 } from "../../components/shared/icons";
import { useData } from "../../context/DataContext";

/** Pure-CSS bar — no recharts, no duplicate-key warnings */
function CssBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 text-xs w-16 shrink-0 text-right">{label}</span>
      <div className="flex-1 bg-gray-700 rounded-full h-5 overflow-hidden">
        <div
          className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-500"
          style={{ width: `${Math.max(pct, value > 0 ? 8 : 0)}%`, background: color }}
        >
          {value > 0 && (
            <span className="text-white text-xs" style={{ fontWeight: 700, fontSize: 10 }}>{value}</span>
          )}
        </div>
      </div>
      <span className="text-gray-300 text-xs w-6 text-right" style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

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

  // ── Plan breakdown ────────────────────────────────────────────────────────
  const planBreakdown = useMemo(() => {
    const counts: Record<string, number> = { Starter: 0, Business: 0, Premium: 0 };
    allAdminCompanies.forEach((c) => {
      if (counts[c.plan] !== undefined) counts[c.plan]++;
    });
    return [
      { name: "Starter",  value: counts.Starter,  color: "#6366F1" },
      { name: "Business", value: counts.Business, color: "#7C3AED" },
      { name: "Premium",  value: counts.Premium,  color: "#A855F7" },
    ];
  }, [allAdminCompanies]);

  const planMax = Math.max(...planBreakdown.map((d) => d.value), 1);

  // ── Status breakdown ──────────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const active   = allAdminCompanies.filter((c) => c.status === "active").length;
    const inactive = allAdminCompanies.filter((c) => c.status !== "active").length;
    return [
      { name: "Ativas",   value: active,   color: "#0D9488" },
      { name: "Inativas", value: inactive, color: "#6B7280" },
    ];
  }, [allAdminCompanies]);

  const statusMax = Math.max(...statusData.map((d) => d.value), 1);

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
          <p className="text-gray-400 text-xs mb-5">Distribuição de assinaturas</p>
          {loading ? (
            <div className="flex items-center justify-center h-[120px] text-gray-500 text-sm">Carregando...</div>
          ) : (
            <div className="space-y-3">
              {planBreakdown.map((d) => (
                <CssBar key={d.name} label={d.name} value={d.value} max={planMax} color={d.color} />
              ))}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Status das Empresas</h3>
          <p className="text-gray-400 text-xs mb-5">Ativas vs. inativas</p>
          {loading ? (
            <div className="flex items-center justify-center h-[120px] text-gray-500 text-sm">Carregando...</div>
          ) : (
            <div className="space-y-3">
              {statusData.map((d) => (
                <CssBar key={d.name} label={d.name} value={d.value} max={statusMax} color={d.color} />
              ))}
            </div>
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
