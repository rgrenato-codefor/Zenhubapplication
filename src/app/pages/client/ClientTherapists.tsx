import { useState, useMemo } from "react";
import { Star, Search, UserPlus, UserMinus, Users, Calendar } from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useFeed } from "../../context/FeedContext";
import { useNavigate } from "react-router";

export default function ClientTherapists() {
  const { user } = useAuth();
  const { company, therapists, therapies } = usePageData();
  const { feedPosts, followedTherapistIds, toggleFollow } = useFeed();
  const navigate = useNavigate();
  const primaryColor = company?.color || "#7C3AED";

  const [tab, setTab] = useState<"todos" | "seguindo">("todos");
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

  // ── "Seguindo" list: derived from feedPosts so it works regardless of company ──
  const followedFromFeed = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string; avatar: string; specialty: string; username: string }[] = [];
    for (const post of feedPosts) {
      if (followedTherapistIds.has(post.therapistId) && !seen.has(post.therapistId)) {
        seen.add(post.therapistId);
        if (post.therapistName.toLowerCase().includes(search.toLowerCase())) {
          result.push({
            id: post.therapistId,
            name: post.therapistName,
            avatar: post.therapistAvatar,
            specialty: post.therapistSpecialty,
            username: post.therapistUsername,
          });
        }
      }
    }
    return result;
  }, [feedPosts, followedTherapistIds, search]);

  // For the "Todos" tab, also allow filtering by therapy
  const filteredCompanyTherapists = selectedTherapy
    ? companyTherapists.filter((t) => t.therapies.includes(selectedTherapy))
    : companyTherapists;

  const HOURS = [
    "08:00","09:00","10:00","11:00","12:00",
    "13:00","14:00","15:00","16:00","17:00","18:00","19:00",
  ];

  return (
    <div className="p-5 space-y-5">
      <div>
        <h1 className="text-gray-900">Profissionais</h1>
        <p className="text-gray-500 text-sm mt-0.5">Encontre e siga seus terapeutas</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {(["todos", "seguindo"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm transition-all"
            style={
              tab === t
                ? { background: "#fff", color: primaryColor, fontWeight: 600, boxShadow: "0 1px 4px rgba(0,0,0,.08)" }
                : { color: "#6B7280" }
            }
          >
            {t === "seguindo" && <Users className="w-3.5 h-3.5" />}
            {t === "todos" ? "Todos" : `Seguindo (${followedTherapistIds.size})`}
          </button>
        ))}
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

      {/* ── TAB: TODOS ─────────────────────────────────────────────────────────── */}
      {tab === "todos" && (
        <>
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

          {filteredCompanyTherapists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Nenhum terapeuta encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCompanyTherapists.map((therapist) => {
                const therapistTherapies = companyTherapies.filter((th) => therapist.therapies.includes(th.id));
                const isFollowed = followedTherapistIds.has(therapist.id);
                return (
                  <FullTherapistCard
                    key={therapist.id}
                    therapist={therapist}
                    therapistTherapies={therapistTherapies}
                    isFollowed={isFollowed}
                    primaryColor={primaryColor}
                    onToggleFollow={() => toggleFollow(therapist.id)}
                    onShowAvailability={() => setSelectedTherapist(selectedTherapist === therapist.id ? null : therapist.id)}
                    onBook={() => { setBookingTherapistId(therapist.id); setShowBookModal(true); }}
                    showAvailability={selectedTherapist === therapist.id}
                    onProfile={() => navigate(`/${therapist.username || therapist.id}`)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB: SEGUINDO ──────────────────────────────────────────────────────── */}
      {tab === "seguindo" && (
        <>
          {followedFromFeed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-12 h-12 mb-3 text-gray-200" />
              <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>
                Você ainda não segue nenhum terapeuta
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Siga terapeutas pelo feed para vê-los aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {followedFromFeed.map((ft) => {
                // Try to find full therapist data for booking
                const full = therapists.find((t) => t.id === ft.id);
                const therapistTherapies = full
                  ? companyTherapies.filter((th) => full.therapies.includes(th.id))
                  : [];
                return (
                  <div
                    key={ft.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 cursor-pointer active:scale-[.99] transition-transform"
                    onClick={() => navigate(`/${ft.username || ft.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-14 h-14 rounded-2xl p-[2px] shrink-0"
                        style={{ background: `linear-gradient(135deg, ${primaryColor}, #EC4899)` }}
                      >
                        <img
                          src={ft.avatar}
                          alt={ft.name}
                          className="w-full h-full rounded-[14px] object-cover border-2 border-white"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm truncate" style={{ fontWeight: 600 }}>{ft.name}</p>
                        <p className="text-xs truncate" style={{ color: primaryColor }}>{ft.specialty}</p>
                        {full && (
                          <div className="flex items-center gap-1 mt-1">
                            {[1,2,3,4,5].map((s) => (
                              <Star key={s} className={`w-3 h-3 ${s <= Math.floor(full.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                            ))}
                            <span className="text-xs text-gray-400 ml-1">{full.rating}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFollow(ft.id); }}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-all shrink-0"
                        style={{ borderColor: "#E5E7EB", color: "#6B7280", background: "#F9FAFB" }}
                      >
                        <UserMinus className="w-3 h-3" />
                        Seguindo
                      </button>
                    </div>

                    {/* Specialty tags if full data available */}
                    {therapistTherapies.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {therapistTherapies.map((th) => (
                          <span key={th.id} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: th.color }}>
                            {th.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Booking button if therapist is in this company */}
                    {full && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setBookingTherapistId(full.id); setShowBookModal(true); }}
                        className="mt-3 w-full py-2.5 rounded-xl text-white text-sm flex items-center justify-center gap-2"
                        style={{ background: primaryColor, fontWeight: 600 }}
                      >
                        <Calendar className="w-4 h-4" />
                        Agendar sessão
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Booking Modal */}
      {showBookModal && bookingTherapistId && (() => {
        const therapist = therapists.find((t) => t.id === bookingTherapistId)!;
        if (!therapist) return null;
        const therapistTherapies = companyTherapies.filter((th) => therapist.therapies.includes(th.id));
        return (
          <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
            <div className="bg-white rounded-t-3xl p-6 w-full max-w-lg shadow-2xl">
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
                      <div key={therapy.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
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
                  <input type="date" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>Horário</label>
                  <div className="grid grid-cols-4 gap-2">
                    {HOURS.map((h) => (
                      <button key={h} className="py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
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
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Full therapist card (used in "Todos" tab) ──────────────────────────────────

interface FullCardProps {
  therapist: any;
  therapistTherapies: any[];
  isFollowed: boolean;
  primaryColor: string;
  showAvailability: boolean;
  onToggleFollow: () => void;
  onShowAvailability: () => void;
  onBook: () => void;
  onProfile: () => void;
}

function FullTherapistCard({
  therapist, therapistTherapies, isFollowed, primaryColor,
  showAvailability, onToggleFollow, onShowAvailability, onBook, onProfile,
}: FullCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-start gap-4">
          <img
            src={therapist.avatar}
            alt={therapist.name}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-gray-100 shrink-0 cursor-pointer"
            onClick={onProfile}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 cursor-pointer" onClick={onProfile}>
                <h3 className="text-gray-900 text-base truncate">{therapist.name}</h3>
                <p className="text-sm truncate" style={{ color: primaryColor }}>{therapist.specialty}</p>
              </div>
              <button
                onClick={onToggleFollow}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full border transition-all shrink-0"
                style={
                  isFollowed
                    ? { borderColor: "#E5E7EB", color: "#6B7280", background: "#F9FAFB" }
                    : { borderColor: primaryColor, color: primaryColor, fontWeight: 600 }
                }
              >
                {isFollowed ? <><UserMinus className="w-3 h-3" /> Seguindo</> : <><UserPlus className="w-3 h-3" /> Seguir</>}
              </button>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map((s) => (
                <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.floor(therapist.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
              ))}
              <span className="text-xs text-gray-500 ml-1">{therapist.rating} ({therapist.totalSessions})</span>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-3 line-clamp-2">{therapist.bio}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {therapistTherapies.map((therapy) => (
            <span key={therapy.id} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: therapy.color }}>
              {therapy.name}
            </span>
          ))}
        </div>
      </div>
      <div className="px-5 pb-5 flex gap-3">
        <button onClick={onProfile} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          Ver perfil
        </button>
        <button onClick={onBook} className="flex-1 py-2.5 rounded-xl text-white text-sm" style={{ background: primaryColor, fontWeight: 600 }}>
          Agendar sessão
        </button>
      </div>
      {showAvailability && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50">
          <p className="text-xs text-gray-500 mb-3" style={{ fontWeight: 600 }}>Horários disponíveis esta semana:</p>
          <div className="space-y-2">
            {Object.entries(therapist.schedule).slice(0, 3).map(([day, slots]) => {
              const dayNames: Record<string, string> = { monday: "Seg", tuesday: "Ter", wednesday: "Qua", thursday: "Qui", friday: "Sex" };
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-8 shrink-0">{dayNames[day]}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {(slots as string[]).slice(0, 4).map((slot: string) => (
                      <button key={slot} onClick={onBook} className="text-xs px-2 py-1 bg-white border rounded-lg transition-colors" style={{ borderColor: `${primaryColor}80`, color: primaryColor }}>
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
}