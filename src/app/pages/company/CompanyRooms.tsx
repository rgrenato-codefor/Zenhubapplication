import { useState } from "react";
import {
  Plus, Edit2, Trash2, X, CheckCircle,
  AlertCircle, WrenchIcon, Clock, User, LayoutGrid,
  CalendarDays, Search, ChevronDown, MapPin,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyUnit } from "../../context/CompanyContext";

type RoomStatus = "active" | "inactive" | "maintenance";
type Room = { id: string; companyId: string; unitId?: string; name: string; description: string; color: string; status: RoomStatus };

export default function CompanyRooms() {
  const { user } = useAuth();
  const { company, appointments, rooms: firestoreRooms, roomStore: store,
    therapists, clients, therapies,
    mutateAddRoom, mutateUpdateRoom, mutateDeleteRoom,
    mutateAssignRoom, mutateUnassignRoom } = usePageData();
  const { selectedUnitId } = useCompanyUnit();
  const primaryColor = company?.color || "#0D9488";
  const companyId = user?.companyId ?? "";

  const companyRooms = firestoreRooms as Room[];
  const companyAppointments = appointments;

  // ── Constants ────────────────────────────────────────────────────────────────

  const HOURS = [
    "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00", "07:00",
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00",
    "20:00", "21:00", "22:00", "23:00",
  ];

  const DAYS_WEEK = [
    { date: "2026-03-02", label: "Seg 02" },
    { date: "2026-03-03", label: "Ter 03" },
    { date: "2026-03-04", label: "Qua 04", isToday: true },
    { date: "2026-03-05", label: "Qui 05" },
    { date: "2026-03-06", label: "Sex 06" },
    { date: "2026-03-07", label: "Sáb 07" },
  ];

  const STATUS_OPTS: { value: RoomStatus; label: string; color: string; bg: string }[] = [
    { value: "active",      label: "Ativa",        color: "#059669", bg: "#ECFDF5" },
    { value: "inactive",    label: "Inativa",       color: "#6B7280", bg: "#F3F4F6" },
    { value: "maintenance", label: "Manutenção",    color: "#D97706", bg: "#FFFBEB" },
  ];

  const PRESET_COLORS = [
    "#7C3AED", "#0D9488", "#D97706", "#DC2626",
    "#059669", "#2563EB", "#DB2777", "#EA580C",
  ];

  // ── Helper ───────────────────────────────────────────────────────────────────

  function statusCfg(s: RoomStatus) {
    return STATUS_OPTS.find((o) => o.value === s) ?? STATUS_OPTS[0];
  }

  function StatusIcon({ status }: { status: RoomStatus }) {
    if (status === "active") return <CheckCircle className="w-3.5 h-3.5" />;
    if (status === "maintenance") return <WrenchIcon className="w-3.5 h-3.5" />;
    return <AlertCircle className="w-3.5 h-3.5" />;
  }

  // ── Modal ────────────────────────────────────────────────────────────────────

  type ModalMode = "add" | "edit";

  function RoomModal({
    mode,
    initial,
    companyId,
    primaryColor,
    onSave,
    onClose,
  }: {
    mode: ModalMode;
    initial?: Room;
    companyId: string;
    primaryColor: string;
    onSave: (room: Room) => void;
    onClose: () => void;
  }) {
    const { companyUnits } = useCompanyUnit();
    const [form, setForm] = useState<Omit<Room, "id" | "companyId">>({
      name: initial?.name ?? "",
      description: initial?.description ?? "",
      color: initial?.color ?? PRESET_COLORS[0],
      status: initial?.status ?? "active",
      unitId: initial?.unitId ?? (companyUnits.length === 1 ? companyUnits[0].id : undefined),
    });
    const [error, setError] = useState("");

    const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
      setForm((p) => ({ ...p, [k]: v }));

    const handleSave = () => {
      if (!form.name.trim()) { setError("Informe um nome para a sala."); return; }
      const room: Room = {
        id: initial?.id ?? `r_${Date.now()}`,
        companyId,
        ...form,
      };
      onSave(room);
    };

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${primaryColor}15` }}>
                <Plus className="w-4 h-4" style={{ color: primaryColor }} />
              </div>
              <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>
                {mode === "add" ? "Nova sala" : "Editar sala"}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                Nome da sala *
              </label>
              <input
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                  error ? "border-red-300 focus:ring-red-400/30" : "border-gray-200 focus:ring-violet-400/30"
                }`}
                placeholder="Ex: Sala 1, Sala Zen, Cabine VIP..."
                value={form.name}
                onChange={(e) => { set("name", e.target.value); setError(""); }}
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                Descrição
              </label>
              <textarea
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30 resize-none"
                placeholder="Ex: Espaço para massagens relaxantes com maca especial..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>

            {/* Unit selector — only when company has units */}
            {companyUnits.length > 0 && (
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                  Unidade
                </label>
                <select
                  value={form.unitId ?? ""}
                  onChange={(e) => set("unitId" as any, e.target.value || undefined)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400/30 bg-white"
                >
                  <option value="">Sem unidade específica</option>
                  {companyUnits.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}{u.isMain ? " (principal)" : ""}</option>
                  ))}
                </select>
                {form.unitId && (
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {companyUnits.find((u) => u.id === form.unitId)?.address ?? ""}
                  </p>
                )}
              </div>
            )}

            {/* Color */}
            <div>
              <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>
                Cor de identificação
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => set("color", c)}
                    className="w-7 h-7 rounded-lg border-2 transition-all"
                    style={{
                      background: c,
                      borderColor: form.color === c ? "#111" : "transparent",
                      transform: form.color === c ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => set("color", e.target.value)}
                  className="w-7 h-7 rounded-lg cursor-pointer border border-gray-200"
                  title="Cor personalizada"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                Status
              </label>
              <div className="flex gap-2">
                {STATUS_OPTS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set("status", opt.value)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs transition-all"
                    style={
                      form.status === opt.value
                        ? { background: opt.bg, borderColor: opt.color, color: opt.color, fontWeight: 700 }
                        : { borderColor: "#E5E7EB", color: "#6B7280" }
                    }
                  >
                    <StatusIcon status={opt.value} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-xl text-white text-sm"
              style={{ background: primaryColor, fontWeight: 700 }}
            >
              {mode === "add" ? "Criar sala" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Page ─────────────────────────────────────────────────────────────────

  // views: "grid" | "availability"
  const [view, setView] = useState<"grid" | "availability">("grid");
  const [selectedDay, setSelectedDay] = useState("2026-03-04");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RoomStatus | "all">("all");
  const [modal, setModal] = useState<{ mode: ModalMode; room?: Room } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Room | null>(null);
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const handleSave = async (room: Room) => {
    if (modal?.mode === "add") {
      await mutateAddRoom({ ...room, companyId });
      showToast("Sala criada com sucesso!");
    } else {
      await mutateUpdateRoom(room.id, { name: room.name, description: room.description, color: room.color, status: room.status });
      showToast("Sala atualizada!");
    }
    setModal(null);
  };

  const handleDelete = async (room: Room) => {
    await mutateDeleteRoom(room.id);
    setDeleteConfirm(null);
    showToast("Sala removida.");
  };

  // Filtered rooms
  const filteredRooms = companyRooms.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedUnitId && r.unitId !== selectedUnitId) return false;
    return true;
  });

  // Stats
  const activeCount = companyRooms.filter((r) => r.status === "active").length;
  const maintenanceCount = companyRooms.filter((r) => r.status === "maintenance").length;

  const todayOccupied = new Set(
    companyAppointments
      .filter((a) => a.date === "2026-03-04")
      .map((a) => store.getRoomForAppointment(a.id))
      .filter(Boolean)
  );
  const availableNow = companyRooms.filter(
    (r) => r.status === "active" && !todayOccupied.has(r.id)
  ).length;

  // Availability grid helpers
  const getAptForRoomHour = (roomId: string, hour: string) => {
    return companyAppointments.find((a) => {
      const assignedRoom = store.getRoomForAppointment(a.id);
      if (assignedRoom !== roomId || a.date !== selectedDay) return false;
      const [aH, aM] = a.time.split(":").map(Number);
      const [hH, hM] = hour.split(":").map(Number);
      const aStart = aH * 60 + aM;
      const hStart = hH * 60 + hM;
      return hStart >= aStart && hStart < aStart + a.duration;
    });
  };

  const activeRooms = companyRooms
    .filter((r) => r.status === "active")
    .filter((r) => !selectedUnitId || r.unitId === selectedUnitId);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Salas de Atendimento</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {activeCount} {activeCount === 1 ? "sala ativa" : "salas ativas"} ·{" "}
            {availableNow} disponíveis hoje
          </p>
        </div>
        <div className="flex items-center gap-3">
          {toast && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span style={{ fontWeight: 600 }}>{toast}</span>
            </div>
          )}
          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${view === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Salas
            </button>
            <button
              onClick={() => setView("availability")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${view === "availability" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"}`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Disponibilidade
            </button>
          </div>
          <button
            onClick={() => setModal({ mode: "add" })}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm"
            style={{ background: primaryColor, fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" /> Nova sala
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total de salas", value: companyRooms.length, color: "text-gray-900", bg: "bg-gray-50", icon: Plus },
          { label: "Ativas", value: activeCount, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
          { label: "Manutenção", value: maintenanceCount, color: "text-amber-600", bg: "bg-amber-50", icon: WrenchIcon },
          { label: "Disponíveis hoje", value: availableNow, color: "text-violet-600", bg: "bg-violet-50", icon: Clock },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`${s.bg} rounded-xl p-4 flex items-center gap-3`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg}`} style={{ border: "1px solid currentColor", opacity: 0.7 }}>
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className={`text-xl ${s.color}`} style={{ fontWeight: 700 }}>{s.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Grid View ────────────────────────────────────────────────────────── */}
      {view === "grid" && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                placeholder="Buscar sala..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RoomStatus | "all")}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-400/30 bg-white"
              >
                <option value="all">Todos os status</option>
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <Plus className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">
                {companyRooms.length === 0
                  ? "Nenhuma sala cadastrada ainda."
                  : "Nenhuma sala encontrada com esse filtro."}
              </p>
              {companyRooms.length === 0 && (
                <button
                  onClick={() => setModal({ mode: "add" })}
                  className="mt-4 px-4 py-2 text-white rounded-xl text-sm"
                  style={{ background: primaryColor, fontWeight: 600 }}
                >
                  Criar primeira sala
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredRooms.map((room) => {
                const todayApts = companyAppointments.filter(
                  (a) => store.getRoomForAppointment(a.id) === room.id && a.date === "2026-03-04"
                );
                const weekApts = companyAppointments.filter(
                  (a) => store.getRoomForAppointment(a.id) === room.id
                );
                const sc = statusCfg(room.status);
                const isOccupied = room.status === "active" && todayApts.length > 0;

                return (
                  <div
                    key={room.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Color bar */}
                    <div className="h-1.5 w-full" style={{ background: room.color }} />

                    <div className="p-5">
                      {/* Top row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                            style={{ background: room.color }}
                          >
                            <Plus className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-gray-900" style={{ fontWeight: 700 }}>{room.name}</p>
                            <p className="text-gray-400 text-xs mt-0.5">{room.description || "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setModal({ mode: "edit", room })}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(room)}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>

                      {/* Status + occupancy */}
                      <div className="flex items-center gap-2 mb-4">
                        <span
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                          style={{ background: sc.bg, color: sc.color, fontWeight: 600 }}
                        >
                          <StatusIcon status={room.status} />
                          {sc.label}
                        </span>
                        {room.status === "active" && (
                          <span
                            className="text-xs px-2 py-1 rounded-full"
                            style={
                              isOccupied
                                ? { background: "#FEF2F2", color: "#DC2626", fontWeight: 600 }
                                : { background: "#ECFDF5", color: "#059669", fontWeight: 600 }
                            }
                          >
                            {isOccupied ? "● Ocupada hoje" : "● Livre hoje"}
                          </span>
                        )}
                      </div>

                      {/* Today's appointments */}
                      {todayApts.length > 0 ? (
                        <div className="space-y-1.5 mb-3">
                          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>HOJE</p>
                          {todayApts.slice(0, 3).map((apt) => {
                            const client = clients.find((c) => c.id === apt.clientId);
                            const therapist = therapists.find((t) => t.id === apt.therapistId);
                            const therapy = therapies.find((th) => th.id === apt.therapyId);
                            return (
                              <div key={apt.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                                <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="text-xs text-gray-600" style={{ fontWeight: 600 }}>{apt.time}</span>
                                <span className="text-xs text-gray-500 truncate">{client?.name}</span>
                                <span className="text-xs text-gray-400 ml-auto shrink-0">
                                  {therapist?.name.split(" ")[0]}
                                </span>
                              </div>
                            );
                          })}
                          {todayApts.length > 3 && (
                            <p className="text-xs text-gray-400 text-center">+{todayApts.length - 3} mais</p>
                          )}
                        </div>
                      ) : (
                        room.status === "active" && (
                          <div className="p-2 rounded-lg bg-emerald-50 mb-3">
                            <p className="text-xs text-emerald-600 text-center">Sem agendamentos hoje</p>
                          </div>
                        )
                      )}

                      {/* Foot stats */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-400">{weekApts.length} sessões na semana</span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-lg"
                          style={{ background: `${room.color}15`, color: room.color, fontWeight: 600 }}
                        >
                          {todayApts.length} hoje
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Availability View ─────────────────────────────────────────────────── */}
      {view === "availability" && (
        <>
          {/* Day selector */}
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
            {DAYS_WEEK.map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedDay(day.date)}
                className={`rounded-xl p-2.5 text-center border transition-all ${
                  selectedDay === day.date
                    ? "text-white shadow-md"
                    : day.isToday
                    ? "bg-white border-gray-300 shadow-sm"
                    : "bg-white border-gray-100"
                }`}
                style={
                  selectedDay === day.date
                    ? { background: primaryColor, borderColor: primaryColor }
                    : {}
                }
              >
                <p className="text-xs opacity-70">{day.label.split(" ")[0]}</p>
                <p className="text-sm" style={{ fontWeight: 700 }}>{day.label.split(" ")[1]}</p>
              </button>
            ))}
          </div>

          {activeRooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
              <Plus className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Nenhuma sala ativa para exibir.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Legend */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-4 flex-wrap">
                <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>
                  {DAYS_WEEK.find((d) => d.date === selectedDay)?.label}
                </p>
                <div className="flex items-center gap-4 ml-auto">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block" />
                    Livre
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span className="w-3 h-3 rounded-sm bg-violet-200 inline-block" />
                    Ocupada
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-xs text-gray-400 px-4 py-3 w-20">Horário</th>
                      {activeRooms.map((room) => (
                        <th key={room.id} className="px-3 py-3">
                          <div className="flex items-center gap-1.5 justify-center">
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: room.color }} />
                            <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>{room.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {HOURS.map((hour) => (
                      <tr key={hour} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-xs text-gray-400 text-right border-r border-gray-100">
                          {hour}
                        </td>
                        {activeRooms.map((room) => {
                          const apt = getAptForRoomHour(room.id, hour);
                          const aptClient = apt ? clients.find((c) => c.id === apt.clientId) : null;
                          const aptTherapist = apt ? therapists.find((t) => t.id === apt.therapistId) : null;
                          const aptTherapy = apt ? therapies.find((th) => th.id === apt.therapyId) : null;
                          const isStart = apt?.time === hour;

                          return (
                            <td key={room.id} className="px-2 py-1.5 text-center">
                              {apt ? (
                                <div
                                  className="rounded-lg px-2 py-1.5 text-left"
                                  style={{
                                    background: isStart ? `${room.color}20` : `${room.color}10`,
                                    borderLeft: isStart ? `3px solid ${room.color}` : "3px solid transparent",
                                  }}
                                >
                                  {isStart ? (
                                    <>
                                      <p className="text-xs truncate" style={{ color: room.color, fontWeight: 700 }}>
                                        {aptClient?.name.split(" ")[0]}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <User className="w-2.5 h-2.5 text-gray-400" />
                                        <p className="text-xs text-gray-500 truncate">
                                          {aptTherapist?.name.split(" ")[0]}
                                        </p>
                                      </div>
                                      <p className="text-xs text-gray-400 truncate">{aptTherapy?.name}</p>
                                    </>
                                  ) : (
                                    <div className="h-4" style={{ opacity: 0.4 }}>
                                      <div className="w-full h-1 rounded" style={{ background: room.color }} />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="h-9 rounded-lg bg-gray-50 border border-dashed border-gray-200" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add/Edit Modal ───────────────────────────────────────────────────── */}
      {modal && (
        <RoomModal
          mode={modal.mode}
          initial={modal.room}
          companyId={companyId}
          primaryColor={primaryColor}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* ── Delete Confirm ───────────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-gray-900 text-center mb-1" style={{ fontWeight: 700 }}>
              Remover sala?
            </h3>
            <p className="text-gray-500 text-sm text-center mb-5">
              A sala <strong>{deleteConfirm.name}</strong> será removida. Os agendamentos existentes
              perderão a associação com essa sala.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm"
                style={{ fontWeight: 700 }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}