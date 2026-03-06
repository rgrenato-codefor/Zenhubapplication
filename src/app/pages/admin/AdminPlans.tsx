import { useState, useEffect, useCallback } from "react";
import {
  Plus, Edit2, Trash2, CheckCircle, XCircle, Zap,
  Building2, Star, Shield, Lock, Unlock, ChevronDown,
  ChevronUp, X, RefreshCw, AlertTriangle, Database,
  Loader2, CheckCheck, ArrowRight,
} from "lucide-react";
import {
  DEFAULT_COMPANY_PLANS, DEFAULT_THERAPIST_PLANS,
  COMPANY_MODULES, type ModuleKey, type CompanyPlan, type TherapistPlan,
} from "../../lib/planConfig";
import {
  getCompanyPlans, getTherapistPlans,
  setCompanyPlan as fsSetCompanyPlan,
  setTherapistPlan as fsSetTherapistPlan,
  deleteCompanyPlan as fsDeleteCompanyPlan,
  deleteTherapistPlan as fsDeleteTherapistPlan,
  seedDefaultPlans,
} from "../../../lib/firestore";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtPrice = (v: number) =>
  v === 0 ? "Gratuito" : `R$ ${v.toLocaleString("pt-BR")}/mês`;

const PLAN_COLORS_OPTIONS = [
  "#6B7280", "#3B82F6", "#8B5CF6", "#F59E0B",
  "#10B981", "#EC4899", "#EF4444", "#0D9488",
];

// ─── Company Plan Card ──────────────────────────────��─────────────────────────

