import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import {
  Star, MapPin, Clock, CheckCircle, ArrowLeft, Share2,
  Calendar, Sparkles, Award, Copy, Check, X,
  ChevronLeft, ChevronRight, User, Building2, Grid,
  ListBullet, InformationCircle, Send,
} from "../../components/shared/icons";
import { getTherapistByUsername, getTherapiesByCompany, getCompany, getCatalogByTherapist } from "../../../lib/firestore";
import { therapists as mockTherapists, therapies as mockTherapies, companies as mockCompanies } from "../../data/mockData";
import { therapistStore } from "../../store/therapistStore";
import { ZenHubLogo } from "../../components/shared/ZenHubLogo";

const DAYS_MAP: Record<string, string> = {
  monday: "Seg", tuesday: "Ter", wednesday: "Qua",
  thursday: "Qui", friday: "Sex",
};

type Tab = "fotos" | "servicos" | "sobre";

export default function TherapistPublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [copied, setCopied] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("fotos");
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<"form" | "success">("form");
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", therapyId: "", date: "", time: "" });
  const [therapist, setTherapist] = useState<any>(null);
  const [allTherapies, setAllTherapies] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [firestoreCatalog, setFirestoreCatalog] = useState<any[]>([]);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      setLoadingProfile(true);
      let t = await getTherapistByUsername(username);
      if (t) {
        setTherapist(t);
        const catalogItems = await getCatalogByTherapist(t.id);
        setFirestoreCatalog(catalogItems);
        if (t.companyId) {
          const [co, ths] = await Promise.all([
            getCompany(t.companyId),
            getTherapiesByCompany(t.companyId),
          ]);
          setCompany(co);
          const catalogActiveNames = new Set(
            catalogItems
              .filter((c: any) => c.active !== false)
              .map((c: any) => c.name.trim().toLowerCase())
          );
          if (catalogActiveNames.size > 0) {
            setAllTherapies(ths.filter((th) => catalogActiveNames.has(th.name.trim().toLowerCase())));
          } else {
            setAllTherapies([]);
          }
        }
      } else {
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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
          <p className="text-gray-400 text-sm">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!therapist) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <User className="w-7 h-7 text-gray-300" />
          </div>
          <h1 className="text-gray-900 mb-2" style={{ fontWeight: 700, fontSize: "1.25rem" }}>
            Perfil não encontrado
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            O perfil <span className="text-violet-500">@{username}</span> não existe ou foi removido.
          </p>
          <Link to="/" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm" style={{ fontWeight: 600 }}>
            <ArrowLeft className="w-4 h-4" /> Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  // ── Derived data ───────────────────────────────────────────────────────────
  const assoc = therapistStore.getAssociation(therapist.id);
  const isAutonomous = !company;
  const catalog = therapistStore.getCatalog(therapist.id);
  const availability = therapistStore.getAvailability(therapist.id, therapist.schedule);
  const companyTherapies = isAutonomous ? [] : allTherapies.filter((t) => t.companyId === assoc.companyId);
  const autonomousCatalogSource = firestoreCatalog.length > 0 ? firestoreCatalog : catalog;

  const displayTherapies = isAutonomous
    ? autonomousCatalogSource
        .filter((c: any) => c.active !== false)
        .map((c: any) => ({ id: c.id, name: c.name, duration: c.duration, price: c.myPrice, category: c.category, color: c.color }))
    : companyTherapies.map((t) => ({ id: t.id, name: t.name, duration: t.duration, price: t.price, category: t.category, color: t.color }));

  const atendimentoAddress = isAutonomous
    ? (therapist as any).address ?? "Endereço a confirmar"
    : company?.address ?? "";

  // Gallery is stored as MediaItem[] in therapist.gallery
  const galleryItems: any[] = (therapist as any).gallery ?? [];
  const photos: string[] = galleryItems
    .filter((item: any) => item.type === "image" || !item.type)
    .map((item: any) => (typeof item === "string" ? item : item.url))
    .filter(Boolean);

  const stars = Array.from({ length: 5 }, (_, i) => i + 1);

  const handleBookingSubmit = () => {
    if (!bookingForm.name || !bookingForm.phone || !bookingForm.therapyId) return;
    setBookingStep("success");
  };

  const openBooking = () => {
    setBookingModal(true);
    setBookingStep("form");
    setBookingForm({ name: "", phone: "", therapyId: "", date: "", time: "" });
  };

  // Tabs available
  const tabs: Tab[] = ["fotos", "servicos", "sobre"];
  const effectiveTab = tabs.includes(activeTab) ? activeTab : tabs[0];

  const tabConfig: Record<Tab, { icon: React.ReactNode; label: string }> = {
    fotos:    { icon: <Grid className="w-4 h-4" />,              label: "Fotos" },
    servicos: { icon: <ListBullet className="w-4 h-4" />,        label: "Serviços" },
    sobre:    { icon: <InformationCircle className="w-4 h-4" />, label: "Sobre" },
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-20">
        <div className="max-w-[480px] mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <ZenHubLogo variant="full" textColor="#6B7280" height={16} />
          </Link>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 text-xs transition-all"
            style={{ fontWeight: 600 }}
          >
            <Share2 className="w-3.5 h-3.5" />
            {copied ? "Copiado!" : "Compartilhar"}
          </button>
        </div>
      </div>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-[480px] mx-auto">

          {/* ── Profile header ──────────────────────────────────────────────── */}
          <div className="px-5 pt-5 pb-4 bg-white">

            {/* Avatar + Stats row */}
            <div className="flex items-center justify-between mb-4">
              {/* Avatar with gradient ring */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-full p-[2.5px]"
                  style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #0D9488 100%)" }}>
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <img
                      src={therapist.avatar}
                      alt={therapist.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  </div>
                </div>
                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
              </div>

              {/* Stats */}
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}>
                    {therapist.totalSessions ?? 0}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">sessões</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}>
                    {therapist.rating ?? "—"}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">avaliação</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}>
                    {displayTherapies.length}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">serviços</p>
                </div>
              </div>
            </div>

            {/* Name + username */}
            <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3 }}>
              {therapist.name}
            </p>
            <p className="text-violet-500 text-sm mt-0.5" style={{ fontWeight: 500 }}>
              @{therapist.username}
            </p>
          </div>

          {/* ── Tab bar ─────────────────────────────────────────────────────── */}
          <div className="bg-white border-t border-b border-gray-100 sticky top-[53px] z-10">
            <div className="flex max-w-[480px] mx-auto">
              {tabs.map((tab) => {
                const isActive = effectiveTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs transition-all border-b-2 ${
                      isActive
                        ? "border-gray-900 text-gray-900"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                    style={{ fontWeight: isActive ? 600 : 400 }}
                  >
                    {tabConfig[tab].icon}
                    {tabConfig[tab].label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── FOTOS tab ───────────────────────────────────────────────────── */}
          {effectiveTab === "fotos" && (
            <>
              {photos.length === 0 ? (
                <div className="bg-white py-16 flex flex-col items-center gap-3 text-center px-6">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <Grid className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Nenhuma foto ainda</p>
                  <p className="text-gray-400 text-xs">Este profissional ainda não adicionou fotos ao perfil.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-px bg-gray-100">
                  {photos.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIndex(i)}
                      className="aspect-square overflow-hidden hover:opacity-90 transition-opacity"
                    >
                      <img src={url} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── SERVIÇOS tab ────────────────────────────────────────────────── */}
          {effectiveTab === "servicos" && (
            <div className="bg-white">
              {!isAutonomous && (
                <div className="px-5 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Preços definidos por <span style={{ fontWeight: 600 }}>{company?.name}</span>
                  </p>
                </div>
              )}

              {displayTherapies.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <ListBullet className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Nenhum serviço cadastrado</p>
                  <p className="text-gray-400 text-xs">Este profissional ainda não adicionou serviços.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {displayTherapies.map((therapy) => (
                    <div key={therapy.id} className="flex items-center gap-4 px-5 py-4">
                      {/* Color dot */}
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${therapy.color}18` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: therapy.color }} />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>{therapy.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" /> {therapy.duration} min
                          </span>
                          {therapy.category && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{ background: `${therapy.color}15`, color: therapy.color, fontWeight: 600 }}
                            >
                              {therapy.category}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Price */}
                      <div className="text-right shrink-0">
                        <p className="text-violet-700 text-sm" style={{ fontWeight: 700 }}>
                          R$ {therapy.price?.toFixed(0) ?? "—"}
                        </p>
                        <p className="text-gray-400 text-xs">por sessão</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── SOBRE tab ───────────────────────────────────────────────────── */}
          {effectiveTab === "sobre" && (
            <div className="divide-y divide-gray-100 bg-white">

              {/* Bio */}
              {therapist.bio && (
                <div className="px-5 py-5">
                  <p className="text-xs text-gray-400 mb-2" style={{ fontWeight: 600, letterSpacing: "0.05em" }}>SOBRE</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{therapist.bio}</p>
                </div>
              )}

              {/* Specialty + stats */}
              <div className="px-5 py-5 space-y-3">
                <p className="text-xs text-gray-400 mb-1" style={{ fontWeight: 600, letterSpacing: "0.05em" }}>INFORMAÇÕES</p>

                {therapist.specialty && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Especialidade</p>
                      <p className="text-sm text-gray-800" style={{ fontWeight: 600 }}>{therapist.specialty}</p>
                    </div>
                  </div>
                )}

                {therapist.experience && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Award className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Experiência</p>
                      <p className="text-sm text-gray-800" style={{ fontWeight: 600 }}>{therapist.experience}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-50 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Avaliação</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {stars.map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= Math.floor(therapist.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}`} />
                      ))}
                      <span className="text-sm text-gray-800 ml-0.5" style={{ fontWeight: 700 }}>{therapist.rating ?? "—"}</span>
                      <span className="text-xs text-gray-400">· {therapist.totalSessions ?? 0} atendimentos</span>
                    </div>
                  </div>
                </div>

                {/* Company or autonomous */}
                {company ? (
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs shrink-0"
                      style={{ background: company.color, fontWeight: 700 }}
                    >
                      {company.logo}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Empresa</p>
                      <p className="text-sm text-gray-800" style={{ fontWeight: 600 }}>{company.name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Atuação</p>
                      <p className="text-sm text-gray-800" style={{ fontWeight: 600 }}>Profissional Autônomo</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="px-5 py-5">
                <p className="text-xs text-gray-400 mb-3" style={{ fontWeight: 600, letterSpacing: "0.05em" }}>LOCAL DE ATENDIMENTO</p>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-800" style={{ fontWeight: 600 }}>
                      {company ? company.name : "Atendimento autônomo"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{atendimentoAddress}</p>
                    {!company && (
                      <p className="text-xs text-gray-400 mt-1">Endereço confirmado no agendamento</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Availability */}
              {Object.keys(availability).length > 0 && (
                <div className="px-5 py-5">
                  <p className="text-xs text-gray-400 mb-4" style={{ fontWeight: 600, letterSpacing: "0.05em" }}>DISPONIBILIDADE</p>
                  <div className="grid grid-cols-5 gap-2">
                    {Object.entries(availability).map(([day, slots]) => (
                      <div key={day} className="text-center">
                        <p className="text-xs text-gray-400 mb-2" style={{ fontWeight: 600 }}>{DAYS_MAP[day]}</p>
                        <div className="space-y-1">
                          {(slots as string[]).slice(0, 3).map((slot) => (
                            <div
                              key={slot}
                              className="py-1 rounded-lg bg-violet-50 text-violet-600 border border-violet-100"
                              style={{ fontWeight: 500, fontSize: "0.6rem" }}
                            >
                              {slot}
                            </div>
                          ))}
                          {(slots as string[]).length > 3 && (
                            <p className="text-gray-400 text-center" style={{ fontSize: "0.6rem" }}>
                              +{(slots as string[]).length - 3}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer branding */}
              <div className="px-5 py-6 flex flex-col items-center gap-1">
                <ZenHubLogo variant="full" textColor="#7C3AED" height={13} />
                <p className="text-gray-400" style={{ fontSize: "0.65rem" }}>Plataforma de gestão de terapias</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Fixed bottom CTA ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3 z-30">
        <div className="max-w-[480px] mx-auto">
          <button
            onClick={openBooking}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white text-sm shadow-md hover:from-violet-700 hover:to-indigo-800 transition-all"
            style={{ fontWeight: 700 }}
          >
            <Calendar className="w-4 h-4" />
            Agendar sessão
          </button>
        </div>
      </div>

      {/* ── Gallery lightbox ──────────────────────────────────────────────────── */}
      {galleryIndex !== null && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
          onClick={() => setGalleryIndex(null)}
        >
          <button className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          <button
            className="absolute left-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setGalleryIndex((galleryIndex - 1 + photos.length) % photos.length); }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <img
            src={photos[galleryIndex]}
            alt={`Foto ${galleryIndex + 1}`}
            className="max-w-full max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            className="absolute right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); setGalleryIndex((galleryIndex + 1) % photos.length); }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="absolute bottom-4 text-white/40 text-xs">{galleryIndex + 1} / {photos.length}</p>
        </div>
      )}

      {/* ── Booking Modal ──────────────────────────────────────────────────────── */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {bookingStep === "form" ? (
              <>
                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-3xl sm:rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <img src={therapist.avatar} alt={therapist.name} className="w-9 h-9 rounded-xl object-cover" />
                    <div>
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Agendar com {therapist.name.split(" ")[0]}</p>
                      {company ? (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {company.name}
                        </p>
                      ) : (
                        <p className="text-xs text-violet-500 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Profissional autônomo
                        </p>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setBookingModal(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Modal body */}
                <div className="px-5 py-5 space-y-4">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500" style={{ fontWeight: 600 }}>Local de atendimento</p>
                      <p className="text-xs text-gray-700 mt-0.5">{atendimentoAddress}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Seu nome *</label>
                      <input
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="Nome completo"
                        value={bookingForm.name}
                        onChange={(e) => setBookingForm((p) => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Telefone *</label>
                      <input
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="(11) 99999-9999"
                        value={bookingForm.phone}
                        onChange={(e) => setBookingForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Serviço *</label>
                    <select
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      value={bookingForm.therapyId}
                      onChange={(e) => setBookingForm((p) => ({ ...p, therapyId: e.target.value }))}
                    >
                      <option value="">Selecione um serviço</option>
                      {displayTherapies.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · {t.duration}min · R$ {t.price?.toFixed(0) ?? "—"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Data</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                        value={bookingForm.date}
                        onChange={(e) => setBookingForm((p) => ({ ...p, date: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>Horário</label>
                      <select
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
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
                      <p className="text-violet-700 text-xs flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                        <Sparkles className="w-3.5 h-3.5" /> Profissional autônomo
                      </p>
                      <p className="text-violet-600 text-xs mt-0.5">
                        O profissional entrará em contato para confirmar local e pagamento.
                      </p>
                    </div>
                  )}
                </div>

                {/* Modal footer */}
                <div className="flex gap-3 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
                  <button
                    onClick={() => setBookingModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                    style={{ fontWeight: 600 }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleBookingSubmit}
                    disabled={!bookingForm.name || !bookingForm.phone || !bookingForm.therapyId}
                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-700 text-white rounded-xl text-sm disabled:opacity-40 hover:shadow-md transition-all flex items-center justify-center gap-2"
                    style={{ fontWeight: 700 }}
                  >
                    <Send className="w-4 h-4" /> Solicitar
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-gray-900 mb-1" style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                  Solicitação enviada!
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  {therapist.name.split(" ")[0]} receberá sua solicitação e entrará em contato em breve.
                </p>
                <button
                  onClick={() => setBookingModal(false)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white text-sm"
                  style={{ fontWeight: 700 }}
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