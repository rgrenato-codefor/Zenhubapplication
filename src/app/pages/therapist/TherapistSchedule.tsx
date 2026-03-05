import { useState } from "react";
import {
  Clock, CheckCircle, AlertCircle, User, X, DollarSign,
  Building2, Sparkles, StickyNote, CalendarCheck, Plus, Trash2,
} from "lucide-react";
import { appointments, clients, therapies, therapists, companies } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useTherapistStore, type SessionRecord } from "../../store/therapistStore";

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const ALL_SLOTS = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00"];
const DAYS = [
  { date: "2026-03-02", label: "Seg", num: "02", dayKey: "monday" },
  { date: "2026-03-03", label: "Ter", num: "03", dayKey: "tuesday" },
  { date: "2026-03-04", label: "Qua", num: "04", isToday: true, dayKey: "wednesday" },
  { date: "2026-03-05", label: "Qui", num: "05", dayKey: "thursday" },
  { date: "2026-03-06", label: "Sex", num: "06", dayKey: "friday" },
];
const DAY_LABELS: Record<string, string> = {
  monday: "Segunda", tuesday: "Terça", wednesday: "Quarta", thursday: "Quinta", friday: "Sexta",
};

type ClosureModal = {
  appointmentId: string;
  clientName: string;
  therapyName: string;
  duration: number;
  sessionPrice: number;
  time: string;
  date: string;
} | null;

