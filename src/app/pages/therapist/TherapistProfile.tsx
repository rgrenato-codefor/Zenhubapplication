import { useState, useEffect } from "react";
import {
  Star, Edit2, Save, CheckCircle, X,
  Link2, Copy, Check, Building2, LogOut,
  AlertTriangle, Sparkles, AtSign, ExternalLink,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";

const DAYS_MAP: Record<string, string> = {
  monday: "Seg", tuesday: "Ter", wednesday: "Qua",
  thursday: "Qui", friday: "Sex", saturday: "Sáb", sunday: "Dom",
};

export default function TherapistProfile() {
  const { user } = useAuth();
  const {
    myTherapist: therapist, company,
    mutateMyTherapistProfile,
    mutateLinkToCompany, mutateUnlinkFromCompany,
  } = usePageData();

  const [editing, setEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const [linking, setLinking] = useState(false);
  const [showUnlinkConfirm, setShowUnlinkConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    bio: therapist?.bio ?? "",
    specialty: therapist?.specialty ?? "",
    phone: therapist?.phone ?? "",
  });

  // Sync form whenever therapist loads or changes
  useEffect(() => {
    if (therapist) {
      setForm({
        bio: therapist.bio ?? "",
        specialty: therapist.specialty ?? "",
        phone: therapist.phone ?? "",
      });
    }
  }, [therapist]);

  const isLinked = !!therapist?.companyId && !!company;

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
    navigator.clipboard.writeText(`https://zenhub.com.br/${username}`).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const publicUrl = `zenhub.com.br/${therapist.username ?? user?.therapistId}`;

  return (
    <div className="space-y-4">

      {/* ── Profile Card ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-violet-100 shadow-sm">
        {/* Cover gradient */}
        <div className="h-24 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl" />

        {/* Avatar + Info */}
        <div className="px-4 md:px-6 pb-5">
          <div className="flex items-end justify-between gap-3 -mt-10 mb-4">
            {/* Avatar */}
            {therapist.avatar ? (
              <img
                src={therapist.avatar}
                alt={therapist.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md shrink-0 relative z-10"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-2xl bg-violet-100 border-4 border-white shadow-md flex items-center justify-center text-violet-600 text-3xl shrink-0 relative z-10"
                style={{ fontWeight: 700 }}
              >
                {therapist.name.charAt(0)}
              </div>
            )}

            {/* Edit / Save button */}
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

          {/* Name, specialty, rating */}
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

          {/* Phone (editing) */}
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

          {/* Bio */}
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

      {/* ── Stats row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Avaliação", value: therapist.rating.toString(), suffix: "★" },
          { label: "Total sessões", value: therapist.totalSessions.toString() },
          { label: "Este mês", value: therapist.monthSessions.toString() },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-violet-100 p-3 text-center shadow-sm">
            <p className="text-lg text-violet-600" style={{ fontWeight: 700 }}>{s.value}{s.suffix}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Public link ───────────────────────────────────────────────────────── */}
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

      {/* ── Company link ──────────────────────────────────────────────────────── */}
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
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: `${company.color}12` }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shrink-0"
                style={{ background: company.color, fontWeight: 700 }}
              >
                {company.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ fontWeight: 600, color: company.color }}>
                  {company.name}
                </p>
                <p className="text-xs text-gray-400">Comissão: {therapist.commission}% por sessão</p>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            </div>
            <button
              onClick={() => setShowUnlinkConfirm(true)}
              className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Desvincular empresa
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

      {/* ── Availability ──────────────────────────────────────────────────────── */}
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

      {/* ── Link company modal ────────────────────────────────────────────────── */}
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

      {/* ── Unlink confirm ────────────────────────────────────────────────────── */}
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