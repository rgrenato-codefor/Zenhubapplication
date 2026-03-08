import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  CalendarDays, Clock, CheckCircle, AlertCircle, User, X,
  CalendarCheck, Plus, Loader2, Zap, Building2, ChevronLeft, ChevronRight,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import type { SessionRecord, CatalogItem } from "../../context/DataContext";
import { checkAppointmentConflicts } from "../../lib/appointmentConflicts";

type ClosureModal = {
  apt: any;
  clientName: string;
  therapyName: string;
  price: number;
} | null;

type BookingForm = {
  date: string;
  time: string;
  clientName: string;
  clientId: string;
  catalogItemId: string;
  therapyId: string;
  duration: string;
  price: string;
  notes: string;
};

// ── Date helpers ──────────────────────────────────────────────────────────────

const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

const DAY_ABBR    = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_KEYS_WK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTH_PT    = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(d: Date): string {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ── Initial state ─────────────────────────────────────────────────────────────

const HOURS = [
  "08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00",
];

const DAY_LABELS: Record<string, string> = {
  monday: "Segunda", tuesday: "Terça", wednesday: "Quarta",
  thursday: "Quinta", friday: "Sexta", saturday: "Sábado", sunday: "Domingo",
};

// ── All 7 days for the availability grid (always fixed Mon → Sun) ──────────
const ALL_WEEK_DAYS = [
  { dayKey: "monday",    label: "Seg" },
  { dayKey: "tuesday",   label: "Ter" },
  { dayKey: "wednesday", label: "Qua" },
  { dayKey: "thursday",  label: "Qui" },
  { dayKey: "friday",    label: "Sex" },
  { dayKey: "saturday",  label: "Sáb" },
  { dayKey: "sunday",    label: "Dom" },
];

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle className="w-3 h-3" /> Encerrado</span>;
  if (status === "confirmed")
    return <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700"><CheckCircle className="w-3 h-3" /> Confirmado</span>;
  if (status === "pending")
    return <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><AlertCircle className="w-3 h-3" /> Pendente</span>;
  return null;
}

