import { useState } from "react";
import { Star, Clock, Search, ChevronRight, Calendar, Sparkles } from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";

export default function ClientTherapists() {
  const { user } = useAuth();
  const { company, therapists, therapies } = usePageData();
  const primaryColor = company?.color || "#7C3AED";

  const [search, setSearch] = useState("");
  const [selectedTherapy, setSelectedTherapy] = useState<string | null>(null);
  const [selectedTherapist, setSelectedTherapist] = useState<string | null>(null);
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookingTherapistId, setBookingTherapistId] = useState<string | null>(null);

  const companyTherapists = therapists.filter(
    (t) => t.companyId === user?.companyId &&
      t.name.toLowerCase().includes(search.toLowerCase())
  );
  const companyTherapies = therapies.filter((t) => t.companyId === user?.companyId);

  const filteredTherapists = selectedTherapy
    ? companyTherapists.filter((t) => t.therapies.includes(selectedTherapy))
    : companyTherapists;

  const selectedTherapistData = therapists.find((t) => t.id === selectedTherapist);

  const HOURS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

  return (
    <div className="p-5 space-y-6">
      <div>
        <h1 className="text-gray-900">Nossos Terapeutas</h1>
        <p className="text-gray-500 text-sm mt-0.5">Escolha seu terapeuta ideal</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou especialidade..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
          style={{ ["--tw-ring-color" as string]: primaryColor }}
        />
      </div>

      {/* Therapy filter chips */}
      <div>
        <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>Filtrar por terapia:</p>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedTherapy(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !selectedTherapy ? "text-white border-transparent" : "bg-gray-100 text-gray-600 border-transparent"
            }`}
            style={!selectedTherapy ? { background: primaryColor } : {}}
          >
            Todos
          </button>
          {companyTherapies.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTherapy(selectedTherapy === t.id ? null : t.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedTherapy === t.id ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200"
              }`}
              style={selectedTherapy === t.id ? { background: t.color } : {}}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Therapists list */}
      <div className="space-y-4">
        {filteredTherapists.map((therapist) => {
          const therapistTherapies = companyTherapies.filter((th) => therapist.therapies.includes(th.id));
          return (
            <div
              key={therapist.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <img
                    src={therapist.avatar}
                    alt={therapist.name}
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 text-base">{therapist.name}</h3>
                    <p className="text-sm" style={{ color: primaryColor }}>{therapist.specialty}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-3.5 h-3.5 ${s <= Math.floor(therapist.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                        />
                      ))}
                      <span className="text-xs text-gray-500 ml-1">{therapist.rating} ({therapist.totalSessions})</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500 mt-3 line-clamp-2">{therapist.bio}</p>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {therapistTherapies.map((therapy) => (
                    <span
                      key={therapy.id}
                      className="text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ background: therapy.color }}
                    >
                      {therapy.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={() => setSelectedTherapist(selectedTherapist === therapist.id ? null : therapist.id)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Ver disponibilidade
                </button>
                <button
                  onClick={() => { setBookingTherapistId(therapist.id); setShowBookModal(true); }}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm"
                  style={{ background: primaryColor, fontWeight: 600 }}
                >
                  Agendar sessão
                </button>
              </div>

              {/* Availability */}
              {selectedTherapist === therapist.id && (
                <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
                  <p className="text-xs text-gray-500 mb-3" style={{ fontWeight: 600 }}>Horários disponíveis esta semana:</p>
                  <div className="space-y-2">
                    {Object.entries(therapist.schedule).slice(0, 3).map(([day, slots]) => {
                      const dayNames: Record<string, string> = { monday: "Seg 04/03", tuesday: "Ter 05/03", wednesday: "Qua 06/03", thursday: "Qui 07/03", friday: "Sex 08/03" };
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-20 shrink-0">{dayNames[day]}</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {(slots as string[]).slice(0, 4).map((slot: string) => (
                              <button
                                key={slot}
                                onClick={() => { setBookingTherapistId(therapist.id); setShowBookModal(true); }}
                                className="text-xs px-2 py-1 bg-white border rounded-lg hover:border-opacity-100 transition-colors"
                                style={{ borderColor: `${primaryColor}80`, color: primaryColor }}
                              >
                                {slot}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Booking Modal */}
      {showBookModal && bookingTherapistId && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-0">
          <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg shadow-2xl animate-in slide-in-from-bottom">
            {(() => {
              const therapist = therapists.find((t) => t.id === bookingTherapistId)!;
              const therapistTherapies = companyTherapies.filter((th) => therapist.therapies.includes(th.id));
              return (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <img src={therapist.avatar} alt={therapist.name} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <h3 className="text-gray-900">{therapist.name}</h3>
                      <p className="text-xs text-gray-500">{therapist.specialty}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Escolha a terapia</label>
                      <div className="space-y-2">
                        {therapistTherapies.map((therapy) => (
                          <div key={therapy.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:border-opacity-80 transition-colors">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ background: therapy.color }} />
                              <span className="text-sm text-gray-700">{therapy.name}</span>
                              <span className="text-xs text-gray-400">{therapy.duration}min</span>
                            </div>
                            <span className="text-sm text-gray-900" style={{ fontWeight: 700 }}>R$ {therapy.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Data</label>
                      <input type="date" defaultValue="2026-03-10" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Horário</label>
                      <div className="grid grid-cols-3 gap-2">
                        {HOURS.map((h) => (
                          <button key={h} className="py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:border-opacity-100 transition-colors" style={{ ["--tw-border-opacity" as string]: "1" }}>
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button onClick={() => setShowBookModal(false)} className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 text-sm">
                      Cancelar
                    </button>
                    <button onClick={() => setShowBookModal(false)} className="flex-1 py-3 rounded-xl text-white text-sm" style={{ background: primaryColor, fontWeight: 600 }}>
                      Confirmar Agendamento
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}