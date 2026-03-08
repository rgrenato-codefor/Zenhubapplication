import { useState } from "react";
import { useNavigate, Link } from "react-router";
import {
  Sparkles, ArrowRight, Eye, EyeOff, Loader2, AlertCircle,
} from "../components/shared/icons";
import { useAuth, ROLE_ROUTES } from "../context/AuthContext";
import { GoogleButton } from "../components/shared/GoogleButton";
import { ZenHubLogo } from "../components/shared/ZenHubLogo";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, signInGoogle, loading: authLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setError(null);
    setSigningIn(true);
    try {
      const { route } = await signIn(email.trim(), password);
      navigate(route);
    } catch (err: any) {
      const code = err?.code ?? "";
      if (
        code === "auth/user-not-found" ||
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setError("E-mail ou senha incorretos.");
      } else if (code === "auth/user-not-registered") {
        setError("Nenhum cadastro encontrado para este e-mail. Por favor, faça o registro.");
      } else if (code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos.");
      } else if (code === "auth/user-disabled") {
        setError("Conta desativada. Entre em contato com o suporte.");
      } else {
        setError("Erro ao entrar. Tente novamente.");
      }
    } finally {
      setSigningIn(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { route } = await signInGoogle();
    navigate(route);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center justify-center gap-2 mb-8">
          <ZenHubLogo variant="full" textColor="#ffffff" height={40} />
          <p className="text-gray-400 text-sm">Plataforma de gestão de terapias</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <div className="mb-6">
            <h3 className="text-gray-900 text-2xl mb-1" style={{ fontWeight: 700 }}>
              Entrar na plataforma
            </h3>
            <p className="text-gray-500 text-sm">Acesse com suas credenciais</p>
          </div>

          {/* Google - temporariamente oculto */}
          {/* <GoogleButton onClick={handleGoogle} label="Continuar com Google" variant="light" /> */}

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-xs">ou entre com e-mail</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                placeholder="seu@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-2" style={{ fontWeight: 600 }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all pr-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="text-sm text-gray-600">Lembrar-me</span>
              </label>
              <a href="#" className="text-sm text-violet-600 hover:text-violet-700" style={{ fontWeight: 500 }}>
                Esqueci a senha
              </a>
            </div>

            <button
              type="submit"
              disabled={signingIn}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-700 text-white text-sm hover:shadow-lg hover:from-violet-700 hover:to-purple-800 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ fontWeight: 600 }}
            >
              {signingIn ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Entrando...</>
              ) : (
                <>Entrar <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-5">
            Ainda não tem conta?{" "}
            <Link to="/cadastro" className="text-violet-600 hover:text-violet-700" style={{ fontWeight: 600 }}>
              Cadastrar empresa
            </Link>
          </p>
          <p className="text-center text-gray-400 text-xs mt-2">
            É terapeuta?{" "}
            <Link to="/cadastro/terapeuta" className="text-teal-500 hover:text-teal-600" style={{ fontWeight: 600 }}>
              Criar perfil de terapeuta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}