import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import {
  Sparkles, User, Mail, Phone, Lock, Eye, EyeOff,
  ArrowRight, CheckCircle, Loader2, Heart, Calendar, Star, AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const BG_IMAGE = "https://images.unsplash.com/photo-1633526543913-d30e3c230d1f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXNzYWdlJTIwdGhlcmFweSUyMHJlbGF4YXRpb24lMjBoYW5kc3xlbnwxfHx8fDE3NzI2Nzg2NjF8MA&ixlib=rb-4.1.0&q=80&w=1080";

function maskPhone(v: string) {
  return v.replace(/\D/g, "").slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskDate(v: string) {
  return v.replace(/\D/g, "").slice(0, 8)
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");
}

type Form = {
  name: string;
  email: string;
  phone: string;
  birthdate: string;
  password: string;
  confirmPassword: string;
};

const BENEFITS = [
  { icon: Calendar, text: "Agende sessões online 24h" },
  { icon: Heart, text: "Acompanhe seu histórico de terapias" },
  { icon: Star, text: "Avalie seus terapeutas" },
];

export default function ClientRegister() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();
  const { registerClient } = useAuth();

  const [form, setForm] = useState<Form>({
    name: "", email: "", phone: "", birthdate: "", password: "", confirmPassword: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Partial<Form>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const set = (field: keyof Form, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const validate = () => {
    const e: Partial<Form> = {};
    if (!form.name.trim()) e.name = "Obrigatório";
    if (!form.email.trim()) e.email = "Obrigatório";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "E-mail inválido";
    if (!form.phone.trim()) e.phone = "Obrigatório";
    if (!form.password) e.password = "Obrigatório";
    else if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (!form.confirmPassword) e.confirmPassword = "Obrigatório";
    else if (form.password !== form.confirmPassword) e.confirmPassword = "Senhas não coincidem";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (!agreed) { alert("Aceite os termos para continuar."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      await registerClient({
        name: form.name,
        email: form.email,
        phone: form.phone,
        birthdate: form.birthdate,
        password: form.password,
        slug,
      });
      setDone(true);
      setTimeout(() => navigate("/cliente"), 2500);
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setSubmitError("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
      } else if (code === "auth/weak-password") {
        setSubmitError("Senha muito fraca. Use no mínimo 6 caracteres.");
      } else {
        setSubmitError("Erro ao criar conta. Tente novamente.");
      }
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    const { route } = await signInGoogle();
    navigate(route);
  };

  const inputCls = (field: keyof Form) =>
    `w-full px-4 py-3 rounded-xl border text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 transition-all ${
      errors[field]
        ? "border-red-300 focus:ring-red-400"
        : "border-gray-200 focus:ring-teal-400 focus:border-transparent"
    }`;

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-600 rounded-full opacity-10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500 rounded-full opacity-10 blur-3xl" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-white mb-3" style={{ fontWeight: 700, fontSize: "1.75rem" }}>
            Conta criada! 🌿
          </h1>
          <p className="text-gray-400 mb-2">
            Bem-vindo(a), <span className="text-white" style={{ fontWeight: 600 }}>{form.name.split(" ")[0]}</span>!
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Enviamos um e-mail de confirmação para{" "}
            <span className="text-gray-300">{form.email}</span>.
          </p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white hover:shadow-lg transition-all flex items-center justify-center gap-2"
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
      <div className="hidden lg:flex lg:w-[400px] xl:w-[460px] flex-col relative overflow-hidden shrink-0">
        <img
          src={BG_IMAGE}
          alt="therapy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/90" />
        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-white" style={{ fontWeight: 700, fontSize: "1.25rem" }}>ZEN HUB</span>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col justify-center py-10">
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-5">
                <Heart className="w-7 h-7 text-teal-400" />
              </div>
              <h2 className="text-white mb-2" style={{ fontWeight: 700, fontSize: "1.75rem", lineHeight: 1.2 }}>
                Cuide-se com quem<br />entende de você
              </h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                Crie sua conta de cliente e tenha acesso a terapeutas especializados, agendamento fácil e histórico completo de sessões.
              </p>
            </div>

            <div className="space-y-4">
              {BENEFITS.map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.text} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/25 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-teal-400" />
                    </div>
                    <p className="text-gray-300 text-sm">{b.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white" style={{ fontWeight: 700 }}>ZEN HUB</span>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-lg">
            <div className="mb-8">
              <h2 className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.5rem" }}>
                Criar conta de cliente
              </h2>
              <p className="text-gray-400 text-sm">
                {slug
                  ? `Cadastro para acesso ao espaço`
                  : "Preencha os dados para criar sua conta"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Google - temporariamente oculto */}
              {/* <GoogleButton onClick={handleGoogle} label="Cadastrar com Google" variant="dark" /> */}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-gray-500 text-xs">ou preencha os dados</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm mb-1.5" style={{ fontWeight: 600, color: "#D1D5DB" }}>
                  Nome completo *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    className={`${inputCls("name")} pl-10`}
                    placeholder="Seu nome completo"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </div>
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm mb-1.5" style={{ fontWeight: 600, color: "#D1D5DB" }}>
                  E-mail *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    className={`${inputCls("email")} pl-10`}
                    placeholder="seu@email.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </div>
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>

              {/* Phone + Birthdate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1.5" style={{ fontWeight: 600, color: "#D1D5DB" }}>
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
                <div>
                  <label className="block text-sm mb-1.5" style={{ fontWeight: 600, color: "#D1D5DB" }}>
                    Data de nascimento
                  </label>
                  <input
                    className={inputCls("birthdate")}
                    placeholder="DD/MM/AAAA"
                    value={form.birthdate}
                    onChange={(e) => set("birthdate", maskDate(e.target.value))}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm mb-1.5" style={{ fontWeight: 600, color: "#D1D5DB" }}>
                  Senha *
                </label>
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm mb-1.5" style={{ fontWeight: 600, color: "#D1D5DB" }}>
                  Confirmar senha *
                </label>
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
              </div>

              {submitError && (
                <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {submitError}
                </div>
              )}

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    agreed
                      ? "border-teal-500 bg-teal-500"
                      : "border-white/20 group-hover:border-white/40"
                  }`}
                  onClick={() => setAgreed(!agreed)}
                >
                  {agreed && <CheckCircle className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm text-gray-400">
                  Li e aceito os{" "}
                  <a href="#" className="text-teal-400 hover:text-teal-300">Termos de Uso</a>{" "}
                  e a{" "}
                  <a href="#" className="text-teal-400 hover:text-teal-300">Política de Privacidade</a>
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                style={{ fontWeight: 600 }}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
                ) : (
                  <>Criar minha conta <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-gray-500 text-sm mt-6">
              Já tem uma conta?{" "}
              <Link to="/" className="text-teal-400 hover:text-teal-300" style={{ fontWeight: 600 }}>
                Fazer login
              </Link>
            </p>
            <p className="text-center text-gray-600 text-xs mt-3">
              É uma empresa?{" "}
              <Link to="/cadastro" className="text-violet-400 hover:text-violet-300" style={{ fontWeight: 600 }}>
                Cadastrar empresa
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}