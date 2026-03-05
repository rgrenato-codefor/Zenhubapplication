import { useState } from "react";
import { Plus, Clock, DollarSign, BarChart3, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { therapies as allTherapies, companies } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

export default function CompanyTherapies() {
  const { user } = useAuth();
  const company = companies.find((c) => c.id === user?.companyId);
  const primaryColor = company?.color || "#0D9488";
  const [showModal, setShowModal] = useState(false);
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>(
    Object.fromEntries(allTherapies.filter((t) => t.companyId === user?.companyId).map((t) => [t.id, t.active]))
  );

  const companyTherapies = allTherapies.filter((t) => t.companyId === user?.companyId);

  const toggleActive = (id: string) => {
    setActiveStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Terapias & Serviços</h1>
          <p className="text-gray-500 text-sm mt-0.5">{companyTherapies.length} serviços cadastrados</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm"
          style={{ background: primaryColor, fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" /> Nova Terapia
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
          <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>{companyTherapies.length}</p>
          <p className="text-sm text-gray-500">Total de Serviços</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
          <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
            R$ {Math.round(companyTherapies.reduce((acc, t) => acc + t.price, 0) / companyTherapies.length)}
          </p>
          <p className="text-sm text-gray-500">Ticket Médio</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center shadow-sm">
          <p className="text-2xl text-gray-900" style={{ fontWeight: 700 }}>
            {companyTherapies.reduce((acc, t) => acc + t.totalBookings, 0)}
          </p>
          <p className="text-sm text-gray-500">Total de Sessões</p>
        </div>
      </div>

      {/* Therapies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {companyTherapies.map((therapy) => {
          const isActive = activeStates[therapy.id] ?? therapy.active;
          return (
            <div
              key={therapy.id}
              className={`bg-white rounded-xl border shadow-sm transition-all ${
                isActive ? "border-gray-100" : "border-gray-100 opacity-60"
              }`}
            >
              {/* Top color bar */}
              <div className="h-1.5 rounded-t-xl" style={{ background: therapy.color }} />

              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-gray-900">{therapy.name}</h3>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white mt-1 inline-block"
                      style={{ background: therapy.color }}
                    >
                      {therapy.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleActive(therapy.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {isActive
                        ? <ToggleRight className="w-5 h-5" style={{ color: primaryColor }} />
                        : <ToggleLeft className="w-5 h-5" />
                      }
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{therapy.description}</p>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="flex flex-col items-center bg-gray-50 rounded-lg p-2">
                    <Clock className="w-3.5 h-3.5 text-gray-400 mb-1" />
                    <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{therapy.duration}min</p>
                  </div>
                  <div className="flex flex-col items-center bg-gray-50 rounded-lg p-2">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500 mb-1" />
                    <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>R$ {therapy.price}</p>
                  </div>
                  <div className="flex flex-col items-center bg-gray-50 rounded-lg p-2">
                    <BarChart3 className="w-3.5 h-3.5 text-blue-500 mb-1" />
                    <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{therapy.totalBookings}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors">
                    <Edit className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-red-100 text-red-500 text-xs hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-gray-900 mb-6">Nova Terapia</h2>
            <div className="space-y-4">
              {[
                { label: "Nome da terapia", placeholder: "Ex: Massagem Relaxante" },
                { label: "Descrição", placeholder: "Descrição breve da terapia" },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>{f.label}</label>
                  <input placeholder={f.placeholder} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Duração (min)</label>
                  <input type="number" defaultValue={60} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Preço (R$)</label>
                  <input type="number" defaultValue={150} className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1" style={{ fontWeight: 600 }}>Categoria</label>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500">
                  {["Relaxamento", "Terapêutica", "Oriental", "Holística", "Reflexologia"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-white rounded-lg text-sm" style={{ background: primaryColor, fontWeight: 600 }}>Criar Terapia</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
