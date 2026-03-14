import { SvgBarChart } from "../../components/shared/CssCharts";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useTherapistStore } from "../../store/therapistStore";

export default function TherapistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const store = useTherapistStore();
  const {
    myTherapist: therapist,
    appointments: allAppointments,
    company: ctxCompany,
    sessionRecords,
    completedSessionIds,
    therapistEarningsData,
    clients,
    therapies,
  } = usePageData();

  // ── Resolve the active company ───────────────────────────────────────────────
  // Demo mode: derive exclusively from the in-memory association store so that
  // dissociation (from either the company or therapist side) is reflected
  // immediately without relying on DataContext's React state.
  // Real mode: use the DataContext value (TherapistLayout calls refresh() on mount
  // to ensure Firestore data is up-to-date).
  const myId = therapist?.id ?? user?.therapistId ?? "";
  const company = ctxCompany;

  // ── Own appointments & records ─────────────────────────────────────────────
  // Use DataContext sessionRecords (works for both demo AND real Firestore users)
  const myRecords = useMemo(
    () => sessionRecords.filter((r) => r.therapistId === myId),
    [sessionRecords, myId]
  );

  // Use DataContext completedSessionIds (works for both demo AND real Firestore users)
  const isCompleted = (aptId: string) => completedSessionIds.has(aptId);

  const myAppointments = useMemo(
    () => allAppointments.filter((a) => a.therapistId === myId),
    [allAppointments, myId]
  );

  const isAutonomous = !company;
  const commissionPct = therapist?.commission ?? 100;

  // ── Date helpers ────────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split("T")[0];
  const currentMonthPrefix = todayStr.slice(0, 7); // "YYYY-MM"

  const todayAppointments = myAppointments.filter((a) => a.date === todayStr);
  const pendingClosure = todayAppointments.filter(
    (a) => !isCompleted(a.id) && (a.status === "confirmed" || a.status === "pending")
  );

  // ── Earnings computed from real records ─────────────────────────────────────
  const monthRecords = myRecords.filter((r) => r.date.startsWith(currentMonthPrefix));
  const monthEarned = monthRecords.reduce((acc, r) => acc + r.therapistEarned, 0);
  const allTimeEarned = myRecords.reduce((acc, r) => acc + r.therapistEarned, 0);

  // Unpaid vs paid breakdown (company owes therapist)
  // Only records with companyId are subject to company payment.
  // Autonomous sessions (companyId === null) are collected directly from the
  // client — they are never "owed" by any company.
  const unpaidRecords = myRecords.filter((r) => r.companyId && !r.paidByCompany);
  const paidRecords   = myRecords.filter((r) => r.companyId && r.paidByCompany === true);
  const pendingReceivable = unpaidRecords.reduce((acc, r) => acc + r.therapistEarned, 0);
  const alreadyReceived   = paidRecords.reduce((acc, r) => acc + r.therapistEarned, 0);

  // Total = historical base (from profile) + all records tracked in the system
  const profileTotal = therapist?.totalEarnings ?? 0;
  const totalEarned = Math.max(profileTotal, allTimeEarned);

  // Month earnings: prefer computed from records; fall back to profile field
  const monthEarnings = monthEarned > 0 ? monthEarned : (therapist?.monthEarnings ?? 0);

  // Sessions count this month (from records)
  const monthSessionCount = monthRecords.length > 0
    ? monthRecords.length
    : (therapist?.monthSessions ?? 0);

  const recentRecords = myRecords.slice(0, 3);

  // ── Chart: build from real records if available, else use mock data ─────────
  const chartData = useMemo(() => {
    if (myRecords.length === 0) return therapistEarningsData.map((item, idx) => ({ ...item, id: `mock-${idx}` }));

    // Group by "MMM/YY"
    const map: Record<string, { gross: number; net: number; sessions: number }> = {};
    myRecords.forEach((r) => {
      const d = new Date(r.date + "T12:00:00");
      const key = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      if (!map[key]) map[key] = { gross: 0, net: 0, sessions: 0 };
      map[key].gross += r.totalCharged;
      map[key].net += r.therapistEarned;
      map[key].sessions += 1;
    });
    const built = Object.entries(map).map(([month, v], idx) => ({
      id: `chart-${idx}-${month}`,
      month,
      gross: Math.round(v.gross),
      net: Math.round(v.net),
      commission: Math.round(v.gross - v.net),
      sessions: v.sessions,
    }));
    // Merge with mock data for the chart (last 6 months mock + real data)
    return built.length >= 2 ? built : therapistEarningsData.map((item, idx) => ({ ...item, id: `mock-${idx}` }));
  }, [myRecords, therapistEarningsData]);

  if (!therapist) return (
    <div className="text-gray-500 text-center py-20">Carregando dados do terapeuta...</div>
  );

  return (
    <div className="space-y-6">
      {/* ── Welcome ──────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          {therapist.avatar ? (
            <img
              src={therapist.avatar}
              alt={therapist.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-white text-2xl" style={{ fontWeight: 700 }}>
              {therapist.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white/80 text-sm">Bem-vindo(a) de volta,</p>
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
            <p className="text-xl text-white" style={{ fontWeight: 700 }}>{monthSessionCount}</p>
            <p className="text-white/80 text-xs">Este mês</p>
          </div>
          <div className="bg-white/20 rounded-xl p-3 text-center">
            <p className="text-xl text-white" style={{ fontWeight: 700 }}>
              R${(monthEarnings / 1000).toFixed(1)}k
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
            value: `R$ ${monthEarnings.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: DollarSign,
            trend: `${monthSessionCount} sessão${monthSessionCount !== 1 ? "s" : ""} este mês`,
            color: "bg-emerald-50", iconColor: "text-emerald-600",
          },
          {
            title: isAutonomous ? "Total acumulado" : "A receber",
            value: isAutonomous
              ? `R$ ${totalEarned.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
              : `R$ ${pendingReceivable.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
            icon: TrendingUp,
            trend: isAutonomous
              ? `${therapist.totalSessions + myRecords.length} sessões`
              : alreadyReceived > 0
                ? `R$ ${alreadyReceived.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} já recebido`
                : "saldo pendente da empresa",
            color: isAutonomous ? "bg-violet-50" : (pendingReceivable > 0 ? "bg-amber-50" : "bg-emerald-50"),
            iconColor: isAutonomous ? "text-violet-600" : (pendingReceivable > 0 ? "text-amber-600" : "text-emerald-600"),
          },
          {
            title: "Sessões hoje",
            value: `${todayAppointments.filter((a) => isCompleted(a.id)).length}/${todayAppointments.length}`,
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
        <SvgBarChart
          data={chartData}
          bars={[
            { key: "gross", color: "#EDE9FE" },
            { key: "net",   color: "#7C3AED" },
          ]}
          labelKey="month"
          height={180}
          formatY={(v) => `R$${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v.toFixed(0)}`}
        />
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-100 inline-block" /><span className="text-xs text-gray-400">Valor da sessão</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-violet-600 inline-block" /><span className="text-xs text-gray-400">Meu ganho</span></div>
        </div>
      </div>

      {/* ── Recent completed sessions ──────────────────────────────────── */}
      {recentRecords.length > 0 ? (
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
      ) : (
        <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-gray-900">Atendimentos Encerrados</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
              <CheckCircle className="w-6 h-6 text-violet-300" />
            </div>
            <p className="text-gray-500 text-sm">Nenhuma sessão encerrada ainda</p>
            <p className="text-gray-400 text-xs mt-1">Após encerrar uma sessão, ela aparece aqui com o valor recebido.</p>
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
            const client  = clients.find((c) => c.id === apt.clientId);
            const therapy = therapies.find((t) => t.id === apt.therapyId);
            const completed = isCompleted(apt.id);

            // Para atendimento encerrado → valor congelado do SessionRecord.
            // Para atendimento em aberto  → prévia com a comissão atual.
            const rec    = myRecords.find((r) => r.appointmentId === apt.id);
            const earned = completed && rec
              ? rec.therapistEarned
              : (isAutonomous ? apt.price : apt.price * commissionPct / 100);

            // Nomes: preferir campos inline (autônomo) antes de buscar pelo id
            const clientName  = client?.name  ?? (apt as any).clientName  ?? "Cliente";
            const therapyName = therapy?.name ?? (apt as any).therapyName ?? "Terapia";

            return (
              <div key={apt.id} className={`flex items-center gap-4 p-3 rounded-xl ${completed ? "bg-emerald-50" : "bg-violet-50"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shrink-0 ${completed ? "bg-emerald-500" : "bg-violet-600"}`} style={{ fontWeight: 700 }}>
                  {completed ? <CheckCircle className="w-5 h-5" /> : apt.time}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{clientName}</p>
                  <p className="text-xs text-gray-500">{therapyName} · {apt.duration}min</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                    +R$ {earned.toFixed(2)}
                  </p>
                  {completed && rec && (
                    <p className="text-xs text-emerald-500">✓ Encerrado · {rec.commissionPct}%</p>
                  )}
                  {!completed && (
                    <p className="text-xs text-gray-400">prévia</p>
                  )}
                </div>
              </div>
            );
          })}
          {todayAppointments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Clock className="w-8 h-8 text-violet-200 mb-2" />
              <p className="text-gray-400 text-sm">Nenhuma sessão hoje</p>
              <p className="text-gray-400 text-xs mt-1">Suas próximas sessões aparecem aqui no dia.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}