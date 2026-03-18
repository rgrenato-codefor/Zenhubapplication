import { useState, useMemo, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Wallet,
  Plus, X, Trash2, Edit2, Filter, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight,
  ArrowUp, Calendar, Banknote, ShoppingBag,
  Briefcase, Globe, Zap, Users, ClipboardList, Percent,
} from "../../components/shared/icons";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyPlan } from "../../hooks/useCompanyPlan";
import { PlanGate } from "../../components/shared/PlanGate";
import { useFinancial, type FinancialTransaction } from "../../context/FinancialContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type TxType = "entrada" | "saida";
type SortKey = "createdAt" | "date" | "description" | "category" | "paymentMethod" | "amount";
type SortDir = "asc" | "desc";

// ─── Pagination ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { key: "comissoes",     label: "Comissões",                  color: "#6366F1", icon: Percent },
  { key: "produtos",      label: "Produtos / Insumos",         color: "#F59E0B", icon: ShoppingBag },
  { key: "pessoal",       label: "Pessoal",                    color: "#EF4444", icon: Users },
  { key: "aluguel",       label: "Aluguel / Infraestrutura",   color: "#8B5CF6", icon: Globe },
  { key: "marketing",     label: "Marketing",                  color: "#3B82F6", icon: Zap },
  { key: "equipamentos",  label: "Equipamentos",               color: "#10B981", icon: Briefcase },
  { key: "utilities",     label: "Contas (luz/água/internet)", color: "#6B7280", icon: ArrowUp },
  { key: "outros_saida",  label: "Outros",                     color: "#9CA3AF", icon: ClipboardList },
];

const INCOME_CATEGORIES = [
  { key: "atendimentos",    label: "Atendimentos / Serviços", color: "#10B981", icon: Wallet },
  { key: "produtos_venda",  label: "Venda de Produtos",       color: "#3B82F6", icon: ShoppingBag },
  { key: "planos",          label: "Planos / Pacotes",        color: "#8B5CF6", icon: ClipboardList },
  { key: "outros_entrada",  label: "Outros",                  color: "#9CA3AF", icon: DollarSign },
];

const PAYMENT_METHODS = ["Dinheiro", "Cartão de Crédito", "Cartão de Débito", "PIX", "Transferência", "Boleto"];

const PERIODS = [
  { key: "month",  label: "Este mês" },
  { key: "3m",     label: "Últimos 3 meses" },
  { key: "6m",     label: "Últimos 6 meses" },
  { key: "year",   label: "Este ano" },
];

// ─── Form blank ───────────────────────────────────────────────────────────────

const BLANK_FORM = {
  type: "entrada" as TxType,
  category: "atendimentos",
  description: "",
  amount: "",
  date: new Date().toISOString().split("T")[0],
  paymentMethod: "PIX",
  notes: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function shortMonth(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function filterByPeriod(txs: FinancialTransaction[], period: string): FinancialTransaction[] {
  const now = new Date();
  const cutoff = new Date(now);
  if (period === "month") {
    cutoff.setDate(1);
    cutoff.setHours(0, 0, 0, 0);
  } else if (period === "3m") {
    cutoff.setMonth(now.getMonth() - 3);
  } else if (period === "6m") {
    cutoff.setMonth(now.getMonth() - 6);
  } else {
    cutoff.setFullYear(now.getFullYear(), 0, 1);
    cutoff.setHours(0, 0, 0, 0);
  }
  return txs.filter((t) => new Date(t.date + "T12:00:00") >= cutoff);
}

function getCategoryLabel(key: string) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.key === key)?.label ||
    INCOME_CATEGORIES.find((c) => c.key === key)?.label ||
    key
  );
}

