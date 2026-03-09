import { useState, useEffect, useRef } from "react";
import {
  Save, Star, AtSign, Check, Copy, ExternalLink, Clock,
  CheckCircle, LogOut, Sparkles, AlertTriangle, X, Edit2,
  Building2, Link2, Camera, ChevronRightIcon,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { uploadMedia, ikFolders, ikAvatar } from "../../../lib/imagekit";

const DAYS_MAP: Record<string, string> = {
  monday: "Seg", tuesday: "Ter", wednesday: "Qua",
  thursday: "Qui", friday: "Sex", saturday: "Sáb", sunday: "Dom",
};

export default function TherapistProfile() {
  const { user }    = useAuth();
  const {
    myTherapist: therapist, company,
    myGallery,
    mutateMyTherapistProfile,
    mutateLinkToCompany, mutateUnlinkFromCompany,
  } = usePageData();

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress,  setAvatarProgress]  = useState(0);
  const [avatarError,     setAvatarError]     = useState("");

  const [editing,           setEditing]           = useState(false);
  const [copiedLink,        setCopiedLink]        = useState(false);
  const [showLinkModal,     setShowLinkModal]     = useState(false);
  const [codeInput,         setCodeInput]         = useState("");
  const [codeError,         setCodeError]         = useState("");
  const [linking,           setLinking]           = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [saving,            setSaving]            = useState(false);

  const [form, setForm] = useState({
    bio:       therapist?.bio       ?? "",
    specialty: therapist?.specialty ?? "",
    phone:     therapist?.phone     ?? "",
  });

  // Sync form whenever therapist loads or changes
  useEffect(() => {
    if (therapist) {
      setForm({
        bio:       therapist.bio       ?? "",
        specialty: therapist.specialty ?? "",
        phone:     therapist.phone     ?? "",
      });
    }
  }, [therapist]);

  const isPending  = false;
  const isActive   = !!company;
  const isLinked   = isPending || isActive;
  const linkedCompany     = company ?? null;
  const companyCommission = therapist?.commission ?? null;

  if (!therapist) return (
    <div className="text-gray-500 text-center py-20">Carregando perfil...</div>
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await mutateMyTherapistProfile(form);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleLinkCompany = async () => {
    setLinking(true);
    setCodeError("");
    const co = await mutateLinkToCompany(codeInput.trim().toUpperCase());
    setLinking(false);
    if (!co) {
      setCodeError("Código inválido. Verifique com o responsável da empresa.");
      return;
    }
    setShowLinkModal(false);
    setCodeInput("");
  };

  const handleUnlink = async () => {
    await mutateUnlinkFromCompany();
    setShowUnlinkConfirm(false);
  };

  const handleCopyLink = () => {
    const username = therapist.username ?? user?.therapistId ?? "";
    navigator.clipboard.writeText(`https://zenhub.online/${username}`).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const publicUrl = `zenhub.online/${therapist.username ?? user?.therapistId}`;

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    (e.target as HTMLInputElement).value = "";
    if (!file || !therapist) return;
    if (!file.type.startsWith("image/")) { setAvatarError("Apenas imagens são aceitas."); return; }
    if (file.size > 10 * 1024 * 1024)   { setAvatarError("Máximo 10 MB."); return; }

    setAvatarError("");
    setAvatarUploading(true);
    setAvatarProgress(0);
    try {
      const item = await uploadMedia(
        file,
        ikFolders.therapistAvatar(therapist.id),
        setAvatarProgress,
      );
      await mutateMyTherapistProfile({ avatar: item.url });
    } catch {
      setAvatarError("Falha no upload. Tente novamente.");
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(0);
    }
  };

  return (
    <div className="space-y-4">

      {/* ── Profile Card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-violet-100 shadow-sm">
        <div className="h-24 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl" />

        <div className="px-4 md:px-6 pb-5">
          <div className="flex items-end justify-between gap-3 -mt-10 mb-4">

            {/* ── Avatar with upload overlay ── */}
            <div className="relative shrink-0 z-10">
              {therapist.avatar ? (
                <img
                  src={ikAvatar(therapist.avatar, 160)}
                  alt={therapist.name}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl bg-violet-100 border-4 border-white shadow-md flex items-center justify-center text-violet-600 text-3xl"
                  style={{ fontWeight: 700 }}
                >
                  {therapist.name.charAt(0)}
                </div>
              )}

              {/* Upload overlay button */}
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute inset-0 rounded-2xl flex items-end justify-end pb-1 pr-1 group disabled:cursor-wait"
                title="Trocar foto de perfil"
              >
                {/* Dark overlay on hover */}
                <span className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 group-disabled:bg-black/30 transition-colors rounded-2xl" />

                {/* Camera icon badge */}
                <span className={`relative w-6 h-6 rounded-full flex items-center justify-center shadow border-2 border-white transition-colors z-10 ${
                  avatarUploading
                    ? "bg-violet-500"
                    : "bg-white group-hover:bg-violet-600"
                }`}>
                  {avatarUploading ? (
                    <div
                      className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin"
                    />
                  ) : (
                    <Camera className="w-3 h-3 text-gray-500 group-hover:text-white transition-colors" />
                  )}
                </span>
              </button>

              {/* Upload progress ring */}
              {avatarUploading && (
                <svg
                  className="absolute inset-0 w-20 h-20 -rotate-90 pointer-events-none"
                  viewBox="0 0 80 80"
                >
                  <circle cx="40" cy="40" r="36" fill="none" stroke="#7C3AED33" strokeWidth="4" />
                  <circle
                    cx="40" cy="40" r="36" fill="none"
                    stroke="#7C3AED" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - avatarProgress / 100)}`}
                    style={{ transition: "stroke-dashoffset 0.2s" }}
                  />
                </svg>
              )}
            </div>

            {/* Hidden file input */}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleAvatarChange}
            />

            {editing ? (
              <div className="flex gap-2 mb-1">
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span className="hidden sm:inline">Cancelar</span>
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-700 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  {saving ? "..." : <Save className="w-4 h-4" />}
                  <span className="hidden sm:inline">Salvar</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-violet-200 text-violet-600 text-sm hover:bg-violet-50 transition-colors mb-1"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Editar perfil</span>
              </button>
            )}
          </div>

          {/* Avatar error */}
          {avatarError && (
            <div className="flex items-center gap-1.5 mb-3 text-red-500 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {avatarError}
            </div>
          )}

          {/* Avatar uploading label */}
          {avatarUploading && (
            <div className="flex items-center gap-1.5 mb-3 text-violet-600 text-xs">
              <div className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
              Enviando foto... {avatarProgress}%
            </div>
          )}

          <div className="space-y-1 mb-4">
            <h2 className="text-gray-900 text-lg" style={{ fontWeight: 700 }}>{therapist.name}</h2>
            {editing ? (
              <input
                className="w-full text-sm text-gray-600 border border-violet-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="Especialidade"
                value={form.specialty}
                onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
              />
            ) : (
              <p className="text-violet-600 text-sm" style={{ fontWeight: 500 }}>{therapist.specialty}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{therapist.rating}</span>
              </div>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">{therapist.totalSessions} sessões realizadas</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-500">{therapist.monthSessions} este mês</span>
            </div>
          </div>

          {editing && (
            <div className="mb-4">
              <label className="text-xs text-gray-400 mb-1 block">Telefone</label>
              <input
                className="w-full border border-violet-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300"
                placeholder="(11) 98765-4321"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
          )}

          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Bio</label>
            {editing ? (
              <textarea
                rows={3}
                className="w-full border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
                placeholder="Fale um pouco sobre você e sua experiência..."
                value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
              />
            ) : therapist.bio ? (
              <p className="text-sm text-gray-600 leading-relaxed">{therapist.bio}</p>
            ) : (
              <p className="text-sm text-gray-300 italic">Sem bio adicionada</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avaliação",     value: therapist.rating.toString(),        suffix: "★" },
          { label: "Total sessões", value: therapist.totalSessions.toString() },
          { label: "Este mês",      value: therapist.monthSessions.toString() },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-violet-100 p-3 text-center shadow-sm">
            <p className="text-lg text-violet-600" style={{ fontWeight: 700 }}>{s.value}{s.suffix}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Public link ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-violet-100 p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <AtSign className="w-4 h-4 text-violet-500" />
          </div>
          <div className="min-w-0">
            <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Perfil público</p>
            <p className="text-xs text-violet-500 truncate">{publicUrl}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs hover:bg-gray-50 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedLink ? "Copiado!" : "Copiar link"}
          </button>
          <a
            href={`/${therapist.username ?? user?.therapistId}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-violet-200 text-violet-600 text-xs hover:bg-violet-50 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Ver perfil
          </a>
        </div>
      </div>

      {/* ── Company link ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-violet-100 p-4 md:p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Vínculo com Empresa</p>
            <p className="text-xs text-gray-400">
              {isLinked ? "Vinculado a uma empresa" : "Terapeuta autônomo"}
            </p>
          </div>
        </div>

        {isLinked ? (
          <div className="space-y-3">
            {isPending ? (
              <div className="rounded-xl border-2 border-amber-200 overflow-hidden">
                <div className="flex items-center gap-3 p-3 bg-amber-50">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shrink-0"
                    style={{ background: linkedCompany?.color, fontWeight: 700 }}
                  >
                    {linkedCompany?.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate" style={{ fontWeight: 600, color: linkedCompany?.color }}>
                      {linkedCompany?.name}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-600" style={{ fontWeight: 600 }}>
                        Aguardando aprovação da empresa
                      </p>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
                  <p className="text-xs text-amber-700">
                    Sua solicitação foi enviada. A empresa precisa aprovar e definir sua comissão antes do vínculo ser ativado.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: `${linkedCompany?.color}12` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shrink-0"
                  style={{ background: linkedCompany?.color, fontWeight: 700 }}
                >
                  {linkedCompany?.logo}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ fontWeight: 600, color: linkedCompany?.color }}>
                    {linkedCompany?.name}
                  </p>
                  {companyCommission !== null && companyCommission > 0 ? (
                    <p className="text-xs text-gray-500">
                      Comissão definida pela empresa:{" "}
                      <span style={{ fontWeight: 700, color: linkedCompany?.color }}>{companyCommission}%</span>
                      {" "}por sessão
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Comissão ainda não definida pela empresa</p>
                  )}
                </div>
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              </div>
            )}
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> {isPending ? "Cancelar solicitação" : "Desvincular empresa"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-violet-50">
              <Sparkles className="w-4 h-4 text-violet-500 shrink-0" />
              <p className="text-xs text-gray-600">
                Você está no modo autônomo. Vinculando-se a uma empresa você aparece na agenda deles e recebe comissões automaticamente.
              </p>
            </div>
            <button
              onClick={() => setShowLinkModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm hover:bg-violet-700 transition-colors"
              style={{ fontWeight: 600 }}
            >
              <Link2 className="w-4 h-4" /> Entrar em empresa
            </button>
          </div>
        )}
      </div>

      {/* ── Gallery shortcut ──────────────────────────────────────────────── */}
      <a
        href="/terapeuta/galeria"
        className="flex items-center justify-between bg-white rounded-2xl border border-violet-100 p-4 md:p-5 shadow-sm hover:shadow-md hover:border-violet-200 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4 text-violet-500" />
          </div>
          <div>
            <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Galeria de fotos</p>
            <p className="text-xs text-gray-400">
              {myGallery.length > 0
                ? `${myGallery.length} ${myGallery.length === 1 ? "foto publicada" : "fotos publicadas"}`
                : "Nenhuma foto ainda · adicione agora"}
            </p>
          </div>
        </div>
        <ChevronRightIcon className="w-4 h-4 text-violet-400 group-hover:text-violet-600 transition-colors" />
      </a>

      {/* ── Availability ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-violet-100 p-4 md:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-900 text-sm" style={{ fontWeight: 600 }}>Disponibilidade</p>
          <a
            href="/terapeuta/agenda"
            className="text-xs text-violet-500 hover:text-violet-700 transition-colors"
          >
            Editar →
          </a>
        </div>
        {therapist.schedule && Object.keys(therapist.schedule).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(therapist.schedule).map(([day, slots]) => (
              <div key={day} className="flex items-start gap-3">
                <span className="w-8 text-xs text-gray-500 pt-0.5 shrink-0">{DAYS_MAP[day] ?? day}</span>
                <div className="flex flex-wrap gap-1 flex-1">
                  {(slots as string[]).slice(0, 8).map((t) => (
                    <span key={t} className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded-md">
                      {t}
                    </span>
                  ))}
                  {(slots as string[]).length > 8 && (
                    <span className="text-xs text-gray-400 px-1 py-0.5">
                      +{(slots as string[]).length - 8}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic">Nenhum horário configurado</p>
        )}
      </div>

      {/* ── Modal: entrar em empresa ──────────────────────────────────────── */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Entrar em Empresa</h3>
                <p className="text-xs text-gray-400 mt-0.5">Insira o código de convite fornecido pela empresa.</p>
              </div>
              <button
                onClick={() => { setShowLinkModal(false); setCodeInput(""); setCodeError(""); }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 mb-4">
              <label className="text-sm text-gray-700" style={{ fontWeight: 600 }}>Código de convite</label>
              <div className="flex gap-2">
                <input
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent uppercase tracking-widest"
                  placeholder="Ex: ZEN2024"
                  value={codeInput}
                  onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && !linking && codeInput.trim() && handleLinkCompany()}
                />
                <button
                  onClick={handleLinkCompany}
                  disabled={linking || !codeInput.trim()}
                  className="px-4 py-3 bg-violet-600 text-white rounded-xl text-sm disabled:opacity-50 hover:bg-violet-700 transition-colors"
                  style={{ fontWeight: 600 }}
                >
                  {linking ? "..." : "Entrar"}
                </button>
              </div>
              {codeError && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {codeError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: desvincular empresa ────────────────────────────────────── */}
      {showUnlinkConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Desvincular empresa?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Você voltará para o modo autônomo e deixará de aparecer na agenda da empresa.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUnlinkConfirm(false)}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUnlink}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition-colors"
                style={{ fontWeight: 600 }}
              >
                Desvincular
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}