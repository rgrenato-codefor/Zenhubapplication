import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  CalendarDays, Clock, CheckCircle, AlertCircle, XCircle, CalendarCheck,
  DollarSign, Building2, X, DoorOpen, Search, UserPlus, Loader2, Plus,
  ChevronLeft, ChevronRight, RefreshCw, Info, MapPin,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyUnit } from "../../context/CompanyContext";
import type { SessionRecord } from "../../context/DataContext";
import { checkAppointmentConflicts } from "../../lib/appointmentConflicts";
import { useCompanyPlan, invalidatePlanCache } from "../../hooks/useCompanyPlan";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ClosureModal = {
  apt: any;
  clientName: string;
  therapyName: string;
  therapistName: string;
  commissionPct: number;
} | null;

type CancelModal = {
  apt: any;
  clientName: string;
  therapistName: string;
  therapyName: string;
} | null;

// ─── Constants ─────────────────────────────────────────────────────────────────
const HOURS = [
  "00:00","01:00","02:00","03:00","04:00","05:00","06:00","07:00",
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00",
  "20:00","21:00","22:00","23:00",
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
    therapistStore: tStore,
    sessionRecords, completedSessionIds, roomAssignments,
    mutateCompleteSession, mutateAddAppointment, mutateAddClient,
    mutateUpdateAppointment,
    refresh, loading,
  } = usePageData();
  const { selectedUnitId, companyUnits } = useCompanyUnit();
  const primaryColor = company?.color || "#0D9488";

  // ── Plan enforcement: monthly appointment limit ────────────────────────────
  const { planConfig, allPlans, getLimit, isAtLimit } = useCompanyPlan(company?.plan);

  // Count appointments in the current calendar month for this company
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthAppointmentCount = storeAppointments.filter(
    (a) => a.date?.startsWith(currentYearMonth)
  ).length;

  const apptLimit = getLimit("appointments_monthly");
  const apptAtLimit = isAtLimit("appointments_monthly", monthAppointmentCount);

  // Next plan above current (for the consent modal) — uses Firestore-first allPlans
  const nextPlan = allPlans.find(
    (p) => p.order === (planConfig.order ?? 0) + 1
  ) ?? null;

  // ── Limit consent modal ──────────────────────────────────────────────────
  const [showLimitConsent, setShowLimitConsent] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState(false);

  const [view, setView] = useState<"week" | "day" | "list">("week");
  const [selectedDay, setSelectedDay] = useState(TODAY_STR);
  const [showNewModal, setShowNewModal] = useState(false);
  const [closureModal, setClosureModal] = useState<ClosureModal>(null);
  const [extraCharge, setExtraCharge] = useState(0);
  const [extraNotes, setExtraNotes] = useState("");
  const [closureNotes, setClosureNotes] = useState("");
  const [closureSuccess, setClosureSuccess] = useState(false);
  const [cancelModal, setCancelModal]     = useState<CancelModal>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [statsDrawerOpen, setStatsDrawerOpen] = useState(false);

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
    unitId: "",  // source-of-truth for multi-unit companies
  };
  const [newApt, setNewApt] = useState(emptyApt);
  const setApt = (k: keyof typeof emptyApt, v: string) =>
    setNewApt((p) => ({ ...p, [k]: v }));

  // Client selector
  const [clientSearch, setClientSearch] = useState("");
  const [clientDropOpen, setClientDropOpen] = useState(false);
  const [clientDropPos, setClientDropPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [showQuickClient, setShowQuickClient] = useState(false);
  const quickClientEmpty = { firstName: "", lastName: "", email: "", phone: "" };
  const [quickClient, setQuickClient] = useState(quickClientEmpty);
  const [qcError, setQcError] = useState("");
  const [addingClient, setAddingClient] = useState(false);
  const [savingApt, setSavingApt] = useState(false);
  const [aptError, setAptError] = useState("");
  const [aptStep, setAptStep] = useState<1 | 2 | 3>(1);
  const clientDropRef = useRef<HTMLDivElement>(null);
  const clientDropListRef = useRef<HTMLDivElement>(null);

  // Compute selected client/therapy for display
  const selectedClient = clients.find((c) => c.id === newApt.clientId);
  const selectedTherapy = therapies.find((t) => t.id === newApt.therapyId);

  // Auto-fill duration & price when therapy is chosen
  const [duration, setDuration] = useState("60");
  const [price, setPrice] = useState("");
  const [aptStatus, setAptStatus] = useState<"confirmed" | "pending" | "cancelled">("confirmed");
  const [aptNotes, setAptNotes] = useState("");
  useEffect(() => {
    if (selectedTherapy) {
      setDuration(String(selectedTherapy.duration ?? 60));
      setPrice(String(selectedTherapy.price ?? ""));
    }
  }, [newApt.therapyId]);

  // Close client dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const inInput = clientDropRef.current?.contains(e.target as Node);
      const inList = clientDropListRef.current?.contains(e.target as Node);
      if (!inInput && !inList) {
        setClientDropOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Recalculate fixed-position coords whenever the dropdown opens
  useEffect(() => {
    if (clientDropOpen && clientDropRef.current) {
      const r = clientDropRef.current.getBoundingClientRect();
      setClientDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
    }
  }, [clientDropOpen]);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  const openNewModal = () => {
    setNewApt({
      ...emptyApt,
      // If a unit filter is active, pre-fill the unit so the user doesn't have to re-select
      unitId: selectedUnitId ?? "",
    });
    setClientSearch("");
    setClientDropOpen(false);
    setShowQuickClient(false);
    setQuickClient(quickClientEmpty);
    setQcError("");
    setAptError("");
    setDuration("60");
    setPrice("");
    setAptStatus("confirmed");
    setAptNotes("");
    setAptStep(1);
    setShowNewModal(true);
  };

  // Opens scheduling: if at limit first ask for consent, otherwise go straight in
  const handleScheduleClick = () => {
    if (apptAtLimit) {
      setConsentChecked(false);
      setShowLimitConsent(true);
    } else {
      openNewModal();
    }
  };

  // Upgrades the company plan to nextPlan in Firestore, then opens the schedule modal
  const handleConsentConfirm = async () => {
    if (!nextPlan || !company) return;
    setUpgradingPlan(true);
    try {
      const { updateCompany } = await import("../../../lib/firestore");
      await updateCompany(company.id, {
        plan: nextPlan.name,
        planChangedAt: new Date().toISOString(),
      } as any);
      invalidatePlanCache();
    } catch (err) {
      console.error("Erro ao atualizar plano:", err);
    } finally {
      setUpgradingPlan(false);
      setShowLimitConsent(false);
      openNewModal();
    }
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
    // Unit is required when the company has more than one unit
    if (companyUnits.length > 1 && !newApt.unitId) {
      setAptError("Selecione a unidade para este agendamento.");
      return;
    }

    // ── Conflict & availability check ──────────────────────────────────────
    // Skip validation for "avulso" (generic therapist)
    if (newApt.therapistId !== "avulso") {
      const selectedT = therapists.find((t) => t.id === newApt.therapistId);
      const { blocked, warn, message } = checkAppointmentConflicts({
        existing: storeAppointments,
        availability: (selectedT as any)?.schedule,
        therapistId: newApt.therapistId,
        date: newApt.date,
        time: newApt.time,
        duration: Number(duration),
      });
      if (blocked) { setAptError(message); return; }
      if (warn && aptError !== message) {
        // Show warning once — user must click again to confirm
        setAptError("⚠️ " + message + " Clique em Confirmar novamente para agendar mesmo assim.");
        return;
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    setAptError("");
    setSavingApt(true);
    try {
      const selectedTherapist = therapists.find((t) => t.id === newApt.therapistId);

      /**
       * unitId resolution — THE FORM is the source of truth.
       *
       *  Autonomous profile (no units at all):
       *    → undefined, never saved. Correct by definition.
       *
       *  Company with exactly 1 unit:
       *    → auto-assign companyUnits[0].id, no user input needed.
       *
       *  Company with 2+ units:
       *    → newApt.unitId (required field in the form).
       *    → Blocked here if somehow empty (shouldn't reach save, form validates first).
       *    → The therapist's own unitId is used only as a SUGGESTION in the UI,
       *      but the form value is what gets persisted.
       */
      let resolvedUnitId: string | undefined;
      if (companyUnits.length === 0) {
        resolvedUnitId = undefined;
      } else if (companyUnits.length === 1) {
        resolvedUnitId = companyUnits[0].id;
      } else {
        if (!newApt.unitId) {
          setAptError("Selecione a unidade para este agendamento.");
          setSavingApt(false);
          return;
        }
        resolvedUnitId = newApt.unitId;
      }

      await mutateAddAppointment({
        companyId: user?.companyId ?? "",
        unitId: resolvedUnitId,
        clientId: newApt.clientId,
        therapistId: newApt.therapistId,
        therapyId: newApt.therapyId,
        date: newApt.date,
        time: newApt.time,
        duration: Number(duration),
        price: Number(price),
        status: aptStatus,
        notes: aptNotes || undefined,
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
  /**
   * Resolve which active unit an appointment belongs to (same cascade as Dashboard):
   *   1. appointment.unitId  — new appointments always have this
   *   2. therapist.unitId    — legacy: infer from the assigned therapist
   *   3. single active unit  — legacy: company had no multi-unit setup at the time
   */
  const resolveAptUnitId = (a: typeof storeAppointments[number]): string | undefined => {
    if ((a as any).unitId) return (a as any).unitId as string;
    const t = therapists.find((th) => th.id === a.therapistId);
    if ((t as any)?.unitId) return (t as any).unitId as string;
    if (companyUnits.length === 1) return companyUnits[0].id;
    return undefined;
  };

  const companyAppointments = storeAppointments.filter((a) =>
    !selectedUnitId || resolveAptUnitId(a) === selectedUnitId
  );

  const companyTherapists = therapists.filter((t) => {
    if (!selectedUnitId) return true;
    if ((t as any).unitId) return (t as any).unitId === selectedUnitId;
    // Therapists without unitId are shown when there's only one active unit
    return companyUnits.length === 1 && companyUnits[0].id === selectedUnitId;
  });

  const companyClients = clients;
  // Use real Firestore session records (filtered by companyId)
  const companyRecords = sessionRecords.filter((r) => r.companyId === user?.companyId);

  const dayAppointments = (date: string) => companyAppointments.filter((a) => a.date === date);

  const getEffectiveStatus = (apt: any) =>
    completedSessionIds.has(apt.id) ? "completed" : apt.status;

  // ── Closure ──────────────────────────────────────────────────────────────
  const openClosure = (apt: any) => {
    const cl = clients.find((c) => c.id === apt.clientId);
    const therapy = therapies.find((t) => t.id === apt.therapyId);
    const therapist = apt.therapistId === "avulso" ? null : therapists.find((t) => t.id === apt.therapistId);
    // Real mode: commission comes from the therapist record in Firestore (set by
    // the company via mutateUpdateTherapistCommission / mutateApproveAssociation).
    // Demo mode: fall back to the in-memory association store.
    const assoc = apt.therapistId === "avulso" ? { commission: 0 } : tStore.getAssociation(apt.therapistId);
    const commissionPct = therapist?.commission ?? assoc.commission;
    setClosureModal({
      apt,
      clientName: cl?.name ?? "Cliente",
      therapyName: therapy?.name ?? "Terapia",
      therapistName: apt.therapistId === "avulso" ? "Avulso" : (therapist?.name ?? "Terapeuta"),
      commissionPct,
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

  // ── Cancel ───────────────────────────────────────────────────────────────
  const openCancel = (apt: any) => {
    const cl        = clients.find((c) => c.id === apt.clientId);
    const therapy   = therapies.find((t) => t.id === apt.therapyId);
    const therapist = apt.therapistId === "avulso" ? null : therapists.find((t) => t.id === apt.therapistId);
    setCancelModal({
      apt,
      clientName:    cl?.name        ?? apt.clientName   ?? "Cliente",
      therapistName: apt.therapistId === "avulso" ? "Avulso" : (therapist?.name ?? "Terapeuta"),
      therapyName:   therapy?.name   ?? apt.therapyName  ?? "Terapia",
    });
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal) return;
    setCancelLoading(true);
    try {
      await mutateUpdateAppointment(cancelModal.apt.id, { status: "cancelled" } as any);
      setCancelModal(null);
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  // Cancelados não contam em nenhum total financeiro nem de sessões
  const activeAppointments = companyAppointments.filter((a) => a.status !== "cancelled");
  const totalGross = companyRecords.reduce((acc, r) => acc + r.totalCharged, 0);
  const totalNet   = companyRecords.reduce((acc, r) => acc + r.companyNet, 0);

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
          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={loading}
            title="Atualizar dados"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          {/* Stats info button */}
          <button
            onClick={() => setStatsDrawerOpen(true)}
            title="Resumo da semana"
            className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all relative"
          >
            <Info className="w-4 h-4" />
            {apptAtLimit && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
            )}
          </button>
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
          {apptAtLimit && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span style={{ fontWeight: 600 }}>
                {monthAppointmentCount}/{apptLimit} atend. — Limite {planConfig.name}
              </span>
            </div>
          )}
          <button
            onClick={handleScheduleClick}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm"
            style={{ background: primaryColor, fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" /> Agendar
            {apptLimit !== null && (
              <span className="ml-1 text-xs opacity-75">
                {monthAppointmentCount}/{apptLimit}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Stats Drawer ──────────────────────────────────────────────────────── */}
      {/* Backdrop */}
      {statsDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setStatsDrawerOpen(false)}
        />
      )}
      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 h-full z-50 w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300"
        style={{ transform: statsDrawerOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5" style={{ color: primaryColor }} />
            <span style={{ fontWeight: 700, color: "#111827" }}>Resumo da semana</span>
          </div>
          <button
            onClick={() => setStatsDrawerOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* Sessões */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Sessões hoje</p>
              <p className="text-2xl mt-1" style={{ color: primaryColor, fontWeight: 700 }}>
                {activeAppointments.filter((a) => a.date === TODAY_STR).length}
              </p>
            </div>
            <div className="w-px self-stretch bg-gray-200 mx-3" />
            <div>
              <p className="text-xs text-gray-400">Total semana</p>
              <p className="text-2xl mt-1" style={{ color: "#8B5CF6", fontWeight: 700 }}>
                {activeAppointments.length}
              </p>
            </div>
          </div>

          {/* Receitas */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>Receitas da semana</p>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Bruta</p>
                <p className="text-xl mt-0.5" style={{ color: "#059669", fontWeight: 700 }}>
                  R$&nbsp;{totalGross.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Líquida</p>
                <p className="text-xl mt-0.5" style={{ color: "#D97706", fontWeight: 700 }}>
                  R$&nbsp;{totalNet.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            {totalGross > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Margem líquida</span>
                  <span className="text-xs" style={{ fontWeight: 600, color: "#D97706" }}>
                    {Math.round((totalNet / totalGross) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${Math.min((totalNet / totalGross) * 100, 100)}%`, background: "#D97706" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Cota mensal */}
          {apptLimit !== null && (
            <div
              className="rounded-xl p-4"
              style={{
                background: apptAtLimit ? "#FFFBF5" : "#F0FDF4",
                border: `1px solid ${apptAtLimit ? "#FED7AA" : "#BBF7D0"}`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                {apptAtLimit
                  ? <AlertCircle className="w-4 h-4 text-amber-500" />
                  : <CalendarDays className="w-4 h-4 text-emerald-500" />}
                <p className="text-xs" style={{ fontWeight: 600, color: apptAtLimit ? "#B45309" : "#065F46" }}>
                  Cota mensal de atendimentos
                </p>
              </div>
              <div className="flex items-end justify-between mb-2">
                <p className="text-2xl" style={{ color: apptAtLimit ? "#B45309" : "#059669", fontWeight: 700 }}>
                  {monthAppointmentCount}
                  <span className="text-sm ml-1" style={{ fontWeight: 400, color: "#6B7280" }}>/ {apptLimit}</span>
                </p>
                <span className="text-xs text-gray-400">Plano {planConfig.name}</span>
              </div>
              <div className="h-2 bg-white/70 rounded-full overflow-hidden border border-white">
                <div
                  className="h-2 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((monthAppointmentCount / apptLimit) * 100, 100)}%`,
                    background: apptAtLimit ? "#F59E0B" : (monthAppointmentCount / apptLimit) >= 0.8 ? "#F59E0B" : primaryColor,
                  }}
                />
              </div>
              {apptAtLimit && (
                <p className="text-xs text-amber-700 mt-2" style={{ fontWeight: 500 }}>
                  Limite atingido. Atendimentos extras podem gerar cobrança adicional.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Dados referentes à semana atual
          </p>
        </div>
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
                  // All appointments in this hour slot (supports any time interval and all units)
                   const cellApts = companyAppointments.filter((a) => {
                     if (a.date !== day.date || !a.time) return false;
                     return `${a.time.split(":")[0].padStart(2, "0")}:00` === hour;
                   });
                  // (week cell — vars declared inside cellApts.map below)
                  // therapist lookup is inside cellApts.map below (as `thr`)
                  // st is also inside cellApts.map below
                  return (
                    <div
                      key={day.date}
                      className="p-1 border-l border-gray-50 min-h-[52px] flex flex-col gap-0.5"
                      style={day.isToday ? { background: `${primaryColor}05` } : {}}
                    >
                      {cellApts.map((_aptX) => { const apt=_aptX; const cl=companyClients.find((c)=>c.id===apt.clientId); const thr=apt.therapistId!=="avulso"?therapists.find((t)=>t.id===apt.therapistId):null; const st=statusConfig[getEffectiveStatus(apt)]; if(!st)return null; return (
                        <button
                          onClick={() => { setSelectedDay(day.date); setView("day"); }}
                          key={apt.id} className="w-full text-left px-2 py-1.5 rounded-lg text-xs"
                          style={{ background: st.bg, color: st.color }}
                        >
                          <p style={{ fontWeight: 600 }} className="truncate">{cl?.name}</p>
                          <p className="opacity-70 truncate">{apt.therapistId === "avulso" ? "Avulso" : (thr?.name.split(" ")[0] ?? "")}</p>
                         </button>
                       ); })}
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
                const therapist = apt.therapistId === "avulso" ? null : companyTherapists.find((t) => t.id === apt.therapistId);
                const cl = companyClients.find((c) => c.id === apt.clientId);
                const therapy = therapies.find((th) => th.id === apt.therapyId);
                const effectiveStatus = getEffectiveStatus(apt);
                const st = statusConfig[effectiveStatus] ?? statusConfig.confirmed;
                const isCompleted  = completedSessionIds.has(apt.id);
                const isCancelled = apt.status === "cancelled";
                const canClose    = !isCompleted && !isCancelled && (apt.status === "confirmed" || apt.status === "pending");
                const canCancel   = !isCompleted && !isCancelled;
                const rec         = companyRecords.find((r) => r.appointmentId === apt.id);
                const roomId = roomAssignments[apt.id];
                const room = roomId ? storeRooms.find((r) => r.id === roomId) : null;
                return (
                  <div key={apt.id} className={`flex items-center gap-4 px-6 py-4 ${isCompleted ? "bg-emerald-50/30" : ""}`}>
                    <div className="text-center w-16 shrink-0">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{apt.time}</p>
                      <p className="text-xs text-gray-400">{apt.duration}min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{cl?.name}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <p className="text-xs text-gray-500">{therapy?.name} · {apt.therapistId === "avulso" ? "Avulso" : therapist?.name}</p>
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
                        <p className={`text-sm ${isCancelled ? "text-red-300 line-through" : "text-gray-900"}`} style={{ fontWeight: 700 }}>
                          R$ {rec ? rec.totalCharged.toFixed(2) : apt.price.toFixed(2)}
                        </p>
                        {rec && !isCancelled && <p className="text-xs text-emerald-600">Empresa: R$ {rec.companyNet.toFixed(2)}</p>}
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
                      {canCancel && (
                        <button
                          onClick={() => openCancel(apt)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                          style={{ fontWeight: 600 }}
                        >
                          <XCircle className="w-3.5 h-3.5" /> Cancelar
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
                const isCompletedL = completedSessionIds.has(apt.id);
                const isCancelledL = apt.status === "cancelled";
                const canClose     = !isCompletedL && !isCancelledL && (apt.status === "confirmed" || apt.status === "pending");
                const canCancelL   = !isCompletedL && !isCancelledL;
                const roomId = roomAssignments[apt.id];
                const room = roomId ? storeRooms.find((r) => r.id === roomId) : null;
                return (
                  <tr key={apt.id} className={`hover:bg-gray-50 ${isCancelledL ? "opacity-60 bg-red-50/30" : ""}`}>
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        {canClose && (
                          <button onClick={() => openClosure(apt)} className="text-xs px-2 py-1 rounded-lg text-white whitespace-nowrap" style={{ background: primaryColor, fontWeight: 600 }}>Encerrar</button>
                        )}
                        {canCancelL && (
                          <button onClick={() => openCancel(apt)} className="text-xs px-2 py-1 rounded-lg whitespace-nowrap border border-red-200 text-red-500 hover:bg-red-50 transition-colors" style={{ fontWeight: 600 }}>Cancelar</button>
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

      {/* ── Cancel Confirmation Modal ─────────────────────────────────────── */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Cancelar Atendimento</p>
                  <p className="text-gray-400 text-xs">{cancelModal.apt.time} · {cancelModal.apt.date.split("-").reverse().join("/")}</p>
                </div>
              </div>
              <button onClick={() => setCancelModal(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Cliente",   value: cancelModal.clientName },
                  { label: "Terapia",   value: cancelModal.therapyName },
                  { label: "Terapeuta", value: cancelModal.therapistName.split(" ")[0] },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700" style={{ fontWeight: 600 }}>Esta ação não pode ser desfeita.</p>
                  <p className="text-xs text-red-500 mt-1">
                    O atendimento será marcado como cancelado e <strong>não contabilizará</strong> como ganho para nenhuma parte.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={cancelLoading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
                style={{ fontWeight: 700 }}
              >
                {cancelLoading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando...</>
                  : <><XCircle className="w-4 h-4" /> Confirmar cancelamento</>
                }
              </button>
            </div>
          </div>
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

      {/* ── Limit Consent Modal ──────────────────────────────────────────── */}
      {showLimitConsent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4">
            {/* Icon */}
            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6 text-amber-500" />
            </div>

            {/* Title */}
            <div className="text-center">
              <p className="text-gray-900 text-base" style={{ fontWeight: 700 }}>
                Limite do plano atingido
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Você usou{" "}
                <strong className="text-gray-700">{monthAppointmentCount}/{apptLimit}</strong>{" "}
                atendimentos do plano{" "}
                <strong className="text-gray-700">{planConfig.name}</strong> este mês.
              </p>
            </div>

            {/* Explanation */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-1.5">
              <p>Você pode continuar agendando normalmente — sem interrupção no atendimento aos seus clientes.</p>
              {nextPlan ? (
                <p>
                  Os atendimentos excedentes serão cobrados com base no plano{" "}
                  <strong>{nextPlan.name} (R$ {nextPlan.price}/mês)</strong> e o valor
                  ajustado aparecerá na sua próxima fatura.
                </p>
              ) : (
                <p>O excedente será cobrado conforme a tabela vigente na próxima fatura.</p>
              )}
            </div>

            {/* Checkbox consent */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-amber-500"
              />
              <span className="text-sm text-gray-600 leading-snug">
                Estou ciente e autorizo a cobrança do plano{" "}
                <strong className="text-gray-700">{nextPlan?.name ?? "superior"}</strong> na próxima fatura.
              </span>
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowLimitConsent(false)}
                disabled={upgradingPlan}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                disabled={!consentChecked || upgradingPlan}
                onClick={handleConsentConfirm}
                className="flex-1 py-2.5 text-white rounded-xl text-sm transition-all disabled:opacity-40 hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: primaryColor, fontWeight: 600 }}
              >
                {upgradingPlan ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Atualizando...</>
                ) : (
                  "Continuar agendando"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New Appointment Modal ─────────────────────────────────────────── */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] flex flex-col">

            {/* ── Header ──────────────────────────────────────────────── */}
            <div className="px-6 pt-6 pb-5 border-b border-gray-100 shrink-0">
              {/* Title row */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: `${primaryColor}15` }}
                  >
                    <CalendarCheck className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1rem", lineHeight: "1.375rem" }}>
                      Novo Agendamento
                    </p>
                    <p className="text-gray-400 mt-0.5" style={{ fontSize: "0.8125rem" }}>
                      {aptStep === 1 && "Passo 1 de 3 — Cliente"}
                      {aptStep === 2 && "Passo 2 de 3 — Profissional & Terapia"}
                      {aptStep === 3 && "Passo 3 de 3 — Data, horário e valores"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors shrink-0 -mt-0.5"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="flex items-center">
                {([1, 2, 3] as const).map((s, i) => (
                  <div key={s} className={`flex items-center ${i < 2 ? "flex-1" : ""}`}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                      style={{
                        background: aptStep >= s ? primaryColor : "transparent",
                        border: `2px solid ${aptStep >= s ? primaryColor : "#d1d5db"}`,
                        color: aptStep >= s ? "white" : "#9ca3af",
                        fontWeight: 600,
                        fontSize: "0.8125rem",
                      }}
                    >
                      {aptStep > s ? <CheckCircle className="w-3.5 h-3.5" /> : s}
                    </div>
                    {i < 2 && (
                      <div
                        className="h-px flex-1 mx-2 rounded-full transition-all"
                        style={{ background: aptStep > s ? primaryColor : "#e5e7eb" }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              {/* ══════════════════════════════════════════════════════════
                  STEP 1 — Cliente
              ══════════════════════════════════════════════════════════ */}
              {aptStep === 1 && <div>
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
                        onChange={(e) => {
                          setClientSearch(e.target.value);
                          if (clientDropRef.current) {
                            const r = clientDropRef.current.getBoundingClientRect();
                            setClientDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
                          }
                          setClientDropOpen(true);
                        }}
                        onFocus={() => {
                          if (clientDropRef.current) {
                            const r = clientDropRef.current.getBoundingClientRect();
                            setClientDropPos({ top: r.bottom + 4, left: r.left, width: r.width });
                          }
                          setClientDropOpen(true);
                        }}
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

                  {/* Dropdown list — rendered fixed to escape overflow clipping */}
                  {clientDropOpen && !newApt.clientId && clientDropPos && (
                    <div
                      ref={clientDropListRef}
                      className="fixed z-[300] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                      style={{ top: clientDropPos.top, left: clientDropPos.left, width: clientDropPos.width }}
                    >
                      <div className="max-h-64 overflow-y-auto">
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
              </div>}

              {/* ══ STEP 2 — Terapeuta, Unidade & Terapia ══ */}
              {aptStep === 2 && <div className="space-y-5">

              {/* ── Terapeuta ───────────────────────────────────────────── */}
              <div>
                <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Terapeuta *</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                  style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                  value={newApt.therapistId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    setApt("therapistId", tid);
                    // Multi-unit: suggest the therapist's default unit when no unit
                    // is manually set yet (pre-fill as convenience, user can override)
                    if (companyUnits.length > 1 && !newApt.unitId) {
                      const t = therapists.find((th) => th.id === tid);
                      const tUnit = (t as any)?.unitId as string | undefined;
                      if (tUnit) setApt("unitId", tUnit);
                    }
                  }}
                >
                  <option value="">Selecione o terapeuta...</option>
                  {therapists.length === 0 ? (
                    <option value="avulso">Avulso</option>
                  ) : (
                    therapists.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))
                  )}
                </select>

                {/* Single-unit: just show info badge, no action needed */}
                {companyUnits.length === 1 && (
                  <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: primaryColor }}>
                    <MapPin className="w-3 h-3 shrink-0" />
                    Unidade: <strong>{companyUnits[0].name}</strong>
                  </p>
                )}
              </div>

              {/* ── Unidade (obrigatório quando há mais de uma) ───────────── */}
              {companyUnits.length > 1 && (
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>
                    Unidade *
                  </label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                    value={newApt.unitId}
                    onChange={(e) => setApt("unitId", e.target.value)}
                  >
                    <option value="">Selecione a unidade...</option>
                    {companyUnits.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}{(u as any).isMain ? " (principal)" : ""}
                      </option>
                    ))}
                  </select>
                  {!newApt.unitId ? (
                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      Obrigatório — define onde o atendimento será registrado.
                    </p>
                  ) : (
                    <p className="text-xs mt-1 flex items-center gap-1" style={{ color: primaryColor }}>
                      <MapPin className="w-3 h-3 shrink-0" />
                      {companyUnits.find((u) => u.id === newApt.unitId)?.name}
                    </p>
                  )}
                </div>
              )}

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

              </div>}

              {/* ══ STEP 3 — Data, Horário & Valores ══ */}
              {aptStep === 3 && <div className="space-y-5">

              {/* ── Resumo (cliente + profissional + terapia) ───────────── */}
              <div className="rounded-xl p-3 space-y-2" style={{ background: `${primaryColor}08`, border: `1px solid ${primaryColor}20` }}>
                <p className="text-xs" style={{ fontWeight: 700, color: primaryColor }}>Resumo</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-gray-400" style={{ fontWeight: 600 }}>Cliente</span>
                    <span style={{ fontWeight: 600 }}>{clients.find((c) => c.id === newApt.clientId)?.name ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-gray-400" style={{ fontWeight: 600 }}>Terapeuta</span>
                    <span style={{ fontWeight: 600 }}>
                      {newApt.therapistId === "avulso"
                        ? "Avulso"
                        : therapists.find((t) => t.id === newApt.therapistId)?.name ?? "—"}
                    </span>
                  </div>
                  {(() => {
                    const uId = newApt.unitId || (companyUnits.length === 1 ? companyUnits[0].id : undefined);
                    const uName = companyUnits.find((u) => u.id === uId)?.name;
                    return uName ? (
                      <div className="flex items-center gap-2">
                        <span className="w-16 text-gray-400" style={{ fontWeight: 600 }}>Unidade</span>
                        <span style={{ fontWeight: 600 }}>{uName}</span>
                      </div>
                    ) : null;
                  })()}
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-gray-400" style={{ fontWeight: 600 }}>Terapia</span>
                    <span style={{ fontWeight: 600 }}>{therapies.find((t) => t.id === newApt.therapyId)?.name ?? "—"}</span>
                  </div>
                </div>
              </div>

              {/* ── Data + Horário ──────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-3">
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

              {/* ── Duração + Valor + Status ──────────────────────────── */}
              <div className="grid grid-cols-3 gap-3">
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
                <div>
                  <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Status</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2"
                    style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                    value={aptStatus}
                    onChange={(e) => setAptStatus(e.target.value as typeof aptStatus)}
                  >
                    <option value="confirmed">Confirmado</option>
                    <option value="pending">Pendente</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* ── Observações ────────────────────────────────────────── */}
              <div>
                <label className="block text-sm text-gray-600 mb-1.5" style={{ fontWeight: 600 }}>Observações</label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 resize-none"
                  style={{ ["--tw-ring-color" as string]: `${primaryColor}40` }}
                  placeholder="Anotações sobre o atendimento..."
                  value={aptNotes}
                  onChange={(e) => setAptNotes(e.target.value)}
                />
              </div>

              </div>}

            </div>

            {/* ── Footer — step-aware navigation ─────────────────────── */}
            <div className="px-6 pt-3 pb-5 border-t border-gray-100 shrink-0 space-y-3">
              {aptError && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aptError}</span>
                </div>
              )}
              <div className="flex gap-3">
                {/* Left button */}
                {aptStep === 1 ? (
                  <button
                    onClick={() => setShowNewModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                ) : (
                  <button
                    onClick={() => { setAptError(""); setAptStep((s) => (s - 1) as 1 | 2 | 3); }}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                )}

                {/* Right button */}
                {aptStep < 3 ? (
                  <button
                    onClick={() => {
                      setAptError("");
                      if (aptStep === 1) {
                        if (!newApt.clientId) { setAptError("Selecione ou cadastre um cliente."); return; }
                      }
                      if (aptStep === 2) {
                        if (!newApt.therapistId) { setAptError("Selecione o terapeuta."); return; }
                        if (!newApt.therapyId) { setAptError("Selecione a terapia."); return; }
                        if (companyUnits.length > 1 && !newApt.unitId) { setAptError("Selecione a unidade."); return; }
                      }
                      setAptStep((s) => (s + 1) as 1 | 2 | 3);
                    }}
                    className="flex-1 py-2.5 text-white rounded-xl text-sm flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
                    style={{ background: primaryColor, fontWeight: 600 }}
                  >
                    Próximo <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
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
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}