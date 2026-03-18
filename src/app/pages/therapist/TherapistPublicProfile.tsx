import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router";
import {
  Star, MapPin, Clock, CheckCircle, ArrowLeft, Share2,
  Calendar, Sparkles, Award, X,
  User, Building2, Grid,
  ListBullet, InformationCircle, Send, Heart, MessageCircle,
} from "../../components/shared/icons";
import { getTherapistByUsername, getTherapiesByCompany, getCompany, getCatalogByTherapist } from "../../../lib/firestore";
import { therapists as mockTherapists, therapies as mockTherapies, companies as mockCompanies } from "../../data/mockData";
import { therapistStore } from "../../store/therapistStore";
import { ZenHubLogo } from "../../components/shared/ZenHubLogo";
import { db } from "../../../lib/firebase";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";

const DAYS_MAP: Record<string, string> = {
  monday: "Seg", tuesday: "Ter", wednesday: "Qua",
  thursday: "Qui", friday: "Sex",
};

type Tab = "feed" | "fotos" | "servicos" | "sobre";

// ── Feed Lightbox ─────────────────────────────────────────────────────────────
function FeedLightbox({
  posts,
  initialIndex,
  onClose,
}: {
  posts: any[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const post = posts[index];

  const goNext = () => { if (index < posts.length - 1) setIndex((i) => i + 1); };
  const goPrev = () => { if (index > 0) setIndex((i) => i - 1); };

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff < -50) goNext();
    else if (diff > 50) goPrev();
    touchStartX.current = null;
  };

  if (!post) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black flex flex-col select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Close button */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-safe pt-4 pb-2">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-black/40 text-white/80 hover:text-white hover:bg-black/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {posts.length > 1 && (
          <span className="text-white/50 text-sm" style={{ fontWeight: 500 }}>
            {index + 1} / {posts.length}
          </span>
        )}
      </div>

      {/* Image — fills screen, object-contain */}
      <div className="flex-1 flex items-center justify-center relative">
        <img
          src={post.mediaUrl}
          alt={post.caption ?? ""}
          className="max-w-full max-h-full w-full object-contain"
          draggable={false}
        />

        {/* Prev arrow */}
        {index > 0 && (
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {/* Next arrow */}
        {index < posts.length - 1 && (
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white transition-colors"
            style={{ transform: "translateY(-50%) rotate(180deg)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Bottom info */}
      <div className="px-5 pt-3 pb-6 bg-black/80 backdrop-blur-sm">
        <div className="flex items-center gap-5 mb-2">
          <span className="flex items-center gap-1.5 text-white/70 text-sm">
            <Heart className="w-4 h-4" /> {post.likesCount ?? 0}
          </span>
          <span className="flex items-center gap-1.5 text-white/70 text-sm">
            <MessageCircle className="w-4 h-4" /> {post.commentsCount ?? 0}
          </span>
        </div>
        {post.caption && (
          <p className="text-white/90 text-sm leading-snug">{post.caption}</p>
        )}
        {/* Dot indicators */}
        {posts.length > 1 && (
          <div className="flex gap-1.5 justify-center mt-3">
            {posts.map((_: any, i: number) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 18 : 6,
                  height: 6,
                  background: i === index ? "#fff" : "rgba(255,255,255,0.3)",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Story Viewer ─────────────────────────────────────────────────────────────
function StoryViewer({
  photos,
  initialIndex,
  onClose,
  therapist,
}: {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
  therapist: any;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const DURATION = 6000;
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);
  const touchStartX = useRef<number | null>(null);

  const goNext = () => {
    if (index < photos.length - 1) setIndex((i) => i + 1);
    else onClose();
  };

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
    else setProgress(0);
  };

  // Auto-advance with rAF progress
  useEffect(() => {
    setProgress(0);
    if (paused) return;
    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startRef.current;
      const pct = Math.min((elapsed / DURATION) * 100, 100);
      setProgress(pct);
      if (pct < 100) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        if (index < photos.length - 1) setIndex((i) => i + 1);
        else onClose();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setPaused(true);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    setPaused(false);
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff < -50) goNext();
    else if (diff > 50) goPrev();
    touchStartX.current = null;
  };

  return (
    <div
      className="fixed inset-0 bg-black z-[60] flex flex-col select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3 pt-3">
        {photos.map((_, i) => (
          <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full"
              style={{
                width: i < index ? "100%" : i === index ? `${progress}%` : "0%",
                transition: "none",
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-7 left-0 right-0 z-30 flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-full p-[2px] shrink-0"
            style={{ background: "linear-gradient(135deg,#7C3AED,#6366F1,#0D9488)" }}
          >
            <img
              src={therapist.avatar}
              alt={therapist.name}
              className="w-full h-full rounded-full object-cover border-[1.5px] border-black"
            />
          </div>
          <div>
            <p className="text-white text-sm leading-none" style={{ fontWeight: 700 }}>
              {therapist.name}
            </p>
            <p className="text-white/50 text-xs mt-0.5" style={{ fontWeight: 500 }}>
              @{therapist.username}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white/70 hover:text-white bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Photo */}
      <img
        src={photos[index]}
        alt={`Foto ${index + 1}`}
        className="absolute inset-0 w-full h-full object-contain"
        draggable={false}
      />

      {/* Tap areas */}
      <div className="absolute inset-0 z-20 flex">
        {/* Left tap → prev */}
        <button
          className="w-1/3 h-full"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => { setPaused(false); }}
          onClick={goPrev}
        />
        {/* Center hold → pause */}
        <button
          className="w-1/3 h-full"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
        />
        {/* Right tap → next */}
        <button
          className="w-1/3 h-full"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => { setPaused(false); }}
          onClick={goNext}
        />
      </div>

      {/* Bottom dots + counter */}
      <div className="absolute bottom-8 left-0 right-0 z-30 flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          {photos.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                background: i === index ? "#fff" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
        <p className="text-white/30 text-xs" style={{ fontWeight: 500 }}>
          {index + 1} / {photos.length}
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TherapistPublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [copied, setCopied] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingStep, setBookingStep] = useState<"form" | "success">("form");
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", therapyId: "", date: "", time: "" });
  const [therapist, setTherapist] = useState<any>(null);
  const [allTherapies, setAllTherapies] = useState<any[]>([]);
  const [company, setCompany] = useState<any>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [firestoreCatalog, setFirestoreCatalog] = useState<any[]>([]);
  const [therapistFeedPosts, setTherapistFeedPosts] = useState<any[]>([]);
  const [feedLightbox, setFeedLightbox] = useState<number | null>(null);

  useEffect(() => {
    if (!username) return;
    const load = async () => {
      setLoadingProfile(true);
      const t = await getTherapistByUsername(username);
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
        // Fetch public feed posts for this therapist
        try {
          const q = query(
            collection(db, "feedPosts"),
            where("therapistId", "==", t.id),
          );
          const snap = await getDocs(q);
          const all = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
          // filter type === "feed" and sort by createdAt desc — client-side
          // (avoids composite index requirement)
          const sorted = all
            .filter((p) => !p.type || p.type === "feed")
            .sort((a, b) => {
              const ta = a.createdAt?.toMillis?.() ?? 0;
              const tb = b.createdAt?.toMillis?.() ?? 0;
              return tb - ta;
            });
          setTherapistFeedPosts(sorted);
        } catch (err) {
          console.error("Erro ao buscar posts do terapeuta:", err);
          setTherapistFeedPosts([]);
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

  // Gallery stored as MediaItem[] in therapist.gallery
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

  const tabs: Tab[] = ["feed", "fotos", "servicos", "sobre"];
  const effectiveTab = tabs.includes(activeTab) ? activeTab : tabs[0];

  const tabConfig: Record<Tab, { icon: React.ReactNode; label: string }> = {
    feed:     { icon: <Sparkles className="w-4 h-4" />,          label: "Feed" },
    fotos:    { icon: <Grid className="w-4 h-4" />,              label: "Fotos" },
    servicos: { icon: <ListBullet className="w-4 h-4" />,        label: "Serviços" },
    sobre:    { icon: <InformationCircle className="w-4 h-4" />, label: "Sobre" },
  };

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Top bar */}
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

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-[480px] mx-auto">

          {/* Profile header */}
          <div className="px-5 pt-5 pb-4 bg-white">
            <div className="flex items-center justify-between mb-4">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className="w-20 h-20 rounded-full p-[2.5px]"
                  style={{ background: "linear-gradient(135deg, #7C3AED 0%, #6366F1 50%, #0D9488 100%)" }}
                >
                  <div className="w-full h-full rounded-full bg-white p-[2px]">
                    <img src={therapist.avatar} alt={therapist.name} className="w-full h-full rounded-full object-cover" />
                  </div>
                </div>
                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white" />
              </div>

              {/* Stats */}
              <div className="flex gap-6">
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
                <div className="text-center">
                  <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.1rem", lineHeight: 1.2 }}>
                    {therapistFeedPosts.length}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">posts</p>
                </div>
              </div>
            </div>

            <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1.05rem", lineHeight: 1.3 }}>
              {therapist.name}
            </p>
            <p className="text-violet-500 text-sm mt-0.5" style={{ fontWeight: 500 }}>
              @{therapist.username}
            </p>
          </div>

          {/* Tab bar */}
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

          {/* ── FEED tab ──────────────────────────────────────────────────── */}
          {effectiveTab === "feed" && (
            <div className="bg-white">
              {therapistFeedPosts.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-3 text-center px-6">
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Nenhuma publicação ainda</p>
                  <p className="text-gray-400 text-xs">Quando este profissional publicar, aparecerá aqui.</p>
                </div>
              ) : (
                <div>
                  {therapistFeedPosts.map((post, idx) => (
                    <div key={post.id} className="border-b border-gray-100 last:border-0">
                      {/* Media — full width, tappable */}
                      {post.mediaUrl && (
                        <button
                          className="w-full block focus:outline-none"
                          onClick={() => setFeedLightbox(idx)}
                        >
                          <img
                            src={post.mediaUrl}
                            alt={post.caption ?? ""}
                            className="w-full aspect-square object-cover"
                          />
                        </button>
                      )}
                      {/* Actions + caption */}
                      <div className="px-4 pt-3 pb-4">
                        <div className="flex items-center gap-4 mb-2">
                          <span className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Heart className="w-5 h-5" />
                            {post.likesCount ?? 0}
                          </span>
                          <span className="flex items-center gap-1.5 text-sm text-gray-500">
                            <MessageCircle className="w-5 h-5" />
                            {post.commentsCount ?? 0}
                          </span>
                        </div>
                        {post.caption && (
                          <p className="text-sm text-gray-700 leading-snug">{post.caption}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── FOTOS tab ─────────────────────────────────────────────────── */}
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

          {/* ── SERVIÇOS tab ──────────────────────────────────────────────── */}
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
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${therapy.color}18` }}
                      >
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: therapy.color }} />
                      </div>
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

          {/* ── SOBRE tab ─────────────────────────────────────────────────── */}
          {effectiveTab === "sobre" && (
            <div className="divide-y divide-gray-100 bg-white">

              {therapist.bio && (
                <div className="px-5 py-5">
                  <p className="text-xs text-gray-400 mb-2" style={{ fontWeight: 600, letterSpacing: "0.05em" }}>SOBRE</p>
                  <p className="text-gray-700 text-sm leading-relaxed">{therapist.bio}</p>
                </div>
              )}

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
                        <Star
                          key={s}
                          className={`w-3 h-3 ${s <= Math.floor(therapist.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}`}
                        />
                      ))}
                      <span className="text-sm text-gray-800 ml-0.5" style={{ fontWeight: 700 }}>{therapist.rating ?? "—"}</span>
                      <span className="text-xs text-gray-400">· {therapist.totalSessions ?? 0} atendimentos</span>
                    </div>
                  </div>
                </div>

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

              <div className="px-5 py-6 flex flex-col items-center gap-1">
                <ZenHubLogo variant="full" textColor="#7C3AED" height={13} />
                <p className="text-gray-400" style={{ fontSize: "0.65rem" }}>Plataforma de gestão de terapias</p>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Fixed bottom CTA */}
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

      {/* Feed Lightbox */}
      {feedLightbox !== null && (
        <FeedLightbox
          posts={therapistFeedPosts}
          initialIndex={feedLightbox}
          onClose={() => setFeedLightbox(null)}
        />
      )}

      {/* Story Viewer */}
      {galleryIndex !== null && (
        <StoryViewer
          photos={photos}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          therapist={therapist}
        />
      )}

      {/* Booking Modal */}
      {bookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {bookingStep === "form" ? (
              <>
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
                        {Object.values(availability)
                          .flat()
                          .filter((v, i, a) => a.indexOf(v) === i)
                          .sort()
                          .map((slot) => (
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