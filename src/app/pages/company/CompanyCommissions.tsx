import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import {
  Edit, Save, X, Info, Percent, CheckCircle,
  ChevronLeft, ChevronRight, TrendingUp, Wallet,
  BarChart2, CircleDollarSign, AlertCircle,
  CalendarDays, Banknote, Star, ExternalLink,
} from "../../components/shared/icons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyUnit } from "../../context/CompanyContext";

type Tab = "earnings" | "settings";
type PayStatus = "pending" | "paid";

// ── Months (mock navigation) ──────────────────────────────────────────────────
const MONTHS = [
  { label: "Set 2025", key: "Set", year: 2025, month: 9 },
  { label: "Out 2025", key: "Out", year: 2025, month: 10 },
  { label: "Nov 2025", key: "Nov", year: 2025, month: 11 },
  { label: "Dez 2025", key: "Dez", year: 2025, month: 12 },
  { label: "Jan 2026", key: "Jan", year: 2026, month: 1 },
  { label: "Fev 2026", key: "Fev", year: 2026, month: 2 },
  { label: "Mar 2026", key: "Mar", year: 2026, month: 3 },
];

// ── Mock earnings history per therapist (last 6 months before current) ────────
const HISTORY_DATA: Record<string, { month: string; sessions: number; gross: number; commission: number; net: number }[]> = {
  t1: [
    { month: "Out", sessions: 25, gross: 3750, commission: 50, net: 1875 },
    { month: "Nov", sessions: 23, gross: 3450, commission: 50, net: 1725 },
    { month: "Dez", sessions: 30, gross: 4500, commission: 50, net: 2250 },
    { month: "Jan", sessions: 26, gross: 3900, commission: 50, net: 1950 },
    { month: "Fev", sessions: 28, gross: 4200, commission: 50, net: 2100 },
  ],
  t2: [
    { month: "Out", sessions: 21, gross: 3360, commission: 45, net: 1512 },
    { month: "Nov", sessions: 19, gross: 3040, commission: 45, net: 1368 },
    { month: "Dez", sessions: 26, gross: 4160, commission: 45, net: 1872 },
    { month: "Jan", sessions: 22, gross: 3520, commission: 45, net: 1584 },
    { month: "Fev", sessions: 24, gross: 3840, commission: 45, net: 1728 },
  ],
  t3: [
    { month: "Out", sessions: 17, gross: 2720, commission: 55, net: 1496 },
    { month: "Nov", sessions: 16, gross: 2560, commission: 55, net: 1408 },
    { month: "Dez", sessions: 21, gross: 3360, commission: 55, net: 1848 },
    { month: "Jan", sessions: 18, gross: 2880, commission: 55, net: 1584 },
    { month: "Fev", sessions: 19, gross: 3040, commission: 55, net: 1672 },
  ],
};

const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    badge: "bg-amber-50 text-amber-700 border border-amber-200",
    dot: "bg-amber-400",
  },
  paid: {
    label: "Pago",
    badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    dot: "bg-emerald-400",
  },
};

