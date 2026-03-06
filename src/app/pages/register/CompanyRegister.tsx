import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Sparkles, Building2, MapPin, User, Lock, CheckCircle,
  ArrowRight, ArrowLeft, Eye, EyeOff, Loader2, Star, Zap, Crown,
  Phone, Mail, FileText, ChevronRight, AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
// Google sign-in temporariamente desativado:
// import { GoogleButton } from "../../components/shared/GoogleButton";
// import { signInWithGoogleGIS } from "../../../lib/googleGIS";

const STEPS = [
  { id: 1, label: "Empresa", icon: Building2 },
  { id: 2, label: "Endereço", icon: MapPin },
  { id: 3, label: "Responsável", icon: User },
  { id: 4, label: "Acesso", icon: Lock },
  { id: 5, label: "Plano", icon: Star },
];

const SEGMENTS = [
  "Clínica de Terapias", "Spa & Bem-estar", "Studio de Massagem",
  "Centro Holístico", "Clínica de Estética", "Outro",
];

const PLANS = [
  {
    id: "basic",
    name: "Básico",
    price: "R$ 97",
    period: "/mês",
    color: "#6B7280",
    icon: Star,
    highlight: false,
    features: [
      "Até 3 terapeutas",
      "50 agendamentos/mês",
      "Dashboard básico",
      "Suporte por e-mail",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 197",
    period: "/mês",
    color: "#7C3AED",
    icon: Zap,
    highlight: true,
    badge: "Mais popular",
    features: [
      "Até 10 terapeutas",
      "Agendamentos ilimitados",
      "Relatórios avançados",
      "Comissões automáticas",
      "Suporte prioritário",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "R$ 397",
    period: "/mês",
    color: "#D97706",
    icon: Crown,
    highlight: false,
    features: [
      "Terapeutas ilimitados",
      "Multi-unidades",
      "API & integrações",
      "Relatórios personalizados",
      "Gerente de conta dedicado",
    ],
  },
];

type FormData = {
  // Step 1
  companyName: string;
  cnpj: string;
  phone: string;
  segment: string;
  // Step 2
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  // Step 3
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone: string;
  role: string;
  // Step 4
  password: string;
  confirmPassword: string;
  // Step 5
  plan: string;
};

const initialForm: FormData = {
  companyName: "", cnpj: "", phone: "", segment: "",
  cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "",
  responsibleName: "", responsibleEmail: "", responsiblePhone: "", role: "",
  password: "", confirmPassword: "",
  plan: "pro",
};

function maskCNPJ(v: string) {
  return v.replace(/\D/g, "").slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskPhone(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskCEP(v: string) {
  return v.replace(/\D/g, "").slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

const BG_IMAGE = "https://images.unsplash.com/photo-1770573319051-c7e63d956d8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3ZWxsbmVzcyUyMHNwYSUyMHRoZXJhcHklMjB6ZW4lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzI2Nzg2NjF8MA&ixlib=rb-4.1.0&q=80&w=1080";

export default function CompanyRegister() {
  const navigate = useNavigate();
  const { registerCompany } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(initialForm);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (field: keyof FormData, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validateStep = () => {
    const e: Partial<FormData> = {};
    if (step === 1) {
      if (!form.companyName.trim()) e.companyName = "Obrigatório";
      if (!form.cnpj.trim()) e.cnpj = "Obrigatório";
      if (!form.phone.trim()) e.phone = "Obrigatório";
      if (!form.segment) e.segment = "Selecione um segmento";
    }
    if (step === 2) {
      if (!form.cep.trim()) e.cep = "Obrigatório";
      if (!form.street.trim()) e.street = "Obrigatório";
      if (!form.number.trim()) e.number = "Obrigatório";
      if (!form.city.trim()) e.city = "Obrigatório";
      if (!form.state.trim()) e.state = "Obrigatório";
    }
    if (step === 3) {
      if (!form.responsibleName.trim()) e.responsibleName = "Obrigatório";
      if (!form.responsibleEmail.trim()) e.responsibleEmail = "Obrigatório";
      else if (!/\S+@\S+\.\S+/.test(form.responsibleEmail)) e.responsibleEmail = "E-mail inválido";
      if (!form.responsiblePhone.trim()) e.responsiblePhone = "Obrigatório";
    }
    if (step === 4) {
      if (!form.password) e.password = "Obrigatório";
      else if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
      if (!form.confirmPassword) e.confirmPassword = "Obrigatório";
      else if (form.password !== form.confirmPassword) e.confirmPassword = "Senhas não coincidem";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, 5)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError("");
    try {
      await registerCompany({
        companyName: form.companyName,
        cnpj: form.cnpj,
        phone: form.phone,
        segment: form.segment,
        street: form.street,
        number: form.number,
        complement: form.complement,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
        cep: form.cep,
        responsibleName: form.responsibleName,
        responsibleEmail: form.responsibleEmail,
        responsiblePhone: form.responsiblePhone,
        role: form.role,
        password: form.password,
        plan: form.plan,
      });
      setDone(true);
      // Brief delay so the success screen is visible, then redirect
      setTimeout(() => navigate("/empresa"), 2000);
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setSubmitError("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
      } else if (code === "auth/weak-password") {
        setSubmitError("Senha muito fraca. Use no mínimo 6 caracteres.");
      } else if (code === "auth/invalid-email") {
        setSubmitError("E-mail inválido.");
      } else {
        setSubmitError("Erro ao criar conta. Verifique sua conexão e tente novamente.");
      }
      setSubmitting(false);
    }
  };

  // Google sign-in temporariamente desativado:
  // const handleGoogleLink = async () => {
  //   try {
  //     const cred = await signInWithGoogleGIS();
  //     const fbUser = cred.user;
  //     set("responsibleName", fbUser.displayName || form.responsibleName);
  //     set("responsibleEmail", fbUser.email || form.responsibleEmail);
  //     setGoogleLinked(true);
  //   } catch {
  //     // user cancelled or error — silently ignore
  //   }
  // };

  const inputCls = (field: keyof FormData) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 transition-all ${
      errors[field]
        ? "border-red-300 focus:ring-red-400"
        : "border-gray-200 focus:ring-violet-400 focus:border-transparent"
    }`;

  const labelCls = "block text-sm text-gray-700 mb-1.5" ;

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-600 rounded-full opacity-10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500 rounded-full opacity-10 blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white mb-3" style={{ fontWeight: 700, fontSize: "1.75rem" }}>
            Empresa cadastrada! 🎉
          </h1>
          <p className="text-gray-400 mb-2">
            Bem-vinda ao ZEN HUB, <span className="text-white" style={{ fontWeight: 600 }}>{form.companyName}</span>!
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Enviamos um e-mail de confirmação para{" "}
            <span className="text-gray-300">{form.responsibleEmail}</span>.
            Acesse sua conta para começar.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white hover:shadow-lg transition-all flex items-center justify-center gap-2"
            style={{ fontWeight: 600 }}
          >
            Acessar minha conta <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col relative overflow-hidden shrink-0">
        <img
          src={BG_IMAGE}
          alt="spa"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/70 via-gray-900/50 to-gray-900/90" />
        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white" style={{ fontWeight: 700, fontSize: "1.25rem" }}>ZEN HUB</span>
          </div>

          {/* Steps progress */}
          <div className="flex-1 flex flex-col justify-center py-10">
            <p className="text-gray-400 text-xs uppercase mb-6" style={{ fontWeight: 600 }}>
              Cadastro de empresa
            </p>
            <div className="space-y-3">
              {STEPS.map((s) => {
                const Icon = s.icon;
                const isActive = s.id === step;
                const isDone = s.id < step;
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${
                      isActive ? "bg-white/10 border border-white/20" : isDone ? "opacity-70" : "opacity-40"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                        isDone
                          ? "bg-emerald-500 text-white"
                          : isActive
                          ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
                          : "bg-white/10 text-white/60"
                      }`}
                    >
                      {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div>
                      <p
                        className={`text-sm ${isActive ? "text-white" : "text-white/70"}`}
                        style={{ fontWeight: isActive ? 700 : 500 }}
                      >
                        {s.label}
                      </p>
                      <p className="text-xs text-white/40">Passo {s.id} de {STEPS.length}</p>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-white/60 ml-auto" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <p className="text-white/30 text-xs">
            © 2026 ZEN HUB. Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white" style={{ fontWeight: 700 }}>ZEN HUB</span>
          </div>
          {/* Mobile step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  s.id === step ? "w-5 bg-violet-400" : s.id < step ? "w-1.5 bg-emerald-400" : "w-1.5 bg-white/20"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-lg">
            {/* Progress bar */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">
                  Passo <span className="text-white" style={{ fontWeight: 700 }}>{step}</span> de {STEPS.length}
                </span>
                <span className="text-gray-400 text-sm">{Math.round((step / STEPS.length) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${(step / STEPS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Step 1: Company */}
            {step === 1 && (
              <div>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-4">
                    <Building2 className="w-6 h-6 text-violet-400" />
                  </div>
                  <h2 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Dados da empresa</h2>
                  <p className="text-gray-400 text-sm">Conte-nos sobre o seu negócio</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>
                      Nome da empresa *
                    </label>
                    <input
                      className={inputCls("companyName")}
                      placeholder="Ex: Espaço Zen Terapias"
                      value={form.companyName}
                      onChange={(e) => set("companyName", e.target.value)}
                    />
                    {errors.companyName && <p className="text-red-400 text-xs mt-1">{errors.companyName}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>
                        CNPJ *
                      </label>
                      <input
                        className={inputCls("cnpj")}
                        placeholder="00.000.000/0001-00"
                        value={form.cnpj}
                        onChange={(e) => set("cnpj", maskCNPJ(e.target.value))}
                      />
                      {errors.cnpj && <p className="text-red-400 text-xs mt-1">{errors.cnpj}</p>}
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>
                        Telefone *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          className={`${inputCls("phone")} pl-10`}
                          placeholder="(11) 99999-9999"
                          value={form.phone}
                          onChange={(e) => set("phone", maskPhone(e.target.value))}
                        />
                      </div>
                      {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>
                      Segmento *
                    </label>
                    <select
                      className={inputCls("segment")}
                      value={form.segment}
                      onChange={(e) => set("segment", e.target.value)}
                    >
                      <option value="">Selecione o segmento...</option>
                      {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {errors.segment && <p className="text-red-400 text-xs mt-1">{errors.segment}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Address */}
            {step === 2 && (
              <div>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-4">
                    <MapPin className="w-6 h-6 text-teal-400" />
                  </div>
                  <h2 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Localização</h2>
                  <p className="text-gray-400 text-sm">Onde sua empresa está localizada?</p>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>CEP *</label>
                      <input
                        className={inputCls("cep")}
                        placeholder="00000-000"
                        value={form.cep}
                        onChange={(e) => set("cep", maskCEP(e.target.value))}
                      />
                      {errors.cep && <p className="text-red-400 text-xs mt-1">{errors.cep}</p>}
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Estado *</label>
                      <select
                        className={inputCls("state")}
                        value={form.state}
                        onChange={(e) => set("state", e.target.value)}
                      >
                        <option value="">UF</option>
                        {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map((uf) => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                      {errors.state && <p className="text-red-400 text-xs mt-1">{errors.state}</p>}
                    </div>
                  </div>
                  <div>
                    <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Logradouro *</label>
                    <input
                      className={inputCls("street")}
                      placeholder="Rua, Avenida, Alameda..."
                      value={form.street}
                      onChange={(e) => set("street", e.target.value)}
                    />
                    {errors.street && <p className="text-red-400 text-xs mt-1">{errors.street}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Número *</label>
                      <input
                        className={inputCls("number")}
                        placeholder="123"
                        value={form.number}
                        onChange={(e) => set("number", e.target.value)}
                      />
                      {errors.number && <p className="text-red-400 text-xs mt-1">{errors.number}</p>}
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Complemento</label>
                      <input
                        className={inputCls("complement")}
                        placeholder="Sala 1, Bloco A..."
                        value={form.complement}
                        onChange={(e) => set("complement", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Bairro</label>
                      <input
                        className={inputCls("neighborhood")}
                        placeholder="Centro"
                        value={form.neighborhood}
                        onChange={(e) => set("neighborhood", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Cidade *</label>
                      <input
                        className={inputCls("city")}
                        placeholder="São Paulo"
                        value={form.city}
                        onChange={(e) => set("city", e.target.value)}
                      />
                      {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Responsible */}
            {step === 3 && (
              <div>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-4">
                    <User className="w-6 h-6 text-blue-400" />
                  </div>
                  <h2 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Responsável</h2>
                  <p className="text-gray-400 text-sm">Quem vai administrar a plataforma?</p>
                </div>
                <div className="space-y-4">
                  {/* Google link - temporariamente oculto */}
                  {/* {!googleLinked ? (
                    <>
                      <GoogleButton onClick={handleGoogleLink} label="Preencher com Google" variant="dark" />
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-gray-500 text-xs">ou preencha manualmente</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-emerald-300 text-sm">Conta Google vinculada — dados preenchidos automaticamente</p>
                    </div>
                  )} */}
                  <div>
                    <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Nome completo *</label>
                    <input
                      className={inputCls("responsibleName")}
                      placeholder="Seu nome completo"
                      value={form.responsibleName}
                      onChange={(e) => set("responsibleName", e.target.value)}
                    />
                    {errors.responsibleName && <p className="text-red-400 text-xs mt-1">{errors.responsibleName}</p>}
                  </div>
                  <div>
                    <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>E-mail *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        className={`${inputCls("responsibleEmail")} pl-10`}
                        placeholder="seu@email.com"
                        value={form.responsibleEmail}
                        onChange={(e) => set("responsibleEmail", e.target.value)}
                      />
                    </div>
                    {errors.responsibleEmail && <p className="text-red-400 text-xs mt-1">{errors.responsibleEmail}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Telefone *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          className={`${inputCls("responsiblePhone")} pl-10`}
                          placeholder="(11) 99999-9999"
                          value={form.responsiblePhone}
                          onChange={(e) => set("responsiblePhone", maskPhone(e.target.value))}
                        />
                      </div>
                      {errors.responsiblePhone && <p className="text-red-400 text-xs mt-1">{errors.responsiblePhone}</p>}
                    </div>
                    <div>
                      <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Cargo</label>
                      <input
                        className={inputCls("role")}
                        placeholder="Proprietário, Gerente..."
                        value={form.role}
                        onChange={(e) => set("role", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Password */}
            {step === 4 && (
              <div>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
                    <Lock className="w-6 h-6 text-amber-400" />
                  </div>
                  <h2 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Crie sua senha</h2>
                  <p className="text-gray-400 text-sm">Essa será a senha de acesso do responsável</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Senha *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPass ? "text" : "password"}
                        className={`${inputCls("password")} pl-10 pr-12`}
                        placeholder="Mínimo 6 caracteres"
                        value={form.password}
                        onChange={(e) => set("password", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className={labelCls} style={{ fontWeight: 600, color: "#D1D5DB" }}>Confirmar senha *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showConfirm ? "text" : "password"}
                        className={`${inputCls("confirmPassword")} pl-10 pr-12`}
                        placeholder="Repita a senha"
                        value={form.confirmPassword}
                        onChange={(e) => set("confirmPassword", e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>

                  {/* Password strength */}
                  {form.password && (
                    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                      <p className="text-xs text-gray-400 mb-2" style={{ fontWeight: 600 }}>Força da senha</p>
                      <div className="flex gap-1 mb-2">
                        {[1,2,3,4].map((i) => {
                          const strength = Math.min(4, Math.floor(form.password.length / 3));
                          return (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-all ${
                                i <= strength
                                  ? strength <= 1 ? "bg-red-400" : strength <= 2 ? "bg-amber-400" : strength <= 3 ? "bg-blue-400" : "bg-emerald-400"
                                  : "bg-white/10"
                              }`}
                            />
                          );
                        })}
                      </div>
                      <div className="space-y-1">
                        {[
                          { label: "Mínimo 6 caracteres", ok: form.password.length >= 6 },
                          { label: "Letras maiúsculas e minúsculas", ok: /[a-z]/.test(form.password) && /[A-Z]/.test(form.password) },
                          { label: "Números", ok: /\d/.test(form.password) },
                        ].map((r) => (
                          <p key={r.label} className={`text-xs flex items-center gap-1.5 ${r.ok ? "text-emerald-400" : "text-gray-500"}`}>
                            <CheckCircle className="w-3 h-3" /> {r.label}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Plan */}
            {step === 5 && (
              <div>
                <div className="mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-4">
                    <Star className="w-6 h-6 text-purple-400" />
                  </div>
                  <h2 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>Escolha seu plano</h2>
                  <p className="text-gray-400 text-sm">Comece com 14 dias grátis em qualquer plano</p>
                </div>
                <div className="space-y-3">
                  {PLANS.map((plan) => {
                    const Icon = plan.icon;
                    const selected = form.plan === plan.id;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => set("plan", plan.id)}
                        className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                          selected
                            ? "border-violet-500 bg-violet-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${plan.color}20` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: plan.color }} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-white text-sm" style={{ fontWeight: 700 }}>{plan.name}</span>
                              {plan.badge && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300" style={{ fontWeight: 600 }}>
                                  {plan.badge}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                              {plan.features.slice(0, 2).map((f) => (
                                <span key={f} className="text-xs text-gray-400">{f}</span>
                              ))}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-white" style={{ fontWeight: 700 }}>{plan.price}</p>
                            <p className="text-gray-400 text-xs">{plan.period}</p>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                              selected ? "border-violet-500 bg-violet-500" : "border-white/20"
                            }`}
                          >
                            {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-gray-500 text-xs text-center mt-4">
                  Cancele quando quiser. Sem fidelidade.
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3 mt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={back}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl border border-white/20 text-white text-sm hover:bg-white/5 transition-all"
                  style={{ fontWeight: 600 }}
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </button>
              )}
              <button
                type="button"
                onClick={step < 5 ? next : handleSubmit}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm hover:shadow-lg hover:from-violet-700 hover:to-purple-800 transition-all disabled:opacity-60"
                style={{ fontWeight: 600 }}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Cadastrando...</>
                ) : step < 5 ? (
                  <>Continuar <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>Finalizar cadastro <CheckCircle className="w-4 h-4" /></>
                )}
              </button>
            </div>

            {/* Login link */}
            <p className="text-center text-gray-500 text-sm mt-6">
              Já tem uma conta?{" "}
              <Link to="/" className="text-violet-400 hover:text-violet-300" style={{ fontWeight: 600 }}>
                Fazer login
              </Link>
            </p>

            {/* Error message */}
            {submitError && (
              <p className="text-center text-red-400 text-sm mt-4">
                <AlertCircle className="w-4 h-4 inline-block mr-1" /> {submitError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}