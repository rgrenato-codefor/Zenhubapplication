import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from "recharts";
import { adminRevenueData, companies } from "../../data/mockData";
import { TrendingUp, Download } from "lucide-react";

export default function AdminReports() {
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
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Receita Total por Mês</h3>
          <p className="text-gray-400 text-xs mb-4">Soma de todas as empresas</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={adminRevenueData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "0.75rem", color: "#F9FAFB" }} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]} />
              <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Empresas Ativas</h3>
          <p className="text-gray-400 text-xs mb-4">Crescimento da base de empresas</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={adminRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "0.75rem", color: "#F9FAFB" }} />
              <Line type="monotone" dataKey="companies" stroke="#0D9488" strokeWidth={2} dot={{ fill: "#0D9488", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-white mb-4">Ranking de Empresas por Receita</h3>
        <div className="space-y-3">
          {companies
            .filter((c) => c.monthRevenue > 0)
            .sort((a, b) => b.monthRevenue - a.monthRevenue)
            .map((company, idx) => {
              const maxRevenue = Math.max(...companies.map((c) => c.monthRevenue));
              const percentage = (company.monthRevenue / maxRevenue) * 100;
              return (
                <div key={company.id} className="flex items-center gap-4">
                  <span className="text-gray-500 text-sm w-5">{idx + 1}</span>
                  <div className="flex items-center gap-2 w-48 shrink-0">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs" style={{ background: company.color, fontWeight: 700 }}>
                      {company.logo.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-300 truncate">{company.name}</span>
                  </div>
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${percentage}%`, background: company.color }}
                    />
                  </div>
                  <span className="text-sm text-white w-28 text-right" style={{ fontWeight: 600 }}>
                    R$ {company.monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
