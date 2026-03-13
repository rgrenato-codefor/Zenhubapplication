import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Mail, CheckCircle, Loader2, ArrowRight, RefreshCw, Eye, EyeOff } from "../../components/shared/icons";
import { ZenHubLogo } from "../../components/shared/ZenHubLogo";
import { auth } from "../../../lib/firebase";
import { sendEmailVerification, signInWithEmailAndPassword, signOut } from "firebase/auth";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!email) {
      navigate("/");
    }
  }, [email, navigate]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setResending(true);
    setError("");
    setResent(false);

    try {
      // Sign in temporarily to resend verification email
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      
      setResent(true);
      setShowPasswordForm(false);
      setPassword("");
      setTimeout(() => setResent(false), 5000);
    } catch (err: any) {
      console.error("Error resending verification email:", err);
      if (err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Senha incorreta.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Muitas tentativas. Aguarde alguns minutos.");
      } else {
        setError("Erro ao reenviar e-mail. Tente novamente.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-teal-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <ZenHubLogo variant="full" textColor="#ffffff" height={40} />
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {/* Icon */}
          <div className="w-20 h-20 rounded-full bg-teal-500/20 border-2 border-teal-500/30 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-teal-400" />
          </div>

          {/* Title */}
          <h1 className="text-white text-center mb-3" style={{ fontWeight: 700, fontSize: "1.75rem" }}>
            Verifique seu e-mail
          </h1>

          {/* Message */}
          <p className="text-gray-400 text-center text-sm leading-relaxed mb-6">
            Enviamos um link de verificação para{" "}
            <span className="text-teal-400" style={{ fontWeight: 600 }}>
              {email}
            </span>
            . Clique no link para ativar sua conta.
          </p>

          {/* Instructions */}
          <div className="space-y-3 mb-6">
            {[
              "1. Abra sua caixa de entrada",
              "2. Procure por um e-mail do ZEN HUB",
              "3. Clique no link de verificação",
              "4. Volte aqui e faça login",
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-teal-500/15 border border-teal-500/25 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-teal-400 text-xs" style={{ fontWeight: 700 }}>
                    {i + 1}
                  </span>
                </div>
                <p className="text-gray-300 text-sm">{step}</p>
              </div>
            ))}
          </div>

          {/* Spam warning */}
          <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-6">
            <p className="text-yellow-300 text-xs leading-relaxed">
              <span style={{ fontWeight: 700 }}>Não recebeu?</span> Verifique sua pasta de spam ou lixo eletrônico.
            </p>
          </div>

          {/* Resend section */}
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              disabled={resent}
              className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm flex items-center justify-center gap-2 mb-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ fontWeight: 600 }}
            >
              {resent ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  E-mail reenviado!
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Reenviar e-mail
                </>
              )}
            </button>
          ) : (
            <form onSubmit={handleResend} className="space-y-3 mb-4">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all pr-12"
                  placeholder="Digite sua senha"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <p className="text-red-400 text-xs">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowPasswordForm(false); setPassword(""); setError(""); }}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 text-sm transition-all"
                  style={{ fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={resending || !password}
                  className="flex-1 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontWeight: 600 }}
                >
                  {resending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Enviar
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Login button */}
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm flex items-center justify-center gap-2 transition-all hover:shadow-lg"
            style={{ fontWeight: 600 }}
          >
            Fazer login
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs mt-6">
          Já verificou seu e-mail? Faça login para acessar sua conta.
        </p>
      </div>
    </div>
  );
}