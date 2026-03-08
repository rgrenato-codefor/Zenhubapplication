import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  CalendarDays, Clock, CheckCircle, AlertCircle, XCircle, CalendarCheck,
  DollarSign, Building2, X, DoorOpen, Search, UserPlus, Loader2, Plus,
  ChevronLeft, ChevronRight,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyUnit } from "../../context/CompanyContext";
import type { SessionRecord } from "../../context/DataContext";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ClosureModal = {
  apt: any;
  clientName: string;
  therapyName: string;
  therapistName: string;
  commissionPct: number;
} | null;

// ─── Constants ─────────────────────────────────────────────────────────────────
const HOURS = [
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00",
];

// ─── Date helpers ──────────────────────────────────────────────────────────────
const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

function toISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const TODAY_STR = toISO(TODAY);

const DAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  confirmed:  { label: "Confirmado", bg: "#EFF6FF", color: "#1D4ED8" },
  pending:    { label: "Pendente",   bg: "#FFFBEB", color: "#B45309" },
  completed:  { label: "Concluído", bg: "#F0FDF4", color: "#15803D" },
  cancelled:  { label: "Cancelado", bg: "#FEF2F2", color: "#B91C1C" },
};

// ─── Component ─────────────────────────────────────────────────────────────────
export default function CompanySchedule() {
  const { user } = useAuth();
  const {
    company, therapists, clients, appointments: storeAppointments,
    therapies, rooms: storeRooms,
    therapistStore: tStore, roomStore: rStore,
    mutateCompleteSession, mutateAddAppointment, mutateAddClient,
  } = usePageData();
  const { selectedUnitId } = useCompanyUnit();
  const primaryColor = company?.color || "#0D9488";

  const [view, setView] = useState<"week" | "day" | "list">("week");
  const [selectedDay, setSelectedDay] = useState(TODAY_STR);
  const [showNewModal, setShowNewModal] = useState(false);
  const [closureModal, setClosureModal] = useState<ClosureModal>(null);
  const [extraCharge, setExtraCharge] = useState(0);
  const [extraNotes, setExtraNotes] = useState("");
  const [closureNotes, setClosureNotes] = useState("");
  const [closureSuccess, setClosureSuccess] = useState(false);

  // ── Week navigation ────────────────────────────────────────────────────────
  const [weekOffset, setWeekOffset] = useState(0); // in days (shifts center)

  // 7 dias centrados em TODAY + weekOffset: [-3, -2, -1, 0, +1, +2, +3]
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(TODAY);
      d.setDate(TODAY.getDate() + weekOffset + (i - 3));
      const iso = toISO(d);
      return {
        date:    iso,
        label:   `${DAY_ABBR[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}`,
        isToday: iso === TODAY_STR,
      };
    });
  }, [weekOffset]);

  // Dynamic header subtitle
  const weekSubtitle = useMemo(() => {
    const d1 = new Date(weekDays[0].date + "T12:00:00");
    const d2 = new Date(weekDays[6].date + "T12:00:00");
    if (d1.getMonth() === d2.getMonth()) {
      return `${d1.getDate()} a ${d2.getDate()} de ${MONTH_PT[d1.getMonth()]}, ${d1.getFullYear()}`;
    }
    return `${d1.getDate()} de ${MONTH_PT[d1.getMonth()]} — ${d2.getDate()} de ${MONTH_PT[d2.getMonth()]}, ${d2.getFullYear()}`;
  }, [weekDays]);

  // ── New Appointment form state ────────────────────────────────────────────
  const emptyApt = {
    clientId: "",
    therapistId: "",
    therapyId: "",
    date: TODAY_STR,
    time: "09:00",
  };
  const [newApt, setNewApt] = useState(emptyApt);
  const setApt = (k: keyof typeof emptyApt, v: string) =>
    setNewApt((p) => ({ ...p, [k]: v }));

  // Client selector
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const quickClientEmpty = { firstName: "", lastName: "", email: "", phone: "" };
  const [quickClient, setQuickClient] = useState(quickClientEmpty);
  const [qcError, setQcError] = useState("");
  const [addingClient, setAddingClient] = useState(false);
  const [savingApt, setSavingApt] = useState(false);
  const [aptError, setAptError] = useState("");
  const clientDropRef = useRef<HTMLDivElement>(null);

  // Compute selected client/therapy for display
  const selectedClient = clients.find((c) => c.id === newApt.clientId);
  const selectedTherapy = therapies.find((t) => t.id === newApt.therapyId);

  // Auto-fill duration & price when therapy is chosen
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  useEffect(() => {
    if (selectedTherapy) {
      setDuration(String(selectedTherapy.duration ?? 60));
      setPrice(String(selectedTherapy.price ?? ""));
    }
  }, [newApt.therapyId]);

  // Close client dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientDropRef.current && !clientDropRef.current.contains(e.target as Node)) {
        setClientDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const openNewModal = () => {
    setNewApt(emptyApt);
    setClientSearch("");
    setClientDropOpen(false);
    setShowQuickClient(false);
    setQuickClient(quickClientEmpty);
    setQcError("");
    setAptError("");
    setDuration("60");
    setPrice("");
    setShowNewModal(true);
  };

  const handleSelectClient = (id: string, name: string) => {
    setApt("clientId", id);
    setClientSearch(name);
    setClientDropOpen(false);
    setShowQuickClient(false);
  };

  const handleClearClient = () => {
    setApt("clientId", "");
    setClientSearch("");
    setClientDropOpen(true);
  };

  const handleAddQuickClient = async () => {
    if (!quickClient.firstName.trim()) { setQcError("Informe o nome."); return; }
    if (!quickClient.email.trim() && !quickClient.phone.trim()) {
      setQcError("Informe e-mail ou telefone."); return;
    }
    setQcError("");
    setAddingClient(true);
    try {
      const fullName = [quickClient.firstName.trim(), quickClient.lastName.trim()].filter(Boolean).join(" ");
      const newC = await mutateAddClient({
        name: fullName,
        email: quickClient.email.trim() || undefined,
        phone: quickClient.phone.trim() || undefined,
        companyId: user?.companyId ?? "",
        status: "active",
      } as any);
      handleSelectClient(newC.id, newC.name);
      setShowQuickClient(false);
      setQuickClient(quickClientEmpty);
    } catch (e: any) {
      setQcError(e?.message ?? "Erro ao cadastrar cliente.");
    } finally {
      setAddingClient(false);
    }
  };

  const handleConfirmNewApt = async () => {
    if (!newApt.clientId) { setAptError("Selecione ou cadastre um cliente."); return; }
    if (!newApt.therapistId) { setAptError("Selecione o terapeuta."); return; }
    if (!newApt.therapyId) { setAptError("Selecione a terapia."); return; }
    if (!price || isNaN(Number(price))) { setAptError("Informe o valor."); return; }
    setAptError("");
    setSavingApt(true);
    try {
      await mutateAddAppointment({
        companyId: user?.companyId ?? "",
        unitId: selectedUnitId ?? undefined,
        clientId: newApt.clientId,
        therapistId: newApt.therapistId,
        therapyId: newApt.therapyId,
        date: newApt.date,
        time: newApt.time,
        duration: Number(duration),
        price: Number(price),
        status: "confirmed",
      } as any);
      setShowNewModal(false);
      setClosureSuccess(true);
      setTimeout(() => setClosureSuccess(false), 3000);
    } catch (e: any) {
      setAptError(e?.message ?? "Erro ao criar agendamento.");
    } finally {
      setSavingApt(false);
    }
  };

  // ── Data filters ──────────────────────────────────────────────────────────
  const companyAppointments = storeAppointments.filter((a) =>
    !selectedUnitId || (a as any).unitId === selectedUnitId
  );

  const companyTherapists = therapists.filter((t) => {
    const isUnit = !selectedUnitId || (t as any).unitId === selectedUnitId;
    return isUnit;
  });

  const companyClients = clients;
  const companyRecords = tStore.getCompanyRecords(user?.companyId ?? "");

  const dayAppointments = (date: string) => companyAppointments.filter((a) => a.date === date);

  const getEffectiveStatus = (apt: any) =>
    tStore.isCompleted(apt.id) ? "completed" : apt.status;

  // ── Closure ──────────────────────────────────────────────────────────────
  const openClosure = (apt: any) => {
    const cl = clients.find((c) => c.id === apt.clientId);
    const therapy = therapies.find((t) => t.id === apt.therapyId);
    const therapist = therapists.find((t) => t.id === apt.therapistId);
    const assoc = tStore.getAssociation(apt.therapistId);
    setClosureModal({
      apt,
      clientName: cl?.name ?? "Cliente",
      therapyName: therapy?.name ?? "Terapia",
      therapistName: therapist?.name ?? "Terapeuta",
      commissionPct: assoc.commission,
    });
    setExtraCharge(0);
    setExtraNotes("");
    setClosureNotes("");
  };

  const handleConfirmClosure = async () => {
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

    await mutateCompleteSession(record);
    setClosureModal(null);
    setClosureSuccess(true);
    setTimeout(() => setClosureSuccess(false), 3000);
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalGross = companyRecords.reduce((acc, r) => acc + r.totalCharged, 0);
  const totalNet = companyRecords.reduce((acc, r) => acc + r.companyNet, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm mt-0.5">{weekSubtitle}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {closureSuccess && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span style={{ fontWeight: 600 }}>Encerrado!</span>
            </div>
          )}
          {/* Week nav */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setWeekOffset((w) => w - 7)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-white hover:shadow-sm transition-all"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className={`px-2 py-1 rounded-md text-xs transition-colors ${weekOffset === 0 ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              style={{ fontWeight: weekOffset === 0 ? 600 : 400 }}
            >
              Hoje
            </button>
            <button
              onClick={() => setWeekOffset((w) => w + 7)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-white hover:shadow-sm transition-all"
              aria-label="Próxima semana"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm"
            style={{ background: primaryColor, fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" /> Agendar
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Sessões hoje", value: dayAppointments(TODAY_STR).length.toString(), color: primaryColor },
          { label: "Total semana", value: companyAppointments.length.toString(), color: "#8B5CF6" },
          { label: "Receita bruta", value: `R$ ${totalGross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "#059669" },
          { label: "Receita líquida", value: `R$ ${totalNet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, color: "#D97706" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-400">{s.label}</p>
            <p className="text-lg mt-0.5" style={{ color: s.color, fontWeight: 700 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Day selector */}
      <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayApts = dayAppointments(day.date);
          const pendingClose = dayApts.filter(
            (a) => !tStore.isCompleted(a.id) && (a.status === "confirmed" || a.status === "pending")
          ).length;
          const isSelected = selectedDay === day.date && view === "day";
          return (
            <button
              key={day.date}
              onClick={() => { setSelectedDay(day.date); setView("day"); }}
              className={`rounded-xl p-3 text-center transition-all border-2 ${
                isSelected
                  ? "text-white shadow-md"
                  : day.isToday
                  ? "bg-white shadow-sm"
                  : "bg-white border-gray-100 hover:border-gray-200"
              }`}
              style={
                isSelected
                  ? { background: primaryColor, borderColor: primaryColor }
                  : day.isToday
                  ? { borderColor: primaryColor }
                  : {}
              }
            >
              <p className={`text-xs ${day.isToday && !isSelected ? "opacity-100" : "opacity-70"}`}
                 style={day.isToday && !isSelected ? { color: primaryColor, fontWeight: 600 } : {}}
              >{day.label.split(" ")[0]}</p>
              <p className="text-lg" style={{ fontWeight: 700, color: isSelected ? "white" : day.isToday ? primaryColor : undefined }}>{day.label.split(" ")[1]}</p>
              {day.isToday && !isSelected && (
                <div className="flex justify-center mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: primaryColor }} />
                </div>
              )}
              {dayApts.length > 0 && (
                <div className="mt-1 flex justify-center items-center gap-1">
                  <span className={`text-xs px-1.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"}`}>
                    {dayApts.length}
                  </span>
                  {pendingClose > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Week View ───────────────────────────────────────────────────── */}
      {view === "week" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="grid border-b border-gray-100" style={{ gridTemplateColumns: `80px repeat(${weekDays.length}, 1fr)` }}>
            <div className="p-3" />
            {weekDays.map((day) => (
              <div
                key={day.date}
                className="p-3 text-center border-l border-gray-100"
                style={day.isToday ? { background: `${primaryColor}10` } : {}}
              >
                <p className="text-xs text-gray-400">{day.label.split(" ")[0]}</p>
                <p
                  className="text-sm"
                  style={{ fontWeight: day.isToday ? 700 : 500, color: day.isToday ? primaryColor : "#374151" }}
                >
                  {day.label.split(" ")[1]}
                </p>
                {day.isToday && (
                  <div className="flex justify-center mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: primaryColor }} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="overflow-y-auto max-h-[400px]">
            {HOURS.map((hour) => (
              <div key={hour} className="grid border-b border-gray-50 hover:bg-gray-50/50" style={{ gridTemplateColumns: `80px repeat(${weekDays.length}, 1fr)` }}>
                <div className="p-3 text-xs text-gray-400 text-right pr-4 border-r border-gray-100">{hour}</div>
                {weekDays.map((day) => {
                  const apt = companyAppointments.find((a) => a.date === day.date && a.time === hour);
                  const cl = apt ? companyClients.find((c) => c.id === apt.clientId) : null;
                  const therapist = apt ? companyTherapists.find((t) => t.id === apt.therapistId) : null;
                  const st = apt ? statusConfig[getEffectiveStatus(apt)] : null;
                  return (
                    <div
                      key={day.date}
                      className="p-1 border-l border-gray-50 min-h-[52px]"
                      style={day.isToday ? { background: `${primaryColor}05` } : {}}
                    >
                      {apt && st && (
                        <button
                          onClick={() => { setSelectedDay(day.date); setView("day"); }}
                          className="w-full text-left px-2 py-1.5 rounded-lg text-xs"
                          style={{ background: st.bg, color: st.color }}
                        >
                          <p style={{ fontWeight: 600 }} className="truncate">{cl?.name}</p>
                          <p className="opacity-70 truncate">{therapist?.name.split(" ")[0]}</p>
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

      {/* ── Day View ────────────────────────────────────────────────────── */}
      {view === "day" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
            <h3 className="text-gray-900">
              {weekDays.find((d) => d.date === selectedDay)?.label || selectedDay}
            </h3>
            <span className="text-sm" style={{ color: primaryColor, fontWeight: 600 }}>
              {dayAppointments(selectedDay).length} sessões
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {dayAppointments(selectedDay).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nenhuma sessão neste dia</p>
            ) : (
              dayAppointments(selectedDay).map((apt: any) => {
                const therapist = companyTherapists.find((t) => t.id === apt.therapistId);
                const cl = companyClients.find((c) => c.id === apt.clientId);
                const therapy = therapies.find((th) => th.id === apt.therapyId);
                const effectiveStatus = getEffectiveStatus(apt);
                const st = statusConfig[effectiveStatus] ?? statusConfig.confirmed;
                const isCompleted = tStore.isCompleted(apt.id);
                const canClose = !isCompleted && (apt.status === "confirmed" || apt.status === "pending");
                const rec = companyRecords.find((r) => r.appointmentId === apt.id);
                const roomId = rStore.getRoomForAppointment(apt.id);
                const room = roomId ? rStore.getRoom(roomId) : null;
                return (
                  <div key={apt.id} className={`flex items-center gap-4 px-6 py-4 ${isCompleted ? "bg-emerald-50/30" : ""}`}>
                    <div className="text-center w-16 shrink-0">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{apt.time}</p>
                      <p className="text-xs text-gray-400">{apt.duration}min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{cl?.name}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <p className="text-xs text-gray-500">{therapy?.name} · {therapist?.name}</p>
                        {room && (
                          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: `${room.color}15`, color: room.color, fontWeight: 600 }}>
                            <DoorOpen className="w-3 h-3" />{room.name}
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
                        {rec && <p className="text-xs text-emerald-600">Empresa: R$ {rec.companyNet.toFixed(2)}</p>}
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
                          <CalendarCheck className="w-3.5 h-3.5" /> Encerrar
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

      {/* ── List View ────────────────────────────────────────────────────── */}
      {view === "list" && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {["Data/Hora", "Cliente", "Terapeuta", "Sala", "Terapia", "Total", "Comissão", "Empresa", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs text-gray-400 px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {companyAppointments.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-gray-400">Nenhum agendamento</td></tr>
              ) : companyAppointments.map((apt: any) => {
                const therapist = companyTherapists.find((t) => t.id === apt.therapistId);
                const cl = companyClients.find((c) => c.id === apt.clientId);
                const therapy = therapies.find((th) => th.id === apt.therapyId);
                const st = statusConfig[getEffectiveStatus(apt)] ?? statusConfig.confirmed;
                const rec = companyRecords.find((r) => r.appointmentId === apt.id);
                const canClose = !tStore.isCompleted(apt.id) && (apt.status === "confirmed" || apt.status === "pending");
                const roomId = rStore.getRoomForAppointment(apt.id);
                const room = roomId ? rStore.getRoom(roomId) : null;
                return (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{apt.date.split("-").reverse().join("/")} {apt.time}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{cl?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{therapist?.name.split(" ")[0]}</td>
                    <td className="px-4 py-3">
                      {room ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md w-fit" style={{ background: `${room.color}15`, color: room.color, fontWeight: 600 }}>
                          <DoorOpen className="w-3 h-3" />{room.name}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{therapy?.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap" style={{ fontWeight: 600 }}>
                      R$ {rec ? rec.totalCharged.toFixed(2) : apt.price.toFixed(2)}
                      {rec?.extraCharge > 0 && <span className="text-amber-500 text-xs ml-1">(+{rec.extraCharge})</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-orange-600 whitespace-nowrap">{rec ? `R$ ${rec.therapistEarned.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3 text-sm text-emerald-600 whitespace-nowrap" style={{ fontWeight: 600 }}>{rec ? `R$ ${rec.companyNet.toFixed(2)}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        {canClose && (
                          <button onClick={() => openClosure(apt)} className="text-xs px-2 py-1 rounded-lg text-white whitespace-nowrap" style={{ background: primaryColor, fontWeight: 600 }}>Encerrar</button>
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

      {/* ── Session Closure Modal ─────────────────────────────────────────── */}
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
              <button onClick={() => setClosureModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Cliente", value: closureModal.clientName },
                  { label: "Terapia", value: closureModal.therapyName },
                  { label: "Terapeuta", value: closureModal.therapistName.split(" ")[0] },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Cobrança extra (opcional)</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                    <input type="number" min={0} step={0.01} className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="0,00" value={extraCharge || ""} onChange={(e) => setExtraCharge(Math.max(0, Number(e.target.value)))} />
                  </div>
                  <input className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="Motivo" value={extraNotes} onChange={(e) => setExtraNotes(e.target.value)} />
                </div>
              </div>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-50 bg-gray-50">
                  <p className="text-xs text-gray-500" style={{ fontWeight: 700 }}>RESUMO FINANCEIRO</p>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Valor da sessão</span><span style={{ fontWeight: 600 }}>R$ {closureModal.apt.price.toFixed(2)}</span></div>
                  {extraCharge > 0 && <div className="flex justify-between text-sm"><span className="text-amber-600">+ Extra</span><span className="text-amber-600" style={{ fontWeight: 600 }}>R$ {extraCharge.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-sm border-t border-gray-100 pt-2"><span className="text-gray-700" style={{ fontWeight: 600 }}>Total cobrado</span><span style={{ fontWeight: 700 }}>R$ {(closureModal.apt.price + extraCharge).toFixed(2)}</span></div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between text-sm"><span className="text-orange-600">Comissão terapeuta ({closureModal.commissionPct}%)</span><span className="text-orange-600" style={{ fontWeight: 600 }}>- R$ {((closureModal.apt.price + extraCharge) * closureModal.commissionPct / 100).toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm bg-emerald-50 -mx-1 px-3 py-2 rounded-lg"><span className="text-emerald-700" style={{ fontWeight: 700 }}>Receita líquida empresa</span><span className="text-emerald-700" style={{ fontWeight: 700 }}>R$ {((closureModal.apt.price + extraCharge) * (1 - closureModal.commissionPct / 100)).toFixed(2)}</span></div>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Observações</label>
                <textarea rows={2} value={closureNotes} onChange={(e) => setClosureNotes(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" placeholder="Observações sobre o atendimento..." />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setClosureModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm">Cancelar</button>
              <button onClick={handleConfirmClosure} className="flex-1 py-2.5 rounded-xl text-white text-sm flex items-center justify-center gap-2" style={{ background: primaryColor, fontWeight: 700 }}>
                <CheckCircle className="w-4 h-4" /> Encerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Appointment Modal ─────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${primaryColor}18` }}>
                  <CalendarCheck className="w-4 h-4" style={{ color: primaryColor }} />
                </div>
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Novo Agendamento</p>
              </div>
              <button onClick={() => setShowNewModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* ── Cliente ─────────────────────────────────────────────── */}
              <div>
                <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>
                  Cliente *
                </label>

                {/* Search / selected chip */}
                <div className="relative" ref={clientDropRef}>
                  {newApt.clientId ? (
                    /* Selected state */
                    <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs shrink-0" style={{ background: primaryColor }}>
                        {selectedClient?.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm text-gray-900" style={{ fontWeight: 600 }}>
                        {selectedClient?.name}
                      </span>
                      <button onClick={handleClearClient} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    /* Search input */
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all"
                        style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                        placeholder="Buscar cliente pelo nome..."
                        value={clientSearch}
                        onChange={(e) => { setClientSearch(e.target.value); setClientDropOpen(true); }}
                        onFocus={() => setClientDropOpen(true)}
                      />
                      <button
                        title="Cadastrar novo cliente"
                        onClick={() => { setShowQuickClient(true); setClientDropOpen(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg flex items-center justify-center text-white transition-all"
                        style={{ background: primaryColor }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Dropdown list */}
                  {clientDropOpen && !newApt.clientId && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                      <div className="max-h-44 overflow-y-auto">
                        {filteredClients.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">Nenhum cliente encontrado</p>
                        ) : (
                          filteredClients.map((c) => (
                            <button
                              key={c.id}
                              onMouseDown={() => handleSelectClient(c.id, c.name)}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors"
                            >
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs shrink-0" style={{ background: primaryColor }}>
                                {c.name[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800" style={{ fontWeight: 500 }}>{c.name}</p>
                                {(c.email || c.phone) && (
                                  <p className="text-xs text-gray-400 truncate">{c.email || c.phone}</p>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                      {/* Add new button at the bottom of dropdown */}
                      <button
                        onMouseDown={() => { setShowQuickClient(true); setClientDropOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 border-t border-gray-100 text-sm hover:bg-gray-50 transition-colors"
                        style={{ color: primaryColor, fontWeight: 600 }}
                      >
                        <UserPlus className="w-4 h-4" />
                        Cadastrar novo cliente
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Quick add client panel ─────────────────────────── */}
                {showQuickClient && (
                  <div className="mt-3 rounded-xl border-2 p-4 space-y-3 bg-gray-50" style={{ borderColor: `${primaryColor}30` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-4 h-4" style={{ color: primaryColor }} />
                        <p className="text-sm" style={{ fontWeight: 700, color: primaryColor }}>Novo cliente</p>
                      </div>
                      <button onClick={() => { setShowQuickClient(false); setQcError(""); }} className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Nome + Sobrenome */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 600 }}>Nome *</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                          style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                          placeholder="João"
                          value={quickClient.firstName}
                          onChange={(e) => { setQuickClient((p) => ({ ...p, firstName: e.target.value })); setQcError(""); }}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 600 }}>Sobrenome</label>
                        <input
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                          style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                          placeholder="Silva"
                          value={quickClient.lastName}
                          onChange={(e) => setQuickClient((p) => ({ ...p, lastName: e.target.value }))}
                        />
                      </div>
                    </div>

                    {/* E-mail */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 600 }}>E-mail</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                        style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                        placeholder="joao@email.com"
                        value={quickClient.email}
                        onChange={(e) => { setQuickClient((p) => ({ ...p, email: e.target.value })); setQcError(""); }}
                      />
                    </div>

                    {/* Telefone */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1" style={{ fontWeight: 600 }}>Telefone</label>
                      <input
                        type="tel"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 bg-white"
                        style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                        placeholder="(11) 99999-0000"
                        value={quickClient.phone}
                        onChange={(e) => { setQuickClient((p) => ({ ...p, phone: e.target.value })); setQcError(""); }}
                      />
                    </div>

                    <p className="text-xs text-gray-400">* Informe ao menos e-mail ou telefone.</p>

                    {qcError && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> {qcError}
                      </p>
                    )}

                    <button
                      onClick={handleAddQuickClient}
                      disabled={addingClient}
                      className="w-full py-2 rounded-lg text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
                      style={{ background: primaryColor, fontWeight: 600 }}
                    >
                      {addingClient ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</>
                      ) : (
                        <><UserPlus className="w-4 h-4" /> Adicionar cliente</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* ── Terapeuta ───────────────────────────────────────────── */}
              <div>
                <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Terapeuta *</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                  value={newApt.therapistId}
                  onChange={(e) => setApt("therapistId", e.target.value)}
                >
                  <option value="">Selecione o terapeuta...</option>
                  {therapists.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* ── Terapia ─────────────────────────────────────────────── */}
              <div>
                <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Terapia *</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                  value={newApt.therapyId}
                  onChange={(e) => setApt("therapyId", e.target.value)}
                >
                  <option value="">Selecione a terapia...</option>
                  {therapies.map((th) => (
                    <option key={th.id} value={th.id}>{th.name} — R$ {th.price}</option>
                  ))}
                </select>
              </div>

              {/* ── Data + Horário ──────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Data *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                    value={newApt.date}
                    onChange={(e) => setApt("date", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Horário *</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                    value={newApt.time}
                    onChange={(e) => setApt("time", e.target.value)}
                  >
                    {HOURS.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Duração + Valor ─────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Duração (min)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                    placeholder="60"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Valor (R$) *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                    placeholder="150"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                </div>
              </div>

              {aptError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aptError}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
              <button
                onClick={() => setShowNewModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmNewApt}
                disabled={savingApt}
                className="flex-1 py-2.5 text-white rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:opacity-90"
                style={{ background: primaryColor, fontWeight: 600 }}
              >
                {savingApt ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Confirmar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}