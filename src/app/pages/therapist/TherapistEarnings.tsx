import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import { DollarSign, TrendingUp, Calendar, Award, Building2, Sparkles, CheckCircle } from "lucide-react";
import { therapistEarningsData, therapists, companies } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useTherapistStore } from "../../store/therapistStore";

export default function TherapistEarnings() {
  const { user } = useAuth();
  const store = useTherapistStore();
  const therapist = therapists.find((t) => t.id === user?.therapistId);
  const records = store.getTherapistRecords(therapist?.id ?? "");

  if (!therapist) return null;

  const company = companies.find((c) => c.id === therapist.companyId);
  const isAutonomous = !company;

  const totalEarned = therapistEarningsData.reduce((acc, d) => acc + d.net, 0);
  const avgPerSession = totalEarned / therapistEarningsData.reduce((acc, d) => acc + d.sessions, 0);

  // Store-based earned (from closures this session)
  const storeEarned = records.reduce((acc, r) => acc + r.therapistEarned, 0);
  const companyRecords = records.filter((r) => r.companyId);
  const autonomousRecords = records.filter((r) => !r.companyId);

  // Earnings by therapy from records
  const byTherapy = records.reduce<Record<string, { name: string; sessions: number; earned: number }>>((acc, r) => {
    if (!acc[r.therapyName]) acc[r.therapyName] = { name: r.therapyName, sessions: 0, earned: 0 };
    acc[r.therapyName].sessions += 1;
    acc[r.therapyName].earned += r.therapistEarned;
    return acc;
  }, {});
  const byTherapyArr = Object.values(byTherapy);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Meus Ganhos</h1>
        <p className="text-gray-500 text-sm mt-0.5">Histórico completo · vinculado ao seu perfil</p>
      </div>

      {/* Mode banner */}
      {isAutonomous ? (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-violet-50 border border-violet-100">
          <Sparkles className="w-5 h-5 text-violet-500 shrink-0" />
          <div>
            <p className="text-violet-700 text-sm" style={{ fontWeight: 700 }}>Modo autônomo</p>
            <p className="text-violet-600 text-xs">Você recebe 100% de cada sessão realizada.</p>
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 p-4 rounded-xl border"
          style={{ background: `${company?.color}08`, borderColor: `${company?.color}22` }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs shrink-0"
            style={{ background: company?.color, fontWeight: 700 }}
          >
            {company?.logo}
          </div>
          <div>
            <p className="text-sm" style={{ color: company?.color, fontWeight: 700 }}>{company?.name}</p>
            <p className="text-gray-500 text-xs">
              Comissão de <span style={{ fontWeight: 700 }}>{therapist.commission}%</span> sobre cada sessão.
              Histórico sempre vinculado ao seu perfil.
            </p>
          </div>
        </div>
      )}

      {/* ── Top cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            title: "Ganho este mês",
            value: `R$ ${therapist.monthEarnings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: DollarSign,
            sub: `${therapist.monthSessions} sessões realizadas`,
            color: "text-emerald-600", bg: "bg-emerald-50",
          },
          {
            title: "Total acumulado",
            value: `R$ ${(therapist.totalEarnings + storeEarned).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: Award,
            sub: `${therapist.totalSessions + records.length} sessões no total`,
            color: "text-teal-600", bg: "bg-teal-50",
          },
          {
            title: "Média por sessão",
            value: `R$ ${avgPerSession.toFixed(0)}`,
            icon: TrendingUp,
            sub: "de ganho médio",
            color: "text-blue-600", bg: "bg-blue-50",
          },
          {
            title: isAutonomous ? "Recebe 100%" : "Comissão atual",
            value: isAutonomous ? "R$ 100%" : `${therapist.commission}%`,
            icon: isAutonomous ? Sparkles : Calendar,
            sub: isAutonomous ? "modo autônomo" : "do valor bruto",
            color: "text-violet-600", bg: "bg-violet-50",
          },
        ].map((card) => (
          <div key={card.title} className="bg-white rounded-xl border border-violet-100 p-5 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-gray-500 text-xs">{card.title}</p>
            <p className="text-xl text-gray-900 mt-0.5" style={{ fontWeight: 700 }}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Completed sessions from store ─────────────────────────────── */}
      {records.length > 0 && (
        <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-violet-50 flex items-center justify-between">
            <h3 className="text-gray-900">Atendimentos Encerrados</h3>
            <div className="flex items-center gap-3">
              {companyRecords.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Building2 className="w-3.5 h-3.5 text-orange-400" />
                  <span>{companyRecords.length} empresa</span>
                </div>
              )}
              {autonomousRecords.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>{autonomousRecords.length} autônomo</span>
                </div>
              )}
            </div>
          </div>
          <div className="divide-y divide-violet-50">
            {records.map((rec) => (
              <div key={rec.id} className="flex items-center gap-4 px-6 py-4 hover:bg-violet-50/30 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${rec.companyId ? "bg-orange-100" : "bg-violet-100"}`}>
                  {rec.companyId
                    ? <Building2 className="w-5 h-5 text-orange-500" />
                    : <Sparkles className="w-5 h-5 text-violet-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{rec.clientName}</p>
                  <p className="text-xs text-gray-500">{rec.therapyName} · {rec.duration}min</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {rec.companyName ? (
                      <span className="text-xs text-orange-500">{rec.companyName}</span>
                    ) : (
                      <span className="text-xs text-violet-500">Autônomo</span>
                    )}
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-xs text-gray-400">
                      {new Date(rec.date + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })} · {rec.time}
                    </span>
                  </div>
                  {rec.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{rec.notes}"</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                    +R$ {rec.therapistEarned.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {rec.commissionPct === 100 ? "100% seu" : `${rec.commissionPct}% de R$ ${rec.sessionPrice.toFixed(0)}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
          {records.length > 0 && (
            <div className="px-6 py-4 border-t border-violet-50 flex items-center justify-between bg-emerald-50/50">
              <p className="text-sm text-gray-600" style={{ fontWeight: 600 }}>Total encerrado</p>
              <p className="text-base text-emerald-600" style={{ fontWeight: 700 }}>
                R$ {storeEarned.toFixed(2)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Earnings chart ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
        <h3 className="text-gray-900 mb-1">Evolução dos Ganhos</h3>
        <p className="text-gray-400 text-xs mb-4">Sessões vs. comissão recebida (últimos 6 meses)</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={therapistEarningsData}>
            <defs>
              <linearGradient id="therapistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE9FE" />
            <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #C4B5FD", borderRadius: "0.75rem" }}
              formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, ""]}
            />
            <Area key="net-area" type="monotone" dataKey="net" stroke="#7C3AED" strokeWidth={2} fill="url(#therapistGrad)" name="Meu ganho" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── By therapy ────────────────────────────────────────────────── */}
      {byTherapyArr.length > 0 && (
        <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Ganhos por Terapia</h3>
          <div className="space-y-3">
            {byTherapyArr.map((item) => {
              const maxEarned = Math.max(...byTherapyArr.map((b) => b.earned));
              const pct = maxEarned > 0 ? (item.earned / maxEarned) * 100 : 0;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-600 shrink-0" />
                  <p className="text-sm text-gray-700 w-36 shrink-0 truncate">{item.name}</p>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-violet-600" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 w-10 text-right shrink-0">{item.sessions}x</p>
                  <p className="text-sm text-gray-900 w-20 text-right shrink-0" style={{ fontWeight: 700 }}>
                    R$ {item.earned.toFixed(0)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Monthly extract ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-violet-50">
          <h3 className="text-gray-900">Extrato Mensal</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-violet-50">
              {["Mês", "Sessões", "Valor Bruto", "Meu Ganho"].map((h) => (
                <th key={h} className="text-left text-xs text-gray-400 px-6 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-violet-50">
            {therapistEarningsData.map((row) => (
              <tr key={row.month} className="hover:bg-violet-50/30">
                <td className="px-6 py-3 text-sm text-gray-900" style={{ fontWeight: 600 }}>{row.month}</td>
                <td className="px-6 py-3 text-sm text-gray-600">{row.sessions}</td>
                <td className="px-6 py-3 text-sm text-gray-600">
                  R$ {row.gross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-3">
                  <span className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                    R$ {row.net.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    {!isAutonomous && (
                      <span className="text-xs text-gray-400 ml-1">({therapist.commission}%)</span>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}