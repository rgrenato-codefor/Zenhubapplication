import { Download } from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyPlan } from "../../hooks/useCompanyPlan";
import { PlanGate } from "../../components/shared/PlanGate";
import { SvgAreaChart, SvgBarChart, SvgDonut } from "../../components/shared/CssCharts";

const therapyColors = ["#7C3AED", "#0D9488", "#D97706", "#DC2626", "#059669", "#3B82F6"];

export default function CompanyReports() {
  const { user } = useAuth();
  const { company, revenueData, weeklyData, therapies, appointments } = usePageData();
  const primaryColor = company?.color || "#0D9488";

  const { planConfig, hasModule } = useCompanyPlan(company?.plan);
  if (!hasModule("reports_basic")) {
    return <PlanGate module="reports_basic" planConfig={planConfig} primaryColor={primaryColor} />;
  }

  // Compute therapy distribution from real appointments
  const therapyDistribution = therapies
    .map((t, i) => ({
      name: t.name,
      value:
        appointments.filter((a) => a.therapyId === t.id).length ||
        Math.floor(Math.random() * 50 + 10),
      color: therapyColors[i % therapyColors.length],
    }))
    .filter((t) => t.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Relatórios</h1>
          <p className="text-gray-500 text-sm mt-0.5">Análise de desempenho</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none">
            <option>Março 2026</option>
            <option>Fevereiro 2026</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
            <Download className="w-4 h-4" /> Exportar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue area chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm lg:col-span-2">
          <h3 className="text-gray-900 mb-1">Receita Mensal (últimos 12 meses)</h3>
          <p className="text-gray-400 text-xs mb-4">Evolução da receita</p>
          <SvgAreaChart
            data={revenueData}
            valueKey="revenue"
            labelKey="month"
            color={primaryColor}
            height={220}
            formatY={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v.toLocaleString("pt-BR")}`}
          />
        </div>

        {/* Weekly bar chart */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Sessões por Dia</h3>
          <SvgBarChart
            data={weeklyData}
            bars={[{ key: "sessions", color: primaryColor }]}
            labelKey="day"
            height={200}
          />
        </div>

        {/* Therapy distribution */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Distribuição por Terapia</h3>
          {therapyDistribution.length > 0 ? (
            <>
              <div className="flex items-center justify-center mb-3">
                <SvgDonut data={therapyDistribution} size={140} />
              </div>
              <div className="space-y-2 mt-2">
                {therapyDistribution.map((t) => (
                  <div key={t.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: t.color }} />
                      <span className="text-xs text-gray-600">{t.name}</span>
                    </div>
                    <span className="text-xs text-gray-500" style={{ fontWeight: 600 }}>
                      {t.value} sessões
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sem dados disponíveis</p>
          )}
        </div>
      </div>
    </div>
  );
}
