import { useState, useEffect, useRef } from "react";
import {
  Save, Building2, Bell, Users, Link, Copy, CheckCheck,
  MapPin, Plus, Edit2, Trash2, X, Phone, Mail, Star,
  CheckCircle, AlertCircle, ChevronRight, ToggleLeft, ToggleRight,
  Download, QrCode, Smartphone, Share2, Camera, Image,
} from "../../components/shared/icons";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { type Unit } from "../../context/DataContext";
import { MediaGallery } from "../../components/shared/MediaGallery";
import { uploadMedia, deleteMedia, ikFolders } from "../../../lib/imagekit";
import type { MediaItem } from "../../../lib/imagekit";

type UnitStatus = "active" | "inactive";
type ActiveTab = "company" | "units" | "gallery" | "notifications" | "invites";

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
      companyId: companyId,
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
  const {
    company: companyData, units,
    mutateCompany, mutateAddUnit, mutateUpdateUnit, mutateDeleteUnit,
    companyGallery,
    mutateAddCompanyGalleryItem, mutateRemoveCompanyGalleryItem,
  } = usePageData();

  const companyId = user?.companyId ?? "";
  const primaryColor = companyData?.color || "#0D9488";

  const [activeTab, setActiveTab] = useState<ActiveTab>("company");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const qrCanvasRef = useRef<HTMLDivElement>(null);
  const [unitModal, setUnitModal] = useState<{ mode: "add" | "edit"; unit?: Unit } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Company form — syncs whenever companyData loads or changes from Firestore
  const [companyForm, setCompanyForm] = useState({
    name: companyData?.name ?? "",
    email: companyData?.email ?? "",
    phone: companyData?.phone ?? "",
    address: companyData?.address ?? "",
    cnpj: (companyData as any)?.cnpj ?? "",
    segment: (companyData as any)?.segment ?? "",
    color: companyData?.color ?? "#0D9488",
    logo: companyData?.logo ?? "",
    logoUrl: (companyData as any)?.logoUrl ?? "",
  });

  // Keep form in sync when companyData arrives from Firestore asynchronously
  useEffect(() => {
    if (!companyData) return;
    setCompanyForm({
      name: companyData.name ?? "",
      email: companyData.email ?? "",
      phone: companyData.phone ?? "",
      address: companyData.address ?? "",
      cnpj: (companyData as any)?.cnpj ?? "",
      segment: (companyData as any)?.segment ?? "",
      color: companyData.color ?? "#0D9488",
      logo: companyData.logo ?? "",
      logoUrl: (companyData as any)?.logoUrl ?? "",
    });
  }, [companyData]);

  const handleSaveCompany = async () => {
    await mutateCompany(companyForm);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleAddUnit = async (form: Omit<Unit, "id" | "createdAt">) => {
    await mutateAddUnit(form);
    setUnitModal(null);
  };

  const handleEditUnit = async (id: string, form: Partial<Unit>) => {
    await mutateUpdateUnit(id, form);
    setUnitModal(null);
  };

  const handleDeleteUnit = async (id: string) => {
    await mutateDeleteUnit(id);
    setDeleteConfirm(null);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(companyData?.inviteCode || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inviteLink = `https://zenhub.com.br/cadastro?invite=${companyData?.inviteCode ?? ""}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const downloadQR = () => {
    const canvas = qrCanvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `qrcode-${companyData?.inviteCode ?? "convite"}.png`;
    a.click();
  };

  const handleCompanyGalleryUpload = async (file: File, onProgress: (p: number) => void): Promise<MediaItem> => {
    const item = await uploadMedia(file, ikFolders.companyGallery(companyId), onProgress);
    await mutateAddCompanyGalleryItem(item);
    return item;
  };

  const handleCompanyGalleryRemove = async (itemId: string) => {
    const item = companyGallery.find((m: MediaItem) => m.id === itemId);
    await deleteMedia(item?.fileId);
    await mutateRemoveCompanyGalleryItem(itemId);
  };

  const tabs = [
    { id: "company",       label: "Geral" },
    { id: "units",         label: "Unidades" },
    { id: "gallery",       label: "Galeria" },
    { id: "notifications", label: "Notificações" },
    { id: "invites",       label: "Convites" },
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
            onClick={() => setActiveTab(t.id as ActiveTab)}
            className={`px-4 py-2 rounded-md text-sm whitespace-nowrap transition-colors ${
              activeTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
            style={activeTab === t.id ? { fontWeight: 600 } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Geral ─────────────────────────────────────────────────────────────── */}
      {activeTab === "company" && (
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
                  { label: "Nome da empresa",  field: "name"    as const },
                  { label: "E-mail",           field: "email"   as const },
                  { label: "Telefone",         field: "phone"   as const },
                  { label: "Endereço (sede)",  field: "address" as const },
                ].map(({ label, field }) => (
                  <div key={field} className={field === "address" ? "col-span-2" : ""}>
                    <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>
                      {label}
                    </label>
                    <input
                      value={companyForm[field] || ""}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2"
                      style={{ ["--tw-ring-color" as string]: `${primaryColor}50` }}
                      onChange={(e) => setCompanyForm((p) => ({ ...p, [field]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h3 className="text-gray-900 mb-4">Identidade Visual</h3>

              {/* ── Logo ─────────────────────────────────────────── */}
              <div className="mb-5">
                <label className="block text-sm text-gray-600 mb-2" style={{ fontWeight: 600 }}>
                  Logotipo da empresa
                </label>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="relative group">
                    {companyForm.logoUrl ? (
                      <img
                        src={companyForm.logoUrl}
                        alt="Logo"
                        className="w-16 h-16 rounded-2xl object-cover shadow-md"
                      />
                    ) : (
                      <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-lg shadow-md"
                        style={{ background: companyForm.color, fontWeight: 700 }}
                      >
                        {companyForm.logo || companyForm.name?.slice(0, 2).toUpperCase() || "ZH"}
                      </div>
                    )}
                    {/* Upload overlay */}
                    <label
                      className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      title="Trocar logo"
                    >
                      <Camera className="w-5 h-5 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setCompanyForm((p) => ({
                              ...p,
                              logoUrl: ev.target?.result as string,
                            }));
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-2">
                      Clique no logo para trocar a imagem. JPG, PNG ou SVG, máx. 2 MB.
                    </p>
                    {/* Initials fallback */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sigla (exibida sem imagem)</label>
                      <input
                        value={companyForm.logo}
                        maxLength={3}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm text-center uppercase focus:outline-none focus:ring-2"
                        style={{ ["--tw-ring-color" as string]: `${companyForm.color}50` }}
                        onChange={(e) => setCompanyForm((p) => ({ ...p, logo: e.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Cor ─────────────────────────────────────────── */}
              <div>
                <label className="block text-sm text-gray-600 mb-2" style={{ fontWeight: 600 }}>
                  Cor da empresa
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={companyForm.color}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                    onChange={(e) => setCompanyForm((p) => ({ ...p, color: e.target.value }))}
                  />
                  <div
                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200"
                    style={{ background: `${companyForm.color}10` }}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ background: companyForm.color }}
                    />
                    <span className="text-sm text-gray-700 font-mono">{companyForm.color}</span>
                  </div>
                </div>
                {/* Color preview on elements */}
                <div className="mt-3 flex gap-2">
                  {["#7C3AED","#0D9488","#2563EB","#D97706","#DC2626","#0EA5E9","#10B981"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCompanyForm((p) => ({ ...p, color: c }))}
                      className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                      style={{
                        background: c,
                        borderColor: companyForm.color === c ? c : "transparent",
                        outline: companyForm.color === c ? `2px solid ${c}` : "none",
                        outlineOffset: "2px",
                      }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button
              className="w-full flex items-center justify-center gap-2 py-3 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
              style={{ background: companyForm.color, fontWeight: 600 }}
              onClick={handleSaveCompany}
            >
              <Save className="w-4 h-4" /> Salvar Alterações
            </button>
            {saveSuccess && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span style={{ fontWeight: 600 }}>Alterações salvas com sucesso!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Unidades ──────────────────────────────────────────────────────────── */}
      {activeTab === "units" && (
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
              {unitModal && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  <span style={{ fontWeight: 600 }}>Unidade salva com sucesso!</span>
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
                            onClick={() => mutateUpdateUnit(unit.id, { isMain: true })}
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
                          onClick={() => setDeleteConfirm(unit.id)}
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

      {/* ── Galeria ────────────────────────────────────────────────────────────── */}
      {activeTab === "gallery" && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: primaryColor }}>
              <Image className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-gray-900">Galeria da Empresa</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Fotos e vídeos dos seus espaços, equipe e serviços — visíveis no perfil público
              </p>
            </div>
          </div>
          <MediaGallery
            items={companyGallery}
            onUpload={handleCompanyGalleryUpload}
            onRemove={handleCompanyGalleryRemove}
            canEdit
            accentColor={primaryColor}
            title="Fotos & Vídeos da empresa"
            maxItems={50}
          />
        </div>
      )}

      {/* ── Notificações ──────────────────────────────────────────────────────── */}
      {activeTab === "notifications" && (
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

      {/* ── Convites ─────────────────────────────────────────────────────────── */}
      {activeTab === "invites" && (
        <div className="space-y-4">
          {/* Header card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white" style={{ background: primaryColor }}>
                <QrCode className="w-4 h-4" />
              </div>
              <h3 className="text-gray-900">QR Code de Convite</h3>
            </div>
            <p className="text-sm text-gray-400 mt-1 mb-6">
              Exiba ou compartilhe o QR Code para que seus clientes se cadastrem e sejam
              vinculados automaticamente à sua empresa.
            </p>

            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">

              {/* ── QR Code ────────────────────────────────────── */}
              <div className="flex flex-col items-center gap-4 shrink-0">
                {/* Visual frame */}
                <div
                  className="relative p-5 rounded-3xl shadow-xl"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}18 0%, ${primaryColor}08 100%)`, border: `2px solid ${primaryColor}30` }}
                >
                  {/* Corner accents */}
                  {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
                    <div
                      key={i}
                      className={`absolute w-5 h-5 ${pos} ${i < 2 ? "rounded-tl-xl rounded-tr-xl" : "rounded-bl-xl rounded-br-xl"}`}
                      style={{ [i % 2 === 0 ? "borderLeft" : "borderRight"]: `3px solid ${primaryColor}`, [i < 2 ? "borderTop" : "borderBottom"]: `3px solid ${primaryColor}` }}
                    />
                  ))}

                  <QRCodeSVG
                    value={inviteLink}
                    size={200}
                    bgColor="#ffffff"
                    fgColor="#111827"
                    level="H"
                    imageSettings={{
                      src: "",
                      x: undefined,
                      y: undefined,
                      height: 0,
                      width: 0,
                      opacity: 0,
                      excavate: false,
                    }}
                  />
                </div>

                {/* Company label below QR */}
                <div className="text-center">
                  <p className="text-sm text-gray-700" style={{ fontWeight: 700 }}>{companyData?.name}</p>
                  <p className="text-xs text-gray-400">Escaneie para se cadastrar</p>
                </div>

                {/* Hidden canvas for download */}
                <div ref={qrCanvasRef} className="hidden">
                  <QRCodeCanvas value={inviteLink} size={512} level="H" />
                </div>

                {/* Download button */}
                <button
                  onClick={downloadQR}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm hover:opacity-90 transition-all shadow-md"
                  style={{ background: primaryColor, fontWeight: 600 }}
                >
                  <Download className="w-4 h-4" />
                  Baixar QR Code
                </button>
              </div>

              {/* ── Right side: info + copy ─────────────────────── */}
              <div className="flex-1 w-full space-y-4">

                {/* How it works */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-3">
                  <p className="text-xs text-gray-500 uppercase" style={{ fontWeight: 700, letterSpacing: "0.05em" }}>Como funciona</p>
                  {[
                    { icon: <QrCode className="w-4 h-4" />, text: "Cliente escaneia o QR Code com a câmera do celular" },
                    { icon: <Smartphone className="w-4 h-4" />, text: "É direcionado para o cadastro já com sua empresa vinculada" },
                    { icon: <CheckCircle className="w-4 h-4" />, text: "Após o cadastro, pode visualizar serviços e agendar sessões" },
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-white" style={{ background: primaryColor }}>
                        {step.icon}
                      </div>
                      <p className="text-sm text-gray-600 pt-0.5">{step.text}</p>
                    </div>
                  ))}
                </div>

                {/* Invite code */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Código de convite</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="flex-1 font-mono text-lg text-gray-900" style={{ fontWeight: 700, letterSpacing: "0.1em" }}>
                        {companyData?.inviteCode ?? "—"}
                      </p>
                    </div>
                    <button
                      onClick={copyInviteCode}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm hover:opacity-90 transition-all shrink-0"
                      style={copied
                        ? { background: "#ECFDF5", color: "#059669", fontWeight: 600 }
                        : { background: primaryColor, color: "#fff", fontWeight: 600 }}
                    >
                      {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>

                {/* Invite link */}
                <div>
                  <p className="text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Link de cadastro</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                      <Link className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <p className="text-xs text-gray-500 font-mono truncate">{inviteLink}</p>
                    </div>
                    <button
                      onClick={copyInviteLink}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm hover:opacity-90 transition-all shrink-0"
                      style={copiedLink
                        ? { background: "#ECFDF5", color: "#059669", fontWeight: 600 }
                        : { background: "#F3F4F6", color: "#374151", fontWeight: 600 }}
                    >
                      {copiedLink ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>

                {/* Share tip */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <Share2 className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-600">
                    <span style={{ fontWeight: 700 }}>Dica:</span> Imprima o QR Code e cole na recepção, nos cards de visita ou nas redes sociais para facilitar o cadastro dos seus clientes.
                  </p>
                </div>
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
          onSave={(unit) => {
            if (unitModal.mode === "add") {
              handleAddUnit(unit);
            } else {
              handleEditUnit(unit.id, unit);
            }
          }}
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
              A unidade <strong>{deleteConfirm}</strong> será removida permanentemente. Os
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