import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  DollarSign, TrendingUp, ShoppingBag, Download, Calendar,
} from "lucide-react";
import { revenueData, weeklyData, appointments, therapists, therapies, companies } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

export default function CompanySales() {
  const { user } = useAuth();
  const company = companies.find((c) => c.id === user?.companyId);
  const primaryColor = company?.color || "#0D9488";

  const companyAppointments = appointments.filter((a) => a.companyId === user?.companyId);
  const completedSales = companyAppointments.filter((a) => a.status === "completed");
  const totalRevenue = completedSales.reduce((acc, a) => acc + a.price, 0);

  // Sales by therapy
  const salesByTherapy = therapies
    .filter((t) => t.companyId === user?.companyId)
    .map((t) => ({
      name: t.name,
      sessions: companyAppointments.filter((a) => a.therapyId === t.id).length,
      revenue: companyAppointments.filter((a) => a.therapyId === t.id).reduce((acc, a) => acc + a.price, 0),
      color: t.color,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Sales by therapist
  const salesByTherapist = therapists
    .filter((t) => t.companyId === user?.companyId)
    .map((t) => ({
      name: t.name.split(" ")[0],
      sessions: companyAppointments.filter((a) => a.therapistId === t.id).length,
      revenue: companyAppointments.filter((a) => a.therapistId === t.id).reduce((acc, a) => acc + a.price, 0),
    }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Vendas</h1>
          <p className="text-gray-500 text-sm mt-0.5">Análise financeira do período</p>
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
          {
            icon: DollarSign,
            title: "Receita do Mês",
            value: `R$ ${(8320).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            trend: "+12%",
            sub: "vs. mês anterior",
            color: "#059669",
          },
          {
            icon: ShoppingBag,
            title: "Total de Sessões",
            value: companyAppointments.length.toString(),
            trend: "+8%",
            sub: "vs. mês anterior",
            color: primaryColor,
          },
          {
            icon: TrendingUp,
            title: "Ticket Médio",
            value: `R$ ${(companyAppointments.length > 0 ? companyAppointments.reduce((a, b) => a + b.price, 0) / companyAppointments.length : 0).toFixed(2)}`,
            trend: "+3%",
            sub: "por sessão",
            color: "#8B5CF6",
          },
          {
            icon: Calendar,
            title: "Taxa de Ocupação",
            value: "78%",
            trend: "+5%",
            sub: "das vagas disponíveis",
            color: "#D97706",
          },
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
          <h3 className="text-gray-900 mb-1">Receita Mensal</h3>
          <p className="text-gray-400 text-xs mb-4">Últimos 7 meses</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="salesRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop key="top" offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                  <stop key="bottom" offset="95%" stopColor={primaryColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }} formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, "Receita"]} />
              <Area type="monotone" dataKey="revenue" stroke={primaryColor} strokeWidth={2} fill="url(#salesRevGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-1">Sessões por Terapeuta</h3>
          <p className="text-gray-400 text-xs mb-4">Este mês</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={salesByTherapist} barSize={30}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }} />
              <Bar dataKey="sessions" fill={primaryColor} radius={[4, 4, 0, 0]} name="Sessões" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales by Therapy */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-gray-900 mb-4">Desempenho por Terapia</h3>
        <div className="space-y-3">
          {salesByTherapy.map((item) => {
            const maxRevenue = Math.max(...salesByTherapy.map((s) => s.revenue));
            const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;
            return (
              <div key={item.name} className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
                <p className="text-sm text-gray-700 w-40 shrink-0 truncate">{item.name}</p>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${percentage}%`, background: item.color }} />
                </div>
                <p className="text-sm text-gray-500 w-10 text-right shrink-0">{item.sessions}x</p>
                <p className="text-sm text-gray-900 w-24 text-right shrink-0" style={{ fontWeight: 600 }}>
                  R$ {item.revenue.toFixed(2)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-gray-900">Últimas Transações</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-50">
              {["Data", "Cliente", "Terapia", "Terapeuta", "Valor", "Status"].map((h) => (
                <th key={h} className="text-left text-xs text-gray-400 px-6 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {companyAppointments.slice(0, 8).map((apt) => {
              const therapist = therapists.find((t) => t.id === apt.therapistId);
              const therapy = therapies.find((t) => t.id === apt.therapyId);
              const statusColors: Record<string, string> = {
                completed: "bg-emerald-50 text-emerald-700",
                confirmed: "bg-blue-50 text-blue-700",
                pending: "bg-amber-50 text-amber-700",
              };
              return (
                <tr key={apt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {new Date(apt.date + "T12:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-900">{apt.clientId === "cl1" ? "Mariana O." : apt.clientId === "cl2" ? "Carlos E." : "Patrícia L."}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{therapy?.name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{therapist?.name.split(" ")[0]}</td>
                  <td className="px-6 py-3 text-sm text-gray-900" style={{ fontWeight: 600 }}>R$ {apt.price.toFixed(2)}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[apt.status] || "bg-gray-50 text-gray-600"}`}>
                      {apt.status === "completed" ? "Concluído" : apt.status === "confirmed" ? "Confirmado" : "Pendente"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}