import { useState } from "react";
import React from "react";
import {
  ChevronLeft, ChevronRight, Plus, Clock, User, Star,
  CheckCircle, AlertCircle, XCircle, CalendarCheck,
  DollarSign, Building2, X, PlusCircle, Receipt, DoorOpen,
} from "lucide-react";
import { appointments, therapists, clients, therapies, companies, rooms as roomsData } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useTherapistStore, type SessionRecord } from "../../store/therapistStore";
import { useRoomStore } from "../../store/roomStore";
import { useCompanyUnit } from "../../context/CompanyContext";

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const DAYS = [
  { date: "2026-03-02", label: "Seg 02" },
  { date: "2026-03-03", label: "Ter 03" },
  { date: "2026-03-04", label: "Qua 04", isToday: true },
  { date: "2026-03-05", label: "Qui 05" },
  { date: "2026-03-06", label: "Sex 06" },
  { date: "2026-03-07", label: "Sáb 07" },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  confirmed: { label: "Confirmado", color: "#059669", bg: "#ECFDF5", icon: CheckCircle },
  pending: { label: "Pendente", color: "#D97706", bg: "#FFFBEB", icon: AlertCircle },
  completed: { label: "Encerrado", color: "#3B82F6", bg: "#EFF6FF", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "#DC2626", bg: "#FEF2F2", icon: XCircle },
};

type ClosureModal = {
  apt: typeof appointments[0];
  clientName: string;
  therapyName: string;
  therapistName: string;
  commissionPct: number;
} | null;

