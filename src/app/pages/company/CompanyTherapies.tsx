import { useState, useEffect } from "react";
import { Plus, Clock, DollarSign, BarChart3, Edit, Trash2, X, Save } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";

const CATEGORIES = ["Relaxamento", "Oriental", "Terapêutica", "Reflexologia", "Holística", "Esportiva", "Outra"];
const COLORS = ["#7C3AED", "#0D9488", "#D97706", "#DC2626", "#059669", "#3B82F6", "#EC4899"];

type TherapyForm = {
  name: string;
  description: string;
  duration: number;
  price: number;
  category: string;
  color: string;
};

const EMPTY_FORM: TherapyForm = {
  name: "", description: "", duration: 60, price: 0, category: "Relaxamento", color: "#7C3AED",
};

export default function CompanyTherapies() {
  const { user } = useAuth();
  const { company, therapies: firestoreTherapies, mutateAddTherapy, mutateUpdateTherapy, mutateDeleteTherapy } = usePageData();
  const primaryColor = company?.color || "#0D9488";

  const [therapies, setTherapies] = useState<any[]>(firestoreTherapies);
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<TherapyForm>({ ...EMPTY_FORM });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Sync with Firestore data when it loads
  useEffect(() => { setTherapies(firestoreTherapies); }, [firestoreTherapies]);

  const set = (k: keyof TherapyForm, v: string | number) => setForm((p) => ({ ...p, [k]: v }));

  const openAdd = () => { setForm({ ...EMPTY_FORM }); setEditId(null); setModal("add"); };
  const openEdit = (t: any) => {
    setForm({ name: t.name, description: t.description ?? "", duration: t.duration, price: t.price, category: t.category ?? "Relaxamento", color: t.color });
    setEditId(t.id);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim() || form.price <= 0 || form.duration <= 0) return;
    if (modal === "add") {
      const newT = await mutateAddTherapy({ ...form, companyId: user?.companyId ?? "", active: true, totalBookings: 0 });
      setTherapies((prev) => [...prev, newT]);
    } else if (editId) {
      await mutateUpdateTherapy(editId, { ...form });
      setTherapies((prev) => prev.map((t) => t.id === editId ? { ...t, ...form } : t));
    }
    setModal(null);
  };

  const handleDelete = async (id: string) => {
    await mutateDeleteTherapy(id);
    setTherapies((prev) => prev.filter((t) => t.id !== id));
    setDeleteConfirm(null);
  };

  const toggleActive = async (t: any) => {
    await mutateUpdateTherapy(t.id, { active: !t.active });
    setTherapies((prev) => prev.map((x) => x.id === t.id ? { ...x, active: !x.active } : x));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Terapias & Serviços</h1>
          <p className="text-gray-500 text-sm mt-0.5">{therapies.filter((t) => t.active !== false).length} serviços ativos</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm" style={{ background: primaryColor, fontWeight: 600 }}>
          <Plus className="w-4 h-4" /> Nova Terapia
        </button>
      </div>

      {/* List */}
      {therapies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: `${primaryColor}15` }}>
            <BarChart3 className="w-7 h-7" style={{ color: primaryColor }} />
          </div>
          <h3 className="text-gray-900 mb-2">Nenhuma terapia cadastrada</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-xs">Cadastre as terapias que sua empresa oferece para começar a agendar sessões.</p>
          <button onClick={openAdd} className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl text-sm" style={{ background: primaryColor, fontWeight: 600 }}>
            <Plus className="w-4 h-4" /> Cadastrar primeira terapia
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {therapies.map((t) => (
            <div key={t.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${t.active === false ? "opacity-60" : ""}`} style={{ borderColor: `${t.color}20` }}>
              <div className="h-1.5" style={{ background: t.color }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-gray-900" style={{ fontWeight: 700 }}>{t.name}</p>
                    {t.category && (
                      <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1" style={{ background: `${t.color}15`, color: t.color, fontWeight: 600 }}>
                        {t.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(t)} className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors">
                      <Edit className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button onClick={() => setDeleteConfirm(t.id)} className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
                {t.description && <p className="text-gray-400 text-xs mb-3 line-clamp-2">{t.description}</p>}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">{t.duration} min</span>
                    </div>
                    {t.totalBookings > 0 && (
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-500">{t.totalBookings}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-gray-900" style={{ color: t.color, fontWeight: 700 }}>
                      R$ {t.price.toFixed(0)}
                    </p>
                    <button
                      onClick={() => toggleActive(t)}
                      className={`w-6 h-3.5 rounded-full relative transition-colors ${t.active !== false ? "bg-emerald-500" : "bg-gray-200"}`}
                    >
                      <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${t.active !== false ? "left-3" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>{modal === "add" ? "Nova Terapia" : "Editar Terapia"}</h3>
              <button onClick={() => setModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Nome *</label>
                <input className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="Massagem Relaxante" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Descrição</label>
                <textarea rows={2} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none" placeholder="Descreva a terapia..." value={form.description} onChange={(e) => set("description", e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Duração (min) *</label>
                  <input type="number" min={15} step={5} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="60" value={form.duration || ""} onChange={(e) => set("duration", Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Valor (R$) *</label>
                  <input type="number" min={0} step={0.5} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" placeholder="150" value={form.price || ""} onChange={(e) => set("price", Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Categoria</label>
                  <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" value={form.category} onChange={(e) => set("category", e.target.value)}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button key={c} onClick={() => set("color", c)} className="w-7 h-7 rounded-full transition-all" style={{ background: c, outline: form.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
              <button onClick={handleSave} disabled={!form.name.trim() || form.price <= 0} className="flex-1 py-2.5 rounded-xl text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: primaryColor, fontWeight: 600 }}>
                <Save className="w-4 h-4" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <p className="text-gray-900 mb-1" style={{ fontWeight: 700 }}>Remover terapia?</p>
            <p className="text-gray-500 text-sm mb-5">Esta ação não pode ser desfeita.</p>
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