function CompanyPlanCard({
  plan, onEdit, onDelete,
}: {
  plan: CompanyPlan;
  onEdit: (p: CompanyPlan) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const allMods = Object.keys(COMPANY_MODULES) as ModuleKey[];

  return (
    <div
      className={`bg-gray-800 rounded-2xl border transition-all ${
        plan.isActive ? "border-gray-700 hover:border-gray-600" : "border-gray-800 opacity-60"
      }`}
    >
      {/* Header */}
      <div className="p-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: `${plan.color}22` }}
          >
            {plan.badge}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-white">{plan.name}</h3>
              {plan.isDefault && (
                <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                  Padrão cadastro
                </span>
              )}
              {!plan.isActive && (
                <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full border border-red-800/40">
                  Inativo
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: plan.color, fontWeight: 600 }}>
              {fmtPrice(plan.price)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={() => onEdit(plan)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {!plan.isDefault && (
            <button
              onClick={() => onDelete(plan.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
              title="Excluir"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="px-5 pb-3 text-xs text-gray-400">{plan.description}</p>

      {/* Limits */}
      <div className="px-5 pb-3 flex gap-2 flex-wrap">
        {[
          { label: "Terapeutas", v: plan.limits.therapists },
          { label: "Clientes",   v: plan.limits.clients   },
          { label: "Unidades",   v: plan.limits.units     },
        ].map((l) => (
          <div
            key={l.label}
            className="flex items-center gap-1.5 bg-gray-700/50 rounded-lg px-3 py-1.5 text-xs"
          >
            <span className="text-gray-400">{l.label}:</span>
            <span className="text-white" style={{ fontWeight: 600 }}>
              {l.v === null ? "∞" : l.v}
            </span>
          </div>
        ))}
      </div>

      {/* Modules toggle */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Ocultar módulos" : `${plan.modules.length} módulos liberados`}
        </button>
        {expanded && (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {allMods.map((mod) => {
              const on = plan.modules.includes(mod);
              return (
                <div
                  key={mod}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs border ${
                    on
                      ? "bg-emerald-900/20 text-emerald-400 border-emerald-800/40"
                      : "bg-gray-700/20 text-gray-600 border-gray-700/30"
                  }`}
                >
                  {on ? <Unlock className="w-3 h-3 shrink-0" /> : <Lock className="w-3 h-3 shrink-0" />}
                  {COMPANY_MODULES[mod]}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Therapist Plan Card ──────────────────────────────────────────────────────

function TherapistPlanCard({
  plan, onEdit, onDelete,
}: {
  plan: TherapistPlan;
  onEdit: (p: TherapistPlan) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`bg-gray-800 rounded-2xl border transition-all ${
        plan.isActive ? "border-gray-700 hover:border-gray-600" : "border-gray-800 opacity-60"
      }`}
    >
      <div className="p-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
            style={{ background: `${plan.color}22` }}
          >
            {plan.badge}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white">{plan.name}</h3>
              {plan.isDefault && (
                <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">
                  Padrão cadastro
                </span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: plan.color, fontWeight: 600 }}>
              {fmtPrice(plan.price)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <button
            onClick={() => onEdit(plan)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {!plan.isDefault && (
            <button
              onClick={() => onDelete(plan.id)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="px-5 pb-3 text-xs text-gray-400">{plan.description}</p>

      <div className="px-5 pb-5">
        <div className="bg-gray-700/40 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-gray-300">Atendimentos / mês</span>
          </div>
          <span className="text-sm text-white" style={{ fontWeight: 700 }}>
            {plan.appointmentsPerMonth === null ? "Ilimitados ♾️" : `até ${plan.appointmentsPerMonth}`}
          </span>
        </div>
        {plan.appointmentsPerMonth !== null && (
          <p className="text-xs text-gray-500 mt-2">
            Ao ultrapassar o limite, o terapeuta avança automaticamente — sem bloqueio de agenda.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Company Plan Modal ───────────────────────────────────────────────────────

function CompanyPlanModal({
  initial, onSave, onClose, saving,
}: {
  initial: CompanyPlan | null;
  onSave: (p: CompanyPlan) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const isNew = initial === null;
  const [name, setName]     = useState(initial?.name || "");
  const [price, setPrice]   = useState(String(initial?.price ?? 0));
  const [desc, setDesc]     = useState(initial?.description || "");
  const [color, setColor]   = useState(initial?.color || PLAN_COLORS_OPTIONS[0]);
  const [badge, setBadge]   = useState(initial?.badge || "🆓");
  const [mods, setMods]     = useState<ModuleKey[]>(initial?.modules || []);
  const [limT, setLimT]     = useState(initial?.limits.therapists == null ? "" : String(initial.limits.therapists));
  const [limC, setLimC]     = useState(initial?.limits.clients == null ? "" : String(initial.limits.clients));
  const [limU, setLimU]     = useState(initial?.limits.units == null ? "" : String(initial.limits.units));
  const [active, setActive] = useState(initial?.isActive ?? true);
  const [isDef, setIsDef]   = useState(initial?.isDefault ?? false);

  const toggleMod = (m: ModuleKey) =>
    setMods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const handleSave = () => {
    if (!name.trim()) return;
    const plan: CompanyPlan = {
      id: initial?.id || `company_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      name: name.trim(),
      price: Number(price) || 0,
      description: desc.trim(),
      color,
      badge,
      modules: mods,
      limits: {
        therapists: limT === "" ? null : Number(limT),
        clients:    limC === "" ? null : Number(limC),
        units:      limU === "" ? null : Number(limU),
      },
      isDefault: isDef,
      isActive: active,
      order: initial?.order ?? 99,
    };
    onSave(plan);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-white">{isNew ? "Novo Plano de Empresa" : `Editar: ${initial?.name}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nome do Plano *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Business"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Preço Mensal (R$)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0 = Gratuito"
                type="number"
                min="0"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Badge + Color */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Emoji / Badge</label>
              <input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                placeholder="🆓"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Cor do plano</label>
              <div className="flex gap-2 flex-wrap pt-1">
                {PLAN_COLORS_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Descrição</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Descreva o plano brevemente..."
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          {/* Limits */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">
              Limites{" "}
              <span className="text-gray-600">(vazio = ilimitado)</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Terapeutas", val: limT, set: setLimT },
                { label: "Clientes",   val: limC, set: setLimC },
                { label: "Unidades",   val: limU, set: setLimU },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                  <input
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder="∞ ilimitado"
                    type="number"
                    min="1"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-400">
                Módulos Liberados{" "}
                <span className="text-gray-600">({mods.length} de {Object.keys(COMPANY_MODULES).length})</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMods(Object.keys(COMPANY_MODULES) as ModuleKey[])}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  Todos
                </button>
                <span className="text-gray-700">|</span>
                <button
                  onClick={() => setMods([])}
                  className="text-xs text-gray-400 hover:text-gray-300"
                >
                  Nenhum
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(COMPANY_MODULES) as ModuleKey[]).map((mod) => {
                const on = mods.includes(mod);
                return (
                  <button
                    key={mod}
                    onClick={() => toggleMod(mod)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs border transition-colors text-left ${
                      on
                        ? "bg-violet-600/20 border-violet-500 text-violet-300"
                        : "bg-gray-700/40 border-gray-600 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {on
                      ? <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 shrink-0 text-gray-600" />}
                    {COMPANY_MODULES[mod]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Flags */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-violet-500 w-4 h-4" />
              <span className="text-sm text-gray-300">Plano ativo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isDef} onChange={(e) => setIsDef(e.target.checked)} className="accent-violet-500 w-4 h-4" />
              <span className="text-sm text-gray-300">Padrão no cadastro</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ fontWeight: 600 }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isNew ? "Criar Plano" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Therapist Plan Modal ─────────────────────────────────────────────────────

function TherapistPlanModal({
  initial, onSave, onClose, saving,
}: {
  initial: TherapistPlan | null;
  onSave: (p: TherapistPlan) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const isNew = initial === null;
  const [name, setName]     = useState(initial?.name || "");
  const [price, setPrice]   = useState(String(initial?.price ?? 0));
  const [desc, setDesc]     = useState(initial?.description || "");
  const [color, setColor]   = useState(initial?.color || PLAN_COLORS_OPTIONS[0]);
  const [badge, setBadge]   = useState(initial?.badge || "🌿");
  const [limit, setLimit]   = useState(
    initial?.appointmentsPerMonth == null ? "" : String(initial.appointmentsPerMonth)
  );
  const [active, setActive] = useState(initial?.isActive ?? true);
  const [isDef, setIsDef]   = useState(initial?.isDefault ?? false);

  const handleSave = () => {
    if (!name.trim()) return;
    const plan: TherapistPlan = {
      id: initial?.id || `therapist_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`,
      name: name.trim(),
      price: Number(price) || 0,
      description: desc.trim(),
      color,
      badge,
      appointmentsPerMonth: limit === "" ? null : Number(limit),
      isDefault: isDef,
      isActive: active,
      order: initial?.order ?? 99,
    };
    onSave(plan);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl">
        <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white">{isNew ? "Novo Plano de Terapeuta" : `Editar: ${initial?.name}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nome *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Profissional"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Preço Mensal (R$)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0 = Gratuito"
                type="number" min="0"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Emoji / Badge</label>
              <input
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Cor</label>
              <div className="flex gap-2 flex-wrap pt-1">
                {PLAN_COLORS_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? "border-white scale-110" : "border-transparent"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Descrição</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="Descreva o plano..."
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Limite de Atendimentos / Mês{" "}
              <span className="text-gray-600">(vazio = ilimitado)</span>
            </label>
            <input
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="∞ ilimitado"
              type="number" min="1"
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Ao atingir o limite, o terapeuta é notificado e enquadrado no próximo plano — sem bloqueio.
            </p>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-violet-500 w-4 h-4" />
              <span className="text-sm text-gray-300">Plano ativo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isDef} onChange={(e) => setIsDef(e.target.checked)} className="accent-violet-500 w-4 h-4" />
              <span className="text-sm text-gray-300">Padrão no cadastro</span>
            </label>
          </div>
        </div>

        <div className="border-t border-gray-700 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontWeight: 600 }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isNew ? "Criar Plano" : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reset Confirm Modal ──────────────────────────────────────────────────────

function ResetConfirmModal({
  onConfirm, onClose, seeding,
}: {
  onConfirm: () => void;
  onClose: () => void;
  seeding: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-red-700/50 w-full max-w-md shadow-2xl p-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-900/40 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="text-white">Zerar e Recriar Planos?</h2>
            <p className="text-gray-400 text-sm mt-1">
              Esta ação irá <strong className="text-red-400">excluir todos os planos existentes</strong> nas
              coleções <code className="text-gray-300 bg-gray-700 px-1 rounded">companyPlans</code> e{" "}
              <code className="text-gray-300 bg-gray-700 px-1 rounded">therapistPlans</code> no Firestore e
              recriar os planos padrão do ZEN HUB.
            </p>
          </div>
        </div>

        {/* What will be created */}
        <div className="bg-gray-700/40 rounded-xl p-4 mb-5 space-y-3">
          <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>Planos que serão criados:</p>
          <div className="space-y-1.5">
            <p className="text-xs text-gray-300" style={{ fontWeight: 600 }}>Empresas:</p>
            {DEFAULT_COMPANY_PLANS.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs text-gray-400">
                <span>{p.badge}</span>
                <span>{p.name}</span>
                <span className="text-gray-600">—</span>
                <span style={{ color: p.color }}>{fmtPrice(p.price)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-gray-600 pt-3 space-y-1.5">
            <p className="text-xs text-gray-300" style={{ fontWeight: 600 }}>Terapeutas:</p>
            {DEFAULT_THERAPIST_PLANS.map((p) => (
              <div key={p.id} className="flex items-center gap-2 text-xs text-gray-400">
                <span>{p.badge}</span>
                <span>{p.name}</span>
                <span className="text-gray-600">—</span>
                <span style={{ color: p.color }}>{fmtPrice(p.price)}</span>
                <span className="text-gray-600 ml-auto">
                  {p.appointmentsPerMonth === null ? "ilimitado" : `≤${p.appointmentsPerMonth}/mês`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={seeding}
            className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={seeding}
            className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ fontWeight: 600 }}
          >
            {seeding ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
            ) : (
              <><Database className="w-4 h-4" /> Confirmar e Criar</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "empresas" | "terapeutas";

export default function AdminPlans() {
  const [tab, setTab] = useState<Tab>("empresas");

  // Data
  const [companyPlans,   setCompanyPlans]   = useState<CompanyPlan[]>([]);
  const [therapistPlans, setTherapistPlans] = useState<TherapistPlan[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [seeding, setSeeding]     = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [toast, setToast]         = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Modals
  const [editCompanyPlan,    setEditCompanyPlan]    = useState<CompanyPlan | null | undefined>(undefined);
  const [editTherapistPlan,  setEditTherapistPlan]  = useState<TherapistPlan | null | undefined>(undefined);
  const [showResetConfirm,   setShowResetConfirm]   = useState(false);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load from Firestore ────────────────────────────────────────────────────

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const [cp, tp] = await Promise.all([getCompanyPlans(), getTherapistPlans()]);
      setCompanyPlans(cp);
      setTherapistPlans(tp);
      setLastSynced(new Date());
    } catch (e) {
      showToast("error", "Erro ao carregar planos do Firestore.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  // ── Seed / Reset ───────────────────────────────────────────────────────────

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedDefaultPlans(DEFAULT_COMPANY_PLANS, DEFAULT_THERAPIST_PLANS);
      setCompanyPlans([...DEFAULT_COMPANY_PLANS]);
      setTherapistPlans([...DEFAULT_THERAPIST_PLANS]);
      setLastSynced(new Date());
      setShowResetConfirm(false);
      showToast("success", `${DEFAULT_COMPANY_PLANS.length + DEFAULT_THERAPIST_PLANS.length} planos criados com sucesso no Firestore!`);
    } catch {
      showToast("error", "Erro ao criar planos no banco. Verifique as permissões do Firestore.");
    } finally {
      setSeeding(false);
    }
  };

  // ── Save company plan ──────────────────────────────────────────────────────

  const handleSaveCompanyPlan = async (plan: CompanyPlan) => {
    setSaving(true);
    try {
      await fsSetCompanyPlan(plan);
      setCompanyPlans((prev) => {
        const idx = prev.findIndex((p) => p.id === plan.id);
        return idx >= 0 ? prev.map((p) => (p.id === plan.id ? plan : p)) : [...prev, plan];
      });
      setEditCompanyPlan(undefined);
      showToast("success", `Plano "${plan.name}" salvo no Firestore!`);
    } catch {
      showToast("error", "Erro ao salvar plano.");
    } finally {
      setSaving(false);
    }
  };

  // ── Save therapist plan ────────────────────────────────────────────────────

  const handleSaveTherapistPlan = async (plan: TherapistPlan) => {
    setSaving(true);
    try {
      await fsSetTherapistPlan(plan);
      setTherapistPlans((prev) => {
        const idx = prev.findIndex((p) => p.id === plan.id);
        return idx >= 0 ? prev.map((p) => (p.id === plan.id ? plan : p)) : [...prev, plan];
      });
      setEditTherapistPlan(undefined);
      showToast("success", `Plano "${plan.name}" salvo no Firestore!`);
    } catch {
      showToast("error", "Erro ao salvar plano.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteCompanyPlan = async (id: string) => {
    if (!confirm("Excluir este plano permanentemente?")) return;
    try {
      await fsDeleteCompanyPlan(id);
      setCompanyPlans((prev) => prev.filter((p) => p.id !== id));
      showToast("success", "Plano excluído.");
    } catch {
      showToast("error", "Erro ao excluir.");
    }
  };

  const handleDeleteTherapistPlan = async (id: string) => {
    if (!confirm("Excluir este plano permanentemente?")) return;
    try {
      await fsDeleteTherapistPlan(id);
      setTherapistPlans((prev) => prev.filter((p) => p.id !== id));
      showToast("success", "Plano excluído.");
    } catch {
      showToast("error", "Erro ao excluir.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  const isEmpty = !loading && companyPlans.length === 0 && therapistPlans.length === 0;

  return (
    <div className="space-y-6">

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm transition-all ${
            toast.type === "success"
              ? "bg-emerald-900/90 border-emerald-700 text-emerald-300"
              : "bg-red-900/90 border-red-700 text-red-300"
          }`}
        >
          {toast.type === "success"
            ? <CheckCheck className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-white">Planos & Assinaturas</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Gerencie planos, preços, módulos e limites de uso
            {lastSynced && (
              <span className="ml-2 text-gray-600 text-xs">
                · sincronizado {lastSynced.toLocaleTimeString("pt-BR")}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPlans}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-red-700/50 text-red-400 hover:bg-red-900/20 rounded-lg text-sm transition-colors"
          >
            <Database className="w-4 h-4" />
            Zerar e Recriar
          </button>
          <button
            onClick={() =>
              tab === "empresas" ? setEditCompanyPlan(null) : setEditTherapistPlan(null)
            }
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" />
            Novo Plano
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
        <div className="text-xs text-gray-400 space-y-1">
          <p>
            <strong className="text-gray-300">Plano padrão:</strong> todos os cadastros começam no plano{" "}
            <strong className="text-gray-300">Gratuito</strong>. O upgrade ocorre por escolha ou automaticamente ao
            ultrapassar limites.
          </p>
          <p>
            <strong className="text-gray-300">Terapeutas:</strong> atendimentos nunca são bloqueados — ao ultrapassar
            o limite do plano, o terapeuta é notificado e enquadrado no plano superior.
          </p>
          <p>
            <strong className="text-gray-300">Controle de acesso:</strong> módulos de empresa são protegidos por rota
            — usuários fora do plano veem a página de upgrade em vez do módulo.
          </p>
        </div>
      </div>

      {/* Empty state — banco vazio */}
      {isEmpty && (
        <div className="bg-gray-800 rounded-2xl border border-dashed border-gray-600 p-12 text-center">
          <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white mb-2">Nenhum plano no banco de dados</h3>
          <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
            As coleções <code className="text-gray-300 bg-gray-700 px-1 rounded">companyPlans</code> e{" "}
            <code className="text-gray-300 bg-gray-700 px-1 rounded">therapistPlans</code> estão vazias.
            Clique abaixo para criar os planos padrão do ZEN HUB.
          </p>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Database className="w-4 h-4" />
            Criar Planos Padrão no Firestore
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-500 gap-3">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Carregando planos do Firestore...</span>
        </div>
      )}

      {/* Tabs */}
      {!loading && !isEmpty && (
        <>
          <div className="flex gap-1 bg-gray-800/60 p-1 rounded-xl border border-gray-700 w-fit">
            {([
              { id: "empresas",   label: "Planos de Empresa",   icon: Building2, count: companyPlans.length   },
              { id: "terapeutas", label: "Planos de Terapeuta",  icon: Star,      count: therapistPlans.length },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
                  tab === t.id ? "bg-violet-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                }`}
                style={{ fontWeight: tab === t.id ? 600 : 400 }}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? "bg-white/20" : "bg-gray-700"}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Company Plans */}
          {tab === "empresas" && (
            <div className="space-y-4">
              {/* Summary strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {companyPlans.map((p) => (
                  <div key={p.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center gap-3">
                    <span className="text-2xl">{p.badge}</span>
                    <div>
                      <p className="text-xs text-gray-400">{p.name}</p>
                      <p className="text-sm text-white" style={{ fontWeight: 700, color: p.color }}>{fmtPrice(p.price)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companyPlans.map((p) => (
                  <CompanyPlanCard
                    key={p.id}
                    plan={p}
                    onEdit={setEditCompanyPlan}
                    onDelete={handleDeleteCompanyPlan}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Therapist Plans */}
          {tab === "terapeutas" && (
            <div className="space-y-4">
              <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-start gap-3">
                <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300/80">
                  <strong className="text-amber-300">Upgrade automático:</strong> ao atingir o limite de atendimentos
                  do plano atual, o terapeuta avança para o próximo tier e é notificado. Nenhum atendimento é recusado.
                </p>
              </div>

              {/* Summary strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {therapistPlans.map((p) => (
                  <div key={p.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center gap-3">
                    <span className="text-2xl">{p.badge}</span>
                    <div>
                      <p className="text-xs text-gray-400">{p.name}</p>
                      <p className="text-sm" style={{ fontWeight: 700, color: p.color }}>{fmtPrice(p.price)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {therapistPlans.map((p) => (
                  <TherapistPlanCard
                    key={p.id}
                    plan={p}
                    onEdit={setEditTherapistPlan}
                    onDelete={handleDeleteTherapistPlan}
                  />
                ))}
              </div>

              {/* Tier progression visual */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-white mb-4">Progressão de Tiers</h3>
                <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
                  {therapistPlans.map((p, i) => (
                    <div key={p.id} className="flex items-center flex-1 min-w-[120px]">
                      <div className="flex-1 bg-gray-700/50 rounded-xl p-4 text-center border border-gray-700">
                        <div className="text-2xl mb-1.5">{p.badge}</div>
                        <p className="text-xs text-white" style={{ fontWeight: 600 }}>{p.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {p.appointmentsPerMonth === null ? "Ilimitado" : `≤ ${p.appointmentsPerMonth}/mês`}
                        </p>
                        <p className="text-xs mt-1.5" style={{ color: p.color, fontWeight: 600 }}>
                          {fmtPrice(p.price)}
                        </p>
                      </div>
                      {i < therapistPlans.length - 1 && (
                        <div className="w-8 flex items-center justify-center shrink-0 text-gray-600">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Ao ultrapassar o limite de cada tier, o terapeuta avança automaticamente.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {editCompanyPlan !== undefined && (
        <CompanyPlanModal
          initial={editCompanyPlan}
          onSave={handleSaveCompanyPlan}
          onClose={() => setEditCompanyPlan(undefined)}
          saving={saving}
        />
      )}
      {editTherapistPlan !== undefined && (
        <TherapistPlanModal
          initial={editTherapistPlan}
          onSave={handleSaveTherapistPlan}
          onClose={() => setEditTherapistPlan(undefined)}
          saving={saving}
        />
      )}
      {showResetConfirm && (
        <ResetConfirmModal
          onConfirm={handleSeed}
          onClose={() => setShowResetConfirm(false)}
          seeding={seeding}
        />
      )}
    </div>
  );
}
