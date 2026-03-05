import {
  CalendarDays, DollarSign, Star, TrendingUp, Clock, CheckCircle,
  AlertCircle, Building2, Sparkles, ArrowRight, CalendarCheck,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { therapists, appointments, clients, therapies, companies, therapistEarningsData } from "../../data/mockData";
import { useTherapistStore } from "../../store/therapistStore";

export default function TherapistDashboard() {
  const { user } = useAuth();
  const store = useTherapistStore();
  const navigate = useNavigate();

  const therapist = therapists.find((t) => t.id === user?.therapistId);
  const myAppointments = appointments.filter((a) => a.therapistId === user?.therapistId);
  const company = companies.find((c) => c.id === therapist?.companyId);
  const isAutonomous = !company;
  const commissionPct = therapist?.commission ?? 100;

  const todayStr = "2026-03-04";
  const todayAppointments = myAppointments.filter((a) => a.date === todayStr);
  const pendingClosure = todayAppointments.filter(
    (a) => !store.isCompleted(a.id) && (a.status === "confirmed" || a.status === "pending")
  );

  // Recent completed sessions from store
  const recentRecords = store.getTherapistRecords(therapist?.id ?? "").slice(0, 3);

  // Accumulated earnings from store
  const storeRecords = store.getTherapistRecords(therapist?.id ?? "");
  const storeEarned = storeRecords.reduce((acc, r) => acc + r.therapistEarned, 0);
  const baseEarnings = therapist?.totalEarnings ?? 0;
  const totalEarned = baseEarnings + storeEarned;

  if (!therapist) return <div className="text-gray-500 text-center py-20">Terapeuta não encontrado</div>;

  return (
    <div className="space-y-6">
      {/* ── Welcome ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <img
            src={therapist.avatar}
            alt={therapist.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white/80 text-sm">Bem-vinda de volta,</p>
              {company ? (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/20">
                  <Building2 className="w-3 h-3" /> {company.name}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white/20">
                  <Sparkles className="w-3 h-3" /> Autônomo
                </span>
              )}
            </div>
            <h2 className="text-white text-xl" style={{ fontWeight: 700 }}>{therapist.name.split(" ")[0]}!</h2>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 fill-white text-white" />
              <span className="text-sm text-white/90">{therapist.rating} · {therapist.totalSessions} sessões no total</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-xl text-white" style={{ fontWeight: 700 }}>{todayAppointments.length}</p>
            <p className="text-white/80 text-xs">Hoje</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-xl text-white" style={{ fontWeight: 700 }}>{therapist.monthSessions}</p>
            <p className="text-white/80 text-xs">Este mês</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-xl text-white" style={{ fontWeight: 700 }}>
              R${(therapist.monthEarnings / 1000).toFixed(1)}k
            </p>
            <p className="text-white/80 text-xs">Ganhos/mês</p>
          </div>
        </div>
      </div>

      {/* ── Pending closure alert ──────────────────────────────────────── */}
      {pendingClosure.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-amber-800 text-sm" style={{ fontWeight: 700 }}>
                  {pendingClosure.length} atendimento{pendingClosure.length > 1 ? "s" : ""} para encerrar
                </p>
                <p className="text-amber-600 text-xs mt-0.5">
                  Encerre os atendimentos concluídos para registrar seus ganhos.
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/terapeuta/agenda")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs shrink-0 hover:bg-amber-600 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              Ver agenda
            </button>
          </div>
        </div>
      )}

      {/* ── Stats ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          {
            title: "Ganho este mês",
            value: `R$ ${therapist.monthEarnings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: DollarSign, trend: "+8% vs mês anterior", color: "bg-emerald-50", iconColor: "text-emerald-600",
          },
          {
            title: "Total acumulado",
            value: `R$ ${totalEarned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: TrendingUp,
            trend: `${therapist.totalSessions + storeRecords.length} sessões`,
            color: "bg-violet-50", iconColor: "text-violet-600",
          },
          {
            title: "Sessões hoje",
            value: `${todayAppointments.filter((a) => store.isCompleted(a.id)).length}/${todayAppointments.length}`,
            icon: CalendarDays, trend: "encerradas / agendadas", color: "bg-blue-50", iconColor: "text-blue-600",
          },
          {
            title: isAutonomous ? "Modo autônomo" : "Comissão",
            value: isAutonomous ? "100%" : `${commissionPct}%`,
            icon: isAutonomous ? Sparkles : Building2,
            trend: isAutonomous ? "100% de cada sessão" : company?.name ?? "",
            color: isAutonomous ? "bg-violet-50" : "bg-orange-50",
            iconColor: isAutonomous ? "text-violet-600" : "text-orange-600",
          },
        ].map((stat) => (
          <div key={stat.title} className="bg-white rounded-xl border border-violet-100 p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
            </div>
            <p className="text-gray-500 text-xs">{stat.title}</p>
            <p className="text-xl text-gray-900 mt-0.5" style={{ fontWeight: 700 }}>{stat.value}</p>
            <p className="text-xs text-gray-400 mt-1 truncate">{stat.trend}</p>
          </div>
        ))}
      </div>

      {/* ── Earnings Chart ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
        <h3 className="text-gray-900 mb-1">Histórico de Ganhos</h3>
        <p className="text-gray-400 text-xs mb-4">Valor bruto da sessão vs. seu ganho líquido</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={therapistEarningsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EDE9FE" />
            <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fontSize: 11 }} />
            <YAxis stroke="#9CA3AF" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ background: "#fff", border: "1px solid #C4B5FD", borderRadius: "0.75rem" }}
              formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR")}`, ""]}
            />
            <Bar key="gross-bar" dataKey="gross" fill="#EDE9FE" radius={[4, 4, 0, 0]} name="Valor da sessão" barSize={16} isAnimationActive={false} />
            <Bar key="net-bar" dataKey="net" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Meu ganho" barSize={16} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Recent completed sessions ──────────────────────────────────── */}
      {recentRecords.length > 0 && (
        <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900">Atendimentos Encerrados</h3>
            <button
              onClick={() => navigate("/terapeuta/ganhos")}
              className="flex items-center gap-1 text-violet-600 text-sm hover:text-violet-700"
              style={{ fontWeight: 600 }}
            >
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {recentRecords.map((rec) => (
              <div key={rec.id} className="flex items-center gap-4 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{rec.clientName}</p>
                  <p className="text-xs text-gray-500">{rec.therapyName} · {rec.duration}min</p>
                  {rec.companyName ? (
                    <p className="text-xs text-gray-400">{rec.companyName}</p>
                  ) : (
                    <p className="text-xs text-violet-500">Autônomo</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                    +R$ {rec.therapistEarned.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(rec.completedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Today's schedule ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">Sessões de Hoje</h3>
          <button
            onClick={() => navigate("/terapeuta/agenda")}
            className="flex items-center gap-1 text-violet-600 text-sm hover:text-violet-700"
            style={{ fontWeight: 600 }}
          >
            Ver agenda <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-3">
          {todayAppointments.map((apt) => {
            const client = clients.find((c) => c.id === apt.clientId);
            const therapy = therapies.find((t) => t.id === apt.therapyId);
            const isCompleted = store.isCompleted(apt.id);
            const earned = isAutonomous ? apt.price : apt.price * commissionPct / 100;
            return (
              <div key={apt.id} className={`flex items-center gap-4 p-3 rounded-xl ${isCompleted ? "bg-emerald-50" : "bg-violet-50"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shrink-0 ${isCompleted ? "bg-emerald-500" : "bg-violet-600"}`} style={{ fontWeight: 700 }}>
                  {isCompleted ? <CheckCircle className="w-5 h-5" /> : apt.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{client?.name}</p>
                  <p className="text-xs text-gray-500">{therapy?.name} · {apt.duration}min</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                    +R$ {earned.toFixed(0)}
                  </p>
                  {isCompleted && <p className="text-xs text-emerald-500">✓ Encerrado</p>}
                </div>
              </div>
            );
          })}
          {todayAppointments.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">Nenhuma sessão hoje</p>
          )}
        </div>
      </div>
    </div>
  );
}