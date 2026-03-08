import { useState } from "react";
import {
  Plus, Edit2, Trash2, Clock, DollarSign,
  Building2, CheckCircle, Info, Sparkles, X, Save, BadgeCheck,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";

type CatalogItem = {
  id: string;
  name: string;
  duration: number;
  myPrice: number;
  category: string;
  color: string;
  active: boolean;
};

const EMPTY_ITEM = { name: "", duration: 60, myPrice: 0, category: "Relaxamento", color: "#7C3AED", active: true };
const CATEGORIES = ["Relaxamento", "Oriental", "Terapêutica", "Reflexologia", "Holística", "Esportiva", "Outra"];
const COLORS = ["#7C3AED","#0D9488","#D97706","#DC2626","#059669","#3B82F6","#EC4899","#8B5CF6"];

export default function TherapistTherapies() {
  const { user } = useAuth();
  const {
    myTherapist: therapist, company, therapies: companyTherapies,
    myCatalog, mutateMyCatalog,
  } = usePageData();

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editItem, setEditItem] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<typeof EMPTY_ITEM>({ ...EMPTY_ITEM });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!therapist) return <div className="text-gray-500 text-center py-20">Carregando...</div>;

  const catalog = myCatalog as CatalogItem[];
  const isAutonomous = !company;
  const availableCompanyTherapies = companyTherapies.filter((t) => t.companyId === therapist.companyId);

  const selectedCompanyIds = new Set(catalog.map((c) => {
    const match = availableCompanyTherapies.find((ct) => ct.name === c.name);
    return match?.id;
  }).filter(Boolean));

  const toggleCompanyTherapy = async (ct: typeof companyTherapies[0]) => {
    let next: CatalogItem[];
    if (selectedCompanyIds.has(ct.id)) {
      next = catalog.filter((c) => c.name !== ct.name);
    } else {
      const newItem: CatalogItem = {
        id: `tc_${ct.id}_${Date.now()}`,
        name: ct.name,
        duration: ct.duration,
        myPrice: ct.price,
        category: (ct as any).category ?? "Relaxamento",
        color: ct.color,
        active: true,
      };
      next = [...catalog, newItem];
    }
    setSaving(true);
    try { await mutateMyCatalog(next); } finally { setSaving(false); }
  };

  const openAdd = () => { setForm({ ...EMPTY_ITEM }); setEditItem(null); setModal("add"); };
  const openEdit = (item: CatalogItem) => {
    setForm({ name: item.name, duration: item.duration, myPrice: item.myPrice, category: item.category, color: item.color, active: item.active });
    setEditItem(item);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.myPrice <= 0 || form.duration <= 0) return;
    let next: CatalogItem[];
    if (modal === "add") {
      next = [...catalog, { ...form, id: `tc_custom_${Date.now()}` }];
    } else if (editItem) {
      next = catalog.map((c) => c.id === editItem.id ? { ...editItem, ...form } : c);
    } else return;
    setSaving(true);
    try { await mutateMyCatalog(next); setModal(null); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setSaving(true);
    try { await mutateMyCatalog(catalog.filter((c) => c.id !== id)); setDeleteConfirm(null); } finally { setSaving(false); }
  };

  const toggleActive = async (item: CatalogItem) => {
    const next = catalog.map((c) => c.id === item.id ? { ...c, active: !c.active } : c);
    setSaving(true);
    try { await mutateMyCatalog(next); } finally { setSaving(false); }
  };

  const earnings = (price: number) => isAutonomous ? price : price * (therapist.commission / 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Minhas Terapias</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isAutonomous ? "Gerencie seus serviços e defina seus preços" : `Selecione as terapias que você oferece em ${company?.name}`}
          </p>
        </div>
        {isAutonomous && (
          <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-700 transition-colors" style={{ fontWeight: 600 }}>
            <Plus className="w-4 h-4" /> ADICIONAR
          </button>
        )}
      </div>

      {/* Status banner */}
      {company ? (
        <div className="rounded-xl p-5 border" style={{ background: `${company.color}08`, borderColor: `${company.color}22` }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: company.color, fontWeight: 700, fontSize: "0.8rem" }}>{company.logo}</div>
            <div>
              <p className="text-sm" style={{ color: company.color, fontWeight: 700 }}>Vinculado: {company.name}</p>
              <p className="text-gray-500 text-xs leading-relaxed mt-1">
                Preços definidos pela empresa. Sua comissão é de <span className="text-emerald-600" style={{ fontWeight: 700 }}>{therapist.commission}%</span> por sessão.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl p-5 border border-violet-100 bg-violet-50">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shrink-0"><Sparkles className="w-5 h-5 text-white" /></div>
            <div>
              <p className="text-violet-700 text-sm" style={{ fontWeight: 700 }}>Modo autônomo</p>
              <p className="text-violet-600 text-xs mt-0.5">Você define seus preços e recebe 100% de cada sessão.</p>
            </div>
          </div>
        </div>
      )}

      {/* Company therapies picker */}
      {company && availableCompanyTherapies.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="text-gray-900">Terapias disponíveis na empresa</h3>
            <p className="text-gray-400 text-xs mt-0.5">{selectedCompanyIds.size} de {availableCompanyTherapies.length} selecionadas</p>
          </div>
          <div className="divide-y divide-gray-50">
            {availableCompanyTherapies.map((ct) => {
              const selected = selectedCompanyIds.has(ct.id);
              const myEarning = ct.price * (therapist.commission / 100);
              return (
                <button key={ct.id} onClick={() => toggleCompanyTherapy(ct)} className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-all hover:bg-gray-50 ${selected ? "" : "opacity-60"}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "border-emerald-500 bg-emerald-500" : "border-gray-300"}`}>
                    {selected && <CheckCircle className="w-3 h-3 text-white" />}
                  </div>
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ background: ct.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{ct.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ct.duration} min · {(ct as any).category}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-400 line-through">R$ {ct.price.toFixed(0)}</p>
                    <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>→ R$ {myEarning.toFixed(0)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Catalog */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <div>
            <h3 className="text-gray-900">{isAutonomous ? "Seu catálogo" : "Terapias que você oferece"}</h3>
            <p className="text-gray-400 text-xs mt-0.5">{catalog.filter((c) => c.active).length} terapias ativas</p>
          </div>
          {isAutonomous && (
            <button onClick={openAdd} className="flex items-center gap-1.5 text-violet-500 text-sm hover:text-violet-600" style={{ fontWeight: 600 }}>
              <Plus className="w-4 h-4" /> ADICIONAR
            </button>
          )}
        </div>
        {catalog.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <Sparkles className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm">Nenhuma terapia cadastrada</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {catalog.map((item) => (
              <div key={item.id} className={`flex items-center gap-4 px-6 py-4 ${!item.active ? "opacity-50" : ""}`}>
                <div className="w-1 h-12 rounded-full shrink-0" style={{ background: item.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{item.name}</p>
                    {!item.active && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inativa</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3 h-3" /> {item.duration} min</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${item.color}18`, color: item.color, fontWeight: 600 }}>{item.category}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {isAutonomous ? (
                    <>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>R$ {item.myPrice.toFixed(0)}</p>
                      <p className="text-xs text-emerald-600">100% seu</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-400 line-through">R$ {item.myPrice.toFixed(0)}</p>
                      <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>R$ {earnings(item.myPrice).toFixed(0)}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(item)} className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.active ? "bg-emerald-50 text-emerald-500" : "bg-gray-100 text-gray-400"}`}>
                    <BadgeCheck className="w-4 h-4" />
                  </button>
                  {isAutonomous && <>
                    <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center hover:bg-blue-100">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteConfirm(item.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>{modal === "add" ? "Nova terapia" : "Editar terapia"}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Nome *</label>
                <input className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder="Massagem Relaxante" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Valor (R$) *</label>
                  <input type="number" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder="150" value={form.myPrice || ""} onChange={(e) => setForm((p) => ({ ...p, myPrice: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Duração (min) *</label>
                  <input type="number" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" placeholder="60" value={form.duration || ""} onChange={(e) => setForm((p) => ({ ...p, duration: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Categoria</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => setForm((p) => ({ ...p, color: c }))} className="w-7 h-7 rounded-full transition-all" style={{ background: c, outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
              <button onClick={handleSave} disabled={!form.name.trim() || form.myPrice <= 0} className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ fontWeight: 600 }}>
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <p className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>Remover terapia?</p>
            <p className="text-gray-500 text-sm mb-5">Essa ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm" style={{ fontWeight: 600 }}>Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}