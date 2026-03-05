import {
  Building2, Users, TrendingUp, DollarSign, Activity, Star,
  ArrowUpRight, MoreHorizontal, CheckCircle, XCircle,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { StatCard } from "../../components/shared/StatCard";
import { adminStats, adminRevenueData, companies, therapyDistribution } from "../../data/mockData";

const planColors: Record<string, string> = {
  Premium: "bg-violet-100 text-violet-700",
  Business: "bg-blue-100 text-blue-700",
  Starter: "bg-gray-100 text-gray-600",
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white">Dashboard Geral</h1>
          <p className="text-gray-400 text-sm mt-0.5">Visão consolidada de toda a plataforma</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
          <Activity className="w-4 h-4 text-green-400" />
          <span>Plataforma ativa</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-violet-600 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-violet-400" />
            </div>
            <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +5
            </span>
          </div>
          <p className="text-gray-400 text-sm">Empresas</p>
          <p className="text-3xl text-white mt-1" style={{ fontWeight: 700 }}>{adminStats.totalCompanies}</p>
          <p className="text-xs text-gray-500 mt-1">{adminStats.activeCompanies} ativas</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-teal-600 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-teal-600/20 flex items-center justify-center">
              <Star className="w-5 h-5 text-teal-400" />
            </div>
            <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +12
            </span>
          </div>
          <p className="text-gray-400 text-sm">Terapeutas</p>
          <p className="text-3xl text-white mt-1" style={{ fontWeight: 700 }}>{adminStats.totalTherapists}</p>
          <p className="text-xs text-gray-500 mt-1">Em toda a rede</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-blue-600 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +8.2%
            </span>
          </div>
          <p className="text-gray-400 text-sm">Clientes</p>
          <p className="text-3xl text-white mt-1" style={{ fontWeight: 700 }}>{adminStats.totalClients.toLocaleString("pt-BR")}</p>
          <p className="text-xs text-gray-500 mt-1">Ativos na plataforma</p>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-amber-600 transition-colors">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-600/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-400" />
            </div>
            <span className="text-xs bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> +{adminStats.growthRate}%
            </span>
          </div>
          <p className="text-gray-400 text-sm">Receita do Mês</p>
          <p className="text-3xl text-white mt-1" style={{ fontWeight: 700 }}>
            R$ {(adminStats.monthRevenue / 1000).toFixed(1)}k
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Total: R$ {(adminStats.totalRevenue / 1000).toFixed(0)}k
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-white">Receita da Plataforma</h3>
              <p className="text-gray-400 text-xs mt-0.5">Últimos 7 meses</p>
            </div>
            <button className="text-gray-400 hover:text-white">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={adminRevenueData}>
              <defs>
                <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="month" stroke="#6B7280" tick={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "0.75rem", color: "#F9FAFB" }}
                formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
              />
              <Area type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2} fill="url(#adminRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Therapy Distribution */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Terapias Populares</h3>
          <p className="text-gray-400 text-xs mb-4">Por número de sessões</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={therapyDistribution}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {therapyDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "0.75rem", color: "#F9FAFB" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {therapyDistribution.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                  <span className="text-xs text-gray-400 truncate max-w-[120px]">{item.name}</span>
                </div>
                <span className="text-xs text-white" style={{ fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white">Empresas Cadastradas</h3>
          <button className="text-violet-400 text-sm hover:text-violet-300 flex items-center gap-1">
            Ver todas <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-xs text-gray-400 pb-3 pr-4">Empresa</th>
                <th className="text-left text-xs text-gray-400 pb-3 pr-4">Plano</th>
                <th className="text-left text-xs text-gray-400 pb-3 pr-4">Terapeutas</th>
                <th className="text-left text-xs text-gray-400 pb-3 pr-4">Clientes</th>
                <th className="text-left text-xs text-gray-400 pb-3 pr-4">Receita/Mês</th>
                <th className="text-left text-xs text-gray-400 pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-750 group">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shrink-0"
                        style={{ background: company.color, fontWeight: 700 }}
                      >
                        {company.logo}
                      </div>
                      <div>
                        <p className="text-sm text-white">{company.name}</p>
                        <p className="text-xs text-gray-500">{company.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${planColors[company.plan]}`}>
                      {company.plan}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-300">{company.therapistsCount}</td>
                  <td className="py-3 pr-4 text-sm text-gray-300">{company.clientsCount}</td>
                  <td className="py-3 pr-4 text-sm text-white" style={{ fontWeight: 600 }}>
                    R$ {company.monthRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3">
                    {company.status === "active" ? (
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">Ativa</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-red-400">
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">Inativa</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
