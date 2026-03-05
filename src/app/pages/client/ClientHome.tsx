import { useNavigate } from "react-router";
import { Star, ArrowRight, Clock, Sparkles, CalendarDays } from "lucide-react";
import { therapists, therapies, appointments, clients, companies } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

export default function ClientHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const company = companies.find((c) => c.id === user?.companyId);
  const primaryColor = company?.color || "#7C3AED";
  const client = clients.find((c) => c.id === user?.clientId);
  const myAppointments = appointments.filter((a) => a.clientId === user?.clientId);
  const upcomingAppointments = myAppointments.filter(
    (a) => a.status === "confirmed" && a.date >= "2026-03-04"
  );
  const companyTherapists = therapists.filter((t) => t.companyId === user?.companyId);
  const companyTherapies = therapies.filter((t) => t.companyId === user?.companyId);

  const favoriteTherapist = therapists.find((t) => t.id === client?.preferredTherapist);

  return (
    <div className="pb-4">
      {/* Hero */}
      <div
        className="px-5 pt-6 pb-8 text-white"
        style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}CC)` }}
      >
        <p className="text-white/80 text-sm">Bem-vinda,</p>
        <h1 className="text-white text-2xl mt-0.5" style={{ fontWeight: 700 }}>
          {user?.name?.split(" ")[0]}! ✨
        </h1>
        <p className="text-white/70 text-sm mt-1">{company?.name}</p>

        {upcomingAppointments.length > 0 && (
          <div className="mt-4 bg-white/15 backdrop-blur rounded-2xl p-4">
            {(() => {
              const apt = upcomingAppointments[0];
              const therapist = therapists.find((t) => t.id === apt.therapistId);
              const therapy = therapies.find((t) => t.id === apt.therapyId);
              return (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/80 text-xs">Próxima sessão</p>
                    <p className="text-white text-sm" style={{ fontWeight: 700 }}>
                      {therapy?.name} com {therapist?.name.split(" ")[0]}
                    </p>
                    <p className="text-white/70 text-xs">
                      {new Date(apt.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })} às {apt.time}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/70" />
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="px-5 -mt-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/cliente/terapeutas")}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: primaryColor }}>
              <Star className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>Agendar</p>
              <p className="text-xs text-gray-400">Escolha um terapeuta</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/cliente/reservas")}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3 hover:shadow-md transition-shadow"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-purple-600" />
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>Histórico</p>
              <p className="text-xs text-gray-400">{myAppointments.length} sessões</p>
            </div>
          </button>
        </div>
      </div>

      {/* Therapies */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-900">Nossas Terapias</h3>
          <button className="text-xs" style={{ color: primaryColor }}>Ver todas</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5">
          {companyTherapies.map((therapy) => (
            <div
              key={therapy.id}
              className="flex-shrink-0 w-36 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm cursor-pointer"
              onClick={() => navigate("/cliente/terapeutas")}
            >
              <div className="w-8 h-8 rounded-xl mb-3 flex items-center justify-center" style={{ background: `${therapy.color}20` }}>
                <Sparkles className="w-4 h-4" style={{ color: therapy.color }} />
              </div>
              <p className="text-xs text-gray-900 truncate" style={{ fontWeight: 700 }}>{therapy.name}</p>
              <div className="flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-400">{therapy.duration}min</p>
              </div>
              <p className="text-sm text-emerald-600 mt-1.5" style={{ fontWeight: 700 }}>R$ {therapy.price}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Favorite Therapist */}
      {favoriteTherapist && (
        <div className="px-5 mt-6">
          <h3 className="text-gray-900 mb-3">Seu Terapeuta Favorito</h3>
          <div
            className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/cliente/terapeutas")}
          >
            <img
              src={favoriteTherapist.avatar}
              alt={favoriteTherapist.name}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-gray-100"
            />
            <div className="flex-1 min-w-0">
              <p className="text-gray-900" style={{ fontWeight: 700 }}>{favoriteTherapist.name}</p>
              <p className="text-sm text-gray-500">{favoriteTherapist.specialty}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{favoriteTherapist.rating}</span>
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-xl text-white text-sm"
              style={{ background: primaryColor, fontWeight: 600 }}
            >
              Agendar
            </button>
          </div>
        </div>
      )}

      {/* All Therapists preview */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-gray-900">Nossa Equipe</h3>
          <button onClick={() => navigate("/cliente/terapeutas")} className="text-xs flex items-center gap-1" style={{ color: primaryColor }}>
            Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5">
          {companyTherapists.map((t) => (
            <div
              key={t.id}
              className="flex-shrink-0 w-28 text-center cursor-pointer"
              onClick={() => navigate("/cliente/terapeutas")}
            >
              <img src={t.avatar} alt={t.name} className="w-16 h-16 rounded-2xl object-cover mx-auto border-2 border-gray-100" />
              <p className="text-xs text-gray-900 mt-2 truncate" style={{ fontWeight: 600 }}>{t.name.split(" ")[0]}</p>
              <div className="flex items-center justify-center gap-0.5 mt-0.5">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-gray-500">{t.rating}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
