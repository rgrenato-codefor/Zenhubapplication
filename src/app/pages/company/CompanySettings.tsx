import { useState } from "react";
import {
  Save, Building2, Bell, Users, Link, Copy, CheckCheck,
  MapPin, Plus, Edit2, Trash2, X, Phone, Mail, Star,
  CheckCircle, AlertCircle, ChevronRight, ToggleLeft, ToggleRight,
} from "lucide-react";
import { companies } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useUnitStore, type Unit, type UnitStatus } from "../../store/unitStore";

// ── Unit Form Modal ──────────────────────────────────────────────────────────

type UnitModalProps = {
  mode: "add" | "edit";
  initial?: Unit;
  companyId: string;
  primaryColor: string;
  onSave: (unit: Unit) => void;
  onClose: () => void;
};

const emptyForm = {
  name: "",
  address: "",
  phone: "",
  email: "",
  status: "active" as UnitStatus,
  isMain: false,
};

function UnitModal({ mode, initial, companyId, primaryColor, onSave, onClose }: UnitModalProps) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    address: initial?.address ?? "",
    phone: initial?.phone ?? "",
    email: initial?.email ?? "",
    status: initial?.status ?? ("active" as UnitStatus),
    isMain: initial?.isMain ?? false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Informe o nome da unidade.";
    if (!form.address.trim()) e.address = "Informe o endereço.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const unit: Unit = {
      id: initial?.id ?? `un_${Date.now()}`,
      companyId,
      fullName: `Unidade ${form.name}`,
      therapistsCount: initial?.therapistsCount ?? 0,
      roomsCount: initial?.roomsCount ?? 0,
      ...form,
    };
    onSave(unit);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `${primaryColor}15` }}
            >
              <MapPin className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>
              {mode === "add" ? "Nova unidade" : "Editar unidade"}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Nome */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
              Nome da unidade *
            </label>
            <input
              className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.name
                  ? "border-red-300 focus:ring-red-400/30"
                  : "border-gray-200 focus:ring-violet-400/30"
              }`}
              placeholder="Ex: Pinheiros, Centro, Jardins, Unidade 2..."
              value={form.name}
              onChange={(e) => { set("name", e.target.value); setErrors((p) => ({ ...p, name: "" })); }}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
              Endereço *
            </label>
            <input
              className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                errors.address
                  ? "border-red-300 focus:ring-red-400/30"
                  : "border-gray-200 focus:ring-violet-400/30"
              }`}
              placeholder="Rua, número, bairro, cidade, estado"
              value={form.address}
              onChange={(e) => { set("address", e.target.value); setErrors((p) => ({ ...p, address: "" })); }}
            />
            {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
          </div>

          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                  placeholder="(11) 99999-0000"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/30"
                  placeholder="unidade@empresa.com"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>
              Status da unidade
            </label>
            <div className="flex gap-2">
              {(["active", "inactive"] as UnitStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => set("status", s)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs transition-all"
                  style={
                    form.status === s
                      ? s === "active"
                        ? { background: "#ECFDF5", borderColor: "#059669", color: "#059669", fontWeight: 700 }
                        : { background: "#F3F4F6", borderColor: "#6B7280", color: "#6B7280", fontWeight: 700 }
                      : { borderColor: "#E5E7EB", color: "#9CA3AF" }
                  }
                >
                  {s === "active" ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {s === "active" ? "Ativa" : "Inativa"}
                </button>
              ))}
            </div>
          </div>

          {/* Marcar como principal */}
          <div
            className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50 cursor-pointer"
            onClick={() => set("isMain", !form.isMain)}
          >
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-amber-400" />
              <div>
                <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>
                  Unidade principal
                </p>
                <p className="text-xs text-gray-400">
                  Aparece em destaque e é selecionada por padrão
                </p>
              </div>
            </div>
            {form.isMain
              ? <ToggleRight className="w-6 h-6" style={{ color: primaryColor }} />
              : <ToggleLeft className="w-6 h-6 text-gray-300" />}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 rounded-xl text-white text-sm transition-opacity hover:opacity-90"
            style={{ background: primaryColor, fontWeight: 700 }}
          >
            {mode === "add" ? "Criar unidade" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function CompanySettings() {
  const { user } = useAuth();
  const store = useUnitStore();
  const company = companies.find((c) => c.id === user?.companyId);
  const primaryColor = company?.color || "#0D9488";
  const companyId = user?.companyId ?? "";

  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState("geral");

  // Units state
  const units = store.getUnits(companyId);
  const [unitModal, setUnitModal] = useState<{ mode: "add" | "edit"; unit?: Unit } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Unit | null>(null);
  const [unitToast, setUnitToast] = useState("");

  const showUnitToast = (msg: string) => {
    setUnitToast(msg);
    setTimeout(() => setUnitToast(""), 3000);
  };

  const handleSaveUnit = (unit: Unit) => {
    if (unitModal?.mode === "add") {
      store.addUnit(unit);
      showUnitToast("Unidade criada com sucesso!");
    } else {
      store.updateUnit(unit);
      showUnitToast("Unidade atualizada!");
    }
    setUnitModal(null);
  };

  const handleDeleteUnit = (unit: Unit) => {
    store.deleteUnit(unit.id);
    setDeleteConfirm(null);
    showUnitToast("Unidade removida.");
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(company?.inviteCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: "geral",         label: "Geral" },
    { id: "unidades",      label: "Unidades" },
    { id: "equipe",        label: "Equipe" },
    { id: "notificacoes",  label: "Notificações" },
    { id: "convites",      label: "Convites" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-0.5">Gerencie as configurações da sua empresa</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            style={tab === t.id ? { fontWeight: 600 } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Geral ─────────────────────────────────────────────────────────────── */}
      {tab === "geral" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: primaryColor }}>
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="text-gray-900">Informações da Empresa</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Nome da empresa", value: company?.name },
                  { label: "E-mail", value: company?.email },
                  { label: "Telefone", value: company?.phone },
                  { label: "Endereço (sede)", value: company?.address },
                ].map((field) => (
                  <div key={field.label} className={field.label === "Endereço (sede)" ? "col-span-2" : ""}>
                    <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>
                      {field.label}
                    </label>
                    <input
                      defaultValue={field.value || ""}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2"
                      style={{ ["--tw-ring-color" as string]: `${primaryColor}50` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-gray-900 mb-4">Identidade Visual</h3>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-lg shadow-lg"
                  style={{ background: primaryColor, fontWeight: 700 }}
                >
                  {company?.logo}
                </div>
                <div>
                  <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{company?.name}</p>
                  <p className="text-xs text-gray-400">Logo da empresa</p>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2" style={{ fontWeight: 600 }}>
                  Cor da empresa
                </label>
                <div className="flex items-center gap-2">
                  <input type="color" defaultValue={primaryColor} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                  <span className="text-sm text-gray-600 font-mono">{primaryColor}</span>
                </div>
              </div>
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
              style={{ background: primaryColor, fontWeight: 600 }}
            >
              <Save className="w-4 h-4" /> Salvar Alterações
            </button>
          </div>
        </div>
      )}

      {/* ── Unidades ──────────────────────────────────────────────────────────── */}
      {tab === "unidades" && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: primaryColor }}>
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-gray-900">Unidades / Filiais</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {units.length} {units.length === 1 ? "unidade cadastrada" : "unidades cadastradas"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {unitToast && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span style={{ fontWeight: 600 }}>{unitToast}</span>
                </div>
              )}
              <button
                onClick={() => setUnitModal({ mode: "add" })}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
                style={{ background: primaryColor, fontWeight: 600 }}
              >
                <Plus className="w-4 h-4" />
                Nova unidade
              </button>
            </div>
          </div>

          {/* Info banner */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
            <Building2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Cada unidade possui seus próprios terapeutas, salas e agenda. Você pode filtrar
              por unidade no menu superior do painel.
            </p>
          </div>

          {/* List */}
          {units.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-gray-600 text-sm" style={{ fontWeight: 600 }}>
                Nenhuma unidade cadastrada
              </p>
              <p className="text-gray-400 text-sm mt-1 mb-5">
                Crie sua primeira unidade para começar a organizar sua empresa por localização.
              </p>
              <button
                onClick={() => setUnitModal({ mode: "add" })}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
                style={{ background: primaryColor, fontWeight: 600 }}
              >
                <Plus className="w-4 h-4" />
                Criar primeira unidade
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between">
                      {/* Left: info */}
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        {/* Icon */}
                        <div
                          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
                          style={{ background: primaryColor }}
                        >
                          <MapPin className="w-5 h-5" />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-gray-900" style={{ fontWeight: 700 }}>
                              {unit.name}
                            </p>
                            {unit.isMain && (
                              <span
                                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full"
                                style={{ background: `${primaryColor}15`, color: primaryColor, fontWeight: 600 }}
                              >
                                <Star className="w-3 h-3 fill-current" />
                                Principal
                              </span>
                            )}
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={
                                unit.status === "active"
                                  ? { background: "#ECFDF5", color: "#059669", fontWeight: 600 }
                                  : { background: "#F3F4F6", color: "#6B7280", fontWeight: 600 }
                              }
                            >
                              {unit.status === "active" ? "Ativa" : "Inativa"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 mt-1.5">
                            <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <p className="text-sm text-gray-500 truncate">{unit.address}</p>
                          </div>

                          <div className="flex items-center gap-4 mt-1 flex-wrap">
                            {unit.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-400">{unit.phone}</p>
                              </div>
                            )}
                            {unit.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-400">{unit.email}</p>
                              </div>
                            )}
                          </div>

                          {/* Counters */}
                          <div className="flex items-center gap-4 mt-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-lg bg-violet-50 flex items-center justify-center">
                                <Users className="w-3 h-3 text-violet-500" />
                              </div>
                              <p className="text-xs text-gray-500">
                                <span style={{ fontWeight: 700 }}>{unit.therapistsCount}</span> terapeutas
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-lg bg-blue-50 flex items-center justify-center">
                                <Building2 className="w-3 h-3 text-blue-500" />
                              </div>
                              <p className="text-xs text-gray-500">
                                <span style={{ fontWeight: 700 }}>{unit.roomsCount}</span> salas
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {!unit.isMain && (
                          <button
                            onClick={() => store.setMain(unit.id, companyId)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 transition-colors"
                          >
                            Tornar principal
                          </button>
                        )}
                        <button
                          onClick={() => setUnitModal({ mode: "edit", unit })}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(unit)}
                          disabled={units.length === 1}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={units.length === 1 ? "Não é possível remover a única unidade" : "Remover"}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Equipe ────────────────────────────────────────────────────────────── */}
      {tab === "equipe" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: primaryColor }}>
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-gray-900">Membros da Equipe</h3>
            </div>
            <button
              className="px-3 py-2 text-sm text-white rounded-lg hover:opacity-90 transition-opacity"
              style={{ background: primaryColor, fontWeight: 600 }}
            >
              + Convidar Membro
            </button>
          </div>
          <div className="space-y-3">
            {[
              { name: "Juliana Santos", email: "juliana@espacozen.com", role: "Admin da Empresa" },
              { name: "Pedro Alves", email: "pedro@espacozen.com", role: "Vendas" },
              { name: "Ana Carolina Silva", email: "ana.silva@espacozen.com", role: "Terapeuta" },
              { name: "Bruno Martins", email: "bruno.martins@espacozen.com", role: "Terapeuta" },
              { name: "Fernanda Costa", email: "fernanda.costa@espacozen.com", role: "Terapeuta" },
            ].map((member) => (
              <div key={member.email} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm"
                    style={{ background: primaryColor, fontWeight: 700 }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{member.name}</p>
                    <p className="text-xs text-gray-400">{member.email}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-lg border border-gray-200">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Notificações ──────────────────────────────────────────────────────── */}
      {tab === "notificacoes" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: primaryColor }}>
              <Bell className="w-4 h-4" />
            </div>
            <h3 className="text-gray-900">Notificações</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: "Novos agendamentos", desc: "Quando um cliente fizer uma reserva", active: true },
              { label: "Cancelamentos", desc: "Quando um agendamento for cancelado", active: true },
              { label: "Lembretes de sessão", desc: "24h antes de cada sessão agendada", active: false },
              { label: "Relatório diário", desc: "Resumo das sessões do dia", active: false },
              { label: "Novos clientes", desc: "Quando um novo cliente se cadastrar", active: true },
              { label: "Pagamentos recebidos", desc: "Confirmação de pagamentos", active: true },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm text-gray-900" style={{ fontWeight: 500 }}>{item.label}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
                <button
                  className="w-11 h-6 rounded-full transition-colors relative shrink-0"
                  style={item.active ? { background: primaryColor } : { background: "#E5E7EB" }}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
                      item.active ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Convites ──────────────────────────────────────────────────────────── */}
      {tab === "convites" && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: primaryColor }}>
                <Link className="w-4 h-4" />
              </div>
              <h3 className="text-gray-900">Links de Convite para Clientes</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Compartilhe o link ou código abaixo para que seus clientes possam se cadastrar e já
              serem vinculados à sua empresa automaticamente.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Código de convite</p>
                  <p className="text-lg font-mono text-gray-900" style={{ fontWeight: 700 }}>
                    {company?.inviteCode}
                  </p>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm hover:opacity-90 transition-opacity"
                  style={{ background: primaryColor, fontWeight: 600 }}
                >
                  {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Link de cadastro</p>
                  <p className="text-sm text-gray-600 font-mono">
                    https://zenhub.com.br/cadastro?invite={company?.inviteCode}
                  </p>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm hover:opacity-90 transition-opacity"
                  style={{ background: primaryColor, fontWeight: 600 }}
                >
                  <Copy className="w-4 h-4" /> Copiar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Unit Add/Edit Modal ───────────────────────────────────────────────── */}
      {unitModal && (
        <UnitModal
          mode={unitModal.mode}
          initial={unitModal.unit}
          companyId={companyId}
          primaryColor={primaryColor}
          onSave={handleSaveUnit}
          onClose={() => setUnitModal(null)}
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
              Remover unidade?
            </h3>
            <p className="text-gray-500 text-sm text-center mb-5">
              A unidade <strong>{deleteConfirm.name}</strong> será removida permanentemente. Os
              terapeutas e salas vinculados a ela não serão excluídos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteUnit(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
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