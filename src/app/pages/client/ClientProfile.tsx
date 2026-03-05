import { Edit, Star, Calendar, DollarSign, Heart, Bell, LogOut } from "lucide-react";
import { clients, therapists, companies } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router";

export default function ClientProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const company = companies.find((c) => c.id === user?.companyId);
  const primaryColor = company?.color || "#7C3AED";
  const client = clients.find((c) => c.id === user?.clientId);
  const favoriteTherapist = therapists.find((t) => t.id === client?.preferredTherapist);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="p-5 pb-8 space-y-5">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center">
        <div className="relative inline-block mb-4">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-2xl object-cover border-4" style={{ borderColor: `${primaryColor}30` }} />
          ) : (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl mx-auto" style={{ background: primaryColor, fontWeight: 700 }}>
              {user?.name?.charAt(0)}
            </div>
          )}
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full text-white flex items-center justify-center" style={{ background: primaryColor }}>
            <Edit className="w-3 h-3" />
          </button>
        </div>
        <h2 className="text-gray-900 text-xl">{user?.name}</h2>
        <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>
        <p className="text-xs text-gray-400 mt-1">Cliente de {company?.name}</p>

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
              <p className="text-xl text-gray-900" style={{ fontWeight: 700 }}>
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 inline" /> 4.9
              </p>
              <p className="text-xs text-gray-400">Avaliação</p>
            </div>
          </div>
        )}
      </div>

      {/* Favorite therapist */}
      {favoriteTherapist && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-3" style={{ fontWeight: 600 }}>TERAPEUTA FAVORITO</p>
          <div className="flex items-center gap-3">
            <img src={favoriteTherapist.avatar} alt={favoriteTherapist.name} className="w-12 h-12 rounded-xl object-cover" />
            <div className="flex-1">
              <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{favoriteTherapist.name}</p>
              <p className="text-xs text-gray-500">{favoriteTherapist.specialty}</p>
              <div className="flex items-center gap-0.5 mt-0.5">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-gray-600">{favoriteTherapist.rating}</span>
              </div>
            </div>
            <Heart className="w-5 h-5" style={{ color: primaryColor, fill: primaryColor }} />
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {[
          { icon: Calendar, label: "Meus Agendamentos", sub: "Ver histórico completo" },
          { icon: Bell, label: "Notificações", sub: "Lembretes de sessões" },
          { icon: Star, label: "Minhas Avaliações", sub: "Sessões avaliadas" },
          { icon: DollarSign, label: "Histórico de Pagamentos", sub: "Extrato financeiro" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${primaryColor}15` }}>
              <item.icon className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{item.label}</p>
              <p className="text-xs text-gray-400">{item.sub}</p>
            </div>
            <span className="text-gray-300">›</span>
          </div>
        ))}
      </div>

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