function getCategoryColor(key: string) {
  return (
    EXPENSE_CATEGORIES.find((c) => c.key === key)?.color ||
    INCOME_CATEGORIES.find((c) => c.key === key)?.color ||
    "#9CA3AF"
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, color, positive,
}: {
  label: string; value: string; sub?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string; positive?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-gray-900 text-2xl" style={{ fontWeight: 700 }}>{value}</p>
        {sub && (
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            {positive !== undefined && (
              positive
                ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            )}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// custom tooltip for AreaChart
function CashFlowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="text-gray-500 mb-1" style={{ fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span className="text-gray-600">{p.name}:</span>
          <span style={{ fontWeight: 700, color: p.color }}>{fmtBRL(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CompanyFinancial() {
  const { company } = usePageData();
  const primaryColor = company?.color || "#0D9488";
  const { planConfig, hasModule, isLoading: planLoading } = useCompanyPlan(company?.plan);

  // ── Shared financial state from context ──────────────────────────────────
  const { transactions, isLoading: txLoading, addTransaction, updateTransaction, deleteTransaction } = useFinancial();

  // ── Local UI state ───────────────────────────────────────────────────────
  const [period, setPeriod] = useState("month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [tab, setTab] = useState<"all" | "entrada" | "saida">("all");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTx, setEditTx] = useState<FinancialTransaction | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Sort & pagination ─────────────────────────────────────────────────────
  // Default: insertion order desc — id = "tx_{timestamp}_{random}" → newest first
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);

  // Reset to page 0 whenever filter/sort/tab/period changes
  useEffect(() => { setPage(0); }, [sortKey, sortDir, tab, search, period]);

  // ── Derived data — all hooks before any early return ─────────────────────
  const filtered = useMemo(() => filterByPeriod(transactions, period), [transactions, period]);

  const totalEntradas = filtered.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0);
  const totalSaidas   = filtered.filter((t) => t.type === "saida").reduce((s, t) => s + t.amount, 0);
  const saldoLiquido  = totalEntradas - totalSaidas;
  const margem        = totalEntradas > 0 ? (saldoLiquido / totalEntradas) * 100 : 0;

  // Area chart: group by month
  const chartData = useMemo(() => {
    const map: Record<string, { month: string; Entradas: number; Saídas: number }> = {};
    transactions.forEach((t) => {
      const key = t.date.substring(0, 7); // YYYY-MM
      if (!map[key]) map[key] = { month: shortMonth(t.date + "-01"), Entradas: 0, Saídas: 0 };
      if (t.type === "entrada") map[key].Entradas += t.amount;
      else map[key]["Saídas"] += t.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [transactions]);

  // Pie: expense breakdown
  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.filter((t) => t.type === "saida").forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([key, value]) => ({
        name: getCategoryLabel(key),
        value,
        color: getCategoryColor(key),
      }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  // All filtered + searched rows (full list for summary totals)
  const tableRows = useMemo(() => {
    let rows = [...filtered];
    if (tab !== "all") rows = rows.filter((t) => t.type === tab);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          getCategoryLabel(t.category).toLowerCase().includes(q) ||
          t.paymentMethod.toLowerCase().includes(q),
      );
    }
    // ── Sort ──────────────────────────────────────────────────────────────
    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "createdAt":     cmp = a.id.localeCompare(b.id); break;
        case "date":          cmp = a.date.localeCompare(b.date); break;
        case "description":   cmp = a.description.localeCompare(b.description, "pt"); break;
        case "category":      cmp = getCategoryLabel(a.category).localeCompare(getCategoryLabel(b.category), "pt"); break;
        case "paymentMethod": cmp = a.paymentMethod.localeCompare(b.paymentMethod, "pt"); break;
        case "amount":        cmp = a.amount - b.amount; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [filtered, tab, search, sortKey, sortDir]);

  // Pagination derived values
  const totalPages    = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  const safePage      = Math.min(page, totalPages - 1);
  const paginatedRows = tableRows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const firstItem     = tableRows.length === 0 ? 0 : safePage * PAGE_SIZE + 1;
  const lastItem      = Math.min((safePage + 1) * PAGE_SIZE, tableRows.length);

  // ── Plan gate — after all hooks ───────────────────────────────────────────
  if (!planLoading && planConfig && !hasModule("financial_control")) {
    return (
      <PlanGate
        module="financial_control"
        planConfig={planConfig}
        primaryColor={primaryColor}
        isLoading={planLoading}
      />
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  function openNew() {
    setEditTx(null);
    setForm({ ...BLANK_FORM });
    setModalOpen(true);
  }

  function openEdit(tx: FinancialTransaction) {
    setEditTx(tx);
    setForm({
      type: tx.type,
      category: tx.category,
      description: tx.description,
      amount: String(tx.amount),
      date: tx.date,
      paymentMethod: tx.paymentMethod,
      notes: tx.notes || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.description || !form.amount || !form.date) return;
    setSaving(true);
    try {
      const payload = {
        type: form.type,
        category: form.category,
        description: form.description,
        amount: parseFloat(String(form.amount).replace(",", ".")),
        date: form.date,
        paymentMethod: form.paymentMethod,
        notes: form.notes || undefined,
      };
      if (editTx) {
        await updateTransaction(editTx.id, payload);
      } else {
        await addTransaction(payload);
      }
      setModalOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteTransaction(id);
    setDeleteConfirm(null);
  }

  // ── Sort helper ───────────────────────────────────────────────────────────
  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "amount" || key === "createdAt" || key === "date" ? "desc" : "asc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) {
      return (
        <span className="inline-flex flex-col gap-px ml-1 opacity-25 align-middle">
          <ChevronUp className="w-2.5 h-2.5" />
          <ChevronDown className="w-2.5 h-2.5 -mt-0.5" />
        </span>
      );
    }
    return sortDir === "asc"
      ? <ChevronUp   className="w-3 h-3 ml-1 inline align-middle" style={{ color: primaryColor }} />
      : <ChevronDown className="w-3 h-3 ml-1 inline align-middle" style={{ color: primaryColor }} />;
  }

  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? "Este mês";

  const categories = form.type === "entrada" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (planLoading || txLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded-lg" />
            <div className="h-4 w-64 bg-gray-100 rounded-lg" />
          </div>
          <div className="h-9 w-32 bg-gray-200 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm h-64" />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-64" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-80" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-gray-900 text-xl" style={{ fontWeight: 700 }}>Controle Financeiro</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gestão de entradas, saídas e centro de custos</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Period picker */}
          <div className="relative">
            <button
              onClick={() => setPeriodOpen((o) => !o)}
              className="flex items-center gap-2 h-9 px-3.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span style={{ fontWeight: 500 }}>{periodLabel}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${periodOpen ? "rotate-180" : ""}`} />
            </button>
            {periodOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-20 overflow-hidden">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => { setPeriod(p.key); setPeriodOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${period === p.key ? "text-white" : "text-gray-700 hover:bg-gray-50"}`}
                    style={period === p.key ? { background: primaryColor, fontWeight: 600 } : {}}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={openNew}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-sm transition-opacity hover:opacity-90"
            style={{ background: primaryColor, fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" />
            Nova Transação
          </button>
        </div>
      </div>

      {/* ── KPI cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total de Entradas"
          value={fmtBRL(totalEntradas)}
          sub={`${filtered.filter((t) => t.type === "entrada").length} lançamentos`}
          icon={TrendingUp}
          color="#10B981"
          positive
        />
        <KpiCard
          label="Total de Saídas"
          value={fmtBRL(totalSaidas)}
          sub={`${filtered.filter((t) => t.type === "saida").length} lançamentos`}
          icon={TrendingDown}
          color="#EF4444"
          positive={false}
        />
        <KpiCard
          label="Saldo Líquido"
          value={fmtBRL(saldoLiquido)}
          sub={saldoLiquido >= 0 ? "Resultado positivo" : "Resultado negativo"}
          icon={Banknote}
          color={saldoLiquido >= 0 ? "#10B981" : "#EF4444"}
          positive={saldoLiquido >= 0}
        />
        <KpiCard
          label="Margem de Lucro"
          value={`${margem.toFixed(1)}%`}
          sub="Lucro / Receita bruta"
          icon={DollarSign}
          color={margem >= 30 ? "#10B981" : margem >= 10 ? "#F59E0B" : "#EF4444"}
          positive={margem >= 20}
        />
      </div>

      {/* ── Charts row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-gray-900 text-base" style={{ fontWeight: 600 }}>Fluxo de Caixa</h2>
              <p className="text-xs text-gray-400 mt-0.5">Evolução mensal de entradas e saídas</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEntradas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10B981" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSaidas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#EF4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CashFlowTooltip />} />
              <Area type="monotone" dataKey="Entradas" stroke="#10B981" strokeWidth={2}
                fill="url(#gradEntradas)" dot={false} />
              <Area type="monotone" dataKey="Saídas"   stroke="#EF4444" strokeWidth={2}
                fill="url(#gradSaidas)"   dot={false} />
              <Legend iconType="circle" iconSize={8}
                formatter={(v) => <span className="text-xs text-gray-500">{v}</span>} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart – cost center */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h2 className="text-gray-900 text-base" style={{ fontWeight: 600 }}>Centro de Custo</h2>
            <p className="text-xs text-gray-400 mt-0.5">Distribuição das saídas por categoria</p>
          </div>
          {pieData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300">
              <ShoppingBag className="w-10 h-10 mb-2" />
              <p className="text-xs">Nenhuma saída no período</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={44} outerRadius={68}
                    dataKey="value" paddingAngle={2}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [fmtBRL(v), ""]}
                    contentStyle={{ borderRadius: 12, border: "1px solid #E5E7EB", fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 space-y-1.5">
                {pieData.slice(0, 5).map((d) => {
                  const pct = totalSaidas > 0 ? (d.value / totalSaidas) * 100 : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-600 truncate flex-1">{d.name}</span>
                      <span className="text-gray-400 shrink-0">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Transaction table ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Table header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-gray-100">
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {(["all", "entrada", "saida"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                style={tab === t ? { fontWeight: 600 } : {}}
              >
                {t === "all" ? "Todas" : t === "entrada" ? "Entradas" : "Saídas"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-1 sm:max-w-xs">
            <div className="relative flex-1">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar transações…"
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 bg-white focus:outline-none focus:border-gray-400 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-50">
                <th
                  className="text-left px-5 py-3 text-xs cursor-pointer select-none whitespace-nowrap hover:text-gray-600 transition-colors"
                  style={sortKey === "createdAt" ? { color: primaryColor, fontWeight: 600 } : { color: "#9CA3AF", fontWeight: 500 }}
                  onClick={() => handleSort("createdAt")}
                  title="Ordenar por ordem de inserção"
                >
                  Inserção <SortIcon col="createdAt" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs cursor-pointer select-none whitespace-nowrap hover:text-gray-600 transition-colors"
                  style={sortKey === "date" ? { color: primaryColor, fontWeight: 600 } : { color: "#9CA3AF", fontWeight: 500 }}
                  onClick={() => handleSort("date")}
                >
                  Data <SortIcon col="date" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs cursor-pointer select-none hover:text-gray-600 transition-colors"
                  style={sortKey === "description" ? { color: primaryColor, fontWeight: 600 } : { color: "#9CA3AF", fontWeight: 500 }}
                  onClick={() => handleSort("description")}
                >
                  Descrição <SortIcon col="description" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs cursor-pointer select-none whitespace-nowrap hover:text-gray-600 transition-colors"
                  style={sortKey === "category" ? { color: primaryColor, fontWeight: 600 } : { color: "#9CA3AF", fontWeight: 500 }}
                  onClick={() => handleSort("category")}
                >
                  Categoria <SortIcon col="category" />
                </th>
                <th
                  className="text-left px-4 py-3 text-xs cursor-pointer select-none whitespace-nowrap hover:text-gray-600 transition-colors"
                  style={sortKey === "paymentMethod" ? { color: primaryColor, fontWeight: 600 } : { color: "#9CA3AF", fontWeight: 500 }}
                  onClick={() => handleSort("paymentMethod")}
                >
                  Pagamento <SortIcon col="paymentMethod" />
                </th>
                <th
                  className="text-right px-4 py-3 text-xs cursor-pointer select-none whitespace-nowrap hover:text-gray-600 transition-colors"
                  style={sortKey === "amount" ? { color: primaryColor, fontWeight: 600 } : { color: "#9CA3AF", fontWeight: 500 }}
                  onClick={() => handleSort("amount")}
                >
                  Valor <SortIcon col="amount" />
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                    Nenhuma transação encontrada.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((tx) => {
                  const isEntrada = tx.type === "entrada";
                  const catColor = getCategoryColor(tx.category);
                  // id = "tx_{timestamp}_{random}" → parse timestamp for insertion label
                  const insertionTs = parseInt(tx.id.split("_")[1] || "0", 10);
                  const insertionLabel = insertionTs
                    ? new Date(insertionTs).toLocaleString("pt-BR", {
                        day: "2-digit", month: "2-digit", year: "2-digit",
                        hour: "2-digit", minute: "2-digit",
                      })
                    : "—";
                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      {/* Inserção */}
                      <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                        {insertionLabel}
                      </td>
                      {/* Data */}
                      <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">
                        {new Date(tx.date + "T12:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      {/* Descrição */}
                      <td className="px-4 py-3.5 text-gray-900 max-w-[200px] truncate">
                        {tx.description}
                      </td>
                      {/* Categoria */}
                      <td className="px-4 py-3.5">
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                          style={{ background: `${catColor}18`, color: catColor, fontWeight: 500 }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: catColor }} />
                          {getCategoryLabel(tx.category)}
                        </span>
                      </td>
                      {/* Pagamento */}
                      <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">{tx.paymentMethod}</td>
                      {/* Valor */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1"
                          style={{ color: isEntrada ? "#10B981" : "#EF4444", fontWeight: 700 }}
                        >
                          {isEntrada
                            ? <ArrowUp className="w-3.5 h-3.5" />
                            : <TrendingDown className="w-3.5 h-3.5" />}
                          {fmtBRL(tx.amount)}
                        </span>
                      </td>
                      {/* Ações */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => openEdit(tx)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {deleteConfirm === tx.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(tx.id)}
                                className="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                style={{ fontWeight: 600 }}
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(tx.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Footer: summary + paginator ──────────────────────────────── */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Summary */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {tableRows.length > 0 ? (
              <>
                <span>
                  {firstItem}–{lastItem} de{" "}
                  <span style={{ fontWeight: 600 }}>{tableRows.length}</span> transação(ões)
                </span>
                <span className="text-emerald-600" style={{ fontWeight: 600 }}>
                  Entradas: {fmtBRL(tableRows.filter((t) => t.type === "entrada").reduce((s, t) => s + t.amount, 0))}
                </span>
                <span className="text-red-500" style={{ fontWeight: 600 }}>
                  Saídas: {fmtBRL(tableRows.filter((t) => t.type === "saida").reduce((s, t) => s + t.amount, 0))}
                </span>
              </>
            ) : (
              <span>Nenhuma transação</span>
            )}
          </div>

          {/* Paginator — only when multiple pages */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              {/* Prev */}
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers with ellipsis */}
              {Array.from({ length: totalPages }, (_, i) => i).map((i) => {
                const show = i === 0 || i === totalPages - 1 || Math.abs(i - safePage) <= 1;
                const isEllipsisBefore = i === safePage - 2 && safePage > 2;
                const isEllipsisAfter  = i === safePage + 2 && safePage < totalPages - 3;
                if (isEllipsisBefore || isEllipsisAfter) {
                  return <span key={`ell-${i}`} className="w-6 text-center text-xs text-gray-400">…</span>;
                }
                if (!show) return null;
                const isActive = i === safePage;
                return (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    className="w-8 h-8 rounded-lg text-xs transition-colors border"
                    style={
                      isActive
                        ? { background: primaryColor, color: "#fff", fontWeight: 700, borderColor: primaryColor }
                        : { background: "#fff", color: "#374151", borderColor: "#E5E7EB", fontWeight: 500 }
                    }
                  >
                    {i + 1}
                  </button>
                );
              })}

              {/* Next */}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={safePage === totalPages - 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Transaction modal ──────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-gray-900" style={{ fontWeight: 700 }}>
                {editTx ? "Editar Transação" : "Nova Transação"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* Type toggle */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block" style={{ fontWeight: 500 }}>Tipo</label>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden">
                  {(["entrada", "saida"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        setForm((f) => ({
                          ...f, type: t,
                          category: t === "entrada" ? "atendimentos" : "produtos",
                        }));
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm transition-all ${form.type === t ? "text-white" : "text-gray-500 hover:bg-gray-50"}`}
                      style={form.type === t ? { background: t === "entrada" ? "#10B981" : "#EF4444", fontWeight: 600 } : {}}
                    >
                      {t === "entrada"
                        ? <TrendingUp  className="w-4 h-4 shrink-0" />
                        : <TrendingDown className="w-4 h-4 shrink-0" />}
                      {t === "entrada" ? "Entrada" : "Saída"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block" style={{ fontWeight: 500 }}>Categoria</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setForm((f) => ({ ...f, category: cat.key }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition-all text-left ${
                        form.category === cat.key ? "border-transparent text-white" : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                      style={form.category === cat.key ? { background: cat.color, fontWeight: 600 } : {}}
                    >
                      <cat.icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block" style={{ fontWeight: 500 }}>Descrição *</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Atendimentos da semana, Salário, Aluguel…"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                />
              </div>

              {/* Amount + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block" style={{ fontWeight: 500 }}>Valor (R$) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0,00"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1.5 block" style={{ fontWeight: 500 }}>Data *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-gray-400 transition-colors"
                  />
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block" style={{ fontWeight: 500 }}>Forma de Pagamento</label>
                <select
                  value={form.paymentMethod}
                  onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:border-gray-400 bg-white transition-colors"
                >
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-gray-500 mb-1.5 block" style={{ fontWeight: 500 }}>Observações</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Informações adicionais opcionais…"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-gray-400 transition-colors resize-none"
                />
              </div>
            </div>

            {/* Modal footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.description || !form.amount || !form.date}
                className="px-6 py-2 rounded-xl text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                style={{ background: primaryColor, fontWeight: 600 }}
              >
                {saving ? "Salvando…" : editTx ? "Salvar alterações" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}