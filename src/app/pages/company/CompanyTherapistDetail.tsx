import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft, Star, Mail, Phone, Percent, TrendingUp,
  CalendarDays, Banknote, CheckCircle, MessageSquare,
  Clock, BarChart2, CircleDollarSign, Wallet,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { therapists, therapies, companies } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useTherapistStore } from "../../store/therapistStore";

// ── Mock monthly history per therapist ───────────────────────────────────────
const MONTHLY_HISTORY: Record<string, { month: string; sessions: number; gross: number; net: number }[]> = {
  t1: [
    { month: "Out", sessions: 25, gross: 3750, net: 1875 },
    { month: "Nov", sessions: 23, gross: 3450, net: 1725 },
    { month: "Dez", sessions: 30, gross: 4500, net: 2250 },
    { month: "Jan", sessions: 26, gross: 3900, net: 1950 },
    { month: "Fev", sessions: 28, gross: 4200, net: 2100 },
    { month: "Mar", sessions: 28, gross: 4200, net: 2100 },
  ],
  t2: [
    { month: "Out", sessions: 21, gross: 3360, net: 1512 },
    { month: "Nov", sessions: 19, gross: 3040, net: 1368 },
    { month: "Dez", sessions: 26, gross: 4160, net: 1872 },
    { month: "Jan", sessions: 22, gross: 3520, net: 1584 },
    { month: "Fev", sessions: 24, gross: 3840, net: 1728 },
    { month: "Mar", sessions: 24, gross: 3840, net: 1728 },
  ],
  t3: [
    { month: "Out", sessions: 17, gross: 2720, net: 1496 },
    { month: "Nov", sessions: 16, gross: 2560, net: 1408 },
    { month: "Dez", sessions: 21, gross: 3360, net: 1848 },
    { month: "Jan", sessions: 18, gross: 2880, net: 1584 },
    { month: "Fev", sessions: 19, gross: 3040, net: 1672 },
    { month: "Mar", sessions: 19, gross: 3040, net: 1672 },
  ],
};

// ── Mock recent sessions ──────────────────────────────────────────────────────
const RECENT_SESSIONS: Record<string, { id: string; client: string; therapy: string; date: string; duration: number; value: number; commission: number }[]> = {
  t1: [
    { id: "s1", client: "Mariana Ferreira", therapy: "Shiatsu", date: "05/03/2026", duration: 60, value: 160, commission: 80 },
    { id: "s2", client: "Lucas Oliveira", therapy: "Reflexologia", date: "04/03/2026", duration: 90, value: 200, commission: 100 },
    { id: "s3", client: "Paula Santos", therapy: "Shiatsu", date: "03/03/2026", duration: 60, value: 160, commission: 80 },
    { id: "s4", client: "Carlos Mendes", therapy: "Shiatsu", date: "01/03/2026", duration: 60, value: 160, commission: 80 },
    { id: "s5", client: "Sofia Lima", therapy: "Reflexologia", date: "28/02/2026", duration: 90, value: 200, commission: 100 },
  ],
  t2: [
    { id: "s6", client: "Rafael Costa", therapy: "Massagem Desportiva", date: "05/03/2026", duration: 60, value: 150, commission: 67 },
    { id: "s7", client: "Bianca Torres", therapy: "Massagem Desportiva", date: "04/03/2026", duration: 90, value: 200, commission: 90 },
    { id: "s8", client: "André Lopes", therapy: "Massagem Desportiva", date: "02/03/2026", duration: 60, value: 150, commission: 67 },
    { id: "s9", client: "Clara Ramos", therapy: "Massagem Relaxante", date: "01/03/2026", duration: 60, value: 130, commission: 58 },
  ],
  t3: [
    { id: "s10", client: "Isabela Moura", therapy: "Aromaterapia", date: "05/03/2026", duration: 60, value: 170, commission: 93 },
    { id: "s11", client: "Tiago Freitas", therapy: "Relaxamento", date: "03/03/2026", duration: 90, value: 220, commission: 121 },
    { id: "s12", client: "Natália Cruz", therapy: "Aromaterapia", date: "02/03/2026", duration: 60, value: 170, commission: 93 },
  ],
};

