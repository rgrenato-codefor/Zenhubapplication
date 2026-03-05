import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Download, TrendingUp } from "lucide-react";
import { revenueData, weeklyData, therapyDistribution, companies } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

export default function CompanyReports() {
  const { user } = useAuth();
  const company = companies.find((c) => c.id === user?.companyId);
  const primaryColor = company?.color || "#0D9488";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Relatórios</h1>
          <p className="text-gray-500 text-sm mt-0.5">Análise detalhada do desempenho</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
          <Download className="w-4 h-4" /> Exportar PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-1">Receita Mensal</h3>
          <p className="text-gray-400 text-xs mb-4">Últimos 7 meses com comparativo de sessões</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="repRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop key="top" offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                  <stop key="bottom" offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]} />
              <Area type="monotone" dataKey="revenue" stroke={primaryColor} strokeWidth={2} fill="url(#repRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-1">Sessões por Dia da Semana</h3>
          <p className="text-gray-400 text-xs mb-4">Padrão de agendamentos</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weeklyData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }} />
              <Bar dataKey="sessions" fill={primaryColor} radius={[4, 4, 0, 0]} name="Sessões" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-1">Distribuição de Terapias</h3>
          <p className="text-gray-400 text-xs mb-4">Por número de sessões</p>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={therapyDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                  {therapyDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 flex-1">
              {therapyDistribution.slice(0, 5).map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-gray-600 flex-1 truncate">{item.name}</span>
                  <span className="text-xs text-gray-900" style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Indicadores de Performance</h3>
          <div className="space-y-4">
            {[
              { label: "Taxa de Retorno de Clientes", value: 68, color: primaryColor },
              { label: "Satisfação Média (Avaliações)", value: 94, color: "#059669" },
              { label: "Taxa de Ocupação da Agenda", value: 78, color: "#8B5CF6" },
              { label: "Crescimento Mensal de Receita", value: 12, color: "#D97706" },
            ].map((kpi) => (
              <div key={kpi.label}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-gray-600">{kpi.label}</p>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{kpi.value}%</p>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${kpi.value}%`, background: kpi.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}