export default function CompanySchedule() {
  const { user } = useAuth();
  const store = useTherapistStore();
  const roomStore = useRoomStore();
  const { selectedUnitId } = useCompanyUnit();
  const company = companies.find((c) => c.id === user?.companyId);
  const primaryColor = company?.color || "#0D9488";

  const [view, setView] = useState<"week" | "day" | "list">("week");
  const [selectedDay, setSelectedDay] = useState("2026-03-04");
  const [showNewModal, setShowNewModal] = useState(false);
  const [closureModal, setClosureModal] = useState<ClosureModal>(null);
  const [extraCharge, setExtraCharge] = useState(0);
  const [extraNotes, setExtraNotes] = useState("");
  const [closureNotes, setClosureNotes] = useState("");
  const [closureSuccess, setClosureSuccess] = useState(false);

  const companyAppointments = appointments
    .filter((a) => a.companyId === user?.companyId)
    .filter((a) => !selectedUnitId || (a as any).unitId === selectedUnitId);

  const companyTherapists = therapists.filter((t) => {
    const assoc = store.getAssociation(t.id);
    const isCompany = assoc.companyId === user?.companyId;
    const isUnit = !selectedUnitId || (t as any).unitId === selectedUnitId;
    return isCompany && isUnit;
  });
  const companyClients = clients.filter((c) => c.companyId === user?.companyId);
  const companyRecords = store.getCompanyRecords(user?.companyId ?? "");

  const dayAppointments = (date: string) => companyAppointments.filter((a) => a.date === date);

  const getEffectiveStatus = (apt: typeof appointments[0]) =>
    store.isCompleted(apt.id) ? "completed" : apt.status;

  const openClosure = (apt: typeof appointments[0]) => {
    const client = clients.find((c) => c.id === apt.clientId);
    const therapy = therapies.find((t) => t.id === apt.therapyId);
    const therapist = therapists.find((t) => t.id === apt.therapistId);
    const assoc = store.getAssociation(apt.therapistId);
    setClosureModal({
      apt,
      clientName: client?.name ?? "Cliente",
      therapyName: therapy?.name ?? "Terapia",
      therapistName: therapist?.name ?? "Terapeuta",
      commissionPct: assoc.commission,
    });
    setExtraCharge(0);
    setExtraNotes("");
    setClosureNotes("");
  };

  const handleConfirmClosure = () => {
    if (!closureModal || !user?.companyId || !company) return;
    const { apt, commissionPct } = closureModal;
    const total = apt.price + extraCharge;
    const therapistEarned = total * (commissionPct / 100);
    const companyNet = total - therapistEarned;

    const record: SessionRecord = {
      id: `sr_co_${Date.now()}`,
      appointmentId: apt.id,
      therapistId: apt.therapistId,
      clientName: closureModal.clientName,
      therapyName: closureModal.therapyName,
      duration: apt.duration,
      sessionPrice: apt.price,
      extraCharge,
      totalCharged: total,
      therapistEarned,
      commissionPct,
      companyNet,
      companyId: user.companyId,
      companyName: company.name,
      completedAt: new Date().toISOString(),
      notes: closureNotes,
      extraNotes,
      date: apt.date,
      time: apt.time,
      closedBy: "company",
    };

    store.completeSession(record);
    setClosureModal(null);
    setClosureSuccess(true);
    setTimeout(() => setClosureSuccess(false), 3000);
  };

  // Summary stats from records
  const totalGross = companyRecords.reduce((acc, r) => acc + r.totalCharged, 0);
  const totalCommissions = companyRecords.reduce((acc, r) => acc + r.therapistEarned, 0);
  const totalNet = companyRecords.reduce((acc, r) => acc + r.companyNet, 0);
  const totalExtras = companyRecords.reduce((acc, r) => acc + r.extraCharge, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm mt-0.5">Semana de 02 a 07 de Março, 2026</p>
        </div>
        <div className="flex items-center gap-3">
          {closureSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span style={{ fontWeight: 600 }}>Encerrado!</span>
            </div>
          )}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {(["week", "day", "list"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${view === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
              >
                {v === "week" ? "Semana" : v === "day" ? "Dia" : "Lista"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm"
            style={{ background: primaryColor, fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" /> Agendar
          </button>
        </div>
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {DAYS.map((day) => {
          const dayApts = dayAppointments(day.date);
          const pendingClose = dayApts.filter((a) => !store.isCompleted(a.id) && (a.status === "confirmed" || a.status === "pending")).length;
          const isToday = day.isToday;
          return (
            <button
              key={day.date}
              onClick={() => { setSelectedDay(day.date); setView("day"); }}
              className={`rounded-xl p-3 text-center transition-all border ${
                selectedDay === day.date && view === "day"
                  ? "text-white shadow-md"
                  : isToday
                  ? "bg-white border-gray-200 shadow-sm"
                  : "bg-white border-gray-100"
              }`}
              style={selectedDay === day.date && view === "day" ? { background: primaryColor, borderColor: primaryColor } : {}}
            >
              <p className="text-xs text-current opacity-70">{day.label.split(" ")[0]}</p>
              <p className="text-lg" style={{ fontWeight: 700 }}>{day.label.split(" ")[1]}</p>
              {dayApts.length > 0 && (
                <div className="mt-1 flex justify-center items-center gap-1">
                  <span className={`text-xs px-1.5 rounded-full ${selectedDay === day.date && view === "day" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {dayApts.length}
                  </span>
                  {pendingClose > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Week View ──────────────────────────────────────────────────────── */}
      {view === "week" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)` }}>
            <div className="p-3" />
            {DAYS.map((day) => (
              <div key={day.date} className={`p-3 text-center border-l border-gray-100 ${day.isToday ? "bg-teal-50" : ""}`}>
                <p className="text-xs text-gray-400">{day.label.split(" ")[0]}</p>
                <p className={`text-sm ${day.isToday ? "text-teal-600" : "text-gray-700"}`} style={{ fontWeight: day.isToday ? 700 : 500 }}>
                  {day.label.split(" ")[1]}
                </p>
              </div>
            ))}
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            {HOURS.map((hour) => (
              <div key={hour} className="grid border-b border-gray-50 hover:bg-gray-50/50" style={{ gridTemplateColumns: `80px repeat(${DAYS.length}, 1fr)` }}>
                <div className="p-3 text-xs text-gray-400 text-right pr-4 border-r border-gray-100">{hour}</div>
                {DAYS.map((day) => {
                  const apt = companyAppointments.find((a) => a.date === day.date && a.time === hour);
                  const therapist = apt ? companyTherapists.find((t) => t.id === apt.therapistId) : null;
                  const client = apt ? companyClients.find((c) => c.id === apt.clientId) : null;
                  const effectiveStatus = apt ? getEffectiveStatus(apt) : null;
                  const st = effectiveStatus ? statusConfig[effectiveStatus] : null;
                  return (
                    <div key={day.date} className="p-1 border-l border-gray-50 min-h-[52px]">
                      {apt && st && (
                        <button
                          onClick={() => { setSelectedDay(day.date); setView("day"); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs"
                          style={{ background: st.bg, color: st.color }}
                        >
                          <p style={{ fontWeight: 600 }} className="truncate">{client?.name}</p>
                          <p className="opacity-80 truncate">{therapist?.name.split(" ")[0]}</p>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Day View ──────────────────────────────────────────────────────── */}
      {view === "day" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-gray-900">
              {DAYS.find((d) => d.date === selectedDay)?.label || selectedDay}
            </h3>
            <span className="text-sm" style={{ color: primaryColor, fontWeight: 600 }}>
              {dayAppointments(selectedDay).length} sessões
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {dayAppointments(selectedDay).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nenhuma sessão neste dia</p>
            ) : (
              dayAppointments(selectedDay).map((apt) => {
                const therapist = companyTherapists.find((t) => t.id === apt.therapistId);
                const client = companyClients.find((c) => c.id === apt.clientId);
                const therapy = therapies.find((th) => th.id === apt.therapyId);
                const effectiveStatus = getEffectiveStatus(apt);
                const st = statusConfig[effectiveStatus] ?? statusConfig.confirmed;
                const isCompleted = store.isCompleted(apt.id);
                const canClose = !isCompleted && (apt.status === "confirmed" || apt.status === "pending");
                const rec = companyRecords.find((r) => r.appointmentId === apt.id);
                const room = roomStore.getRoom(roomStore.getRoomForAppointment(apt.id) ?? "");
                return (
                  <div key={apt.id} className={`flex items-center gap-4 px-6 py-4 ${isCompleted ? "bg-emerald-50/30" : ""}`}>
                    <div className="text-center w-16 shrink-0">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{apt.time}</p>
                      <p className="text-xs text-gray-400">{apt.duration}min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{client?.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-gray-500">{therapy?.name} · {therapist?.name}</p>
                        {room && (
                          <span
                            className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md"
                            style={{ background: `${room.color}15`, color: room.color, fontWeight: 600 }}
                          >
                            <DoorOpen className="w-3 h-3" />
                            {room.name}
                          </span>
                        )}
                      </div>
                      {rec?.extraCharge > 0 && (
                        <p className="text-xs text-amber-600 mt-0.5" style={{ fontWeight: 600 }}>
                          +R$ {rec.extraCharge.toFixed(2)} extra · {rec.extraNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
                          R$ {rec ? rec.totalCharged.toFixed(2) : apt.price.toFixed(2)}
                        </p>
                        {rec && (
                          <p className="text-xs text-emerald-600">
                            Empresa: R$ {rec.companyNet.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: st.bg, color: st.color, fontWeight: 600 }}>
                        {st.label}
                      </span>
                      {canClose && (
                        <button
                          onClick={() => openClosure(apt)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs"
                          style={{ background: primaryColor, fontWeight: 600 }}
                        >
                          <CalendarCheck className="w-3.5 h-3.5" />
                          Encerrar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── List View ──────────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Data/Hora", "Cliente", "Terapeuta", "Sala", "Terapia", "Total", "Comissão", "Empresa", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-400 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companyAppointments.map((apt) => {
                const therapist = companyTherapists.find((t) => t.id === apt.therapistId);
                const client = companyClients.find((c) => c.id === apt.clientId);
                const therapy = therapies.find((th) => th.id === apt.therapyId);
                const effectiveStatus = getEffectiveStatus(apt);
                const st = statusConfig[effectiveStatus] ?? statusConfig.confirmed;
                const rec = companyRecords.find((r) => r.appointmentId === apt.id);
                const canClose = !store.isCompleted(apt.id) && (apt.status === "confirmed" || apt.status === "pending");
                const room = roomStore.getRoom(roomStore.getRoomForAppointment(apt.id) ?? "");
                return (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(apt.date + "T" + apt.time).toLocaleDateString("pt-BR")} {apt.time}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{client?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{therapist?.name.split(" ")[0]}</td>
                    <td className="px-4 py-3">
                      {room ? (
                        <span
                          className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md w-fit"
                          style={{ background: `${room.color}15`, color: room.color, fontWeight: 600 }}
                        >
                          <DoorOpen className="w-3 h-3" />
                          {room.name}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{therapy?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900" style={{ fontWeight: 600 }}>
                      R$ {rec ? rec.totalCharged.toFixed(2) : apt.price.toFixed(2)}
                      {rec?.extraCharge > 0 && <span className="text-amber-500 text-xs ml-1">(+{rec.extraCharge})</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-orange-600">
                      {rec ? `R$ ${rec.therapistEarned.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-600" style={{ fontWeight: 600 }}>
                      {rec ? `R$ ${rec.companyNet.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                        {canClose && (
                          <button
                            onClick={() => openClosure(apt)}
                            className="text-xs px-2 py-1 rounded-lg text-white"
                            style={{ background: primaryColor, fontWeight: 600 }}
                          >
                            Encerrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Session Closure Modal ──────────────────────────────────────────── */}
      {closureModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${primaryColor}15` }}>
                  <CalendarCheck className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Encerrar Atendimento</p>
                  <p className="text-gray-400 text-xs">{closureModal.apt.time} · {closureModal.apt.date.split("-").reverse().join("/")}</p>
                </div>
              </div>
              <button onClick={() => setClosureModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Session info */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400">Cliente</p>
                  <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{closureModal.clientName}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400">Terapia</p>
                  <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{closureModal.therapyName}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50">
                  <p className="text-xs text-gray-400">Terapeuta</p>
                  <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{closureModal.therapistName.split(" ")[0]}</p>
                </div>
              </div>

              {/* Extra charge */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                  Cobrança extra (opcional)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="0,00"
                      value={extraCharge || ""}
                      onChange={(e) => setExtraCharge(Math.max(0, Number(e.target.value)))}
                    />
                  </div>
                  <input
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    placeholder="Motivo (ex: produto usado)"
                    value={extraNotes}
                    onChange={(e) => setExtraNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Financial breakdown */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
                  <p className="text-xs text-gray-500" style={{ fontWeight: 700 }}>RESUMO FINANCEIRO</p>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Valor da sessão</span>
                    <span style={{ fontWeight: 600 }}>R$ {closureModal.apt.price.toFixed(2)}</span>
                  </div>
                  {extraCharge > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-amber-600">+ Cobrança extra</span>
                      <span className="text-amber-600" style={{ fontWeight: 600 }}>R$ {extraCharge.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                    <span className="text-gray-700" style={{ fontWeight: 600 }}>Total cobrado</span>
                    <span style={{ fontWeight: 700 }}>R$ {(closureModal.apt.price + extraCharge).toFixed(2)}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">Comissão do terapeuta ({closureModal.commissionPct}%)</span>
                    <span className="text-orange-600" style={{ fontWeight: 600 }}>
                      - R$ {((closureModal.apt.price + extraCharge) * closureModal.commissionPct / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm bg-emerald-50 -mx-1 px-3 py-2 rounded-lg">
                    <span className="text-emerald-700" style={{ fontWeight: 700 }}>Receita líquida da empresa</span>
                    <span className="text-emerald-700" style={{ fontWeight: 700 }}>
                      R$ {((closureModal.apt.price + extraCharge) * (1 - closureModal.commissionPct / 100)).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                  Observações
                </label>
                <textarea
                  rows={2}
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                  placeholder="Observações sobre o atendimento..."
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setClosureModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm">
                Cancelar
              </button>
              <button
                onClick={handleConfirmClosure}
                className="flex-1 py-2.5 rounded-xl text-white text-sm flex items-center justify-center gap-2"
                style={{ background: primaryColor, fontWeight: 700 }}
              >
                <CheckCircle className="w-4 h-4" />
                Encerrar atendimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Appointment Modal ─────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-gray-900 mb-6">Novo Agendamento</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Cliente</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {companyClients.map((c) => <option key={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Terapeuta</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {companyTherapists.map((t) => <option key={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Terapia</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {therapies.filter((th) => th.companyId === user?.companyId).map((th) => (
                    <option key={th.id}>{th.name} — R$ {th.price}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Sala de atendimento</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  <option value="">Selecionar sala...</option>
                  {roomsData
                    .filter((r) => r.companyId === user?.companyId && r.status === "active")
                    .map((r) => (
                      <option key={r.id} value={r.id}>{r.name} — {r.description}</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Data</label>
                  <input type="date" defaultValue="2026-03-04" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Horário</label>
                  <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                    {HOURS.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Observações</label>
                <textarea rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" placeholder="Informações adicionais..." />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNewModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm">Cancelar</button>
              <button onClick={() => setShowNewModal(false)} className="flex-1 py-2.5 text-white rounded-xl text-sm" style={{ background: primaryColor, fontWeight: 600 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}