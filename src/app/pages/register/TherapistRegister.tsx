import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Sparkles, User, Mail, Phone, Lock, Eye, EyeOff,
  ArrowRight, CheckCircle, Loader2, AtSign, KeyRound,
  Briefcase, ChevronRight, ChevronLeft, Search, MapPin, X, AlertCircle,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import { useData } from "../../context/DataContext";

type Step = 1 | 2 | 3;

type Form = {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  username: string;
  password: string;
  confirmPassword: string;
  inviteCode: string;
  unitId: string;
};

const SPECIALTIES = [
  "Massagem Relaxante", "Shiatsu", "Reflexologia", "Aromaterapia",
  "Drenagem Linfática", "Massagem Desportiva", "Craniosacral",
  "Bioenergética", "Ayurveda", "Acupuntura", "Outra",
];

const STEPS = [
  { number: 1, label: "Conta" },
  { number: 2, label: "Perfil" },
  { number: 3, label: "Empresa" },
];

export default function TherapistRegister() {
  const navigate = useNavigate();
  const { registerTherapist } = useAuth();
  const { searchCompaniesByName, fetchCompanyByInviteCode, fetchUnitsByCompany } = useData();

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<Form>({
    name: "", email: "", phone: "", specialty: "",
    username: "", password: "", confirmPassword: "", inviteCode: "", unitId: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [linkedCompany, setLinkedCompany] = useState<any | null>(null);
  const [linkedUnit, setLinkedUnit] = useState<any | null>(null);
  const [codeError, setCodeError] = useState("");
  const [submitError, setSubmitError] = useState("");

  // Company search state
  const [searchMode, setSearchMode] = useState<"code" | "name">("code");
  const [nameSearch, setNameSearch] = useState("");
  const [candidateCompany, setCandidateCompany] = useState<any | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [companyStep, setCompanyStep] = useState<"search" | "pick-unit">("search");
  const [candidateUnits, setCandidateUnits] = useState<any[]>([]);
  const [nameResults, setNameResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const set = (field: keyof Form, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const maskPhone = (v: string) =>
    v.replace(/\D/g, "").slice(0, 11)
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");

  const slugify = (v: string) =>
    v.toLowerCase().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "").slice(0, 30);

  const validateStep1 = () => {
    const e: Partial<Form> = {};
    if (!form.name.trim()) e.name = "Obrigatório";
    if (!form.email.trim()) e.email = "Obrigatório";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "E-mail inválido";
    if (!form.phone.trim()) e.phone = "Obrigatório";
    if (!form.password) e.password = "Obrigatório";
    else if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Senhas não coincidem";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Partial<Form> = {};
    if (!form.specialty) e.specialty = "Selecione uma especialidade";
    if (!form.username.trim()) e.username = "Obrigatório";
    else if (form.username.length < 3) e.username = "Mínimo 3 caracteres";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    if (step === 2 && validateStep2()) setStep(3);
  };

  const handleVerifyCode = async () => {
    const code = form.inviteCode.trim().toUpperCase();
    if (!code) return;
    setSearching(true);
    const company = await fetchCompanyByInviteCode(code);
    setSearching(false);
    if (company) {
      setCandidateCompany(company);
      setCodeError("");
      setSelectedUnitId(null);
      const units = await fetchUnitsByCompany(company.id);
      setCandidateUnits(units);
      setCompanyStep("pick-unit");
    } else {
      setCodeError("Código inválido. Verifique com o responsável da empresa.");
      setCandidateCompany(null);
    }
  };

  const handleNameSearch = async (q: string) => {
    setNameSearch(q);
    if (q.trim().length < 2) { setNameResults([]); return; }
    setSearching(true);
    const results = await searchCompaniesByName(q);
    setNameResults(results);
    setSearching(false);
  };

  const handleSelectByName = async (company: any) => {
    setCandidateCompany(company);
    setSelectedUnitId(null);
    const units = await fetchUnitsByCompany(company.id);
    setCandidateUnits(units);
    setCompanyStep("pick-unit");
    setNameSearch("");
    setNameResults([]);
  };

  const handleConfirmCompany = () => {
    if (!candidateCompany) return;
    setLinkedCompany(candidateCompany);
    const unit = candidateUnits.find((u) => u.id === selectedUnitId) ?? null;
    setLinkedUnit(unit);
    setCompanyStep("search");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await registerTherapist({
        name: form.name,
        email: form.email,
        phone: form.phone,
        specialty: form.specialty,
        username: form.username,
        password: form.password,
        companyId: linkedCompany?.id,
        unitId: linkedUnit?.id,
        commission: linkedCompany ? 50 : 100,
      });
      setDone(true);
      setTimeout(() => navigate("/terapeuta"), 2500);
    } catch (err: any) {
      console.error("[TherapistRegister] Erro ao criar perfil:", err);
      const code = err?.code ?? "";
      const msg = err?.message ?? "";
      if (code === "auth/email-already-in-use") {
        setSubmitError("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
      } else if (code === "auth/weak-password") {
        setSubmitError("Senha muito fraca. Use no mínimo 6 caracteres.");
      } else if (code === "permission-denied" || msg.includes("permission")) {
        setSubmitError("Sem permissão para salvar dados. Verifique as regras do Firestore no Firebase Console.");
      } else if (msg.includes("undefined") || msg.includes("invalid data")) {
        setSubmitError("Dados inválidos ao salvar perfil. Contate o suporte.");
      } else {
        setSubmitError(`Erro ao criar conta: ${msg || code || "Verifique sua conexão e tente novamente."}`);
      }
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-600 rounded-full opacity-10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500 rounded-full opacity-10 blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-md w-full">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white mb-2" style={{ fontWeight: 700, fontSize: "1.75rem" }}>Perfil criado!</h1>
          <p className="text-gray-400 mb-1">
            Seu link público:{" "}
            <span className="text-teal-400" style={{ fontWeight: 600 }}>
              zenhub.com.br/@{form.username}
            </span>
          </p>
          {linkedCompany && (
            <div className="mt-3 mb-2">
              <p className="text-gray-500 text-sm">
                Vinculado a <span className="text-white" style={{ fontWeight: 600 }}>{linkedCompany.name}</span>
              </p>
              {linkedUnit && (
                <p className="text-gray-500 text-sm flex items-center justify-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Unidade <span className="text-white" style={{ fontWeight: 600 }}>{linkedUnit.name}</span>
                  {" · "}{linkedUnit.address.split(" - ")[0]}
                </p>
              )}
            </div>
          )}
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white flex items-center justify-center gap-2 mt-6"
            style={{ fontWeight: 600 }}
          >
            Fazer login <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[380px] flex-col relative overflow-hidden shrink-0 bg-gray-900/50 border-r border-white/5">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-teal-600 rounded-full opacity-10 blur-3xl" />
          <div className="absolute bottom-20 right-0 w-48 h-48 bg-violet-500 rounded-full opacity-10 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col h-full p-10">
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white" style={{ fontWeight: 700, fontSize: "1.25rem" }}>ZEN HUB</span>
          </div>

          <div className="flex-1 flex flex-col justify-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-5">
              <Briefcase className="w-7 h-7 text-teal-400" />
            </div>
            <h2 className="text-white mb-3" style={{ fontWeight: 700, fontSize: "1.6rem", lineHeight: 1.2 }}>
              Seu perfil,<br />suas regras
            </h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-8">
              Crie seu perfil independente com URL própria. Associe-se a empresas com um código e leve seu histórico para onde for.
            </p>
            <div className="space-y-4">
              {[
                { icon: AtSign, text: "URL pública @handle exclusiva" },
                { icon: KeyRound, text: "Entre em empresas com código" },
                { icon: Briefcase, text: "Histórico de ganhos é seu, sempre" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-teal-400" />
                    </div>
                    <p className="text-gray-300 text-sm">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-white/30 text-xs">© 2026 ZEN HUB</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-2 px-6 pt-6 pb-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-white" style={{ fontWeight: 700 }}>ZEN HUB</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">

            {/* Steps indicator */}
            <div className="flex items-center gap-2 mb-8">
              {STEPS.map((s, i) => (
                <div key={s.number} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 transition-all ${
                        step > s.number
                          ? "bg-emerald-500 text-white"
                          : step === s.number
                          ? "bg-teal-500 text-white"
                          : "bg-white/10 text-gray-400"
                      }`}
                      style={{ fontWeight: 700 }}
                    >
                      {step > s.number ? <CheckCircle className="w-4 h-4" /> : s.number}
                    </div>
                    <span
                      className={`text-xs ${step >= s.number ? "text-gray-300" : "text-gray-500"}`}
                      style={{ fontWeight: step === s.number ? 600 : 400 }}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${step > s.number ? "bg-emerald-500/50" : "bg-white/10"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* ── Step 1: Account ──────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-white" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Criar sua conta</h2>
                  <p className="text-gray-400 text-sm mt-1">Dados de acesso ao ZEN HUB</p>
                </div>

                {/* Name */}
                <Field label="Nome completo *" error={errors.name}>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className={inputCls(!!errors.name)}
                      style={{ paddingLeft: "2.5rem" }}
                      placeholder="Seu nome completo"
                      value={form.name}
                      onChange={(e) => {
                        set("name", e.target.value);
                        if (!form.username) set("username", slugify(e.target.value));
                      }}
                    />
                  </div>
                </Field>

                {/* Email */}
                <Field label="E-mail *" error={errors.email}>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      className={inputCls(!!errors.email)}
                      style={{ paddingLeft: "2.5rem" }}
                      placeholder="seu@email.com"
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                    />
                  </div>
                </Field>

                {/* Phone */}
                <Field label="Telefone *" error={errors.phone}>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className={inputCls(!!errors.phone)}
                      style={{ paddingLeft: "2.5rem" }}
                      placeholder="(11) 99999-9999"
                      value={form.phone}
                      onChange={(e) => set("phone", maskPhone(e.target.value))}
                    />
                  </div>
                </Field>

                {/* Password */}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Senha *" error={errors.password}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPass ? "text" : "password"}
                        className={inputCls(!!errors.password)}
                        style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                        placeholder="Mín. 6 caracteres"
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field label="Confirmar *" error={errors.confirmPassword}>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showConfirm ? "text" : "password"}
                        className={inputCls(!!errors.confirmPassword)}
                        style={{ paddingLeft: "2.5rem", paddingRight: "2.5rem" }}
                        placeholder="Repita"
                        value={form.confirmPassword}
                        onChange={(e) => set("confirmPassword", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>
                </div>

                <button onClick={handleNext} className={primaryBtn}>
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Step 2: Profile ──────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-white" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Seu perfil público</h2>
                  <p className="text-gray-400 text-sm mt-1">Como clientes vão te encontrar</p>
                </div>

                {/* Username */}
                <Field label="Seu @handle (URL pública) *" error={errors.username}>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className={inputCls(!!errors.username)}
                      style={{ paddingLeft: "2.5rem" }}
                      placeholder="ana.silva"
                      value={form.username}
                      onChange={(e) => set("username", slugify(e.target.value))}
                    />
                  </div>
                  {form.username.length >= 3 && !errors.username && (
                    <p className="text-teal-400 text-xs mt-1">
                      zenhub.com.br/@{form.username}
                    </p>
                  )}
                </Field>

                {/* Specialty */}
                <Field label="Especialidade principal *" error={errors.specialty}>
                  <select
                    className={inputCls(!!errors.specialty)}
                    value={form.specialty}
                    onChange={(e) => set("specialty", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className={secondaryBtn}
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button onClick={handleNext} className={`${primaryBtn} flex-1`}>
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Company ──────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-white" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Vincular empresa</h2>
                  <p className="text-gray-400 text-sm mt-1">Opcional — você pode fazer isso depois no seu perfil</p>
                </div>

                <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/20">
                  <p className="text-teal-300 text-xs leading-relaxed">
                    <span style={{ fontWeight: 700 }}>Como funciona:</span> Busque a empresa pelo nome ou código de convite e escolha a unidade onde irá atuar. Todo o seu histórico fica sempre vinculado ao seu perfil.
                  </p>
                </div>

                {linkedCompany ? (
                  // ── Empresa confirmada ──────────────────────────────
                  <div className="space-y-3">
                    <div
                      className="flex items-center gap-3 p-4 rounded-xl border"
                      style={{ background: `${linkedCompany.color}15`, borderColor: `${linkedCompany.color}30` }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs shrink-0"
                        style={{ background: linkedCompany.color, fontWeight: 700 }}
                      >
                        {linkedCompany.logo}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm" style={{ fontWeight: 700 }}>{linkedCompany.name}</p>
                        {linkedUnit && (
                          <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            Unidade {linkedUnit.name} · {linkedUnit.address.split(" - ")[0]}
                          </p>
                        )}
                      </div>
                      <CheckCircle className="w-5 h-5 text-emerald-400 ml-auto shrink-0" />
                    </div>
                    <button
                      onClick={() => { setLinkedCompany(null); setLinkedUnit(null); setCompanyStep("search"); setCandidateCompany(null); setSelectedUnitId(null); }}
                      className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      Trocar empresa
                    </button>
                  </div>
                ) : companyStep === "search" ? (
                  // ── Busca ────────────────────────────────────────────
                  <div className="space-y-3">
                    {/* Mode toggle */}
                    <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
                      {[
                        { id: "code" as const, label: "Código de convite", icon: KeyRound },
                        { id: "name" as const, label: "Buscar por nome", icon: Search },
                      ].map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => { setSearchMode(id); setCodeError(""); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs transition-all"
                          style={searchMode === id
                            ? { background: "rgba(255,255,255,0.12)", color: "#fff", fontWeight: 700 }
                            : { color: "#6B7280" }
                          }
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </button>
                      ))}
                    </div>

                    {searchMode === "code" ? (
                      <Field label="Código de convite (opcional)" error={codeError}>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                              className={inputCls(!!codeError)}
                              style={{ paddingLeft: "2.5rem" }}
                              placeholder="Ex: ZEN2024"
                              value={form.inviteCode}
                              onChange={(e) => {
                                set("inviteCode", e.target.value.toUpperCase());
                                setCodeError("");
                                setCandidateCompany(null);
                              }}
                            />
                          </div>
                          <button
                            onClick={handleVerifyCode}
                            className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white text-sm rounded-xl transition-all"
                            style={{ fontWeight: 600 }}
                          >
                            Buscar
                          </button>
                        </div>
                      </Field>
                    ) : (
                      <Field label="Nome da empresa">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            className={inputCls(false)}
                            style={{ paddingLeft: "2.5rem" }}
                            placeholder="Digite o nome da empresa..."
                            value={nameSearch}
                            onChange={(e) => handleNameSearch(e.target.value)}
                          />
                          {nameSearch && (
                            <button onClick={() => setNameSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        {nameSearch.trim().length >= 2 && (
                          <div className="mt-2 border border-white/10 rounded-xl overflow-hidden">
                            {nameResults.length === 0 ? (
                              <p className="text-gray-500 text-sm text-center py-3">Nenhuma empresa encontrada</p>
                            ) : (
                              nameResults.map((c) => (
                                <button
                                  key={c.id}
                                  onClick={() => handleSelectByName(c)}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/10 last:border-0 text-left"
                                >
                                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs shrink-0" style={{ background: c.color, fontWeight: 700 }}>
                                    {c.logo}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm truncate" style={{ fontWeight: 600 }}>{c.name}</p>
                                    <p className="text-gray-400 text-xs truncate">{c.address}</p>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </Field>
                    )}
                  </div>
                ) : (
                  // ── Pick unit ────────────────────────────────────────
                  candidateCompany && (
                    <div className="space-y-4">
                      <div
                        className="flex items-center gap-3 p-3 rounded-xl border"
                        style={{ background: `${candidateCompany.color}15`, borderColor: `${candidateCompany.color}30` }}
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs shrink-0" style={{ background: candidateCompany.color, fontWeight: 700 }}>
                          {candidateCompany.logo}
                        </div>
                        <div>
                          <p className="text-white text-sm" style={{ fontWeight: 700 }}>{candidateCompany.name}</p>
                          <p className="text-gray-400 text-xs">{candidateCompany.address}</p>
                        </div>
                        <CheckCircle className="w-5 h-5 text-emerald-400 ml-auto shrink-0" />
                      </div>

                      <div>
                        <p className="text-gray-400 text-xs mb-2" style={{ fontWeight: 600 }}>
                          Escolha a unidade onde irá atuar *
                        </p>
                        <div className="space-y-2">
                          {candidateUnits.map((unit) => (
                            <button
                              key={unit.id}
                              onClick={() => setSelectedUnitId(unit.id === selectedUnitId ? null : unit.id)}
                              className="w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
                              style={
                                selectedUnitId === unit.id
                                  ? { borderColor: candidateCompany.color, background: `${candidateCompany.color}10` }
                                  : { borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }
                              }
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${candidateCompany.color}20` }}>
                                <MapPin className="w-4 h-4" style={{ color: candidateCompany.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="text-white text-sm" style={{ fontWeight: 600 }}>{unit.name}</p>
                                  {unit.isMain && (
                                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${candidateCompany.color}20`, color: candidateCompany.color, fontWeight: 600 }}>
                                      Principal
                                    </span>
                                  )}
                                </div>
                                <p className="text-gray-400 text-xs truncate">{unit.address}</p>
                              </div>
                              <div
                                className="w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center"
                                style={
                                  selectedUnitId === unit.id
                                    ? { borderColor: candidateCompany.color, background: candidateCompany.color }
                                    : { borderColor: "rgba(255,255,255,0.2)" }
                                }
                              >
                                {selectedUnitId === unit.id && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => { setCompanyStep("search"); setCandidateCompany(null); setSelectedUnitId(null); }}
                          className={secondaryBtn}
                        >
                          <ChevronLeft className="w-4 h-4" /> Voltar
                        </button>
                        <button
                          onClick={handleConfirmCompany}
                          disabled={!selectedUnitId && candidateUnits.length > 0}
                          className={`${primaryBtn} flex-1 disabled:opacity-50`}
                        >
                          Confirmar <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(2)}
                    className={secondaryBtn}
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`${primaryBtn} flex-1 disabled:opacity-60`}
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
                    ) : (
                      <>Criar perfil <ArrowRight className="w-4 h-4" /></>
                    )}
                  </button>
                </div>

                {submitError && (
                  <p className="text-red-400 text-xs mt-1">
                    <AlertCircle className="w-3.5 h-3.5 inline-block mr-1" />
                    {submitError}
                  </p>
                )}

                <p className="text-center text-gray-500 text-xs">
                  Sem empresa? Clique em "Criar perfil" assim mesmo. Você pode se vincular depois.
                </p>
              </div>
            )}

            {/* Footer links */}
            <div className="mt-6 text-center space-y-2">
              <p className="text-gray-500 text-sm">
                Já tem conta?{" "}
                <Link to="/" className="text-teal-400 hover:text-teal-300" style={{ fontWeight: 600 }}>
                  Fazer login
                </Link>
              </p>
              <p className="text-gray-600 text-xs">
                É uma empresa?{" "}
                <Link to="/cadastro" className="text-violet-400 hover:text-violet-300" style={{ fontWeight: 600 }}>
                  Cadastrar empresa
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = (hasError: boolean) =>
  `w-full px-4 py-3 rounded-xl border text-sm bg-white/5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all ${
    hasError
      ? "border-red-500/50 focus:ring-red-500/40"
      : "border-white/10 focus:ring-teal-500/50 focus:border-teal-500/50"
  }`;

const primaryBtn =
  "flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm hover:shadow-lg transition-all";

const secondaryBtn =
  "flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-sm border border-white/10 transition-all";

function Field({
  label, error, children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm mb-1.5" style={{ fontWeight: 600, color: "#D1D5DB" }}>
        {label}
      </label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}