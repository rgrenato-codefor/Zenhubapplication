import { useState } from "react";
import {
  Plus, Search, MoreVertical, Building2, Users, DollarSign,
  Edit, Trash2, Eye, CheckCircle, XCircle, Filter, TrendingUp,
} from "../../components/shared/icons";
import { useData } from "../../context/DataContext";
import type { Company } from "../../context/DataContext";
import { CompanyDetailModal } from "../../components/admin/CompanyDetailModal";
import { normalizePlanName } from "../../lib/planConfig";

export default function AdminCompanies() {
  const { allAdminCompanies, loading } = useData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [detailCompany, setDetailCompany] = useState<Company | null>(null);

  const filtered = allAdminCompanies.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      c.status === filter ||
      (c.plan || "").toLowerCase() === filter ||
      normalizePlanName(c.plan).toLowerCase() === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white">Empresas</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {loading ? "Carregando..." : `${allAdminCompanies.length} empresas cadastradas na plataforma`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresas..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          {["all", "active", "inactive", "premium", "business", "starter"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                filter === f
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {f === "all" ? "Todos" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-12 text-center">
          <Building2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {search || filter !== "all"
              ? "Nenhuma empresa encontrada com esses filtros"
              : "Nenhuma empresa cadastrada"}
          </p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((company) => (
          <div
            key={company.id}
            className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-violet-600/50 transition-colors cursor-pointer group"
            onClick={() => {
              setActiveMenu(null);
              setDetailCompany(company);
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-sm shadow-lg"
                  style={{ background: company.color || "#7C3AED", fontWeight: 700 }}
                >
                  {company.logo || company.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-white group-hover:text-violet-300 transition-colors">
                    {company.name}
                  </h3>
                  <p className="text-xs text-gray-400">{company.address || company.email}</p>
                </div>
              </div>

              {/* Context menu — stop propagation so card click doesn't fire */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setActiveMenu(activeMenu === company.id ? null : company.id)}
                  className="text-gray-400 hover:text-white p-1 rounded"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {activeMenu === company.id && (
                  <div className="absolute right-0 top-8 bg-gray-700 border border-gray-600 rounded-lg shadow-xl z-10 w-40 py-1">
                    <button
                      onClick={() => { setActiveMenu(null); setDetailCompany(company); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white"
                    >
                      <Eye className="w-3.5 h-3.5" /> Ver detalhes
                    </button>
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-gray-600 hover:text-white">
                      <Edit className="w-3.5 h-3.5" /> Editar
                    </button>
                    <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-gray-600 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" /> Excluir
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-3 h-3 text-teal-400" />
                </div>
                <p className="text-lg text-white" style={{ fontWeight: 700 }}>
                  {company.therapistsCount || 0}
                </p>
                <p className="text-xs text-gray-400">Profissionais</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Building2 className="w-3 h-3 text-blue-400" />
                </div>
                <p className="text-lg text-white" style={{ fontWeight: 700 }}>
                  {company.clientsCount || 0}
                </p>
                <p className="text-xs text-gray-400">Clientes</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                </div>
                <p className="text-sm text-white" style={{ fontWeight: 700 }}>
                  R${((company.monthRevenue || 0) / 1000).toFixed(1)}k
                </p>
                <p className="text-xs text-gray-400">Este mês</p>
              </div>
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    normalizePlanName(company.plan) === "Premium"
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : normalizePlanName(company.plan) === "Business"
                      ? "bg-violet-100 text-violet-700 border-violet-200"
                      : normalizePlanName(company.plan) === "Starter"
                      ? "bg-blue-100 text-blue-700 border-blue-200"
                      : "bg-gray-700 text-gray-400 border-gray-600"
                  }`}
                >
                  {normalizePlanName(company.plan) || "—"}
                </span>
                {company.status === "active" ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-3 h-3" />
                    <span className="text-xs">Ativa</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-3 h-3" />
                    <span className="text-xs">Inativa</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-amber-400">
                <DollarSign className="w-3.5 h-3.5" />
                <span className="text-xs" style={{ fontWeight: 600 }}>
                  R$ {(company.totalRevenue || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  Código:{" "}
                  <span className="text-violet-400 font-mono">{company.inviteCode || "—"}</span>
                </span>
                <span>
                  {company.createdAt
                    ? `Desde ${new Date(
                        (company.createdAt as any).seconds
                          ? (company.createdAt as any).seconds * 1000
                          : (company.createdAt as any)
                      ).toLocaleDateString("pt-BR")}`
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Nova Empresa */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
            <h2 className="text-white mb-6">Nova Empresa</h2>
            <div className="space-y-4">
              {[
                { label: "Nome da Empresa", placeholder: "Ex: Espaço Zen Massagens" },
                { label: "E-mail", placeholder: "contato@empresa.com" },
                { label: "Telefone", placeholder: "(11) 99999-9999" },
                { label: "Endereço", placeholder: "Rua, Número - Cidade, UF" },
              ].map((field) => (
                <div key={field.label}>
                  <label className="block text-sm text-gray-400 mb-1">{field.label}</label>
                  <input
                    placeholder={field.placeholder}
                    className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Plano</label>
                <select className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option>Starter</option>
                  <option>Business</option>
                  <option>Premium</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors"
                style={{ fontWeight: 600 }}
              >
                Criar Empresa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Detail Drawer */}
      <CompanyDetailModal
        company={detailCompany}
        onClose={() => setDetailCompany(null)}
      />
    </div>
  );
}
