import { useState } from "react";
import {
  Plus, Edit2, Trash2, CheckCircle, XCircle, Zap,
  Building2, Star, Shield, Lock, Unlock, ChevronDown, ChevronUp, X,
} from "lucide-react";
import {
  DEFAULT_COMPANY_PLANS, DEFAULT_THERAPIST_PLANS,
  COMPANY_MODULES, type ModuleKey, type CompanyPlan, type TherapistPlan,
} from "../../lib/planConfig";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) => v === 0 ? "Gratuito" : `R$ ${v.toLocaleString("pt-BR")}/mês`;

// ─── Company Plan Card ────────────────────────────────────────────────────────

function CompanyPlanCard({
  plan,
  onEdit,
}: {
  plan: CompanyPlan;
  onEdit: (p: CompanyPlan) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const allModules = Object.keys(COMPANY_MODULES) as ModuleKey[];

  return (
    <div className={`bg-gray-800 rounded-2xl border transition-colors ${plan.isActive ? "border-gray-700 hover:border-gray-600" : "border-gray-800 opacity-60"}`}>
      {/* Header */}
      <div className="p-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
            style={{ background: `${plan.color}20` }}
          >
            {plan.badge}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white">{plan.name}</h3>
              {plan.isDefault && (
                <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Padrão</span>
              )}
              {!plan.isActive && (
                <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">Inativo</span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: plan.color, fontWeight: 600 }}>{fmt(plan.price)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(plan)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="px-5 pb-3">
        <p className="text-xs text-gray-400">{plan.description}</p>
      </div>

      {/* Limits */}
      <div className="px-5 pb-3">
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Terapeutas", value: plan.limits.therapists },
            { label: "Clientes",   value: plan.limits.clients },
            { label: "Unidades",   value: plan.limits.units },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5 bg-gray-700/50 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-400">{l.label}:</span>
              <span className="text-xs text-white" style={{ fontWeight: 600 }}>
                {l.value === null ? "∞ ilimitado" : l.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modules toggle */}
      <div className="px-5 pb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? "Ocultar módulos" : `Ver ${plan.modules.length} módulos liberados`}
        </button>

        {expanded && (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {allModules.map((mod) => {
              const unlocked = plan.modules.includes(mod);
              return (
                <div
                  key={mod}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs ${
                    unlocked
                      ? "bg-emerald-900/20 text-emerald-400 border border-emerald-800/40"
                      : "bg-gray-700/30 text-gray-600 border border-gray-700/30"
                  }`}
                >
                  {unlocked
                    ? <Unlock className="w-3 h-3 shrink-0" />
                    : <Lock className="w-3 h-3 shrink-0" />}
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
  plan,
  onEdit,
}: {
  plan: TherapistPlan;
  onEdit: (p: TherapistPlan) => void;
}) {
  return (
    <div className={`bg-gray-800 rounded-2xl border transition-colors ${plan.isActive ? "border-gray-700 hover:border-gray-600" : "border-gray-800 opacity-60"}`}>
      <div className="p-5 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${plan.color}20` }}>
            {plan.badge}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white">{plan.name}</h3>
              {plan.isDefault && (
                <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded-full">Padrão</span>
              )}
            </div>
            <p className="text-sm mt-0.5" style={{ color: plan.color, fontWeight: 600 }}>{fmt(plan.price)}</p>
          </div>
        </div>
        <button
          onClick={() => onEdit(plan)}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-5 pb-3">
        <p className="text-xs text-gray-400">{plan.description}</p>
      </div>

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
            Ao ultrapassar {plan.appointmentsPerMonth} atendimentos, o terapeuta é notificado sobre o próximo plano — sem bloqueio de agenda.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Edit Modal (Company Plan) ─────────────────────────────────────────────────

function CompanyPlanModal({
  plan,
  onClose,
}: {
  plan: CompanyPlan | null; // null = new plan
  onClose: () => void;
}) {
  const isNew = plan === null;
  const [name, setName]         = useState(plan?.name || "");
  const [price, setPrice]       = useState(String(plan?.price ?? ""));
  const [desc, setDesc]         = useState(plan?.description || "");
  const [mods, setMods]         = useState<ModuleKey[]>(plan?.modules || []);
  const [limT, setLimT]         = useState(String(plan?.limits.therapists ?? ""));
  const [limC, setLimC]         = useState(String(plan?.limits.clients ?? ""));
  const [limU, setLimU]         = useState(String(plan?.limits.units ?? ""));

  const toggleMod = (m: ModuleKey) =>
    setMods((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white">{isNew ? "Novo Plano de Empresa" : `Editar: ${plan?.name}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + Price */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nome do Plano</label>
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
            <label className="block text-xs text-gray-400 mb-2">Limites <span className="text-gray-500">(deixe vazio = ilimitado)</span></label>
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
                    placeholder="∞"
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
            <label className="block text-xs text-gray-400 mb-2">
              Módulos Liberados <span className="text-gray-500">({mods.length} selecionados)</span>
            </label>
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
                    {on ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0 text-gray-600" />}
                    {COMPANY_MODULES[mod]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors"
            style={{ fontWeight: 600 }}
          >
            {isNew ? "Criar Plano" : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Modal (Therapist Plan) ──────────────────────────────────────────────

function TherapistPlanModal({
  plan,
  onClose,
}: {
  plan: TherapistPlan | null;
  onClose: () => void;
}) {
  const isNew = plan === null;
  const [name, setName]     = useState(plan?.name || "");
  const [price, setPrice]   = useState(String(plan?.price ?? ""));
  const [desc, setDesc]     = useState(plan?.description || "");
  const [limit, setLimit]   = useState(plan?.appointmentsPerMonth === null ? "" : String(plan?.appointmentsPerMonth ?? ""));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md">
        <div className="border-b border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-white">{isNew ? "Novo Plano de Terapeuta" : `Editar: ${plan?.name}`}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Nome</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Profissional"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Preço Mensal (R$)</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 = Gratuito" type="number" min="0"
                className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Descrição</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} placeholder="Descreva o plano..."
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">
              Limite de Atendimentos / Mês <span className="text-gray-500">(vazio = ilimitado)</span>
            </label>
            <input
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="∞ ilimitado"
              type="number"
              min="1"
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Ao atingir o limite, o terapeuta é notificado automaticamente para fazer upgrade — sem bloqueio de atendimentos.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-700 px-6 py-4 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">Cancelar</button>
          <button onClick={onClose} className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors" style={{ fontWeight: 600 }}>
            {isNew ? "Criar Plano" : "Salvar"}
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
  const [editCompanyPlan, setEditCompanyPlan]     = useState<CompanyPlan | null | undefined>(undefined); // undefined = closed
  const [editTherapistPlan, setEditTherapistPlan] = useState<TherapistPlan | null | undefined>(undefined);

  // Local plan state (will be persisted to Firestore in a future iteration)
  const [companyPlans]   = useState<CompanyPlan[]>(DEFAULT_COMPANY_PLANS);
  const [therapistPlans] = useState<TherapistPlan[]>(DEFAULT_THERAPIST_PLANS);

  const companyMRR   = companyPlans.reduce((s, p) => s, 0); // placeholder
  const therapistMRR = therapistPlans.reduce((s, p) => s, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white">Planos & Assinaturas</h1>
          <p className="text-gray-400 text-sm mt-0.5">Configure planos, preços, módulos e limites de uso</p>
        </div>
        <button
          onClick={() => tab === "empresas" ? setEditCompanyPlan(null) : setEditTherapistPlan(null)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          Novo Plano
        </button>
      </div>

      {/* Info banner */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
        <div className="text-xs text-gray-400">
          <p><strong className="text-gray-300">Plano padrão:</strong> todos os cadastros começam no plano <strong className="text-gray-300">Gratuito</strong> — empresa e terapeuta. O upgrade é por escolha do usuário ou automático ao ultrapassar limites.</p>
          <p className="mt-1"><strong className="text-gray-300">Terapeutas:</strong> não bloqueamos atendimentos. Ao ultrapassar o limite do plano, o terapeuta é notificado e enquadrado no plano superior automaticamente.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800/60 p-1 rounded-xl border border-gray-700 w-fit">
        {([
          { id: "empresas",    label: "Planos de Empresa",    icon: Building2 },
          { id: "terapeutas",  label: "Planos de Terapeuta",  icon: Star      },
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
                  <p className="text-sm text-white" style={{ fontWeight: 700 }}>{fmt(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyPlans.map((p) => (
              <CompanyPlanCard key={p.id} plan={p} onEdit={setEditCompanyPlan} />
            ))}
          </div>
        </div>
      )}

      {/* Therapist Plans */}
      {tab === "terapeutas" && (
        <div className="space-y-4">
          {/* Upgrade logic explainer */}
          <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex items-start gap-3">
            <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-300/80">
              <strong className="text-amber-300">Como funciona o upgrade automático:</strong> quando um terapeuta atinge o limite de atendimentos do plano atual,
              ele é automaticamente movido para o próximo tier e notificado. Nenhum atendimento é recusado. O objetivo é transparência, não bloqueio.
            </div>
          </div>

          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {therapistPlans.map((p) => (
              <div key={p.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4 flex items-center gap-3">
                <span className="text-2xl">{p.badge}</span>
                <div>
                  <p className="text-xs text-gray-400">{p.name}</p>
                  <p className="text-sm text-white" style={{ fontWeight: 700 }}>{fmt(p.price)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {therapistPlans.map((p) => (
              <TherapistPlanCard key={p.id} plan={p} onEdit={setEditTherapistPlan} />
            ))}
          </div>

          {/* Tier progression visual */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h3 className="text-white mb-4">Progressão de Tiers</h3>
            <div className="flex items-center gap-0">
              {therapistPlans.map((p, i) => (
                <div key={p.id} className="flex items-center flex-1">
                  <div className="flex-1 bg-gray-700/60 rounded-xl p-4 text-center">
                    <div className="text-2xl mb-1">{p.badge}</div>
                    <p className="text-xs text-gray-300" style={{ fontWeight: 600 }}>{p.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.appointmentsPerMonth === null ? "Ilimitado" : `≤ ${p.appointmentsPerMonth}/mês`}
                    </p>
                    <p className="text-xs mt-1" style={{ color: p.color, fontWeight: 600 }}>{fmt(p.price)}</p>
                  </div>
                  {i < therapistPlans.length - 1 && (
                    <div className="w-8 flex items-center justify-center shrink-0">
                      <div className="text-gray-600 text-lg">→</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3 text-center">
              Ao ultrapassar o limite de cada tier, o terapeuta avança automaticamente para o próximo plano.
            </p>
          </div>
        </div>
      )}

      {/* Modals */}
      {editCompanyPlan !== undefined && (
        <CompanyPlanModal plan={editCompanyPlan} onClose={() => setEditCompanyPlan(undefined)} />
      )}
      {editTherapistPlan !== undefined && (
        <TherapistPlanModal plan={editTherapistPlan} onClose={() => setEditTherapistPlan(undefined)} />
      )}
    </div>
  );
}