export default function TherapistSchedule() {
  const { user } = useAuth();
  const {
    myTherapist: therapist, appointments: allAppointments,
    clients, therapies, company,
    myCatalog,
    myAvailability,
    therapistStore: store, mutateCompleteSession,
    mutateAddAppointment,
    mutateMyAvailability,
  } = usePageData();

  const myAppointments = allAppointments.filter((a) => a.therapistId === (user?.therapistId ?? therapist?.id));
  const commissionPct = therapist?.commission ?? 100;
  const isAutonomous = !company;

  const [tab, setTab] = useState<"agenda" | "disponibilidade">("agenda");
  const [centerOffset, setCenterOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState(toISO(TODAY));
  const [closureModal, setClosureModal] = useState<ClosureModal>(null);
  const [closureNotes, setClosureNotes] = useState("");
  const [closureSuccess, setClosureSuccess] = useState(false);

  // ── 91 dias para o carrossel (30 passados + hoje + 60 futuros) ────────────
  const ALL_DAYS = useMemo(() =>
    Array.from({ length: 91 }, (_, i) => {
      const d   = addDays(TODAY, i - 30);
      const iso = toISO(d);
      return {
        date:    iso,
        label:   DAY_ABBR[d.getDay()],
        num:     String(d.getDate()).padStart(2, "0"),
        dayKey:  DAY_KEYS_WK[d.getDay()],
        isToday: iso === toISO(TODAY),
      };
    }), []);

  // ── Derived: 5 days visíveis centrados em TODAY + centerOffset ────────────
  const visibleDays = useMemo(() => {
    return [-2, -1, 0, 1, 2].map((rel) => {
      const d    = addDays(TODAY, centerOffset + rel);
      const iso  = toISO(d);
      return {
        date:    iso,
        label:   DAY_ABBR[d.getDay()],
        num:     String(d.getDate()).padStart(2, "0"),
        dayKey:  DAY_KEYS_WK[d.getDay()],
        isToday: iso === toISO(TODAY),
      };
    });
  }, [centerOffset]);

  // ── Header subtitle — baseado no dia selecionado ──────────────────────────
  const headerSubtitle = useMemo(() => {
    const d = new Date(selectedDay + "T12:00:00");
    if (selectedDay === toISO(TODAY))
      return `Hoje · ${d.getDate()} de ${MONTH_PT[d.getMonth()]}, ${d.getFullYear()}`;
    const dayNames = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];
    return `${dayNames[d.getDay()]}, ${d.getDate()} de ${MONTH_PT[d.getMonth()]} · ${d.getFullYear()}`;
  }, [selectedDay]);

  // ── Carrossel ref + helpers ───────────────────────────────────────────────
  const carouselRef = useRef<HTMLDivElement>(null);

  const scrollToDate = useCallback((date: string, behavior: ScrollBehavior = "smooth") => {
    const el = carouselRef.current;
    if (!el) return;
    const item = el.querySelector(`[data-date="${date}"]`) as HTMLElement | null;
    if (!item) return;
    const left = item.offsetLeft - el.clientWidth / 2 + item.offsetWidth / 2;
    el.scrollTo({ left, behavior });
  }, []);

  // Centraliza hoje na montagem
  useEffect(() => { scrollToDate(toISO(TODAY), "instant"); }, [scrollToDate]);

  const scrollCarousel = (dir: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    const itemW = el.scrollWidth / ALL_DAYS.length;
    el.scrollBy({ left: dir * itemW * 5, behavior: "smooth" });
  };

  const handleDaySelect = (date: string) => {
    setSelectedDay(date);
    scrollToDate(date);
  };

  // navegar (usado pela aba Disponibilidade)
  const navigate = (dir: -1 | 1) => {
    const newOffset = centerOffset + dir;
    setCenterOffset(newOffset);
    const centerISO = toISO(addDays(TODAY, newOffset));
    const windowDates = [-2, -1, 0, 1, 2].map((r) => toISO(addDays(TODAY, newOffset + r)));
    if (!windowDates.includes(selectedDay)) setSelectedDay(centerISO);
  };

  // ── Touch / swipe ─────────────────────────────────────────────────────────
  const touchStartX = useRef<number>(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40) navigate(dx < 0 ? 1 : -1);
  };

  // ── Booking modal ────────────────────────────────────────────────────────
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    date: selectedDay,
    time: "09:00",
    clientName: "",
    clientId: "",
    catalogItemId: "",
    therapyId: "",
    duration: "60",
    price: "",
    notes: "",
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState("");

  // ── 181 datas para o seletor do modal (hoje + 180 dias futuros) ───────────
  const BOOKING_DATES = useMemo(() =>
    Array.from({ length: 181 }, (_, i) => {
      const d   = addDays(TODAY, i);
      const iso = toISO(d);
      const parts = iso.split("-");
      const sameYear = d.getFullYear() === TODAY.getFullYear();
      return {
        date:  iso,
        label: `${DAY_ABBR[d.getDay()]}, ${parts[2]}/${parts[1]}${sameYear ? "" : `/${String(d.getFullYear()).slice(2)}`}`,
      };
    }), []);

  // ── Availability — usa React state (reativo) ──────────────────────────────
  const availability = myAvailability;

  const toggleSlot = (dayKey: string, slot: string) => {
    if (!therapist) return;
    const current = availability[dayKey] ?? [];
    const updated = current.includes(slot)
      ? current.filter((s) => s !== slot)
      : [...current, slot].sort();
    mutateMyAvailability({ ...availability, [dayKey]: updated });
  };

  const dayAppointments = myAppointments.filter((a) => a.date === selectedDay);

  // ── Closure logic ────────────────────────────────────────────────────────
  const openClosure = (apt: any) => {
    const cl = clients.find((c) => c.id === apt.clientId);
    const therapy = therapies.find((t) => t.id === apt.therapyId);
    const catalog = myCatalog.find((c) => c.id === apt.catalogItemId);
    const displayClient = cl?.name ?? apt.clientName ?? "Cliente";
    const displayTherapy = therapy?.name ?? catalog?.name ?? apt.therapyName ?? "Atendimento";
    setClosureModal({ apt, clientName: displayClient, therapyName: displayTherapy, price: apt.price });
    setClosureNotes("");
  };

  const handleConfirmClosure = async () => {
    if (!closureModal || !therapist) return;
    const earned = isAutonomous ? closureModal.price : closureModal.price * commissionPct / 100;
    const companyNet = isAutonomous ? 0 : closureModal.price - earned;
    const record: SessionRecord = {
      id: `sr_${Date.now()}`,
      appointmentId: closureModal.apt.id,
      therapistId: therapist.id,
      clientName: closureModal.clientName,
      therapyName: closureModal.therapyName,
      duration: closureModal.apt.duration,
      sessionPrice: closureModal.price,
      extraCharge: 0,
      totalCharged: closureModal.price,
      therapistEarned: earned,
      commissionPct: isAutonomous ? 100 : commissionPct,
      companyNet,
      companyId: company?.id ?? null,
      companyName: company?.name ?? null,
      completedAt: new Date().toISOString(),
      notes: closureNotes,
      extraNotes: "",
      date: closureModal.apt.date,
      time: closureModal.apt.time,
      closedBy: "therapist",
    };
    await mutateCompleteSession(record);
    setClosureModal(null);
    setClosureSuccess(true);
    setTimeout(() => setClosureSuccess(false), 3000);
  };

  const getAptStatus = (apt: any) => store.isCompleted(apt.id) ? "completed" : apt.status;

  // ── Booking helpers ──────────────────────────────────────────────────────
  const openBooking = (presetTime?: string) => {
    setBookingForm({
      date: selectedDay,
      time: presetTime ?? "09:00",
      clientName: "",
      clientId: "",
      catalogItemId: "",
      therapyId: "",
      duration: "60",
      price: "",
      notes: "",
    });
    setBookingError("");
    setShowBooking(true);
  };

  const setBookingField = (field: keyof BookingForm, value: string) => {
    setBookingForm((p) => ({ ...p, [field]: value }));
  };

  const handleCatalogSelect = (item: CatalogItem) => {
    setBookingForm((p) => ({
      ...p,
      catalogItemId: item.id,
      duration: String(item.duration),
      price: String(item.myPrice),
    }));
  };

  const handleTherapySelect = (therapyId: string) => {
    const t = therapies.find((th) => th.id === therapyId);
    setBookingForm((p) => ({
      ...p,
      therapyId,
      duration: t ? String(t.duration) : p.duration,
      price: t ? String(t.price) : p.price,
    }));
  };

  const handleClientSelect = (clientId: string) => {
    const cl = clients.find((c) => c.id === clientId);
    setBookingForm((p) => ({
      ...p,
      clientId,
      clientName: cl?.name ?? "",
    }));
  };

  const validateBooking = (): string => {
    if (!bookingForm.date) return "Selecione a data.";
    if (!bookingForm.time) return "Selecione o horário.";
    if (isAutonomous && !bookingForm.clientName.trim()) return "Informe o nome do cliente.";
    if (!isAutonomous && !bookingForm.clientId) return "Selecione o cliente.";
    if (isAutonomous && !bookingForm.catalogItemId && !bookingForm.price) return "Selecione um serviço do catálogo ou informe o valor.";
    if (!isAutonomous && !bookingForm.therapyId) return "Selecione a terapia.";
    if (!bookingForm.price || isNaN(Number(bookingForm.price))) return "Informe o valor do atendimento.";
    if (!bookingForm.duration || isNaN(Number(bookingForm.duration))) return "Informe a duração.";
    return "";
  };

  const handleSaveBooking = async () => {
    const err = validateBooking();
    if (err) { setBookingError(err); return; }
    if (!therapist) return;

    // ── Conflict & availability check ─────────────────────────────────────
    const { blocked, warn, message } = checkAppointmentConflicts({
      existing: allAppointments,
      availability: myAvailability,
      therapistId: therapist.id,
      date: bookingForm.date,
      time: bookingForm.time,
      duration: Number(bookingForm.duration),
    });
    if (blocked) { setBookingError(message); return; }
    if (warn && bookingError !== message) {
      setBookingError("⚠️ " + message + " Clique em Salvar novamente para agendar mesmo assim.");
      return;
    }
    // ─────────────────────────────────────────────────────────────────────

    setBookingLoading(true);
    setBookingError("");
    try {
      const catalogItem = myCatalog.find((c) => c.id === bookingForm.catalogItemId);
      const therapy = therapies.find((t) => t.id === bookingForm.therapyId);

      const appointmentData: any = {
        therapistId: therapist.id,
        date: bookingForm.date,
        time: bookingForm.time,
        duration: Number(bookingForm.duration),
        price: Number(bookingForm.price),
        status: "confirmed",
        notes: bookingForm.notes || "",
      };

      if (isAutonomous) {
        appointmentData.clientName = bookingForm.clientName.trim();
        appointmentData.therapyName = catalogItem?.name ?? "Atendimento";
        if (bookingForm.catalogItemId) appointmentData.catalogItemId = bookingForm.catalogItemId;
      } else {
        appointmentData.companyId = company!.id;
        appointmentData.clientId = bookingForm.clientId;
        appointmentData.therapyId = bookingForm.therapyId;
        appointmentData.therapyName = therapy?.name ?? "";
        const cl = clients.find((c) => c.id === bookingForm.clientId);
        if (cl) appointmentData.clientName = cl.name;
      }

      await mutateAddAppointment(appointmentData);
      setShowBooking(false);
      setClosureSuccess(true);
      setTimeout(() => setClosureSuccess(false), 3000);
    } catch (e: any) {
      setBookingError(e?.message ?? "Erro ao salvar atendimento.");
    } finally {
      setBookingLoading(false);
    }
  };

  if (!therapist) return <div className="text-gray-500 text-center py-20">Carregando agenda...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-gray-900">Minha Agenda</h1>
          <p className="text-gray-500 text-sm mt-0.5">{headerSubtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {closureSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span style={{ fontWeight: 600 }}>Salvo com sucesso!</span>
            </div>
          )}
          {tab === "agenda" && (
            <button
              onClick={() => openBooking()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm hover:shadow-lg transition-all"
              style={{ fontWeight: 600 }}
            >
              <Plus className="w-4 h-4" /> Novo atendimento
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[{ id: "agenda", label: "Agenda" }, { id: "disponibilidade", label: "Disponibilidade" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as typeof tab)}
            className={`px-5 py-2 rounded-lg text-sm transition-all ${tab === t.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            style={{ fontWeight: tab === t.id ? 600 : 400 }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Agenda ─────────────────────────────────────────────────────────── */}
      {tab === "agenda" && (
        <>
          {/* Day selector — Carrossel */}
          <div className="flex items-center sm:gap-2">
            {/* Seta esquerda — só desktop */}
            <button
              onClick={() => scrollCarousel(-1)}
              className="hidden sm:flex shrink-0 w-9 h-9 items-center justify-center rounded-xl bg-white border border-violet-100 text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-all"
              aria-label="Dias anteriores"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Carrossel horizontal */}
            <div
              ref={carouselRef}
              className="flex-1 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              {ALL_DAYS.map((day) => {
                const isSelected = selectedDay === day.date;
                const count   = myAppointments.filter((a) => a.date === day.date).length;
                const pending = myAppointments.filter(
                  (a) => a.date === day.date && !store.isCompleted(a.id) && (a.status === "confirmed" || a.status === "pending")
                ).length;
                return (
                  <button
                    key={day.date}
                    data-date={day.date}
                    onClick={() => handleDaySelect(day.date)}
                    className={`flex-none w-[calc((100%-24px)/5)] min-w-[52px] rounded-xl py-2.5 px-1 text-center transition-all ${
                      isSelected
                        ? "text-white shadow-md"
                        : day.isToday
                        ? "bg-white border-2 border-violet-300"
                        : "bg-white border border-violet-100"
                    }`}
                    style={isSelected ? { background: "linear-gradient(135deg, #7C3AED, #4F46E5)" } : {}}
                  >
                    <p className="text-xs opacity-70">{day.label}</p>
                    <p className="text-base" style={{ fontWeight: 700 }}>{day.num}</p>
                    {day.isToday && !isSelected && (
                      <div className="flex justify-center mt-0.5">
                        <span className="w-1 h-1 rounded-full bg-violet-400" />
                      </div>
                    )}
                    {count > 0 && (
                      <div className="flex items-center justify-center gap-0.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/70" : "bg-violet-400"}`} />
                        {pending > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-amber-200" : "bg-amber-400"}`} />}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Seta direita — só desktop */}
            <button
              onClick={() => scrollCarousel(1)}
              className="hidden sm:flex shrink-0 w-9 h-9 items-center justify-center rounded-xl bg-white border border-violet-100 text-gray-500 hover:border-violet-400 hover:text-violet-600 transition-all"
              aria-label="Próximos dias"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl border border-violet-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-violet-50 flex items-center justify-between">
              <h3 className="text-gray-900">
                {visibleDays.find((d) => d.date === selectedDay)?.label},{" "}
                {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-sm text-violet-600" style={{ fontWeight: 600 }}>
                  {dayAppointments.length} sessões
                </span>
                <button
                  onClick={() => openBooking()}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 text-xs hover:bg-violet-100 transition-all border border-violet-200"
                  style={{ fontWeight: 600 }}
                >
                  <Plus className="w-3.5 h-3.5" /> Agendar
                </button>
              </div>
            </div>
            <div className="divide-y divide-violet-50">
              {HOURS.map((hour) => {
                const apt = dayAppointments.find((a) => a.time === hour);
                const cl = apt ? clients.find((c) => c.id === apt.clientId) : null;
                const therapy = apt ? therapies.find((t) => t.id === apt.therapyId) : null;
                const catalog = apt ? myCatalog.find((c) => c.id === apt.catalogItemId) : null;
                const isCompleted = apt ? store.isCompleted(apt.id) : false;
                const canClose = apt && !isCompleted && (apt.status === "confirmed" || apt.status === "pending");
                const earned = apt ? (isAutonomous ? apt.price : apt.price * commissionPct / 100) : 0;

                // Resolve display names (works for both autonomous and company-linked)
                const clientDisplayName = cl?.name ?? apt?.clientName ?? "—";
                const therapyDisplayName = therapy?.name ?? catalog?.name ?? apt?.therapyName ?? "Atendimento";

                return (
                  <div
                    key={hour}
                    className={`flex items-start gap-4 px-5 py-3 min-h-[60px] ${apt && !isCompleted ? "bg-violet-50/30" : ""} ${isCompleted ? "bg-emerald-50/30" : ""}`}
                  >
                    <div className="w-12 text-right shrink-0 pt-2">
                      <span className="text-xs text-gray-400">{hour}</span>
                    </div>
                    <div className="w-0.5 bg-violet-100 self-stretch mx-1 shrink-0" />
                    {apt ? (
                      <div className="flex-1 flex items-start gap-3 py-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${isCompleted ? "bg-emerald-500" : "bg-gradient-to-br from-violet-500 to-indigo-500"}`}>
                          {isCompleted ? <CheckCircle className="w-5 h-5" /> : <User className="w-4 h-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{clientDisplayName}</p>
                            <StatusBadge status={getAptStatus(apt)} />
                          </div>
                          <p className="text-xs text-gray-500">{therapyDisplayName} · {apt.duration}min</p>
                          {isCompleted && <p className="text-xs text-emerald-600 mt-0.5" style={{ fontWeight: 600 }}>✓ +R$ {earned.toFixed(2)} registrado</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>+R$ {earned.toFixed(0)}</p>
                          <p className="text-xs text-gray-400">R$ {apt.price}</p>
                          {canClose && (
                            <button
                              onClick={() => openClosure(apt)}
                              className="mt-1 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs hover:bg-violet-700 transition-all"
                              style={{ fontWeight: 600 }}
                            >
                              <CalendarCheck className="w-3.5 h-3.5" /> Encerrar
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => openBooking(hour)}
                        className="flex-1 py-2 text-left group"
                      >
                        <p className="text-xs text-gray-300 group-hover:text-violet-400 transition-colors">
                          + Agendar horário
                        </p>
                      </button>
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
                  <p className="text-xl" style={{ fontWeight: 700 }}>R$ {dayAppointments.reduce((acc, a) => acc + (isAutonomous ? a.price : a.price * commissionPct / 100), 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-white/70 text-xs">Encerrados</p>
                  <p className="text-xl" style={{ fontWeight: 700 }}>{dayAppointments.filter((a) => store.isCompleted(a.id)).length}/{dayAppointments.length}</p>
                </div>
                <div>
                  <p className="text-white/70 text-xs">Tempo total</p>
                  <p className="text-xl" style={{ fontWeight: 700 }}>{dayAppointments.reduce((acc, a) => acc + a.duration, 0)}min</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Disponibilidade ──────────────────────────────────────────────────── */}
      {tab === "disponibilidade" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-violet-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1"><Clock className="w-4 h-4 text-violet-500" /><h3 className="text-gray-900">Horários disponíveis</h3></div>
            <p className="text-gray-400 text-xs mb-5">Clique para marcar ou desmarcar sua disponibilidade.</p>
            <div className="grid grid-cols-7 gap-2">
              {ALL_WEEK_DAYS.map((day) => {
                const slots = availability[day.dayKey] ?? [];
                return (
                  <div key={day.dayKey}>
                    <p className="text-xs text-gray-500 text-center mb-2" style={{ fontWeight: 700 }}>{day.label}</p>
                    <div className="space-y-1">
                      {HOURS.map((slot) => {
                        const active = slots.includes(slot);
                        return (
                          <button
                            key={slot}
                            onClick={() => toggleSlot(day.dayKey, slot)}
                            className={`w-full py-1 px-0.5 rounded-lg text-xs transition-all ${active ? "bg-violet-600 text-white" : "bg-gray-50 text-gray-400 hover:bg-violet-50 hover:text-violet-500 border border-gray-100"}`}
                            style={{ fontWeight: active ? 600 : 400 }}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-center text-violet-500 text-xs mt-2" style={{ fontWeight: 600 }}>{slots.length}h</p>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-violet-100 p-5 shadow-sm">
            <h3 className="text-gray-900 mb-3">Resumo semanal</h3>
            <div className="space-y-2">
              {ALL_WEEK_DAYS.map((day) => {
                const slots = availability[day.dayKey] ?? [];
                if (slots.length === 0) return null;
                return (
                  <div key={day.dayKey} className="flex items-center gap-3">
                    <p className="text-sm text-gray-600 w-20 shrink-0" style={{ fontWeight: 600 }}>{DAY_LABELS[day.dayKey]}</p>
                    <div className="flex-1 flex flex-wrap gap-1">
                      {slots.slice(0, 6).map((s) => (<span key={s} className="text-xs px-2 py-0.5 bg-violet-50 text-violet-600 rounded-lg">{s}</span>))}
                      {slots.length > 6 && <span className="text-xs text-gray-400">+{slots.length - 6}</span>}
                    </div>
                    <p className="text-xs text-gray-400 shrink-0">{slots.length} horários</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Booking Modal ─────────────────────────────────────────────────────── */}
      {showBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Novo Atendimento</p>
                  <p className="text-gray-400 text-xs">
                    {isAutonomous ? (
                      <span className="inline-flex items-center gap-1">
                        <Zap className="w-3 h-3" /> Autônomo — 100% seu
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {company?.name}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowBooking(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Data *</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={bookingForm.date}
                    onChange={(e) => setBookingField("date", e.target.value)}
                  >
                    {BOOKING_DATES.map((d) => (
                      <option key={d.date} value={d.date}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Horário *</label>
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={bookingForm.time}
                    onChange={(e) => setBookingField("time", e.target.value)}
                  >
                    {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Client */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                  Cliente *
                </label>
                {isAutonomous ? (
                  <input
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="Nome do cliente"
                    value={bookingForm.clientName}
                    onChange={(e) => setBookingField("clientName", e.target.value)}
                  />
                ) : (
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={bookingForm.clientId}
                    onChange={(e) => handleClientSelect(e.target.value)}
                  >
                    <option value="">Selecione o cliente...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}
              </div>

              {/* Service */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                  Serviço / Terapia *
                </label>
                {isAutonomous ? (
                  myCatalog.length > 0 ? (
                    <div className="space-y-1.5">
                      {myCatalog.filter((c) => c.active !== false).map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleCatalogSelect(item)}
                          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                          style={
                            bookingForm.catalogItemId === item.id
                              ? { borderColor: item.color, background: `${item.color}12` }
                              : { borderColor: "#E5E7EB", background: "#FAFAFA" }
                          }
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
                            <span className="text-sm text-gray-800" style={{ fontWeight: bookingForm.catalogItemId === item.id ? 600 : 400 }}>
                              {item.name}
                            </span>
                            <span className="text-xs text-gray-400">{item.duration}min</span>
                          </div>
                          <span className="text-sm text-emerald-600" style={{ fontWeight: 600 }}>R$ {item.myPrice}</span>
                        </button>
                      ))}
                      <p className="text-xs text-gray-400 pt-1">Ou preencha duração e valor manualmente abaixo.</p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <p className="text-amber-700 text-xs">
                        Você ainda não tem serviços no catálogo. Preencha duração e valor manualmente.{" "}
                        <a href="/terapeuta/terapias" className="underline" style={{ fontWeight: 600 }}>Criar catálogo</a>
                      </p>
                    </div>
                  )
                ) : (
                  <select
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    value={bookingForm.therapyId}
                    onChange={(e) => handleTherapySelect(e.target.value)}
                  >
                    <option value="">Selecione a terapia...</option>
                    {therapies.map((t) => <option key={t.id} value={t.id}>{t.name} — R$ {t.price}</option>)}
                  </select>
                )}
              </div>

              {/* Duration + Price */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Duração (min) *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="60"
                    value={bookingForm.duration}
                    onChange={(e) => setBookingField("duration", e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Valor (R$) *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="150"
                    value={bookingForm.price}
                    onChange={(e) => setBookingField("price", e.target.value)}
                  />
                </div>
              </div>

              {/* Earnings preview */}
              {bookingForm.price && (
                <div className={`rounded-xl p-3 border ${isAutonomous ? "bg-violet-50 border-violet-100" : "bg-emerald-50 border-emerald-100"}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {isAutonomous ? (
                        <span className="inline-flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Você recebe (100%)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> Sua comissão ({commissionPct}%)
                        </span>
                      )}
                    </span>
                    <span className="text-base" style={{ fontWeight: 700, color: isAutonomous ? "#7C3AED" : "#059669" }}>
                      R$ {(isAutonomous ? Number(bookingForm.price) : Number(bookingForm.price) * commissionPct / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Observações (opcional)</label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                  placeholder="Informações adicionais..."
                  value={bookingForm.notes}
                  onChange={(e) => setBookingField("notes", e.target.value)}
                />
              </div>

              {bookingError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowBooking(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBooking}
                disabled={bookingLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ fontWeight: 700 }}
              >
                {bookingLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                ) : (
                  <><CalendarCheck className="w-4 h-4" /> Confirmar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Closure Modal ─────────────────────────────────────────────────────── */}
      {closureModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Encerrar Atendimento</p>
                  <p className="text-gray-400 text-xs">{closureModal.apt.time} · {closureModal.apt.date.split("-").reverse().join("/")}</p>
                </div>
              </div>
              <button onClick={() => setClosureModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {[{ label: "Cliente", value: closureModal.clientName }, { label: "Terapia", value: closureModal.therapyName }].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-400">{item.label}</p>
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{item.value}</p>
                  </div>
                ))}
              </div>
              <div className={`rounded-xl p-4 border ${isAutonomous ? "bg-violet-50 border-violet-100" : "bg-emerald-50 border-emerald-100"}`}>
                <p className="text-xs mb-2" style={{ fontWeight: 700, color: isAutonomous ? "#7C3AED" : "#059669" }}>
                  {isAutonomous ? (
                    <span className="inline-flex items-center gap-1">
                      <Zap className="w-3 h-3" /> Autônomo — 100% seu
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {company?.name} · {commissionPct}% comissão
                    </span>
                  )}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Você recebe</span>
                  <span className="text-xl" style={{ fontWeight: 700, color: isAutonomous ? "#7C3AED" : "#059669" }}>
                    R$ {(isAutonomous ? closureModal.price : closureModal.price * commissionPct / 100).toFixed(2)}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Observações (opcional)</label>
                <textarea rows={2} value={closureNotes} onChange={(e) => setClosureNotes(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none" placeholder="Observações sobre o atendimento..." />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setClosureModal(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm">Cancelar</button>
              <button onClick={handleConfirmClosure} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm flex items-center justify-center gap-2" style={{ fontWeight: 700 }}>
                <CheckCircle className="w-4 h-4" /> Encerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}