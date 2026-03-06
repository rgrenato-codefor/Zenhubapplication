import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  Star, MapPin, Clock, CheckCircle, ArrowLeft, Share2,
  Calendar, Sparkles, Award, Copy, Check, Phone, X,
  Image, ChevronLeft, ChevronRight, User, Building2,
  Send,
} from "lucide-react";
import { getTherapistByUsername, getTherapiesByCompany, getCompany } from "../../../lib/firestore";
import { therapists as mockTherapists, therapies as mockTherapies, companies as mockCompanies } from "../../data/mockData";
import { therapistStore } from "../../store/therapistStore";

const DAYS_MAP: Record<string, string> = {
  monday: "Seg", tuesday: "Ter", wednesday: "Qua",
  thursday: "Qui", friday: "Sex",
};

const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

export default function TherapistPublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [copied, setCopied] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<"form" | "success">("form");
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", therapyId: "", date: "", time: "" });
  const [therapist, setTherapist] = useState<any>(null);
  const [allTherapies, setAllTherapies] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      setLoadingProfile(true);
      // Try Firestore first
      let t = await getTherapistByUsername(username);
      if (t) {
        setTherapist(t);
        if (t.companyId) {
          const [co, ths] = await Promise.all([getCompany(t.companyId), getTherapiesByCompany(t.companyId)]);
          setCompany(co);
          setAllTherapies(ths);
        }
      } else {
        // Fall back to mockData
        const mockT = mockTherapists.find((m) => m.username === username);
        if (mockT) {
          setTherapist(mockT);
          setAllTherapies(mockTherapies.filter((th) => mockT.therapies?.includes(th.id)));
          const co = mockCompanies.find((c) => c.id === mockT.companyId);
          setCompany(co ?? null);
        }
      }
      setLoadingProfile(false);
    };
    load();
  }, [username]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!therapist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="w-8 h-8 text-gray-400" />
          </div>
          <h1 className="text-white mb-2" style={{ fontWeight: 700, fontSize: "1.5rem" }}>
            Terapeuta não encontrado
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            O perfil <span className="text-teal-400">@{username}</span> não existe ou foi removido.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-500 text-white text-sm" style={{ fontWeight: 600 }}>
            <ArrowLeft className="w-4 h-4" /> Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  // Use store association to get real-time company link
  const assoc = therapistStore.getAssociation(therapist.id);
  const isAutonomous = !company;
  const commissionPct = assoc.commission;

  // Catalog from store (therapist's own catalog)
  const catalog = therapistStore.getCatalog(therapist.id);
  // Availability from store
  const availability = therapistStore.getAvailability(therapist.id, therapist.schedule);

  // Therapies to display: if linked to company → company therapies with company prices
  //                       if autonomous → therapist's catalog with own prices
  const companyTherapies = isAutonomous ? [] : allTherapies.filter((t) => t.companyId === assoc.companyId);
  const displayTherapies = isAutonomous
    ? catalog.filter((c) => c.active).map((c) => ({
        id: c.id, name: c.name, duration: c.duration,
        price: c.myPrice, category: c.category, color: c.color,
      }))
    : companyTherapies.map((t) => ({
        id: t.id, name: t.name, duration: t.duration,
        price: t.price, category: t.category, color: t.color,
      }));

  // Address: company if linked, therapist's own if autonomous
  const atendimentoAddress = isAutonomous
    ? (therapist as any).address ?? "Endereço a confirmar"
    : company?.address ?? "";

  const photos: string[] = (therapist as any).photos ?? [];
  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  const handleBookingSubmit = () => {
    if (!bookingForm.name || !bookingForm.phone || !bookingForm.therapyId) return;
    setBookingStep("success");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm" style={{ fontWeight: 500 }}>ZEN HUB</span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-violet-600 transition-colors"
              style={{ fontWeight: 500 }}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
              {copied ? "Copiado!" : "Compartilhar"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

        {/* ── Hero Card ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          <div className="h-28 bg-gradient-to-r from-violet-700 via-indigo-700 to-violet-800" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-14 mb-4">
              <div className="relative">
                <img
                  src={therapist.avatar}
                  alt={therapist.name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white" />
              </div>
              <button
                onClick={() => { setBookingModal(true); setBookingStep("form"); setBookingForm({ name: "", phone: "", therapyId: "", date: "", time: "" }); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white text-sm shadow-sm hover:shadow-md transition-all"
                style={{ fontWeight: 700 }}
              >
                <Calendar className="w-4 h-4" />
                Agendar sessão
              </button>
            </div>

            <div className="mb-3">
              <h1 className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.4rem" }}>{therapist.name}</h1>
              <p className="text-violet-600 text-sm" style={{ fontWeight: 600 }}>@{therapist.username}</p>
            </div>
            <p className="text-gray-600 text-sm mb-4" style={{ fontWeight: 500 }}>{therapist.specialty}</p>

            <div className="flex items-center gap-5 mb-4">
              <div className="flex items-center gap-1">
                {stars.map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.floor(therapist.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                ))}
                <span className="text-sm text-gray-700 ml-1" style={{ fontWeight: 600 }}>{therapist.rating}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <Award className="w-4 h-4" />
                <span>{therapist.totalSessions} sessões</span>
              </div>
            </div>

            {/* Company / autonomous badge */}
            {company ? (
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm"
                style={{ background: `${company.color}12`, border: `1px solid ${company.color}30` }}
              >
                <Building2 className="w-4 h-4" style={{ color: company.color }} />
                <span style={{ color: company.color, fontWeight: 600 }}>{company.name}</span>
                <span className="text-gray-400 text-xs">·</span>
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500 text-xs">{company.address.split(" - ")[1] ?? ""}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-100 text-sm">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <span className="text-violet-600" style={{ fontWeight: 600 }}>Autônomo</span>
                <span className="text-gray-400 text-xs">·</span>
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-gray-500 text-xs truncate max-w-[180px]">{atendimentoAddress.split(" - ")[0]}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── About ─────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-gray-900 mb-3" style={{ fontWeight: 700, fontSize: "1rem" }}>Sobre</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{therapist.bio}</p>
        </div>

        {/* ── Photo Album ───────────────────────────────────────────────────── */}
        {photos.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Image className="w-4 h-4 text-gray-400" />
              <h2 className="text-gray-900" style={{ fontWeight: 700, fontSize: "1rem" }}>
                Galeria ({photos.length})
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryIndex(i)}
                  className="aspect-square rounded-xl overflow-hidden hover:opacity-90 transition-opacity"
                >
                  <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Services ──────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-gray-900 mb-1" style={{ fontWeight: 700, fontSize: "1rem" }}>Serviços</h2>
          {!isAutonomous && (
            <p className="text-xs text-gray-400 mb-4">Preços definidos por {company?.name}</p>
          )}
          {displayTherapies.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhum serviço cadastrado ainda.</p>
          ) : (
            <div className="space-y-3 mt-3">
              {displayTherapies.map((therapy) => (
                <div
                  key={therapy.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-violet-100 hover:bg-violet-50/30 transition-all"
                >
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ background: therapy.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{therapy.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" /> {therapy.duration} min
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${therapy.color}18`, color: therapy.color, fontWeight: 600 }}>
                        {therapy.category}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-violet-700 text-sm" style={{ fontWeight: 700 }}>R$ {therapy.price.toFixed(0)}</p>
                    <p className="text-gray-400 text-xs">por sessão</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Address ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-violet-500" />
            <h2 className="text-gray-900" style={{ fontWeight: 700, fontSize: "1rem" }}>Endereço de atendimento</h2>
          </div>
          {company ? (
            <div className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs shrink-0"
                style={{ background: company.color, fontWeight: 700 }}
              >
                {company.logo}
              </div>
              <div>
                <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{company.name}</p>
                <p className="text-sm text-gray-600 mt-0.5">{company.address}</p>
                <p className="text-xs text-gray-400 mt-1">Atendimentos realizados nas instalações da empresa</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>Atendimento autônomo</p>
                <p className="text-sm text-gray-600 mt-0.5">{atendimentoAddress}</p>
                <p className="text-xs text-gray-400 mt-1">Endereço sujeito a confirmação no agendamento</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Availability ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-gray-900 mb-4" style={{ fontWeight: 700, fontSize: "1rem" }}>Disponibilidade</h2>
          <div className="grid grid-cols-5 gap-2">
            {Object.entries(availability).map(([day, slots]) => (
              <div key={day} className="text-center">
                <p className="text-xs text-gray-400 mb-2" style={{ fontWeight: 600 }}>{DAYS_MAP[day]}</p>
                <div className="space-y-1">
                  {(slots as string[]).slice(0, 3).map((slot) => (
                    <div key={slot} className="text-xs py-1 px-1 rounded-lg bg-violet-50 text-violet-600 border border-violet-100" style={{ fontWeight: 500 }}>
                      {slot}
                    </div>
                  ))}
                  {(slots as string[]).length > 3 && (
                    <div className="text-xs text-gray-400 text-center">+{(slots as string[]).length - 3}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CTA ───────────────────────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-violet-700 to-indigo-800 rounded-2xl p-6 text-center shadow-md">
          <CheckCircle className="w-10 h-10 text-white/80 mx-auto mb-3" />
          <h3 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.1rem" }}>
            Pronto para se cuidar?
          </h3>
          <p className="text-white/70 text-sm mb-4">
            Agende uma sessão com {therapist.name.split(" ")[0]} agora mesmo.
          </p>
          <button
            onClick={() => { setBookingModal(true); setBookingStep("form"); }}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-violet-700 text-sm hover:bg-violet-50 transition-all"
            style={{ fontWeight: 700 }}
          >
            <Calendar className="w-4 h-4" />
            Agendar sessão
          </button>
        </div>

        {/* ── Share link ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 mb-0.5" style={{ fontWeight: 500 }}>Link do perfil</p>
            <p className="text-sm text-gray-600 truncate">zenhub.com.br/{therapist.username}</p>
          </div>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm transition-all shrink-0"
            style={{ fontWeight: 600 }}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>

        <p className="text-center text-gray-400 text-xs pb-4">
          Powered by <span className="text-violet-600" style={{ fontWeight: 600 }}>ZEN HUB</span>
        </p>
      </div>

      {/* ── Gallery lightbox ─────────────────────────────────────────────────── */}
      {galleryIndex !== null && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setGalleryIndex(null)}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white">
            <X className="w-6 h-6" />
          </button>
          <button
            className="absolute left-4 text-white/80 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setGalleryIndex((galleryIndex - 1 + photos.length) % photos.length); }}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <img
            src={photos[galleryIndex]}
            alt={`Foto ${galleryIndex + 1}`}
            className="max-w-full max-h-[85vh] rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-4 text-white/80 hover:text-white"
            onClick={(e) => { e.stopPropagation(); setGalleryIndex((galleryIndex + 1) % photos.length); }}
          >
            <ChevronRight className="w-8 h-8" />
          </button>
          <p className="absolute bottom-4 text-white/50 text-sm">{galleryIndex + 1} / {photos.length}</p>
        </div>
      )}

      {/* ── Booking Modal ─────────────────────────────────────────────────── */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {bookingStep === "form" ? (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <img src={therapist.avatar} alt={therapist.name} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Agendar com {therapist.name.split(" ")[0]}</p>
                      {company ? (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {company.name}
                        </p>
                      ) : (
                        <p className="text-xs text-violet-500 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Atendimento autônomo
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setBookingModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-5 space-y-4">
                  {/* Address info */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>Local de atendimento</p>
                      <p className="text-xs text-gray-700">{atendimentoAddress}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Seu nome *</label>
                      <input
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="Nome completo"
                        value={bookingForm.name}
                        onChange={(e) => setBookingForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Telefone *</label>
                      <input
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        placeholder="(11) 99999-9999"
                        value={bookingForm.phone}
                        onChange={(e) => setBookingForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Terapia *</label>
                    <select
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      value={bookingForm.therapyId}
                      onChange={(e) => setBookingForm((p) => ({ ...p, therapyId: e.target.value }))}
                    >
                      <option value="">Selecione uma terapia</option>
                      {displayTherapies.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.duration}min · R$ {t.price.toFixed(0)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Data</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm((p) => ({ ...p, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Horário</label>
                      <select
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                        value={bookingForm.time}
                        onChange={(e) => setBookingForm((p) => ({ ...p, time: e.target.value }))}
                      >
                        <option value="">Selecione</option>
                        {Object.values(availability).flat().filter((v, i, a) => a.indexOf(v) === i).sort().map((slot) => (
                          <option key={slot} value={slot}>{slot}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isAutonomous && (
                    <div className="p-3 bg-violet-50 border border-violet-100 rounded-xl">
                      <p className="text-violet-700 text-xs" style={{ fontWeight: 600 }}>💡 Terapeuta autônomo</p>
                      <p className="text-violet-600 text-xs mt-0.5">
                        O terapeuta entrará em contato para confirmar local e pagamento.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                  <button onClick={() => setBookingModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm">
                    Cancelar
                  </button>
                  <button
                    onClick={handleBookingSubmit}
                    disabled={!bookingForm.name || !bookingForm.phone || !bookingForm.therapyId}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ fontWeight: 700 }}
                  >
                    <Send className="w-4 h-4" /> Solicitar agendamento
                  </button>
                </div>
              </>
            ) : (
              <div className="px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-gray-900 text-base mb-2" style={{ fontWeight: 700 }}>Solicitação enviada!</h3>
                <p className="text-gray-500 text-sm mb-1">
                  {therapist.name.split(" ")[0]} receberá sua solicitação e entrará em contato pelo número <strong>{bookingForm.phone}</strong>.
                </p>
                <p className="text-gray-400 text-xs mb-6">
                  {company
                    ? `Atendimento em: ${company.name} · ${company.address}`
                    : `Atendimento em: ${atendimentoAddress}`}
                </p>
                <button
                  onClick={() => setBookingModal(false)}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 text-white text-sm"
                  style={{ fontWeight: 600 }}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}