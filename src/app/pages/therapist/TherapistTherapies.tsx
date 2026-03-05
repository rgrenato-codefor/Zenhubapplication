import { useState } from "react";
import {
  Plus, Edit2, Trash2, Toggle3D, Clock, DollarSign,
  Building2, CheckCircle, Info, Sparkles, X, Save,
  ChevronDown, BadgeCheck, AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { therapists, companies, therapies as companyTherapies } from "../../data/mockData";
import { useTherapistStore, type CatalogItem } from "../../store/therapistStore";

const CATEGORIES = ["Relaxamento", "Oriental", "Terapêutica", "Reflexologia", "Holística", "Desportiva", "Outra"];
const COLORS = ["#7C3AED", "#0D9488", "#D97706", "#DC2626", "#059669", "#0EA5E9", "#EC4899", "#6366F1"];

const EMPTY_ITEM: Omit<CatalogItem, "id"> = {
  name: "", duration: 60, myPrice: 0, category: "Relaxamento", color: "#0D9488", active: true,
};

export default function TherapistTherapies() {
  const { user } = useAuth();
  const store = useTherapistStore();
  const therapist = therapists.find((t) => t.id === user?.therapistId);

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<Omit<CatalogItem, "id">>(EMPTY_ITEM);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  if (!therapist) return null;

  const catalog = store.getCatalog(therapist.id);
  const company = companies.find((c) => c.id === therapist.companyId);
  const isAutonomous = !company;

  // Company therapies available to therapist
  const availableCompanyTherapies = companyTherapies.filter(
    (t) => t.companyId === therapist.companyId
  );

  // Which company therapies the therapist has selected (toggle list in company mode)
  const selectedCompanyIds = new Set(catalog.map((c) => {
    const match = availableCompanyTherapies.find((ct) => ct.name === c.name);
    return match?.id;
  }).filter(Boolean));

  const toggleCompanyTherapy = (ct: typeof companyTherapies[0]) => {
    if (selectedCompanyIds.has(ct.id)) {
      // Remove
      store.setCatalog(therapist.id, catalog.filter((c) => c.name !== ct.name));
    } else {
      // Add
      const newItem: CatalogItem = {
        id: `tc_${ct.id}_${Date.now()}`,
        name: ct.name,
        duration: ct.duration,
        myPrice: ct.price,
        category: ct.category,
        color: ct.color,
        active: true,
      };
      store.addCatalogItem(therapist.id, newItem);
    }
  };

  const openAdd = () => {
    setForm(EMPTY_ITEM);
    setEditItem(null);
    setModal("add");
  };

  const openEdit = (item: CatalogItem) => {
    setForm({ name: item.name, duration: item.duration, myPrice: item.myPrice, category: item.category, color: item.color, active: item.active });
    setEditItem(item);
    setModal("edit");
  };

  const handleSave = () => {
    if (!form.name.trim() || form.myPrice <= 0 || form.duration <= 0) return;
    if (modal === "add") {
      store.addCatalogItem(therapist.id, { ...form, id: `tc_custom_${Date.now()}` });
    } else if (modal === "edit" && editItem) {
      store.updateCatalogItem(therapist.id, { ...editItem, ...form });
    }
    setModal(null);
  };

  const handleDelete = (id: string) => {
    store.removeCatalogItem(therapist.id, id);
    setDeleteConfirm(null);
  };

  const toggleActive = (item: CatalogItem) => {
    store.updateCatalogItem(therapist.id, { ...item, active: !item.active });
  };

  const earnings = (price: number) =>
    isAutonomous ? price : price * (therapist.commission / 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Minhas Terapias</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isAutonomous
              ? "Gerencie seus serviços e defina seus preços"
              : `Selecione as terapias que você oferece em ${company?.name}`}
          </p>
        </div>
        {isAutonomous && (
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-700 transition-colors"
            style={{ fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" /> Nova terapia
          </button>
        )}
      </div>

      {/* ── Status Banner ───────────────────────────────────────────── */}
      {company ? (
        <div
          className="rounded-xl p-5 border"
          style={{ background: `${company.color}08`, borderColor: `${company.color}22` }}
        >
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: company.color, fontWeight: 700, fontSize: "0.8rem" }}
            >
              {company.logo}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm" style={{ color: company.color, fontWeight: 700 }}>
                  Vinculado: {company.name}
                </p>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `${company.color}20`, color: company.color, fontWeight: 600 }}
                >
                  Plano {company.plan}
                </span>
              </div>
              <p className="text-gray-500 text-xs leading-relaxed">
                Os <span style={{ fontWeight: 700 }}>preços são definidos pela empresa</span> e não podem ser alterados por você.
                Selecione abaixo as terapias que você oferece nesta empresa.
                Sua comissão é de <span className="text-emerald-600" style={{ fontWeight: 700 }}>{therapist.commission}%</span> sobre o valor de cada sessão.
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <Info className="w-3.5 h-3.5 text-amber-500" />
                <p className="text-amber-600 text-xs">
                  Se você sair desta empresa, seus preços autônomos voltam a valer.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-5 border border-violet-100 bg-violet-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-violet-700 text-sm" style={{ fontWeight: 700 }}>Modo autônomo</p>
              <p className="text-violet-600 text-xs leading-relaxed mt-0.5">
                Você não está vinculado a nenhuma empresa. Defina seus próprios preços —{" "}
                <span style={{ fontWeight: 700 }}>você recebe 100%</span> do valor de cada sessão realizada.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Company mode: select from company catalog ────────────────── */}
      {company && availableCompanyTherapies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Terapias disponíveis na empresa</h3>
            <p className="text-gray-400 text-xs mt-0.5">
              {selectedCompanyIds.size} de {availableCompanyTherapies.length} selecionadas
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {availableCompanyTherapies.map((ct) => {
              const selected = selectedCompanyIds.has(ct.id);
              const myEarning = ct.price * (therapist.commission / 100);
              return (
                <button
                  key={ct.id}
                  onClick={() => toggleCompanyTherapy(ct)}
                  className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-all hover:bg-gray-50 ${selected ? "" : "opacity-60"}`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "border-emerald-500 bg-emerald-500" : "border-gray-300"}`}
                  >
                    {selected && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ background: ct.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{ct.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{ct.duration} min</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">{ct.category}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-400 line-through">R$ {ct.price.toFixed(0)}</p>
                    <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                      → R$ {myEarning.toFixed(0)}
                    </p>
                    <p className="text-xs text-gray-400">{therapist.commission}% comissão</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Autonomous catalog or selected catalog ────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
              {isAutonomous ? "Seu catálogo" : "Terapias que você oferece"}
            </h3>
            <p className="text-gray-400 text-xs mt-0.5">
              {catalog.filter((c) => c.active).length} terapias ativas
            </p>
          </div>
          {isAutonomous && (
            <button
              onClick={openAdd}
              className="flex items-center gap-1.5 text-violet-500 text-sm hover:text-violet-600"
              style={{ fontWeight: 600 }}
            >
              <Plus className="w-4 h-4" /> Adicionar
            </button>
          )}
        </div>

        {catalog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Sparkles className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Nenhuma terapia cadastrada</p>
            <p className="text-gray-400 text-xs mt-1">
              {isAutonomous
                ? 'Clique em "Nova terapia" para começar.'
                : "Selecione acima as terapias que você oferece nesta empresa."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {catalog.map((item) => {
              const myEarning = earnings(item.myPrice);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 px-6 py-4 transition-all ${!item.active ? "opacity-50" : ""}`}
                >
                  <div className="w-1 h-12 rounded-full shrink-0" style={{ background: item.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{item.name}</p>
                      {!item.active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                          Inativa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" /> {item.duration} min
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${item.color}18`, color: item.color, fontWeight: 600 }}
                      >
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isAutonomous ? (
                      <>
                        <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>R$ {item.myPrice.toFixed(0)}</p>
                        <p className="text-xs text-emerald-600" style={{ fontWeight: 600 }}>100% seu</p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-400 line-through text-right">R$ {item.myPrice.toFixed(0)}</p>
                        <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>
                          R$ {myEarning.toFixed(0)}
                        </p>
                        <p className="text-xs text-gray-400">{therapist.commission}%</p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle active */}
                    <button
                      onClick={() => toggleActive(item)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        item.active ? "bg-emerald-50 text-emerald-500" : "bg-gray-100 text-gray-400"
                      }`}
                      title={item.active ? "Desativar" : "Ativar"}
                    >
                      <BadgeCheck className="w-4 h-4" />
                    </button>

                    {isAutonomous && (
                      <>
                        <button
                          onClick={() => openEdit(item)}
                          className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>
                {modal === "add" ? "Nova terapia" : "Editar terapia"}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Nome da terapia *</label>
                <input
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="Ex: Massagem Relaxante"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Price */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Valor (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
                    <input
                      type="number"
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      placeholder="150"
                      value={form.myPrice || ""}
                      onChange={(e) => setForm((p) => ({ ...p, myPrice: Number(e.target.value) }))}
                    />
                  </div>
                </div>
                {/* Duration */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Duração (min) *</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                    placeholder="60"
                    value={form.duration || ""}
                    onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Categoria</label>
                <select
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Cor de identificação</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((p) => ({ ...p, color: c }))}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        background: c,
                        outline: form.color === c ? `3px solid ${c}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>

              {form.myPrice > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <DollarSign className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-emerald-700 text-xs">
                    Valor da sessão: <span style={{ fontWeight: 700 }}>R$ {form.myPrice.toFixed(2)}</span>{" "}
                    · Você recebe: <span style={{ fontWeight: 700 }}>R$ {form.myPrice.toFixed(2)} (100%)</span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.name.trim() || form.myPrice <= 0}
                className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ fontWeight: 600 }}
              >
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ────────────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Remover terapia?</p>
                <p className="text-gray-500 text-xs">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm"
                style={{ fontWeight: 600 }}
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