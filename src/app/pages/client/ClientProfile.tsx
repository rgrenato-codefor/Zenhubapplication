import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Star, Edit2, Calendar, Bell, DollarSign, LogOut, Heart, User,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";

export default function ClientProfile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { company, myClient: client, appointments: allAppointments, therapists, mutateMyClientProfile } = usePageData();
  const primaryColor = company?.color || "#7C3AED";
  const myAppointments = allAppointments.filter((a) => a.clientId === user?.clientId);
  const favoriteTherapist = therapists.find((t) => t.id === client?.preferredTherapist);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: client?.name ?? user?.name ?? "",
    phone: client?.phone ?? "",
    birthdate: client?.birthdate ?? "",
    address: client?.address ?? "",
    notes: client?.notes ?? "",
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleSave = async () => {
    await mutateMyClientProfile(form);
    setEditing(false);
  };

  return (
    <div className="p-5 pb-8 space-y-5">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
        <div className="relative inline-block mb-4">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-2xl object-cover border-4" style={{ borderColor: `${primaryColor}30` }} />
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto" style={{ background: primaryColor, fontWeight: 700 }}>
              {user?.name?.charAt(0) ?? <User className="w-8 h-8" />}
            </div>
          )}
          <button
            onClick={() => setEditing(!editing)}
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full text-white flex items-center justify-center shadow-md"
            style={{ background: primaryColor }}
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>

        {editing ? (
          <input
            className="text-center border-b border-gray-200 w-full text-gray-900 text-lg focus:outline-none focus:border-violet-400"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          />
        ) : (
          <h2 className="text-gray-900 text-xl">{user?.name}</h2>
        )}
        <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
        <p className="text-xs text-gray-400 mt-1">Cliente de {company?.name ?? "ZEN HUB"}</p>

        {client && (
          <div className="grid grid-cols-3 gap-3 mt-5">
            <div>
              <p className="text-xl text-gray-900" style={{ fontWeight: 700 }}>{client.totalSessions}</p>
              <p className="text-xs text-gray-400">Sessões</p>
            </div>
            <div>
              <p className="text-xl text-gray-900" style={{ fontWeight: 700 }}>
                R${(client.totalSpent / 1000).toFixed(1)}k
              </p>
              <p className="text-xs text-gray-400">Investido</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <p className="text-xl text-gray-900" style={{ fontWeight: 700 }}>4.9</p>
              </div>
              <p className="text-xs text-gray-400">Avaliação</p>
            </div>
          </div>
        )}

        {editing && (
          <button
            onClick={handleSave}
            className="mt-4 w-full py-2.5 rounded-xl text-white text-sm"
            style={{ background: primaryColor, fontWeight: 600 }}
          >
            Salvar alterações
          </button>
        )}
      </div>

      {/* Favorite therapist */}
      {favoriteTherapist && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-3" style={{ fontWeight: 600 }}>TERAPEUTA FAVORITO</p>
          <div className="flex items-center gap-3">
            {favoriteTherapist.avatar ? (
              <img src={favoriteTherapist.avatar} alt={favoriteTherapist.name} className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${primaryColor}20`, color: primaryColor }}>
                {favoriteTherapist.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{favoriteTherapist.name}</p>
              <p className="text-xs text-gray-500">{favoriteTherapist.specialty}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-gray-600">{favoriteTherapist.rating}</span>
              </div>
            </div>
            <Heart className="w-5 h-5 shrink-0" style={{ color: primaryColor, fill: primaryColor }} />
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {[
          { icon: Calendar, label: "Meus Agendamentos", sub: `${myAppointments.length} sessões` },
          { icon: Bell, label: "Notificações", sub: "Lembretes de sessões" },
          { icon: Star, label: "Minhas Avaliações", sub: "Sessões avaliadas" },
          { icon: DollarSign, label: "Histórico de Pagamentos", sub: "Extrato financeiro" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${primaryColor}15` }}>
              <item.icon className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{item.label}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
            <span className="text-gray-300 text-lg">›</span>
          </div>
        ))}
      </div>

      {/* Personal data edit */}
      {editing && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
          <h3 className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Dados Pessoais</h3>
          {[
            { label: "Telefone", key: "phone" as const, placeholder: "(11) 99999-9999" },
            { label: "Data de nascimento", key: "birthdate" as const, placeholder: "DD/MM/AAAA" },
            { label: "Endereço", key: "address" as const, placeholder: "Rua, número" },
          ].map((f) => (
            <div key={f.key}>
              <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>{f.label}</label>
              <input
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 border border-red-100 rounded-2xl text-red-500 text-sm"
        style={{ fontWeight: 600 }}
      >
        <LogOut className="w-4 h-4" />
        Sair da conta
      </button>
    </div>
  );
}