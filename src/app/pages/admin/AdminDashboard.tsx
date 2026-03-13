import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  Building2, Users, TrendingUp, DollarSign, Activity, Star,
  CheckCircle, XCircle, LayoutGrid, CreditCard, ChevronRight,
} from "../../components/shared/icons";
import { useData } from "../../context/DataContext";
import {
  DEFAULT_COMPANY_PLANS, DEFAULT_THERAPIST_PLANS,
  companyPlanMRR, normalizePlanName,
} from "../../lib/planConfig";

const PIE_COLORS = ["#6B7280", "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EC4899"];

const planColors: Record<string, string> = {
  Premium:  "bg-amber-100 text-amber-700 border-amber-200",
  Business: "bg-violet-100 text-violet-700 border-violet-200",
  Starter:  "bg-blue-100 text-blue-700 border-blue-200",
  Gratuito: "bg-gray-100 text-gray-600 border-gray-200",
};

// ─── Tab: Visão Geral ─────────────────────────────────────────────────────────

function TabGeral({
  companies, therapists, clients, loading,
}: {
  companies: ReturnType<typeof useData>["allAdminCompanies"];
  therapists: ReturnType<typeof useData>["allAdminTherapists"];
  clients: ReturnType<typeof useData>["allAdminClients"];
  loading: boolean;
}) {
  const stats = useMemo(() => ({
    totalCompanies:  companies.length,
    activeCompanies: companies.filter((c) => c.status === "active").length,
    totalTherapists: therapists.length,
    totalClients:    clients.length,
  }), [companies, therapists, clients]);

  const planDist = useMemo(() => {
    const counts: Record<string, number> = {};
    companies.forEach((c) => {
      // Normalize plan key: "company_free" → "Gratuito"
      const key = normalizePlanName(c.plan || "Gratuito");
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], i) => ({
      name, value, color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [companies]);

  const topCompanies = useMemo(
    () => [...companies].sort((a, b) => (b.therapistsCount || 0) - (a.therapistsCount || 0)).slice(0, 10),
    [companies]
  );

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Empresas Cadastradas", value: stats.totalCompanies, sub: `${stats.activeCompanies} ativas`, icon: Building2, color: "#7C3AED" },
          { label: "Profissionais",        value: stats.totalTherapists, sub: "na plataforma",              icon: Star,     color: "#0D9488" },
          { label: "Clientes",             value: stats.totalClients,    sub: "cadastrados",                icon: Users,    color: "#3B82F6" },
          { label: "Taxa de Atividade",    value: stats.totalCompanies > 0 ? `${Math.round((stats.activeCompanies / stats.totalCompanies) * 100)}%` : "—", sub: "empresas ativas", icon: Activity, color: "#10B981" },
        ].map((k) => (
          <div key={k.label} className="bg-gray-800 rounded-xl border border-gray-700 p-5 hover:border-gray-600 transition-colors">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.color}25` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <p className="text-gray-400 text-sm">{k.label}</p>
            <p className="text-2xl text-white mt-0.5" style={{ fontWeight: 700 }}>
              {loading ? "—" : k.value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profissionais por empresa */}
        <div className="lg:col-span-2 bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Profissionais por Empresa</h3>
          <p className="text-gray-400 text-xs mb-4">Top 10 empresas com mais profissionais</p>
          {topCompanies.length === 0 ? (
            <div className="flex items-center justify-center h-[200px] text-gray-500 text-sm">
              {loading ? "Carregando..." : "Sem dados"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topCompanies.map((c) => ({ name: c.name.split(" ")[0], profissionais: c.therapistsCount || 0, clientes: c.clientsCount || 0 }))} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6B7280" tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "0.75rem", color: "#F9FAFB" }} />
                <Bar dataKey="profissionais" fill="#0D9488" radius={[3, 3, 0, 0]} isAnimationActive={false} name="Profissionais" />
                <Bar dataKey="clientes"   fill="#3B82F6" radius={[3, 3, 0, 0]} isAnimationActive={false} name="Clientes" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Planos */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Distribuição de Planos</h3>
          <p className="text-gray-400 text-xs mb-4">Empresas por plano</p>
          {planDist.length === 0 ? (
            <div className="flex items-center justify-center h-[140px] text-gray-500 text-sm">
              {loading ? "Carregando..." : "Sem dados"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={planDist} cx="50%" cy="50%" innerRadius={34} outerRadius={60} paddingAngle={3} dataKey="value" isAnimationActive={false}>
                  {planDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#1F2937", border: "1px solid #374151", borderRadius: "0.75rem", color: "#F9FAFB" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="space-y-1.5 mt-2">
            {planDist.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  <span className="text-xs text-gray-400">{item.name}</span>
                </div>
                <span className="text-xs text-white" style={{ fontWeight: 600 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Company list — sem dados sensíveis de clientes */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-white">Empresas Cadastradas</h3>
            <p className="text-gray-400 text-xs mt-0.5">Visão agregada · sem dados individuais de clientes</p>
          </div>
          <span className="text-xs bg-gray-700 text-gray-400 px-2.5 py-1 rounded-full">{companies.length} total</span>
        </div>

        {companies.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-8">{loading ? "Carregando..." : "Nenhuma empresa"}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700 text-left">
                  {["Empresa", "Plano", "Profissionais", "Clientes (total)", "Unidades", "Status"].map((h) => (
                    <th key={h} className="text-xs text-gray-400 pb-3 pr-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/60">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-700/30">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs shrink-0" style={{ background: c.color || "#7C3AED", fontWeight: 700 }}>
                          {(c.logo || c.name).charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm text-white">{c.name}</p>
                          <p className="text-xs text-gray-500">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${planColors[normalizePlanName(c.plan)] || planColors.Gratuito}`}>
                        {normalizePlanName(c.plan) || "Gratuito"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-sm text-gray-300">{c.therapistsCount || 0}</td>
                    <td className="py-3 pr-4 text-sm text-gray-300">{c.clientsCount || 0}</td>
                    <td className="py-3 pr-4 text-sm text-gray-300">{(c as any).unitsCount || 1}</td>
                    <td className="py-3">
                      {c.status === "active"
                        ? <div className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3.5 h-3.5" /><span className="text-xs">Ativa</span></div>
                        : <div className="flex items-center gap-1 text-red-400"><XCircle className="w-3.5 h-3.5" /><span className="text-xs">Inativa</span></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Plataforma / Financeiro ─────────────────────────────────────────────

function TabPlataforma({
  companies, therapists, loading,
}: {
  companies: ReturnType<typeof useData>["allAdminCompanies"];
  therapists: ReturnType<typeof useData>["allAdminTherapists"];
  loading: boolean;
}) {
  const [syncing, setSyncing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const { refresh } = useData();
  
  const handleSyncRevenues = async () => {
    console.log("🚀 Sync button clicked");
    setSyncing(true);
    try {
      console.log("📦 Importing syncCompanyRevenues...");
      const { syncCompanyRevenues } = await import("../../../lib/firestore");
      console.log("✅ Import successful, calling function...");
      await syncCompanyRevenues();
      console.log("✅ Sync completed, refreshing data...");
      refresh();
      alert("✅ Receitas sincronizadas com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao sincronizar receitas:", error);
      alert("❌ Erro ao sincronizar receitas. Verifique o console.");
    } finally {
      setSyncing(false);
    }
  };

  const handleMigratePlans = async () => {
    setMigrating(true);
    try {
      const { syncCompanyPlanNames } = await import("../../../lib/firestore");
      const result = await syncCompanyPlanNames();
      refresh();
      alert(`✅ Migração concluída! ${result.fixed} empresa(s) atualizada(s) de ${result.total} total.`);
    } catch (error) {
      console.error("❌ Erro ao migrar planos:", error);
      alert("❌ Erro ao migrar planos. Verifique o console.");
    } finally {
      setMigrating(false);
    }
  };

  // MRR from companies (subscription fees paid to ZEN HUB)
  const companyMRR = useMemo(
    () => companies.reduce((s, c) => s + companyPlanMRR(c.plan), 0),
    [companies]
  );

  // MRR from therapists — approximate by plan distribution
  // In a real setup therapists would have a planId field; for now we group by
  // appointment count vs tier limits as proxy (simplified: count all as free)
  const therapistMRR = useMemo(() => {
    // When therapists have a "plan" field use it; otherwise default to free
    return therapists.reduce((s, t) => {
      const planName = (t as any).plan || "Gratuito";
      const planCfg = DEFAULT_THERAPIST_PLANS.find(
        (p) => p.name.toLowerCase() === planName.toLowerCase()
      );
      return s + (planCfg?.price ?? 0);
    }, 0);
  }, [therapists]);

  const totalMRR = companyMRR + therapistMRR;
  const projectedARR = totalMRR * 12;

  // MRR by company plan breakdown
  const companyPlanRevenue = useMemo(() => {
    const breakdown: Record<string, { count: number; mrr: number }> = {};
    companies.forEach((c) => {
      // Normalize: handles both plan IDs ("company_free") and names ("Gratuito")
      const key = normalizePlanName(c.plan || "Gratuito");
      const price = companyPlanMRR(c.plan || "Gratuito");
      if (!breakdown[key]) breakdown[key] = { count: 0, mrr: 0 };
      breakdown[key].count++;
      breakdown[key].mrr += price;
    });
    return DEFAULT_COMPANY_PLANS.map((p) => ({
      name: p.name,
      count: breakdown[p.name]?.count || 0,
      mrr: breakdown[p.name]?.mrr || 0,
      price: p.price,
      color: p.color,
    }));
  }, [companies]);

  // Therapist plan breakdown
  const therapistPlanRevenue = useMemo(() => {
    const breakdown: Record<string, { count: number; mrr: number }> = {};
    therapists.forEach((t) => {
      const key = (t as any).plan || "Gratuito";
      const planCfg = DEFAULT_THERAPIST_PLANS.find((p) => p.name.toLowerCase() === key.toLowerCase());
      if (!breakdown[key]) breakdown[key] = { count: 0, mrr: 0 };
      breakdown[key].count++;
      breakdown[key].mrr += planCfg?.price ?? 0;
    });
    return DEFAULT_THERAPIST_PLANS.map((p) => ({
      name: p.name,
      count: breakdown[p.name]?.count || 0,
      mrr: breakdown[p.name]?.mrr || 0,
      price: p.price,
      color: p.color,
    }));
  }, [therapists]);

  // Operational revenue (what companies earn from clients — NOT platform revenue)
  const operationalMRR = useMemo(
    () => companies.reduce((s, c) => s + (c.monthRevenue || 0), 0),
    [companies]
  );

  const fmt = (v: number) =>
    v >= 1000 ? `R$ ${(v / 1000).toFixed(1)}k` : `R$ ${v.toLocaleString("pt-BR")}`;

  return (
    <div className="space-y-6">
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR Empresas",      value: fmt(companyMRR),    sub: "assinaturas de empresa",       icon: Building2,   color: "#7C3AED" },
          { label: "MRR Profissionais", value: fmt(therapistMRR),  sub: "assinaturas de profissional",  icon: Star,        color: "#0D9488" },
          { label: "MRR Total",        value: fmt(totalMRR),      sub: "receita recorrente mensal",  icon: DollarSign,  color: "#F59E0B" },
          { label: "ARR Projetado",    value: fmt(projectedARR),  sub: "receita anual projetada",    icon: TrendingUp,  color: "#3B82F6" },
        ].map((k) => (
          <div key={k.label} className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${k.color}25` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <p className="text-gray-400 text-sm">{k.label}</p>
            <p className="text-2xl text-white mt-0.5" style={{ fontWeight: 700 }}>
              {loading ? "—" : k.value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Aviso: receita operacional vs plataforma */}
      <div className="bg-violet-900/20 border border-violet-700/40 rounded-xl p-4 flex items-start gap-3">
        <CreditCard className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-violet-300 text-sm" style={{ fontWeight: 600 }}>Dois tipos de receita no ZEN HUB</p>
          <p className="text-violet-300/70 text-xs mt-0.5">
            <strong className="text-violet-300">Receita da Plataforma (MRR)</strong> — o que empresas e profissionais pagam ao ZEN HUB pelas assinaturas de planos. &nbsp;|&nbsp;
            <strong className="text-violet-300">Receita Operacional</strong> — o que as empresas movimentam com seus clientes (R$ {operationalMRR.toLocaleString("pt-BR")}/mês no total).
          </p>
        </div>
        <button
          onClick={handleSyncRevenues}
          disabled={syncing || migrating}
          className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-600 text-white text-xs rounded-lg transition-colors shrink-0"
          style={{ fontWeight: 600 }}
        >
          {syncing ? "Sincronizando..." : "🔄 Sincronizar Receitas"}
        </button>
        <button
          onClick={handleMigratePlans}
          disabled={syncing || migrating}
          title="Converte IDs de plano (ex: company_free) para nomes (ex: Gratuito) no Firestore"
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white text-xs rounded-lg transition-colors shrink-0"
          style={{ fontWeight: 600 }}
        >
          {migrating ? "Migrando..." : "🔧 Migrar Planos"}
        </button>
      </div>

      {/* Breakdown por plano — empresas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Assinaturas de Empresas</h3>
          <p className="text-gray-400 text-xs mb-4">Por plano · MRR gerado à plataforma</p>
          <div className="space-y-3">
            {companyPlanRevenue.map((row) => (
              <div key={row.name} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{row.name}</span>
                    <span className="text-xs text-gray-400">{row.count} empresa{row.count !== 1 ? "s" : ""} · {fmt(row.mrr)}/mês</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: companyMRR > 0 ? `${(row.mrr / (companyMRR || 1)) * 100}%` : "0%",
                        background: row.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-400">MRR total de empresas</span>
            <span className="text-sm text-white" style={{ fontWeight: 700 }}>{fmt(companyMRR)}</span>
          </div>
        </div>

        {/* Breakdown por plano — profissionais */}
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-white mb-1">Assinaturas de Profissionais</h3>
          <p className="text-gray-400 text-xs mb-4">Por plano · MRR gerado à plataforma</p>
          <div className="space-y-3">
            {therapistPlanRevenue.map((row) => (
              <div key={row.name} className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: row.color }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-300">{row.name}</span>
                    <span className="text-xs text-gray-400">{row.count} profissional{row.count !== 1 ? "is" : ""} · {fmt(row.mrr)}/mês</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: therapistMRR > 0 ? `${(row.mrr / (therapistMRR || 1)) * 100}%` : "0%",
                        background: row.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-400">MRR total de profissionais</span>
            <span className="text-sm text-white" style={{ fontWeight: 700 }}>{fmt(therapistMRR)}</span>
          </div>
        </div>
      </div>

      {/* Receita operacional das empresas */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white">Receita Operacional das Empresas</h3>
            <p className="text-gray-400 text-xs mt-0.5">O que cada empresa está movimentando com seus clientes este mês</p>
          </div>
          <span className="text-xs bg-emerald-900/40 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-700/40">
            {fmt(operationalMRR)} / mês
          </span>
        </div>
        {companies.length === 0 ? (
          <p className="text-center text-gray-500 text-sm py-6">{loading ? "Carregando..." : "Sem dados"}</p>
        ) : (
          <div className="space-y-2">
            {[...companies]
              .filter((c) => (c.monthRevenue || 0) > 0)
              .sort((a, b) => (b.monthRevenue || 0) - (a.monthRevenue || 0))
              .map((c, idx) => {
                const pct = operationalMRR > 0 ? ((c.monthRevenue || 0) / operationalMRR) * 100 : 0;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <span className="text-gray-500 text-xs w-4">{idx + 1}</span>
                    <div className="flex items-center gap-2 w-44 shrink-0">
                      <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs shrink-0" style={{ background: c.color || "#7C3AED", fontWeight: 700 }}>
                        {(c.logo || c.name).charAt(0)}
                      </div>
                      <span className="text-xs text-gray-300 truncate">{c.name}</span>
                    </div>
                    <div className="flex-1 bg-gray-700 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: c.color || "#7C3AED" }} />
                    </div>
                    <span className="text-xs text-white w-24 text-right" style={{ fontWeight: 600 }}>
                      R$ {(c.monthRevenue || 0).toLocaleString("pt-BR")}
                    </span>
                  </div>
                );
              })}
            {companies.every((c) => !c.monthRevenue) && (
              <p className="text-center text-gray-500 text-sm py-4">
                Nenhuma receita operacional registrada este mês.<br />
                <span className="text-xs text-gray-600">O campo <code className="text-gray-500">monthRevenue</code> das empresas está vazio ou zerado no Firestore.</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { allAdminCompanies, allAdminTherapists, allAdminClients, loading } = useData();
  const [activeTab, setActiveTab] = useState<"geral" | "plataforma">("geral");

  const tabs = [
    { id: "geral",      label: "Visão Geral",         icon: LayoutGrid  },
    { id: "plataforma", label: "Financeiro da Plataforma", icon: CreditCard },
  ] as const;

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
          <span>{loading ? "Carregando..." : "Plataforma ativa"}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800/60 p-1 rounded-xl border border-gray-700 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              activeTab === t.id
                ? "bg-violet-600 text-white shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
            style={{ fontWeight: activeTab === t.id ? 600 : 400 }}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "geral" && (
        <TabGeral companies={allAdminCompanies} therapists={allAdminTherapists} clients={allAdminClients} loading={loading} />
      )}
      {activeTab === "plataforma" && (
        <TabPlataforma companies={allAdminCompanies} therapists={allAdminTherapists} loading={loading} />
      )}
    </div>
  );
}