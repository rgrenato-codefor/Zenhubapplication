import { useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { DollarSign, TrendingUp, Calendar, Award, Building2, Sparkles } from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";

export default function TherapistEarnings() {
  const { isDemoMode } = useAuth();
  const {
    myTherapist: therapist,
    company,
    therapistStore: store,
    therapistEarningsData,
    sessionRecords,
  } = usePageData();

  const isAutonomous = !company;

  // ── Unified record set ───────────────────────────────────────────────────────
  // • Demo: DataContext already exposes store records via demoSessionRecords  
  // • Real: sessionRecords loaded from Firestore via getSessionRecordsByTherapist
  // In both cases sessionRecords is the canonical source; fall back to in-memory
  // store only when the DataContext hasn't hydrated yet (empty array).
  const storeRecords = store.getTherapistRecords(therapist?.id ?? "");

  const allRecords = useMemo(() => {
    const fromCtx = sessionRecords.filter((r) => r.therapistId === therapist?.id);
    if (fromCtx.length > 0) return fromCtx;
    // Fallback: in-memory store (demo or same-session mutations not yet reflected)
    return storeRecords as unknown as typeof sessionRecords;
  }, [sessionRecords, storeRecords, therapist?.id]);

  // Sort newest first
  const sortedRecords = useMemo(
    () => [...allRecords].sort((a, b) => {
      const da = new Date((a.date ?? a.completedAt ?? "") + "T12:00:00").getTime();
      const db_ = new Date((b.date ?? b.completedAt ?? "") + "T12:00:00").getTime();
      return db_ - da;
    }),
    [allRecords],
  );

  // ── Computed metrics (from real records, not stale Firestore fields) ─────────
  const now = new Date();
  const thisMonthRecords = useMemo(
    () => allRecords.filter((r) => {
      const d = new Date((r.date ?? r.completedAt ?? "") + "T12:00:00");
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allRecords],
  );

  const monthEarned = thisMonthRecords.reduce((acc, r) => acc + (r.therapistEarned ?? 0), 0);
  const monthSessionCount = thisMonthRecords.length;
  const totalEarned = allRecords.reduce((acc, r) => acc + (r.therapistEarned ?? 0), 0);
  const totalSessions = allRecords.length;
  const avgPerSession = totalSessions > 0 ? totalEarned / totalSessions : 0;
  const commissionPct = therapist?.commission ?? 100;

  const companyRecords = allRecords.filter((r) => r.companyId);
  const autonomousRecords = allRecords.filter((r) => !r.companyId);

  // ── Earnings by therapy ──────────────────────────────────────────────────────
  const byTherapyArr = useMemo(() => {
    const map = allRecords.reduce<Record<string, { name: string; sessions: number; earned: number }>>((acc, r) => {
      const key = r.therapyName ?? "Outro";
      if (!acc[key]) acc[key] = { name: key, sessions: 0, earned: 0 };
      acc[key].sessions += 1;
      acc[key].earned += r.therapistEarned ?? 0;
      return acc;
    }, {});
    return Object.values(map).sort((a, b) => b.earned - a.earned);
  }, [allRecords]);

  // ── Monthly chart data (last 6 months) ───────────────────────────────────────
  // Demo: prefer pre-built mock data (richer); real: compute from real records.
  const computedChartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")
        + "/" + String(yr).slice(2);
      const recs = allRecords.filter((r) => {
        const rd = new Date((r.date ?? r.completedAt ?? "") + "T12:00:00");
        return rd.getFullYear() === yr && rd.getMonth() === mo;
      });
      return {
        month: label,
        sessions: recs.length,
        gross: recs.reduce((acc, r) => acc + (r.sessionPrice ?? 0), 0),
        net: recs.reduce((acc, r) => acc + (r.therapistEarned ?? 0), 0),
      };
    });
  }, [allRecords]);

  // Use mock chart data in demo mode (more visually interesting), computed for real
  const earningsChartData = (isDemoMode && therapistEarningsData.length > 0)
    ? therapistEarningsData
    : computedChartData;

  if (!therapist) return <div className="text-gray-500 text-center py-20">Carregando...</div>;

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
              Comissão de <span style={{ fontWeight: 700 }}>{commissionPct}%</span> sobre cada sessão.
              Histórico sempre vinculado ao seu perfil.
            </p>
          </div>
        </div>
      )}

      {/* ── Top cards ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            title: "Ganho este mês",
            value: `R$ ${monthEarned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: DollarSign,
            sub: `${monthSessionCount} sessões realizadas`,
            color: "text-emerald-600", bg: "bg-emerald-50",
          },
          {
            title: "Total acumulado",
            value: `R$ ${totalEarned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: Award,
            sub: `${totalSessions} sessões no total`,
            color: "text-teal-600", bg: "bg-teal-50",
          },
          {
            title: "Média por sessão",
            value: `R$ ${avgPerSession.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
            icon: TrendingUp,
            sub: "de ganho médio",
            color: "text-blue-600", bg: "bg-blue-50",
          },
          {
            title: isAutonomous ? "Recebe 100%" : "Comissão atual",
            value: isAutonomous ? "100%" : `${commissionPct}%`,
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

      {/* ── Completed sessions list ────────────────────────────────────────────── */}
      {sortedRecords.length > 0 && (
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
            {sortedRecords.map((rec) => (
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
                      {new Date((rec.date ?? rec.completedAt ?? "") + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                      {rec.time ? ` · ${rec.time}` : ""}
                    </span>
                  </div>
                  {rec.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{rec.notes}"</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                    +R$ {(rec.therapistEarned ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-400">
                    {(rec.commissionPct ?? 100) === 100
                      ? "100% seu"
                      : `${rec.commissionPct}% de R$ ${(rec.sessionPrice ?? 0).toFixed(0)}`
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-violet-50 flex items-center justify-between bg-emerald-50/50">
            <p className="text-sm text-gray-600" style={{ fontWeight: 600 }}>Total encerrado</p>
            <p className="text-base text-emerald-600" style={{ fontWeight: 700 }}>
              R$ {totalEarned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* ── Evolução dos Ganhos chart ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
        <h3 className="text-gray-900 mb-1">Evolução dos Ganhos</h3>
        <p className="text-gray-400 text-xs mb-4">Sessões vs. comissão recebida (últimos 6 meses)</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={earningsChartData}>
            <defs>
              <linearGradient id="therapistGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE9FE" />
            <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #C4B5FD", borderRadius: "0.75rem" }}
              formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, ""]}
            />
            <Area type="monotone" dataKey="net" stroke="#7C3AED" strokeWidth={2} fill="url(#therapistGrad)" name="Meu ganho" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Ganhos por Terapia ─────────────────────────────────────────────────── */}
      {byTherapyArr.length > 0 && (
        <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
          <h3 className="text-gray-900 mb-4">Ganhos por Terapia</h3>
          <div className="space-y-3">
            {byTherapyArr.map((item) => {
              const maxEarned = byTherapyArr[0]?.earned ?? 1;
              const pct = maxEarned > 0 ? (item.earned / maxEarned) * 100 : 0;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-600 shrink-0" />
                  <p className="text-sm text-gray-700 w-36 shrink-0 truncate">{item.name}</p>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="h-2 rounded-full bg-violet-600 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-500 w-10 text-right shrink-0">{item.sessions}x</p>
                  <p className="text-sm text-gray-900 w-24 text-right shrink-0" style={{ fontWeight: 700 }}>
                    R$ {item.earned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Extrato Mensal ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-violet-50">
          <h3 className="text-gray-900">Extrato Mensal</h3>
        </div>
        {earningsChartData.some((r) => r.sessions > 0) ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-violet-50">
                {["Mês", "Sessões", "Valor Bruto", "Meu Ganho"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-400 px-6 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {earningsChartData.filter((r) => r.sessions > 0).map((row) => (
                <tr key={row.month} className="hover:bg-violet-50/30">
                  <td className="px-6 py-3 text-sm text-gray-900" style={{ fontWeight: 600 }}>{row.month}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{row.sessions}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    R$ {(row.gross ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                      R$ {(row.net ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      {!isAutonomous && (
                        <span className="text-xs text-gray-400 ml-1">({commissionPct}%)</span>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-6 py-10 text-center">
            <Sparkles className="w-8 h-8 text-violet-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma sessão encerrada ainda.</p>
            <p className="text-xs text-gray-300 mt-1">Os ganhos aparecerão aqui após fechar um atendimento.</p>
          </div>
        )}
      </div>
    </div>
  );
}