export default function CompanyTherapistDetail() {
  const { therapistId } = useParams<{ therapistId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const store = useTherapistStore();

  const company = companies.find((c) => c.id === user?.companyId);
  const primaryColor = company?.color || "#0D9488";

  const therapist = therapists.find((t) => t.id === therapistId);
  if (!therapist) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-500">Terapeuta não encontrado.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm underline" style={{ color: primaryColor }}>
          Voltar
        </button>
      </div>
    );
  }

  const assoc = store.getAssociation(therapist.id);
  const rate = assoc.commission || therapist.commission;
  const therapistTherapyList = therapies.filter((th) => therapist.therapies.includes(th.id));
  const history = MONTHLY_HISTORY[therapist.id] ?? [];
  const recentSessions = RECENT_SESSIONS[therapist.id] ?? [];

  const currentMonth = history[history.length - 1];
  const gross = currentMonth?.gross ?? 0;
  const net = currentMonth?.net ?? 0;
  const companyShare = gross - net;

  const avgSessions = history.length > 0
    ? Math.round(history.reduce((s, h) => s + h.sessions, 0) / history.length)
    : 0;

  const trend = history.length >= 2
    ? ((history[history.length - 1].net - history[history.length - 2].net) / history[history.length - 2].net) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Voltar para Comissões
      </button>

      {/* ── Profile header ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Color bar */}
        <div className="h-3" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}60)` }} />

        <div className="p-6">
          <div className="flex items-start gap-5 flex-wrap">
            {/* Avatar */}
            <div className="relative shrink-0">
              <img
                src={therapist.avatar}
                alt={therapist.name}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-gray-900">{therapist.name}</h2>
                <span
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl text-white text-xs"
                  style={{ background: primaryColor, fontWeight: 700 }}
                >
                  <Percent className="w-3 h-3" /> {rate}% comissão
                </span>
              </div>
              <p className="text-gray-500 text-sm mt-0.5">@{therapist.username} · {therapist.specialty}</p>

              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${s <= Math.floor(therapist.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}`}
                  />
                ))}
                <span className="text-sm text-gray-700 ml-1" style={{ fontWeight: 700 }}>{therapist.rating}</span>
                <span className="text-xs text-gray-400">· {therapist.totalSessions} sessões totais</span>
              </div>

              <div className="flex flex-wrap gap-3 mt-3">
                <a href={`mailto:${therapist.email}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                  <Mail className="w-3.5 h-3.5" /> {therapist.email}
                </a>
                <a href={`tel:${therapist.phone}`} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700">
                  <Phone className="w-3.5 h-3.5" /> {therapist.phone}
                </a>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                {therapistTherapyList.map((th) => (
                  <span key={th.id} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: th.color }}>
                    {th.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex flex-col gap-2 shrink-0">
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm"
                style={{ background: primaryColor, fontWeight: 600 }}
              >
                <Banknote className="w-4 h-4" /> Pagar comissão
              </button>
              <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
                <MessageSquare className="w-4 h-4" /> Enviar mensagem
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI cards ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "A receber (Mar 2026)",
            value: `R$ ${net.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
            sub: `${rate}% de R$ ${gross.toLocaleString("pt-BR")}`,
            icon: Wallet,
            color: "#059669",
          },
          {
            label: "Sessões este mês",
            value: therapist.monthSessions,
            sub: `Média: ${avgSessions}/mês`,
            icon: CalendarDays,
            color: "#8B5CF6",
          },
          {
            label: "Receita gerada",
            value: `R$ ${gross.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
            sub: "bruto — Mar 2026",
            icon: TrendingUp,
            color: primaryColor,
          },
          {
            label: "Empresa retém",
            value: `R$ ${companyShare.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
            sub: `${100 - rate}% da receita`,
            icon: CircleDollarSign,
            color: "#6B7280",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${s.color}18` }}>
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="text-xl text-gray-900 mt-0.5" style={{ fontWeight: 700 }}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Earnings chart ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-gray-900">Evolução de Ganhos</h3>
            <p className="text-gray-400 text-xs mt-0.5">Últimos 6 meses · comissão a receber vs. receita bruta</p>
          </div>
          {trend !== 0 && (
            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs ${trend > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`} style={{ fontWeight: 600 }}>
              <TrendingUp className="w-3.5 h-3.5" />
              {trend > 0 ? "+" : ""}{trend.toFixed(1)}% vs mês anterior
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={history} margin={{ top: 12, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={primaryColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: "0.75rem" }}
              formatter={(v: number, name: string) => [
                `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`,
                name === "gross" ? "Receita bruta" : "Comissão",
              ]}
            />
            <Area key="area-gross" type="monotone" dataKey="gross" stroke={primaryColor} strokeWidth={2} fill="url(#gradGross)" strokeDasharray="4 2" isAnimationActive={false} />
            <Area key="area-net" type="monotone" dataKey="net" stroke="#10B981" strokeWidth={2.5} fill="url(#gradNet)" isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-5 mt-2 justify-center">
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 rounded" style={{ background: primaryColor, borderTop: "2px dashed" }} />
            <span className="text-xs text-gray-400">Receita bruta</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 bg-emerald-500 rounded" />
            <span className="text-xs text-gray-400">Comissão</span>
          </div>
        </div>
      </div>

      {/* ── Payment history + Recent sessions ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Payment history table */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Histórico de Pagamentos</h3>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 text-xs text-gray-400" style={{ fontWeight: 600 }}>Mês</th>
                  <th className="text-center px-3 py-2.5 text-xs text-gray-400" style={{ fontWeight: 600 }}>Sessões</th>
                  <th className="text-right px-3 py-2.5 text-xs text-gray-400" style={{ fontWeight: 600 }}>Comissão</th>
                  <th className="text-center px-3 py-2.5 text-xs text-gray-400" style={{ fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => {
                  const isPending = i === history.length - 1;
                  return (
                    <tr key={h.month} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-700" style={{ fontWeight: 600 }}>
                        {h.month} {h.month === "Mar" ? "2026" : "2025"}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500 text-center">{h.sessions}</td>
                      <td className="px-3 py-3 text-sm text-emerald-600 text-right" style={{ fontWeight: 700 }}>
                        R$ {h.net.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                      </td>
                      <td className="px-3 py-3 text-center">
                        {isPending ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200" style={{ fontWeight: 600 }}>
                            Pendente
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200" style={{ fontWeight: 600 }}>
                            Pago
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t border-gray-200">
                <tr>
                  <td className="px-4 py-2.5 text-xs text-gray-600" style={{ fontWeight: 700 }}>Total</td>
                  <td className="px-3 py-2.5 text-xs text-gray-600 text-center" style={{ fontWeight: 700 }}>
                    {history.reduce((s, h) => s + h.sessions, 0)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-emerald-600 text-right" style={{ fontWeight: 700 }}>
                    R$ {history.reduce((s, h) => s + h.net, 0).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Recent sessions */}
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Últimas Sessões</h3>
          <div className="space-y-2">
            {recentSessions.map((session) => (
              <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{session.client}</p>
                  <p className="text-xs text-gray-500">{session.therapy} · {session.duration}min · {session.date}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                    +R$ {session.commission.toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-400">R$ {session.value}</p>
                </div>
              </div>
            ))}
            {recentSessions.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-8 italic">Nenhuma sessão registrada.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}