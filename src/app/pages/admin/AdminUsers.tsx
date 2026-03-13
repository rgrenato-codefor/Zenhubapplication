import { useState, useEffect } from "react";
import React from "react";
import { Search, Plus, Shield, Building2, Star, UserCircle, Edit, Trash2, CheckCircle, AlertCircle } from "../../components/shared/icons";
import { useData } from "../../context/DataContext";
import { getAllUserProfiles, migrateEmailVerifiedField, type UserProfile } from "../../../lib/firestore";

const roleConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  super_admin: { label: "Super Admin", color: "bg-violet-100 text-violet-700", icon: Shield },
  company_admin: { label: "Admin Empresa", color: "bg-teal-100 text-teal-700", icon: Building2 },
  sales: { label: "Vendas", color: "bg-blue-100 text-blue-700", icon: UserCircle },
  therapist: { label: "Profissional", color: "bg-orange-100 text-orange-700", icon: Star },
  client: { label: "Cliente", color: "bg-pink-100 text-pink-700", icon: UserCircle },
};

export default function AdminUsers() {
  const { allAdminTherapists, allAdminClients, allAdminCompanies, loading } = useData();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [verificationFilter, setVerificationFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);

  // Load user profiles to get email verification status
  useEffect(() => {
    const loadProfilesAndMigrate = async () => {
      // Run migration first to ensure all profiles have emailVerified field
      await migrateEmailVerifiedField();
      
      // Then load all profiles
      const profiles = await getAllUserProfiles();
      console.log('[AdminUsers] User profiles loaded:', profiles);
      setUserProfiles(profiles);
    };
    
    loadProfilesAndMigrate();
  }, []);

  // Build a unified user list from real Firestore data:
  // therapists + clients (company admins aren't stored as separate users in Firestore client SDK)
  const allUsers = [
    ...allAdminTherapists.map((t) => ({
      id: t.id,
      userId: t.userId,
      name: t.name,
      email: t.email,
      role: "therapist" as const,
      companyId: t.companyId,
      status: t.status,
    })),
    ...allAdminClients.map((c) => ({
      id: c.id,
      userId: c.userId,
      name: c.name,
      email: c.email,
      role: "client" as const,
      companyId: c.companyId,
      status: c.status,
    })),
  ];

  console.log('[AdminUsers] All users:', allUsers);
  console.log('[AdminUsers] User profiles:', userProfiles);

  const filtered = allUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    
    // Find profile by userId first, then fallback to email
    const profile = u.userId 
      ? userProfiles.find((p) => p.uid === u.userId)
      : userProfiles.find((p) => p.email === u.email);
    
    // Treat undefined as false (not verified)
    const isVerified = profile?.emailVerified === true;
    const isNotVerified = !profile || profile?.emailVerified === false || profile?.emailVerified === undefined;
    
    console.log(`[AdminUsers] User ${u.name}:`, {
      userId: u.userId,
      email: u.email,
      profile,
      emailVerified: profile?.emailVerified,
      isVerified,
      isNotVerified,
      verificationFilter
    });
    
    const matchVerification =
      verificationFilter === "all" ||
      (verificationFilter === "verified" && isVerified) ||
      (verificationFilter === "unverified" && isNotVerified);
    
    console.log(`[AdminUsers] Match verification for ${u.name}:`, matchVerification);
    
    return matchSearch && matchRole && matchVerification;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white">Usuários</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {loading
              ? "Carregando..."
              : `${allAdminTherapists.length} profissionais · ${allAdminClients.length} clientes`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors"
          style={{ fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" /> Novo Usuário
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuários..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "therapist", "client"].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                roleFilter === r
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {r === "all" ? "Todos" : roleConfig[r]?.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {["all", "verified", "unverified"].map((v) => (
            <button
              key={v}
              onClick={() => setVerificationFilter(v)}
              className={`px-3 py-2 rounded-lg text-xs transition-colors ${
                verificationFilter === v
                  ? "bg-violet-600 text-white"
                  : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
              }`}
            >
              {v === "all" ? "Todos" : v === "verified" ? "Verificados" : "Não verificados"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        {filtered.length === 0 && !loading ? (
          <div className="text-center py-12 text-gray-500 text-sm">
            {search || roleFilter !== "all" || verificationFilter !== "all"
              ? "Nenhum usuário encontrado com esses filtros"
              : "Nenhum usuário cadastrado"}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left text-xs text-gray-400 px-6 py-4">Usuário</th>
                <th className="text-left text-xs text-gray-400 px-6 py-4">Perfil</th>
                <th className="text-left text-xs text-gray-400 px-6 py-4">Empresa</th>
                <th className="text-left text-xs text-gray-400 px-6 py-4">Status</th>
                <th className="text-left text-xs text-gray-400 px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.map((u) => {
                const role = roleConfig[u.role];
                const company = allAdminCompanies.find((c) => c.id === u.companyId);
                // Find profile by userId first, then fallback to email
                const profile = u.userId 
                  ? userProfiles.find((p) => p.uid === u.userId)
                  : userProfiles.find((p) => p.email === u.email);
                return (
                  <tr key={u.id} className="hover:bg-gray-750 group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full bg-violet-600/30 flex items-center justify-center text-violet-400 text-sm"
                          style={{ fontWeight: 700 }}
                        >
                          {u.name.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm text-white">{u.name}</p>
                            {profile?.emailVerified === true ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" title="E-mail verificado" />
                            ) : profile?.emailVerified === false ? (
                              <AlertCircle className="w-3.5 h-3.5 text-amber-400" title="E-mail não verificado" />
                            ) : null}
                          </div>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${role?.color || "bg-gray-700 text-gray-300"}`}>
                          {role && <role.icon className="w-3 h-3" />}
                          {role?.label || u.role}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {company ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded flex items-center justify-center text-white text-xs"
                            style={{ background: company.color || "#7C3AED", fontWeight: 700 }}
                          >
                            {(company.logo || company.name).charAt(0)}
                          </div>
                          <span className="text-xs text-gray-300">{company.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="text-xs">{u.status === "active" ? "Ativo" : "Inativo"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 w-full max-w-md">
            <h2 className="text-white mb-6">Novo Usuário</h2>
            <div className="space-y-4">
              {[
                { label: "Nome completo", placeholder: "Nome do usuário" },
                { label: "E-mail", placeholder: "email@exemplo.com" },
                { label: "Senha temporária", placeholder: "••••••••" },
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
                <label className="block text-sm text-gray-400 mb-1">Perfil</label>
                <select className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  {Object.entries(roleConfig).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Empresa</label>
                <select className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">Nenhuma (Super Admin)</option>
                  {allAdminCompanies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition-colors">
                Cancelar
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 transition-colors" style={{ fontWeight: 600 }}>
                Criar Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}