export default function CompanyCommissions() {
  const { user } = useAuth();
  const { company, therapists: allTherapists, sessionRecords,
    therapistStore: store, mutateUpdateTherapistCommission,
    mutateMarkCommissionPaid } = usePageData();
  const { selectedUnitId } = useCompanyUnit();
  const navigate = useNavigate();
  const primaryColor = company?.color || "#0D9488";
  const companyId = user?.companyId ?? "";

  const [tab, setTab] = useState<Tab>("earnings");
  const [monthIdx, setMonthIdx] = useState(MONTHS.length - 1); // Mar 2026
  const [paying, setPaying] = useState<string | null>(null); // therapist id being processed

  // ── Settings tab state ──────────────────────────────────────────────────────
  const [globalRate, setGlobalRate] = useState(50);
  const [rates, setRates] = useState<Record<string, number>>(
    Object.fromEntries(allTherapists.map((t) => [t.id, t.commission]))
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [tempRate, setTempRate] = useState(0);

  const companyTherapists = allTherapists
    .filter((t) => t.companyId === user?.companyId)
    .filter((t) => !selectedUnitId || (t as any).unitId === selectedUnitId);
  const currentMonth = MONTHS[monthIdx];

  // ── Earnings calculation per therapist ────────────────────────────────────
  const therapistEarnings = useMemo(() => {
    return companyTherapists.map((therapist) => {
      const rate = rates[therapist.id] ?? therapist.commission;

      // All session records for this therapist + company + current month
      const monthRecords = (sessionRecords as any[]).filter((r) => {
        if (r.therapistId !== therapist.id) return false;
        if (r.companyId && r.companyId !== companyId) return false;
        try {
          const d = new Date(r.date ?? r.completedAt ?? "");
          return (
            d.getFullYear() === currentMonth.year &&
            d.getMonth() + 1 === currentMonth.month
          );
        } catch {
          return false;
        }
      });

      // Split paid vs unpaid records
      const paidRecords   = monthRecords.filter((r: any) => r.paidByCompany === true);
      const unpaidRecords = monthRecords.filter((r: any) => r.paidByCompany !== true);

      let sessions: number, gross: number, net: number, alreadyPaid: number;

      if (monthRecords.length > 0) {
        sessions    = monthRecords.length;
        gross       = monthRecords.reduce((s: number, r: any) => s + (r.totalCharged ?? 0), 0);
        net         = monthRecords.reduce((s: number, r: any) => s + (r.therapistEarned ?? 0), 0);
        alreadyPaid = paidRecords.reduce((s: number, r: any) => s + (r.therapistEarned ?? 0), 0);
      } else {
        // Fallback to history data for months with no real records
        const hist = HISTORY_DATA[therapist.id]?.find((h) => h.month === currentMonth.key);
        sessions    = hist?.sessions ?? 0;
        gross       = hist?.gross ?? 0;
        net         = hist?.net ?? 0;
        alreadyPaid = 0; // historic data always shows as pending
      }

      const companyShare  = gross - net;
      const pendingAmount = net - alreadyPaid;
      const isPaid        = monthRecords.length > 0
        ? unpaidRecords.length === 0
        : false;
      const unpaidIds     = unpaidRecords.map((r: any) => r.id as string);

      return {
        therapist, rate, sessions, gross, net,
        companyShare, alreadyPaid, pendingAmount, isPaid, unpaidIds,
      };
    });
  }, [companyTherapists, rates, currentMonth, sessionRecords, companyId]);

  const totalNet     = therapistEarnings.reduce((s, e) => s + e.net, 0);
  const totalGross   = therapistEarnings.reduce((s, e) => s + e.gross, 0);
  const totalSessions = therapistEarnings.reduce((s, e) => s + e.sessions, 0);
  const totalPending  = therapistEarnings.reduce((s, e) => s + e.pendingAmount, 0);
  const pendingCount  = therapistEarnings.filter((e) => !e.isPaid && e.net > 0).length;

  // ── Pay handler ─────────────────────────────────────────────────────────────
  const handlePayTherapist = async (e: React.MouseEvent, entry: typeof therapistEarnings[0]) => {
    e.stopPropagation();
    if (entry.isPaid || entry.unpaidIds.length === 0) return;
    setPaying(entry.therapist.id);
    await mutateMarkCommissionPaid(entry.unpaidIds);
    setPaying(null);
  };

  const handlePayAll = async () => {
    const allUnpaidIds = therapistEarnings.flatMap((e) => e.unpaidIds);
    if (allUnpaidIds.length === 0) return;
    setPaying("all");
    await mutateMarkCommissionPaid(allUnpaidIds);
    setPaying(null);
  };

  // ── Settings helpers ────────────────────────────────────────────────────────
  const startEdit = (id: string, currentRate: number) => { setEditing(id); setTempRate(currentRate); };
  const saveEdit = (id: string) => {
    setRates((prev) => ({ ...prev, [id]: tempRate }));
    setEditing(null);
    mutateUpdateTherapistCommission(id, tempRate);
  };

  return (
    <div className="space-y-6">
      {/* Header + Tabs */}
      <div>
        <h1 className="text-gray-900">Comissões</h1>
        <p className="text-gray-500 text-sm mt-0.5">Ganhos dos terapeutas e configurações de remuneração</p>
        <div className="flex items-center gap-1 mt-4 bg-gray-100 rounded-xl p-1 w-fit">
          {[
            { id: "earnings" as Tab, label: "Ganhos", icon: Wallet },
            { id: "settings" as Tab, label: "Configurações", icon: Percent },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all"
              style={
                tab === id
                  ? { background: "#fff", color: primaryColor, fontWeight: 700, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }
                  : { color: "#6B7280" }
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: GANHOS                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "earnings" && (
        <div className="space-y-5">

          {/* Month navigator */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-3 py-2 shadow-sm">
              <button
                onClick={() => setMonthIdx((i) => Math.max(0, i - 1))}
                disabled={monthIdx === 0}
                className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div className="flex items-center gap-2 px-2">
                <CalendarDays className="w-4 h-4" style={{ color: primaryColor }} />
                <span className="text-sm text-gray-900 min-w-[80px] text-center" style={{ fontWeight: 700 }}>
                  {currentMonth.label}
                </span>
              </div>
              <button
                onClick={() => setMonthIdx((i) => Math.min(MONTHS.length - 1, i + 1))}
                disabled={monthIdx === MONTHS.length - 1}
                className="p-1 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {pendingCount > 0 && (
              <button
                onClick={handlePayAll}
                disabled={paying === "all"}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: primaryColor, fontWeight: 600 }}
              >
                <CheckCircle className="w-4 h-4" />
                {paying === "all" ? "Pagando..." : `Pagar todos (${pendingCount})`}
              </button>
            )}
          </div>

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total a Pagar",
                value: `R$ ${totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
                sub: `${pendingCount} pendente${pendingCount !== 1 ? "s" : ""}`,
                icon: Banknote,
                color: pendingCount > 0 ? "#F59E0B" : "#059669",
                highlight: pendingCount > 0,
              },
              {
                label: "Total Comissões",
                value: `R$ ${totalNet.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
                sub: "soma dos terapeutas",
                icon: CircleDollarSign,
                color: "#059669",
                highlight: false,
              },
              {
                label: "Receita Bruta",
                value: `R$ ${totalGross.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
                sub: currentMonth.label,
                icon: TrendingUp,
                color: primaryColor,
                highlight: false,
              },
              {
                label: "Sessões Realizadas",
                value: totalSessions,
                sub: `${companyTherapists.length} terapeutas`,
                icon: CalendarDays,
                color: "#8B5CF6",
                highlight: false,
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-xl border p-5 shadow-sm"
                style={{ borderColor: s.highlight ? "#FDE68A" : "#F3F4F6", background: s.highlight ? "#FFFBEB" : "#fff" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}20` }}>
                    <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  </div>
                  {s.highlight && <AlertCircle className="w-4 h-4 text-amber-400" />}
                </div>
                <p className="text-gray-500 text-xs">{s.label}</p>
                <p className="text-xl text-gray-900 mt-0.5" style={{ fontWeight: 700 }}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Bar chart — earnings per therapist */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900">Comissão por Terapeuta</h3>
                <p className="text-gray-400 text-xs mt-0.5">{currentMonth.label} · valor a receber</p>
              </div>
              <BarChart2 className="w-5 h-5 text-gray-300" />
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={therapistEarnings.map((e) => ({ name: e.therapist.name.split(" ")[0], net: e.net, gross: e.gross }))} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }}
                  formatter={(v: number, name: string) => [
                    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
                    name === "net" ? "Comissão (a pagar)" : "Receita bruta",
                  ]}
                />
                <Bar key="bar-gross" dataKey="gross" fill={`${primaryColor}30`} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar key="bar-net" dataKey="net" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {therapistEarnings.map((e) => (
                    <Cell
                      key={e.therapist.id}
                      fill={e.isPaid ? "#10B981" : primaryColor}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: `${primaryColor}30` }} />
                <span className="text-xs text-gray-400">Receita bruta</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: primaryColor }} />
                <span className="text-xs text-gray-400">Comissão a pagar</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-xs text-gray-400">Pago</span>
              </div>
            </div>
          </div>

          {/* Per-therapist earnings CARDS */}
          <div>
            <div className="flex items-center justify-between px-1 mb-3">
              <p className="text-sm text-gray-700" style={{ fontWeight: 700 }}>
                Detalhamento por Terapeuta
              </p>
              <p className="text-xs text-gray-400">{currentMonth.label} · clique para ver detalhes</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {therapistEarnings.map(({ therapist, rate, sessions, gross, net,
                companyShare, alreadyPaid, pendingAmount, isPaid, unpaidIds }) => {
                const status: PayStatus = isPaid ? "paid" : "pending";
                const cfg = STATUS_CONFIG[status];
                const isProcessing = paying === therapist.id;

                return (
                  <div
                    key={therapist.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group"
                    onClick={() => navigate(`/empresa/comissoes/terapeuta/${therapist.id}`)}
                  >
                    {/* Accent top bar */}
                    <div
                      className="h-1.5 w-full transition-colors"
                      style={{ background: isPaid ? "#10B981" : primaryColor }}
                    />

                    <div className="p-5">
                      {/* Header: avatar + name + detail hint */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0">
                            <img
                              src={therapist.avatar}
                              alt={therapist.name}
                              className="w-12 h-12 rounded-xl object-cover border-2 border-gray-100"
                            />
                            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${cfg.dot}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-gray-900 text-sm truncate" style={{ fontWeight: 700 }}>{therapist.name}</p>
                            <p className="text-xs text-gray-400">@{therapist.username}</p>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-0.5 shrink-0" />
                      </div>

                      {/* Specialty */}
                      <p className="text-xs text-gray-500 mb-4 truncate">{therapist.specialty}</p>

                      {/* Amount breakdown */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-gray-400">A receber — {currentMonth.label}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.badge}`} style={{ fontWeight: 600 }}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className={`text-2xl ${isPaid ? "text-emerald-500" : "text-emerald-600"}`} style={{ fontWeight: 700 }}>
                          R$ {pendingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                        </p>
                        {alreadyPaid > 0 && (
                          <p className="text-xs text-emerald-500 mt-0.5 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            R$ {alreadyPaid.toLocaleString("pt-BR", { minimumFractionDigits: 0 })} já pagos
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600" style={{ fontWeight: 600 }}>
                            <Percent className="w-2.5 h-2.5" />{rate}%
                          </span>
                          <div className="flex items-center gap-0.5">
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} className={`w-2.5 h-2.5 ${s <= Math.floor(therapist.rating) ? "fill-yellow-400 text-yellow-400" : "fill-gray-200 text-gray-200"}`} />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mini stats */}
                      <div className="grid grid-cols-3 gap-1.5 mb-4">
                        {[
                          { label: "Sessões", value: String(sessions) },
                          { label: "Bruto", value: `R$${(gross / 1000).toFixed(1)}k` },
                          { label: "Empresa", value: `R$${(companyShare / 1000).toFixed(1)}k` },
                        ].map((s) => (
                          <div key={s.label} className="bg-gray-50 rounded-xl py-2 px-1 text-center">
                            <p className="text-xs text-gray-900" style={{ fontWeight: 700 }}>{s.value}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Pay button */}
                      <button
                        onClick={(e) => handlePayTherapist(e, { therapist, rate, sessions, gross, net, companyShare, alreadyPaid, pendingAmount, isPaid, unpaidIds })}
                        disabled={isPaid || isProcessing || unpaidIds.length === 0}
                        className="w-full py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                        style={
                          !isPaid && unpaidIds.length > 0
                            ? { background: primaryColor, color: "#fff", fontWeight: 600 }
                            : { background: "#F0FDF4", color: "#059669", border: "1px solid #BBF7D0", fontWeight: 600 }
                        }
                      >
                        {isProcessing ? (
                          <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Pagando...</>
                        ) : !isPaid && unpaidIds.length > 0 ? (
                          <><Banknote className="w-4 h-4" /> Pagar comissão</>
                        ) : (
                          <><CheckCircle className="w-4 h-4" /> Pago ✓</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer totals */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs text-gray-500 mb-3" style={{ fontWeight: 700 }}>RESUMO DO MÊS — {currentMonth.label.toUpperCase()}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total de sessões", value: totalSessions, color: "#8B5CF6" },
                { label: "Receita bruta total", value: `R$ ${totalGross.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, color: primaryColor },
                { label: "A pagar (pendente)", value: `R$ ${totalPending.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, color: "#F59E0B" },
                { label: "Receita líquida empresa", value: `R$ ${(totalGross - totalNet).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`, color: "#374151" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-xs text-gray-400">{s.label}</p>
                  <p className="text-lg mt-0.5" style={{ fontWeight: 700, color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB: CONFIGURAÇÕES                                                    */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "settings" && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800" style={{ fontWeight: 600 }}>Como funciona o comissionamento</p>
              <p className="text-xs text-blue-600 mt-1">
                A comissão é o percentual do valor da sessão que o terapeuta recebe. O restante vai para a empresa.
                Você pode definir uma taxa global ou personalizada por terapeuta.
              </p>
            </div>
          </div>

          {/* Global Rate */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-gray-900">Taxa Global Padrão</h3>
                <p className="text-xs text-gray-500 mt-0.5">Aplicada quando não há taxa específica por terapeuta</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={10} max={90}
                  value={globalRate}
                  onChange={(e) => setGlobalRate(Number(e.target.value))}
                  className="w-32"
                  style={{ accentColor: primaryColor }}
                />
                <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 min-w-[70px] justify-center">
                  <Percent className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{globalRate}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 mb-1">Terapeuta recebe</p>
                <p className="text-2xl text-emerald-600" style={{ fontWeight: 700 }}>{globalRate}%</p>
              </div>
              <div className="text-2xl text-gray-300">+</div>
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 mb-1">Empresa retém</p>
                <p className="text-2xl" style={{ fontWeight: 700, color: primaryColor }}>{100 - globalRate}%</p>
              </div>
              <div className="text-2xl text-gray-300">=</div>
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500 mb-1">Sessão de R$ 150</p>
                <p className="text-lg text-gray-700" style={{ fontWeight: 600 }}>
                  R$ {(150 * globalRate / 100).toFixed(0)} / R$ {(150 * (100 - globalRate) / 100).toFixed(0)}
                </p>
              </div>
            </div>
          </div>

          {/* Per Therapist */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-gray-900 mb-4">Taxa por Terapeuta</h3>
            <div className="space-y-3">
              {companyTherapists.map((therapist) => {
                const rate = rates[therapist.id] ?? therapist.commission;
                const isEditing = editing === therapist.id;
                const monthEarnings = therapist.monthEarnings;

                return (
                  <div key={therapist.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <img
                      src={therapist.avatar}
                      alt={therapist.name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 border-2 border-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{therapist.name}</p>
                      <p className="text-xs text-gray-500">{therapist.specialty}</p>
                    </div>

                    <div className="text-center hidden md:block">
                      <p className="text-xs text-gray-400">Ganho este mês</p>
                      <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                        R$ {monthEarnings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <input
                            type="number" min={10} max={90}
                            value={tempRate}
                            onChange={(e) => setTempRate(Number(e.target.value))}
                            className="w-20 px-2 py-1.5 border-2 rounded-lg text-sm text-center text-gray-900 focus:outline-none"
                            style={{ borderColor: primaryColor }}
                          />
                          <span className="text-gray-400 text-sm">%</span>
                          <button
                            onClick={() => saveEdit(therapist.id)}
                            className="p-1.5 rounded-lg text-white"
                            style={{ background: primaryColor }}
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditing(null)}
                            className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                            <Percent className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{rate}</span>
                          </div>
                          <button
                            onClick={() => startEdit(therapist.id, rate)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>

                    <div className="w-24 hidden lg:block">
                      <div className="h-2 rounded-full overflow-hidden bg-gray-100 flex">
                        <div className="h-full bg-emerald-400 rounded-l-full" style={{ width: `${rate}%` }} />
                        <div className="h-full rounded-r-full" style={{ width: `${100 - rate}%`, background: primaryColor }} />
                      </div>
                      <p className="text-xs text-gray-400 text-center mt-1">{rate}% / {100 - rate}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="flex items-center gap-2 px-6 py-3 text-white rounded-xl text-sm"
              style={{ background: primaryColor, fontWeight: 600 }}
            >
              <Save className="w-4 h-4" />
              Salvar Configurações
            </button>
          </div>
        </div>
      )}
    </div>
  );
}