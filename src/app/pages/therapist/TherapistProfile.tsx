import { useState } from "react";
import {
  Star, Edit, Save, Calendar, Clock, CheckCircle,
  Link2, Copy, Check, Building2, LogOut, KeyRound,
  AlertTriangle, Sparkles, AtSign, ExternalLink,
  Search, MapPin, ChevronRight, X,
} from "lucide-react";
import { therapists, therapies, companies, units } from "../../data/mockData";
import { useAuth } from "../../context/AuthContext";

const DAYS_MAP: Record<string, string> = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
};

// Simula codes válidos para associação (em prod viria do Firestore)
const VALID_CODES = companies.reduce<Record<string, string>>((acc, c) => {
  acc[c.inviteCode] = c.id;
  return acc;
}, {});

export default function TherapistProfile() {
  const { user } = useAuth();
  const therapist = therapists.find((t) => t.id === user?.therapistId);
  const [editing, setEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Company association state
  const [currentCompanyId, setCurrentCompanyId] = useState(therapist?.companyId ?? null);
  const [currentUnitId, setCurrentUnitId] = useState<string | null>((therapist as any)?.unitId ?? null);

  // Search mode: "code" | "name"
  const [searchMode, setSearchMode] = useState<"code" | "name">("code");
  const [joinCode, setJoinCode] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [joinError, setJoinError] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Step: "search" | "pick-unit" | "confirm"
  const [joinStep, setJoinStep] = useState<"search" | "pick-unit">("search");
  const [candidateCompany, setCandidateCompany] = useState<typeof companies[0] | null>(null);
  const [selectedJoinUnit, setSelectedJoinUnit] = useState<string | null>(null);

  // Username edit
  const [username, setUsername] = useState(therapist?.username ?? "");
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameInput, setUsernameInput] = useState(therapist?.username ?? "");

  if (!therapist) return null;

  const myTherapies = therapies.filter((t) => therapist.therapies.includes(t.id));
  const currentCompany = companies.find((c) => c.id === currentCompanyId);
  const currentUnit = units.find((u) => u.id === currentUnitId);
  const profileUrl = `zenhub.com.br/${username}`;

  // Name search results (excluding currently linked company)
  const nameResults = nameSearch.trim().length >= 2
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(nameSearch.toLowerCase()) &&
        c.id !== currentCompanyId &&
        c.status === "active"
      )
    : [];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${profileUrl}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Step 1: find company by code or name
  const handleFindByCode = () => {
    setJoinError("");
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError("Digite o código da empresa."); return; }
    const companyId = VALID_CODES[code];
    if (companyId) {
      const c = companies.find((cp) => cp.id === companyId) ?? null;
      setCandidateCompany(c);
      setSelectedJoinUnit(null);
      setJoinStep("pick-unit");
    } else {
      setJoinError("Código inválido. Verifique com o responsável da empresa.");
    }
  };

  const handleSelectByName = (company: typeof companies[0]) => {
    setCandidateCompany(company);
    setSelectedJoinUnit(null);
    setJoinStep("pick-unit");
    setNameSearch("");
  };

  // Step 2: confirm join with selected unit
  const handleJoinConfirm = async () => {
    if (!candidateCompany) return;
    setJoinLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setCurrentCompanyId(candidateCompany.id);
    setCurrentUnitId(selectedJoinUnit);
    setJoinStep("search");
    setJoinCode("");
    setCandidateCompany(null);
    setSelectedJoinUnit(null);
    setJoinSuccess(true);
    setTimeout(() => setJoinSuccess(false), 3000);
    setJoinLoading(false);
  };

  const handleLeave = () => {
    setCurrentCompanyId(null);
    setCurrentUnitId(null);
    setShowLeaveConfirm(false);
    setJoinStep("search");
  };

  const handleSaveUsername = () => {
    const cleaned = usernameInput.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (cleaned.length >= 3) {
      setUsername(cleaned);
      setEditingUsername(false);
    }
  };

  // Units for candidate company
  const candidateUnits = candidateCompany
    ? units.filter((u) => u.companyId === candidateCompany.id && u.status === "active")
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gerencie suas informações e vínculo com empresa</p>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
            editing ? "bg-emerald-500 text-white" : "bg-violet-600 text-white"
          }`}
          style={{ fontWeight: 600 }}
        >
          {editing ? <Save className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
          {editing ? "Salvar" : "Editar"}
        </button>
      </div>

      {/* ── Meu Link Público ───────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-100 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <AtSign className="w-4 h-4 text-violet-500" />
              <p className="text-sm text-violet-700" style={{ fontWeight: 700 }}>Seu perfil público</p>
            </div>

            {editingUsername ? (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-gray-400 text-sm">zenhub.com.br/</span>
                <input
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-violet-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  placeholder="seu.nome"
                  autoFocus
                />
                <button
                  onClick={handleSaveUsername}
                  className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg"
                  style={{ fontWeight: 600 }}
                >
                  Salvar
                </button>
                <button
                  onClick={() => { setEditingUsername(false); setUsernameInput(username); }}
                  className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs rounded-lg"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-700 text-sm" style={{ fontWeight: 600 }}>
                  zenhub.com.br/<span className="text-violet-600">{username}</span>
                </p>
                <button
                  onClick={() => setEditingUsername(true)}
                  className="text-gray-400 hover:text-violet-500 transition-colors"
                  title="Editar username"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-1">
              Compartilhe esse link com seus clientes. Seu histórico de ganhos sempre fica vinculado a você.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/${username}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-violet-200 text-violet-600 text-sm hover:bg-violet-50 transition-all"
              style={{ fontWeight: 600 }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver
            </a>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white text-sm hover:bg-violet-700 transition-all"
              style={{ fontWeight: 600 }}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedLink ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Vínculo com Empresa ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Building2 className="w-5 h-5 text-violet-500" />
          <h3 className="text-gray-900" style={{ fontWeight: 700 }}>Vínculo com Empresa</h3>
        </div>

        {currentCompany ? (
          // ── Associado ─────────────────────────────────────────────
          <div className="space-y-4">
            <div
              className="flex items-center gap-4 p-4 rounded-xl border"
              style={{ background: `${currentCompany.color}08`, borderColor: `${currentCompany.color}25` }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                style={{ background: currentCompany.color, fontWeight: 700, fontSize: "0.875rem" }}
              >
                {currentCompany.logo}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{currentCompany.name}</p>
                <p className="text-gray-500 text-xs mt-0.5">{currentCompany.address}</p>
                {currentUnit && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      Unidade <span style={{ fontWeight: 600 }}>{currentUnit.name}</span>
                      {" · "}{currentUnit.address.split(" - ")[0]}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-xs text-emerald-600" style={{ fontWeight: 600 }}>Vinculado ativamente</span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-xs text-gray-400">Plano {currentCompany.plan}</span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-700 text-xs leading-relaxed">
                <span style={{ fontWeight: 700 }}>Seus ganhos são seus.</span>{" "}
                Se você sair desta empresa e entrar em outra, todo o seu histórico de comissões, sessões e avaliações continua vinculado ao seu perfil <span className="font-semibold">@{username}</span>.
              </p>
            </div>

            {!showLeaveConfirm ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
                style={{ fontWeight: 600 }}
              >
                <LogOut className="w-4 h-4" />
                Sair desta empresa
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-red-100 bg-red-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700" style={{ fontWeight: 700 }}>Confirmar saída da empresa?</p>
                    <p className="text-xs text-red-500 mt-1">
                      Você perderá acesso à agenda e aos clientes desta empresa. Seu histórico de ganhos permanece intacto.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={handleLeave}
                        className="px-4 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        Confirmar saída
                      </button>
                      <button
                        onClick={() => setShowLeaveConfirm(false)}
                        className="px-4 py-1.5 bg-white text-gray-600 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // ── Sem empresa ───────────────────────────────────────────
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-dashed border-gray-200">
              <Building2 className="w-8 h-8 text-gray-300 shrink-0" />
              <div>
                <p className="text-sm text-gray-500" style={{ fontWeight: 600 }}>Nenhuma empresa vinculada</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Você está atuando de forma autônoma. Busque uma empresa para se associar.
                </p>
              </div>
            </div>

            {joinSuccess && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <p className="text-sm text-emerald-700" style={{ fontWeight: 600 }}>
                  Vinculado com sucesso! Você agora faz parte da equipe.
                </p>
              </div>
            )}

            {joinStep === "search" ? (
              <>
                {/* Mode toggle */}
                <div className="flex bg-gray-100 rounded-xl p-1">
                  {[
                    { id: "code" as const, label: "Código de convite", icon: KeyRound },
                    { id: "name" as const, label: "Buscar por nome", icon: Search },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => { setSearchMode(id); setJoinError(""); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-all"
                      style={searchMode === id
                        ? { background: "#fff", color: "#4C1D95", fontWeight: 700, boxShadow: "0 1px 3px rgba(0,0,0,.08)" }
                        : { color: "#6B7280" }
                      }
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {searchMode === "code" ? (
                  <div>
                    <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>
                      Código de convite da empresa
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          value={joinCode}
                          onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setJoinError(""); }}
                          placeholder="Ex: ZEN2024"
                          className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 ${
                            joinError ? "border-red-300" : "border-gray-200"
                          }`}
                        />
                      </div>
                      <button
                        onClick={handleFindByCode}
                        className="px-5 py-2.5 bg-violet-600 text-white text-sm rounded-xl hover:bg-violet-700 transition-colors"
                        style={{ fontWeight: 600 }}
                      >
                        Buscar
                      </button>
                    </div>
                    {joinError && <p className="text-red-500 text-xs mt-1.5">{joinError}</p>}
                    <p className="text-xs text-gray-400 mt-2">
                      Exemplos: <span className="font-mono text-gray-500">ZEN2024</span>, <span className="font-mono text-gray-500">WELL2024</span>
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>
                      Nome da empresa
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        value={nameSearch}
                        onChange={(e) => setNameSearch(e.target.value)}
                        placeholder="Digite o nome da empresa..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                      {nameSearch && (
                        <button
                          onClick={() => setNameSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {nameSearch.trim().length >= 2 && (
                      <div className="mt-2 border border-gray-200 rounded-xl overflow-hidden">
                        {nameResults.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">Nenhuma empresa encontrada</p>
                        ) : (
                          nameResults.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleSelectByName(c)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-violet-50 transition-colors border-b border-gray-100 last:border-0 text-left"
                            >
                              <div
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs shrink-0"
                                style={{ background: c.color, fontWeight: 700 }}
                              >
                                {c.logo}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{c.name}</p>
                                <p className="text-xs text-gray-400 truncate">{c.address}</p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              // ── Step: pick unit ─────────────────────────────────
              candidateCompany && (
                <div className="space-y-4">
                  {/* Company preview */}
                  <div
                    className="flex items-center gap-3 p-4 rounded-xl border"
                    style={{ background: `${candidateCompany.color}10`, borderColor: `${candidateCompany.color}30` }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shrink-0"
                      style={{ background: candidateCompany.color, fontWeight: 700 }}
                    >
                      {candidateCompany.logo}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{candidateCompany.name}</p>
                      <p className="text-gray-500 text-xs">{candidateCompany.address}</p>
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                  </div>

                  {/* Unit picker */}
                  <div>
                    <p className="text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>
                      Escolha a unidade onde você irá atuar *
                    </p>
                    {candidateUnits.length === 0 ? (
                      <p className="text-sm text-gray-400 py-2">Nenhuma unidade cadastrada nesta empresa.</p>
                    ) : (
                      <div className="space-y-2">
                        {candidateUnits.map((unit) => (
                          <button
                            key={unit.id}
                            onClick={() => setSelectedJoinUnit(unit.id === selectedJoinUnit ? null : unit.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
                            style={
                              selectedJoinUnit === unit.id
                                ? { borderColor: candidateCompany.color, background: `${candidateCompany.color}08` }
                                : { borderColor: "#E5E7EB", background: "#fff" }
                            }
                          >
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: `${candidateCompany.color}20` }}
                            >
                              <MapPin className="w-4 h-4" style={{ color: candidateCompany.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm text-gray-900" style={{ fontWeight: 600 }}>{unit.name}</p>
                                {unit.isMain && (
                                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${candidateCompany.color}15`, color: candidateCompany.color, fontWeight: 600 }}>
                                    Principal
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-400 truncate mt-0.5">{unit.address}</p>
                            </div>
                            <div
                              className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all"
                              style={
                                selectedJoinUnit === unit.id
                                  ? { borderColor: candidateCompany.color, background: candidateCompany.color }
                                  : { borderColor: "#D1D5DB" }
                              }
                            >
                              {selectedJoinUnit === unit.id && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setJoinStep("search"); setCandidateCompany(null); setSelectedJoinUnit(null); }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={handleJoinConfirm}
                      disabled={joinLoading || (!selectedJoinUnit && candidateUnits.length > 0)}
                      className="flex-1 py-2.5 rounded-xl text-white text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                      style={{ background: candidateCompany.color, fontWeight: 700 }}
                    >
                      {joinLoading ? "Vinculando..." : "Confirmar vínculo"}
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ── Profile Card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
        <div className="flex items-start gap-6">
          <div className="relative">
            <img
              src={therapist.avatar}
              alt={therapist.name}
              className="w-24 h-24 rounded-2xl object-cover border-4 border-violet-100"
            />
            {editing && (
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-violet-600 rounded-full text-white flex items-center justify-center">
                <Edit className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Nome", value: therapist.name },
                  { label: "Especialidade", value: therapist.specialty },
                  { label: "E-mail", value: therapist.email },
                  { label: "Telefone", value: therapist.phone },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                    <input
                      defaultValue={f.value}
                      className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div>
                <h2 className="text-gray-900 text-xl">{therapist.name}</h2>
                <p className="text-violet-500 text-sm mt-0.5" style={{ fontWeight: 600 }}>{therapist.specialty}</p>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= Math.floor(therapist.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                    />
                  ))}
                  <span className="text-sm text-gray-600 ml-1">{therapist.rating} ({therapist.totalSessions} avaliações)</span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span>{therapist.email}</span>
                  <span>{therapist.phone}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {editing ? (
          <div className="mt-4">
            <label className="block text-xs text-gray-500 mb-1">Bio</label>
            <textarea
              defaultValue={therapist.bio}
              rows={3}
              className="w-full px-3 py-2 border border-violet-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500 mt-4 leading-relaxed">{therapist.bio}</p>
        )}
      </div>

      {/* ── Therapies ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
        <h3 className="text-gray-900 mb-4">Minhas Terapias</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {myTherapies.map((therapy) => (
            <div key={therapy.id} className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
              <div className="w-3 h-8 rounded-full shrink-0" style={{ background: therapy.color }} />
              <div className="min-w-0">
                <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 600 }}>{therapy.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500">{therapy.duration}min</span>
                  <span className="text-xs text-emerald-600" style={{ fontWeight: 600 }}>R$ {therapy.price}</span>
                </div>
              </div>
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Schedule ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-violet-100 p-6 shadow-sm">
        <h3 className="text-gray-900 mb-4">Disponibilidade Semanal</h3>
        <div className="space-y-3">
          {Object.entries(therapist.schedule).map(([day, slots]) => (
            <div key={day} className="flex items-start gap-4">
              <div className="w-20 shrink-0">
                <p className="text-sm text-gray-700" style={{ fontWeight: 600 }}>{DAYS_MAP[day]}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(slots as string[]).map((slot: string) => (
                  <span key={slot} className="text-xs px-2 py-1 bg-violet-50 text-violet-600 rounded-lg border border-violet-100">
                    {slot}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}