export default function TherapistSchedule() {
  const { user } = useAuth();
  const store = useTherapistStore();
  const [tab, setTab] = useState<"agenda" | "disponibilidade">("agenda");
  const [selectedDay, setSelectedDay] = useState("2026-03-04");

  // Closure modal
  const [closureModal, setClosureModal] = useState<ClosureModal>(null);
  const [closureNotes, setClosureNotes] = useState("");
  const [closureSuccess, setClosureSuccess] = useState(false);

  const therapist = therapists.find((t) => t.id === user?.therapistId);
  const myAppointments = appointments.filter((a) => a.therapistId === user?.therapistId);
  const dayAppointments = myAppointments.filter((a) => a.date === selectedDay);
  const company = companies.find((c) => c.id === therapist?.companyId);
  const isAutonomous = !company;
  const commissionPct = therapist?.commission ?? 100;

  // Availability state (from store)
  const availability = therapist
    ? store.getAvailability(therapist.id, therapist.schedule)
    : {};

  const toggleSlot = (dayKey: string, slot: string) => {
    if (!therapist) return;
    const current = availability[dayKey] ?? [];
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot].sort();
    store.setAvailability(therapist.id, { ...availability, [dayKey]: updated });
  };

  const openClosure = (apt: typeof appointments[0]) => {
    const client = clients.find((c) => c.id === apt.clientId);
    const therapy = therapies.find((t) => t.id === apt.therapyId);
    setClosureModal({
      appointmentId: apt.id,
      clientName: client?.name ?? "Cliente",
      therapyName: therapy?.name ?? "Terapia",
      duration: apt.duration,
      sessionPrice: apt.price,
      time: apt.time,
      date: apt.date,
    });
    setClosureNotes("");
  };

  const handleConfirmClosure = () => {
    if (!closureModal || !therapist) return;
    const commissionUsed = isAutonomous ? 100 : commissionPct;
    const earned = closureModal.sessionPrice * (commissionUsed / 100);
    const companyNet = isAutonomous ? 0 : closureModal.sessionPrice - earned;

    const record: SessionRecord = {
      id: `sr_${Date.now()}`,
      appointmentId: closureModal.appointmentId,
      therapistId: therapist.id,
      clientName: closureModal.clientName,
      therapyName: closureModal.therapyName,
      duration: closureModal.duration,
      sessionPrice: closureModal.sessionPrice,
      extraCharge: 0,
      totalCharged: closureModal.sessionPrice,
      therapistEarned: earned,
      commissionPct: commissionUsed,
      companyNet,
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      completedAt: new Date().toISOString(),
      notes: closureNotes,
      extraNotes: "",
      date: closureModal.date,
      time: closureModal.time,
      closedBy: "therapist",
    };

    store.completeSession(record);
    setClosureModal(null);
    setClosureSuccess(true);
    setTimeout(() => setClosureSuccess(false), 3000);
  };

  const getAptStatus = (apt: typeof appointments[0]) => {
    if (store.isCompleted(apt.id)) return "completed";
    return apt.status;
  };

  if (!therapist) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Minha Agenda</h1>
          <p className="text-gray-500 text-sm mt-0.5">Semana de 02 a 06 de Março, 2026</p>
        </div>
        {closureSuccess && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm animate-pulse">
            <CheckCircle className="w-4 h-4" />
            <span style={{ fontWeight: 600 }}>Atendimento encerrado!</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[
          { id: "agenda", label: "Agenda" },
          { id: "disponibilidade", label: "Disponibilidade" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-5 py-2 rounded-lg text-sm transition-all ${
              tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
            style={{ fontWeight: tab === t.id ? 600 : 400 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Agenda ─────────────────────────────────────────────────────── */}
      {tab === "agenda" && (
        <>
          {/* Day selector */}
          <div className="grid grid-cols-5 gap-2">
            {DAYS.map((day) => {
              const count = myAppointments.filter((a) => a.date === day.date).length;
              const pending = myAppointments.filter(
                (a) => a.date === day.date && !store.isCompleted(a.id) && (a.status === "confirmed" || a.status === "pending")
              ).length;
              return (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day.date)}
                  className={`rounded-xl p-3 text-center transition-all ${
                    selectedDay === day.date
                      ? "text-white shadow-md"
                      : day.isToday
                      ? "bg-white border-2 border-violet-200"
                      : "bg-white border border-violet-100"
                  }`}
                  style={selectedDay === day.date ? { background: "linear-gradient(135deg, #7C3AED, #4F46E5)" } : {}}
                >
                  <p className="text-xs opacity-70">{day.label}</p>
                  <p className="text-lg" style={{ fontWeight: 700 }}>{day.num}</p>
                  {count > 0 && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedDay === day.date ? "bg-white/70" : "bg-violet-400"}`} />
                      {pending > 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedDay === day.date ? "bg-amber-200" : "bg-amber-400"}`} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Schedule timeline */}
          <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-50 flex items-center justify-between">
              <h3 className="text-gray-900">
                {DAYS.find((d) => d.date === selectedDay)?.label},{" "}
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
              </h3>
              <span className="text-sm text-violet-600" style={{ fontWeight: 600 }}>
                {dayAppointments.length} sessões
              </span>
            </div>

            <div className="divide-y divide-violet-50">
              {HOURS.map((hour) => {
                const apt = dayAppointments.find((a) => a.time === hour);
                const client = apt ? clients.find((c) => c.id === apt.clientId) : null;
                const therapy = apt ? therapies.find((t) => t.id === apt.therapyId) : null;
                const status = apt ? getAptStatus(apt) : null;
                const isCompleted = apt ? store.isCompleted(apt.id) : false;
                const canClose = apt && !isCompleted && (apt.status === "confirmed" || apt.status === "pending");
                const earned = apt ? (isAutonomous ? apt.price : apt.price * commissionPct / 100) : 0;

                return (
                  <div key={hour} className={`flex items-start gap-4 px-5 py-3 min-h-[64px] ${apt && !isCompleted ? "bg-violet-50/30" : ""} ${isCompleted ? "bg-emerald-50/30" : ""}`}>
                    <div className="w-12 text-right shrink-0 pt-2">
                      <span className="text-xs text-gray-400">{hour}</span>
                    </div>
                    <div className="w-0.5 bg-violet-100 self-stretch mx-1 shrink-0" />
                    {apt ? (
                      <div className="flex-1 flex items-start gap-3 py-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shrink-0 ${isCompleted ? "bg-emerald-500" : "bg-gradient-to-br from-violet-500 to-indigo-500"}`} style={{ fontWeight: 700 }}>
                          {isCompleted ? <CheckCircle className="w-5 h-5" /> : <User className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{client?.name}</p>
                            <StatusBadge status={status ?? ""} />
                          </div>
                          <p className="text-xs text-gray-500">{therapy?.name} · {apt.duration}min</p>
                          {apt.notes && <p className="text-xs text-violet-500 mt-0.5">📝 {apt.notes}</p>}
                          {isCompleted && (
                            <p className="text-xs text-emerald-600 mt-0.5" style={{ fontWeight: 600 }}>
                              ✓ Encerrado · +R$ {earned.toFixed(2)} registrado
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                            +R$ {earned.toFixed(0)}
                          </p>
                          <p className="text-xs text-gray-400">R$ {apt.price}</p>
                          {canClose && (
                            <button
                              onClick={() => openClosure(apt)}
                              className="mt-1 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs hover:bg-violet-700 transition-all"
                              style={{ fontWeight: 600 }}
                            >
                              <CalendarCheck className="w-3.5 h-3.5" />
                              Encerrar
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 py-2">
                        <p className="text-xs text-gray-300">Disponível</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day summary */}
          {dayAppointments.length > 0 && (
            <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-4 text-white">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-white/70 text-xs">Previsto do dia</p>
                  <p className="text-xl text-white" style={{ fontWeight: 700 }}>
                    R$ {dayAppointments.reduce((acc, a) => acc + (isAutonomous ? a.price : a.price * commissionPct / 100), 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-white/70 text-xs">Encerrados</p>
                  <p className="text-xl text-white" style={{ fontWeight: 700 }}>
                    {dayAppointments.filter((a) => store.isCompleted(a.id)).length}/{dayAppointments.length}
                  </p>
                </div>
                <div>
                  <p className="text-white/70 text-xs">Tempo total</p>
                  <p className="text-xl text-white" style={{ fontWeight: 700 }}>
                    {dayAppointments.reduce((acc, a) => acc + a.duration, 0)}min
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab: Disponibilidade ─────────────────────────────────────────────── */}
      {tab === "disponibilidade" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-violet-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-violet-500" />
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Horários disponíveis</h3>
            </div>
            <p className="text-gray-400 text-xs mb-5">
              Clique nos horários para marcar ou desmarcar sua disponibilidade. Isso aparece no seu perfil público.
            </p>
            <div className="grid grid-cols-5 gap-3">
              {DAYS.map((day) => {
                const slots = availability[day.dayKey] ?? [];
                return (
                  <div key={day.dayKey}>
                    <p className="text-xs text-gray-500 text-center mb-2" style={{ fontWeight: 700 }}>
                      {day.label}
                    </p>
                    <div className="space-y-1">
                      {ALL_SLOTS.map((slot) => {
                        const active = slots.includes(slot);
                        return (
                          <button
                            key={slot}
                            onClick={() => toggleSlot(day.dayKey, slot)}
                            className={`w-full py-1 px-1 rounded-lg text-xs transition-all ${
                              active
                                ? "bg-violet-600 text-white"
                                : "bg-gray-50 text-gray-400 hover:bg-violet-50 hover:text-violet-500 border border-gray-100"
                            }`}
                            style={{ fontWeight: active ? 600 : 400 }}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-center text-violet-500 text-xs mt-2" style={{ fontWeight: 600 }}>
                      {slots.length}h
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-violet-100 p-5 shadow-sm">
            <h3 className="text-gray-900 mb-3" style={{ fontWeight: 700 }}>Resumo semanal</h3>
            <div className="space-y-2">
              {DAYS.map((day) => {
                const slots = availability[day.dayKey] ?? [];
                if (slots.length === 0) return null;
                return (
                  <div key={day.dayKey} className="flex items-center gap-3">
                    <p className="text-sm text-gray-600 w-20 shrink-0" style={{ fontWeight: 600 }}>
                      {DAY_LABELS[day.dayKey]}
                    </p>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {slots.slice(0, 6).map((s) => (
                        <span key={s} className="text-xs px-2 py-0.5 bg-violet-50 text-violet-600 rounded-lg border border-violet-100">
                          {s}
                        </span>
                      ))}
                      {slots.length > 6 && (
                        <span className="text-xs text-gray-400">+{slots.length - 6}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">{slots.length} horários</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Closure Modal ───────────────────────────────────────────────────── */}
      {closureModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Encerrar Atendimento</p>
                  <p className="text-gray-400 text-xs">{closureModal.time} · {closureModal.date.split("-").reverse().join("/")}</p>
                </div>
              </div>
              <button onClick={() => setClosureModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Session info */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400">Cliente</p>
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{closureModal.clientName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400">Terapia</p>
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{closureModal.therapyName}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400">Duração</p>
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{closureModal.duration} min</p>
                  </div>
                </div>
              </div>

              {/* Earnings breakdown */}
              <div className={`rounded-xl p-4 border ${isAutonomous ? "bg-violet-50 border-violet-100" : "bg-emerald-50 border-emerald-100"}`}>
                <p className="text-xs mb-3" style={{ fontWeight: 700, color: isAutonomous ? "#7C3AED" : "#059669" }}>
                  {isAutonomous ? "⚡ Modo autônomo" : `🏢 ${company?.name}`}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Valor da sessão</span>
                    <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
                      R$ {closureModal.sessionPrice.toFixed(2)}
                    </span>
                  </div>
                  {!isAutonomous && (
                    <div className="flex justify-between">
                      <span className="text-xs text-gray-500">Sua comissão</span>
                      <span className="text-xs text-gray-500">{commissionPct}%</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200/70 my-1" />
                  <div className="flex justify-between">
                    <span className="text-xs" style={{ fontWeight: 700, color: isAutonomous ? "#7C3AED" : "#059669" }}>
                      Você recebe
                    </span>
                    <span className="text-base" style={{ fontWeight: 700, color: isAutonomous ? "#7C3AED" : "#059669" }}>
                      R$ {(isAutonomous ? closureModal.sessionPrice : closureModal.sessionPrice * commissionPct / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {isAutonomous
                    ? "Registrado no seu histórico pessoal."
                    : "Registrado no histórico da empresa e no seu histórico pessoal."}
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                  placeholder="Ex: Cliente relatou alívio nas dores nas costas..."
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setClosureModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClosure}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm flex items-center justify-center gap-2"
                style={{ fontWeight: 700 }}
              >
                <CheckCircle className="w-4 h-4" />
                Encerrar atendimento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
        <CheckCircle className="w-3 h-3" /> Encerrado
      </span>
    );
  if (status === "confirmed")
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
        <CheckCircle className="w-3 h-3" /> Confirmado
      </span>
    );
  if (status === "pending")
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
        <AlertCircle className="w-3 h-3" /> Pendente
      </span>
    );
  return null;
}