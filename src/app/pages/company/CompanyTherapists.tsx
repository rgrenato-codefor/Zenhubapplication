import { useState, useMemo, useCallback } from "react";
import {
  UserPlus, Clock, Search, Star, Percent, Mail, Edit2, Link2Off,
  Link2, X, AlertCircle, Check, CheckCircle, ArrowLeft, Loader2,
  MapPin, Building2,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { useCompanyUnit } from "../../context/CompanyContext";
import { getTherapistByUsername } from "../../../lib/firestore";
import { useTherapistStore } from "../../store/therapistStore";

export default function CompanyTherapists() {
  const { user } = useAuth();
  // Direct store subscription — ensures this component re-renders immediately
  // on ANY store mutation (dissociate, approve, reject…) without depending on
  // the DataContext forceRender propagation chain.
  const store = useTherapistStore();
  const { company, therapists: allTherapists, therapies,
    mutateInviteTherapist, mutateDissociateTherapist, mutateUpdateTherapistCommission,
    mutateApproveAssociation, mutateRejectAssociation } = usePageData();
  const { selectedUnitId, companyUnits } = useCompanyUnit();
  const primaryColor = company?.color || "#0D9488";

  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit_commission" | "dissociate" | "approve" | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [newCommission, setNewCommission] = useState(50);
  const [newUnitId, setNewUnitId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState("");
  const [searching, setSearching] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Two-step association flow
  const [addStep, setAddStep] = useState<"search" | "preview">("search");
  const [previewTherapist, setPreviewTherapist] = useState<typeof allTherapists[0] | null>(null);

  // Get company therapists from DataContext (already fetched from Firestore)
  const companyTherapistIds: string[] = allTherapists
    .filter((t) => t.companyId === user?.companyId)
    .map((t) => t.id);

  const companyTherapists = allTherapists
    .filter((t) => t.companyId === user?.companyId)
    .filter((t) => {
      if (!selectedUnitId) return true;
      const assoc = store.getAssociation(t.id);
      return assoc.unitId === selectedUnitId || (t as any).unitId === selectedUnitId;
    })
    .filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  const selectedTherapist = allTherapists.find((t) => t.id === selectedId);
  const selectedAssoc = selectedId ? store.getAssociation(selectedId) : null;
  const detailTherapist = allTherapists.find((t) => t.id === detailId);
  const detailAssoc = detailId ? store.getAssociation(detailId) : null;

  const handleSearchTherapist = async () => {
    setInviteError("");
    const query = inviteCode.trim().replace(/^@/, "").toLowerCase();
    if (!query) {
      setInviteError("Digite o @username ou código do terapeuta.");
      return;
    }

    // 1️⃣ Try local store first (covers mock/demo and already-loaded therapists)
    let found = allTherapists.find(
      (t) => t.username?.toLowerCase() === query || t.id === query
    );

    // 2️⃣ If not found locally, hit Firestore
    if (!found) {
      setSearching(true);
      try {
        found = (await getTherapistByUsername(query)) ?? undefined;
      } catch {
        setInviteError("Erro ao buscar no servidor. Verifique sua conexão.");
        setSearching(false);
        return;
      } finally {
        setSearching(false);
      }
    }

    if (!found) {
      setInviteError("Terapeuta não encontrado. Verifique o @username.");
      return;
    }
    const current = store.getAssociation(found.id);
    if (current.companyId && current.companyId !== user?.companyId) {
      setInviteError("Este terapeuta já está vinculado a outra empresa.");
      return;
    }
    if (current.status === "pending" && current.companyId === user?.companyId) {
      setInviteError("Este terapeuta já tem uma solicitação pendente. Use a seção \"Solicitações pendentes\" acima para aprovar.");
      return;
    }
    if (companyTherapistIds.includes(found.id)) {
      setInviteError("Este terapeuta já faz parte da sua equipe.");
      return;
    }
    setPreviewTherapist(found);
    setAddStep("preview");
  };

  const handleAssociate = async () => {
    if (!user?.companyId || !previewTherapist) return;
    const username = previewTherapist.username ?? previewTherapist.id;
    store.associateTherapist(previewTherapist.id, user.companyId, newCommission, newUnitId);
    setModal(null);
    setInviteCode("");
    setInviteError("");
    setAddStep("search");
    setPreviewTherapist(null);
    await mutateInviteTherapist(username, newCommission, newUnitId);
  };

  const closeAddModal = () => {
    setModal(null);
    setInviteCode("");
    setInviteError("");
    setAddStep("search");
    setPreviewTherapist(null);
    setNewCommission(50);
    setNewUnitId(null);
  };

  const handleDissociate = () => {
    if (!selectedId) return;
    store.dissociateTherapist(selectedId);
    setModal(null);
    setSelectedId(null);
    setDetailId(null);
    mutateDissociateTherapist(selectedId);
  };

  const handleUpdateCommission = async () => {
    if (!selectedId) return;
    store.updateCommission(selectedId, newCommission);
    setModal(null);
    await mutateUpdateTherapistCommission(selectedId, newCommission);
  };

  const openEditCommission = (therapistId: string) => {
    setSelectedId(therapistId);
    const assoc = store.getAssociation(therapistId);
    setNewCommission(assoc.commission || 50);
    setModal("edit_commission");
  };

  const openDissociate = (therapistId: string) => {
    setSelectedId(therapistId);
    setModal("dissociate");
  };

  // Pending association requests (therapist-initiated, awaiting company approval)
  const pendingRequests = store.getPendingForCompany(user?.companyId ?? "");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900">Terapeutas</h1>
          <p className="text-gray-500 text-sm mt-0.5">{companyTherapists.length} terapeutas na equipe</p>
        </div>
        <button
          onClick={() => { setModal("add"); setInviteCode(""); setInviteError(""); setNewCommission(50); }}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm transition-colors"
          style={{ background: primaryColor, fontWeight: 600 }}
        >
          <UserPlus className="w-4 h-4" /> Associar Terapeuta
        </button>
      </div>

      {/* ── Pending requests ────────────────────────────────────────────────── */}
      {pendingRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-amber-100 bg-amber-50">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-amber-900" style={{ fontWeight: 700 }}>
                Solicitações pendentes ({pendingRequests.length})
              </p>
              <p className="text-xs text-amber-600">
                Terapeutas aguardando sua aprovação para integrar a equipe
              </p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingRequests.map((req) => {
              // Look up full therapist data if available in allTherapists (for display)
              const fullTherapist = allTherapists.find((t) => t.id === req.therapistId);
              const name    = fullTherapist?.name    ?? req.therapistName    ?? "Terapeuta";
              const avatar  = fullTherapist?.avatar  ?? req.therapistAvatar  ?? "";
              const specialty = fullTherapist?.specialty ?? req.therapistSpecialty ?? "";
              const username  = fullTherapist?.username  ?? req.therapistUsername  ?? req.therapistId;
              return (
                <div key={req.therapistId} className="flex items-center gap-4 px-5 py-4">
                  {/* Avatar */}
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ background: primaryColor, fontWeight: 700 }}
                    >
                      {name.charAt(0)}
                    </div>
                  )}
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 700 }}>{name}</p>
                    <p className="text-xs text-gray-400">@{username}</p>
                    {specialty && <p className="text-xs text-gray-500 mt-0.5">{specialty}</p>}
                  </div>
                  {/* Status badge */}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-50 border border-amber-200 shrink-0">
                    <Clock className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-amber-600" style={{ fontWeight: 600 }}>Pendente</span>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setSelectedId(req.therapistId);
                        setNewCommission(50);
                        setNewUnitId(null);
                        setModal("approve");
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-white hover:opacity-90 transition-opacity"
                      style={{ background: primaryColor, fontWeight: 600 }}
                    >
                      <Check className="w-3.5 h-3.5" /> Aprovar
                    </button>
                    <button
                      onClick={async () => {
                        await mutateRejectAssociation(req.therapistId);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                      style={{ fontWeight: 600 }}
                    >
                      <X className="w-3.5 h-3.5" /> Rejeitar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar terapeuta..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2"
          style={{ ["--tw-ring-color" as string]: primaryColor }}
        />
      </div>

      {/* Grid */}
      {companyTherapists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <UserPlus className="w-7 h-7 text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm" style={{ fontWeight: 600 }}>Nenhum terapeuta encontrado</p>
          <p className="text-gray-400 text-xs mt-1">Use "Associar Terapeuta" para convidar pelo username.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companyTherapists.map((therapist) => {
            const assoc = store.getAssociation(therapist.id);
            const commission = assoc.commission;
            const therapistTherapies = therapies.filter((th) => therapist.therapies.includes(th.id));
            const companyRecords = store.getCompanyRecords(user?.companyId ?? "")
              .filter((r) => r.therapistId === therapist.id);
            const totalSessions = therapist.totalSessions + companyRecords.length;
            const monthEarned = therapist.monthEarnings;

            return (
              <div
                key={therapist.id}
                className={`bg-white rounded-xl border shadow-sm transition-all cursor-pointer hover:shadow-md ${detailId === therapist.id ? "border-2 ring-2 ring-opacity-30" : "border-gray-100"}`}
                style={detailId === therapist.id ? { borderColor: primaryColor, ["--tw-ring-color" as string]: primaryColor } : {}}
                onClick={() => setDetailId(detailId === therapist.id ? null : therapist.id)}
              >
                {/* Card Header */}
                <div className="p-5 pb-4">
                  <div className="flex items-start gap-3">
                    <div className="relative shrink-0">
                      <img src={therapist.avatar} alt={therapist.name} className="w-14 h-14 rounded-xl object-cover" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 text-sm truncate" style={{ fontWeight: 700 }}>{therapist.name}</p>
                      <p className="text-xs text-gray-400 truncate">@{therapist.username}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{therapist.specialty}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs text-gray-700" style={{ fontWeight: 600 }}>{therapist.rating}</span>
                        <span className="text-xs text-gray-400">({totalSessions} sessões)</span>
                      </div>
                    </div>
                    {/* Commission badge */}
                    <div
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-white"
                      style={{ background: primaryColor, fontWeight: 700 }}
                    >
                      <Percent className="w-3 h-3" />
                      {commission}%
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{therapist.monthSessions}</p>
                      <p className="text-xs text-gray-400">Sessões/mês</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-900" style={{ fontWeight: 700 }}>
                        R${(monthEarned / 1000).toFixed(1)}k
                      </p>
                      <p className="text-xs text-gray-400">Comissão</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-900" style={{ fontWeight: 700 }}>
                        R${((therapist.monthEarnings / (therapist.commission / 100)) / 1000).toFixed(1)}k
                      </p>
                      <p className="text-xs text-gray-400">Receita</p>
                    </div>
                  </div>
                </div>

                {/* Therapies */}
                <div className="px-5 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {therapistTherapies.slice(0, 3).map((therapy) => (
                      <span key={therapy.id} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: therapy.color }}>
                        {therapy.name}
                      </span>
                    ))}
                    {therapistTherapies.length > 3 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        +{therapistTherapies.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <Mail className="w-3 h-3" />
                    <span className="truncate max-w-[110px]">{therapist.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditCommission(therapist.id); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 text-gray-600 hover:bg-gray-50"
                      style={{ fontWeight: 600 }}
                    >
                      <Edit2 className="w-3 h-3" /> Comissão
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); openDissociate(therapist.id); }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-red-100 text-red-500 hover:bg-red-50"
                      style={{ fontWeight: 600 }}
                    >
                      <Link2Off className="w-3 h-3" /> Desassociar
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {detailId === therapist.id && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                    <p className="text-xs text-gray-400" style={{ fontWeight: 600 }}>ATENDIMENTOS ENCERRADOS RECENTEMENTE</p>
                    {companyRecords.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhum atendimento encerrado ainda.</p>
                    ) : (
                      companyRecords.slice(0, 3).map((rec) => (
                        <div key={rec.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 truncate" style={{ fontWeight: 600 }}>{rec.clientName}</p>
                            <p className="text-xs text-gray-500">{rec.therapyName} · {rec.duration}min</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-emerald-600" style={{ fontWeight: 700 }}>
                              +R$ {rec.totalCharged.toFixed(0)}
                            </p>
                            <p className="text-xs text-gray-400">{rec.date}</p>
                          </div>
                        </div>
                      ))
                    )}
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Endereço de atendimento</p>
                        <p className="text-xs text-gray-700" style={{ fontWeight: 600 }}>{company?.address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Associar via código/username ─────────────────────────────── */}
      {modal === "add" && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">

            {/* Modal header */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${primaryColor}15` }}>
                  <Link2 className="w-5 h-5" style={{ color: primaryColor }} />
                </div>
                <div>
                  <h3 className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Associar Terapeuta</h3>
                  <p className="text-gray-400 text-xs">
                    {addStep === "search" ? "Informe o @username ou código do terapeuta" : "Confirme os dados antes de associar"}
                  </p>
                </div>
              </div>
              <button onClick={closeAddModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">

              {/* ── Step 1: Search ─────────────────────────────────── */}
              {addStep === "search" && (
                <>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                      Username ou código do terapeuta *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">@</span>
                      <input
                        className={`w-full pl-7 pr-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                          inviteError ? "border-red-300 focus:ring-red-300" : "border-gray-200 focus:ring-violet-300"
                        }`}
                        placeholder="ana.silva ou t1"
                        value={inviteCode}
                        onChange={(e) => { setInviteCode(e.target.value); setInviteError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleSearchTherapist()}
                        autoFocus
                      />
                    </div>
                    {inviteError && (
                      <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 shrink-0" /> {inviteError}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1.5">
                      Exemplos: <span className="font-mono">ana.silva</span> · <span className="font-mono">t1</span>
                    </p>
                  </div>

                  <div className="flex gap-3 pt-1">
                     <button onClick={closeAddModal} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                       Cancelar
                     </button>
                     <button
                       onClick={handleSearchTherapist}
                       disabled={!inviteCode.trim() || searching}
                       className="flex-1 py-2.5 text-white rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
                       style={{ background: primaryColor, fontWeight: 600 }}
                     >
                       {searching
                         ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</>
                         : <><Search className="w-4 h-4" /> Buscar terapeuta</>}
                     </button>
                   </div>
                </>
              )}

              {/* ── Step 2: Preview + Commission ───────────────────── */}
              {addStep === "preview" && previewTherapist && (
                <>
                  {/* Therapist identity card */}
                  <div className="rounded-xl border-2 overflow-hidden" style={{ borderColor: `${primaryColor}30` }}>
                    {/* Top color bar */}
                    <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${primaryColor}80)` }} />

                    <div className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <img
                            src={previewTherapist.avatar}
                            alt={previewTherapist.name}
                            className="w-16 h-16 rounded-xl object-cover border-2"
                            style={{ borderColor: `${primaryColor}40` }}
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                            <CheckCircle className="w-3 h-3 text-white" />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-900" style={{ fontWeight: 700, fontSize: "1rem" }}>
                            {previewTherapist.name}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: primaryColor, fontWeight: 600 }}>
                            @{previewTherapist.username}
                          </p>
                          <p className="text-gray-500 text-xs mt-0.5">{previewTherapist.specialty}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3 h-3 ${s <= Math.floor(previewTherapist.rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200 fill-gray-200"}`}
                              />
                            ))}
                            <span className="text-xs text-gray-600 ml-1" style={{ fontWeight: 600 }}>
                              {previewTherapist.rating}
                            </span>
                            <span className="text-xs text-gray-400">· {previewTherapist.totalSessions} sessões</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div className="grid grid-cols-3 gap-2 mt-4">
                        {[
                          { label: "Sessões/mês", value: previewTherapist.monthSessions },
                          { label: "Avaliação", value: previewTherapist.rating },
                          { label: "E-mail", value: previewTherapist.email.split("@")[0] + "…" },
                        ].map((s) => (
                          <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
                            <p className="text-gray-900 text-xs truncate" style={{ fontWeight: 700 }}>{s.value}</p>
                            <p className="text-gray-400 text-xs mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Confirmed identity badge */}
                      <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <p className="text-xs text-emerald-700" style={{ fontWeight: 600 }}>
                          Terapeuta identificado — confirme os dados antes de associar
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Unit selector — only when company has multiple units */}
                  {companyUnits.length > 0 && (
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                        Unidade de atendimento
                      </label>
                      <select
                        value={newUnitId ?? ""}
                        onChange={(e) => setNewUnitId(e.target.value || null)}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                      >
                        <option value="">Sem unidade específica</option>
                        {companyUnits.map((u) => (
                          <option key={u.id} value={u.id}>{u.name}{u.isMain ? " (principal)" : ""}</option>
                        ))}
                      </select>
                      {newUnitId && (
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {companyUnits.find((u) => u.id === newUnitId)?.address ?? ""}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Commission */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                      Comissão do terapeuta (%)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={10} max={90} step={5}
                        value={newCommission}
                        onChange={(e) => setNewCommission(Number(e.target.value))}
                        className="flex-1"
                        style={{ accentColor: primaryColor }}
                      />
                      <div
                        className="w-16 py-1.5 rounded-lg text-center text-white text-sm shrink-0"
                        style={{ background: primaryColor, fontWeight: 700 }}
                      >
                        {newCommission}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 p-3 rounded-xl bg-gray-50">
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-400">Terapeuta recebe</p>
                        <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>{newCommission}%</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="flex-1 text-center">
                        <p className="text-xs text-gray-400">Empresa fica com</p>
                        <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{100 - newCommission}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing rule */}
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-amber-700 text-xs" style={{ fontWeight: 600 }}>Regra de precificação</p>
                    <p className="text-amber-600 text-xs mt-0.5 leading-relaxed">
                      Ao associar o terapeuta, <strong>os preços da empresa passam a valer</strong> para todos os atendimentos.
                      Os preços pessoais do terapeuta ficam suspensos durante o vínculo.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={() => { setAddStep("search"); setPreviewTherapist(null); setInviteError(""); }}
                      className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                    <button
                      onClick={handleAssociate}
                      className="flex-1 py-2.5 text-white rounded-xl text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      style={{ background: primaryColor, fontWeight: 600 }}
                    >
                      <Link2 className="w-4 h-4" /> Associar
                    </button>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Approve pending association ──────────────────────────────── */}
      {modal === "approve" && selectedId && (() => {
        const req = pendingRequests.find((r) => r.therapistId === selectedId);
        const fullT = allTherapists.find((t) => t.id === selectedId);
        const name = fullT?.name ?? req?.therapistName ?? "Terapeuta";
        const avatar = fullT?.avatar ?? req?.therapistAvatar ?? "";
        return (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${primaryColor}15` }}>
                    <CheckCircle className="w-5 h-5" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <h3 className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Aprovar Terapeuta</h3>
                    <p className="text-gray-400 text-xs">Defina a comissão antes de confirmar</p>
                  </div>
                </div>
                <button onClick={() => { setModal(null); setSelectedId(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                {/* Therapist preview */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                  {avatar ? (
                    <img src={avatar} alt={name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ background: primaryColor, fontWeight: 700 }}>
                      {name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 700 }}>{name}</p>
                    <p className="text-xs text-gray-400">@{fullT?.username ?? req?.therapistUsername ?? selectedId}</p>
                  </div>
                </div>

                {/* Unit */}
                {companyUnits.length > 0 && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                      Unidade de atendimento
                    </label>
                    <select
                      value={newUnitId ?? ""}
                      onChange={(e) => setNewUnitId(e.target.value || null)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 bg-white"
                      style={{ ["--tw-ring-color" as string]: `${primaryColor}50` }}
                    >
                      <option value="">Sem unidade específica</option>
                      {companyUnits.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}{u.isMain ? " (principal)" : ""}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Commission slider */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5" style={{ fontWeight: 600 }}>
                    Comissão do terapeuta
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range" min={10} max={90} step={5}
                      value={newCommission}
                      onChange={(e) => setNewCommission(Number(e.target.value))}
                      className="flex-1"
                      style={{ accentColor: primaryColor }}
                    />
                    <div className="w-16 py-1.5 rounded-lg text-center text-white text-sm shrink-0"
                      style={{ background: primaryColor, fontWeight: 700 }}>
                      {newCommission}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 p-3 rounded-xl bg-gray-50">
                    <div className="flex-1 text-center">
                      <p className="text-xs text-gray-400">Terapeuta recebe</p>
                      <p className="text-sm text-emerald-600" style={{ fontWeight: 700 }}>{newCommission}%</p>
                    </div>
                    <div className="w-px h-8 bg-gray-200" />
                    <div className="flex-1 text-center">
                      <p className="text-xs text-gray-400">Empresa fica com</p>
                      <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{100 - newCommission}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setModal(null); setSelectedId(null); }}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={async () => {
                      await mutateApproveAssociation(selectedId, newCommission, newUnitId);
                      setModal(null);
                      setSelectedId(null);
                    }}
                    className="flex-1 py-2.5 text-white rounded-xl text-sm hover:opacity-90 transition-opacity"
                    style={{ background: primaryColor, fontWeight: 600 }}
                  >
                    Confirmar aprovação
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Editar comissão ─────────────────────────────────────────── */}
      {modal === "edit_commission" && selectedTherapist && selectedAssoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <img src={selectedTherapist.avatar} alt={selectedTherapist.name} className="w-10 h-10 rounded-xl object-cover" />
              <div>
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>{selectedTherapist.name}</p>
                <p className="text-gray-400 text-xs">Editar comissão</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-2" style={{ fontWeight: 600 }}>
                  Comissão do terapeuta
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={10} max={90} step={5}
                    value={newCommission}
                    onChange={(e) => setNewCommission(Number(e.target.value))}
                    className="flex-1"
                    style={{ accentColor: primaryColor }}
                  />
                  <div
                    className="w-16 py-1.5 rounded-lg text-center text-white text-sm shrink-0"
                    style={{ background: primaryColor, fontWeight: 700 }}
                  >
                    {newCommission}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="p-3 rounded-xl bg-emerald-50 text-center">
                    <p className="text-xs text-gray-400">Terapeuta recebe</p>
                    <p className="text-base text-emerald-600" style={{ fontWeight: 700 }}>{newCommission}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 text-center">
                    <p className="text-xs text-gray-400">Empresa fica com</p>
                    <p className="text-base text-gray-900" style={{ fontWeight: 700 }}>{100 - newCommission}%</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm">
                Cancelar
              </button>
              <button
                onClick={handleUpdateCommission}
                className="flex-1 py-2.5 text-white rounded-xl text-sm flex items-center justify-center gap-2"
                style={{ background: primaryColor, fontWeight: 600 }}
              >
                <CheckCircle className="w-4 h-4" /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmar desassociação ──────────────────────────��─────── */}
      {modal === "dissociate" && selectedTherapist && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <Link2Off className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-gray-900 text-sm" style={{ fontWeight: 700 }}>Desassociar terapeuta?</p>
                <p className="text-gray-500 text-xs mt-1">
                  <strong>{selectedTherapist.name}</strong> perderá o vínculo com <strong>{company?.name}</strong>.
                  Os preços pessoais dele voltarão a valer automaticamente.
                </p>
              </div>
            </div>
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl mb-4">
              <p className="text-amber-600 text-xs" style={{ fontWeight: 600 }}>
                ⚠️ Atendimentos já encerrados permanecem no histórico de ambas as partes.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm">
                Cancelar
              </button>
              <button onClick={handleDissociate} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm" style={{ fontWeight: 600 }}>
                Desassociar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}