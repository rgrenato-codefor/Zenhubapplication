import { Link } from "react-router";
import { ZenHubLogo } from "../../components/shared/ZenHubLogo";
import { Building2, UserCircle, ChevronRight, Sparkles } from "../../components/shared/icons";

export default function RegisterSelect() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-6">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-violet-600 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-teal-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600 rounded-full opacity-5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <ZenHubLogo variant="full" textColor="#ffffff" height={40} />
          <p className="text-gray-400 text-sm mt-3">Plataforma de gestão de terapias</p>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1 className="text-white mb-2" style={{ fontWeight: 700, fontSize: "1.75rem" }}>
            Criar sua conta
          </h1>
          <p className="text-gray-400 text-sm">
            Como você vai usar o ZEN HUB?
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Profissional */}
          <Link
            to="/cadastro/terapeuta"
            className="group relative flex flex-col p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-teal-500/40 transition-all duration-200 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl" />

            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-4">
              <UserCircle className="w-6 h-6 text-teal-400" />
            </div>

            <div className="flex-1">
              <p className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                Sou Profissional
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Massagistas, terapeutas e especialistas. Crie seu perfil com URL pública e gerencie seus atendimentos.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-5 text-teal-400" style={{ fontWeight: 600, fontSize: "0.8rem" }}>
              Criar perfil de profissional
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Empresa */}
          <Link
            to="/cadastro/empresa"
            className="group relative flex flex-col p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 hover:border-violet-500/40 transition-all duration-200 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl" />

            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center mb-4">
              <Building2 className="w-6 h-6 text-violet-400" />
            </div>

            <div className="flex-1">
              <p className="text-white mb-1" style={{ fontWeight: 700, fontSize: "1.05rem" }}>
                Sou uma Empresa
              </p>
              <p className="text-gray-400 text-xs leading-relaxed">
                Clínicas, spas e centros de bem-estar. Gerencie equipe, agenda, salas e relatórios em um só lugar.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-5 text-violet-400" style={{ fontWeight: 600, fontSize: "0.8rem" }}>
              Cadastrar empresa
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>

        {/* Info badge */}
        <div className="mt-5 p-3 rounded-xl bg-white/5 border border-white/8 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-gray-400 text-xs leading-relaxed">
            <span className="text-gray-200" style={{ fontWeight: 600 }}>Profissional autônomo?</span>{" "}
            Você pode atuar de forma independente ou se vincular a uma empresa depois do cadastro, sem perder seu histórico.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-sm mt-8">
          Já tem conta?{" "}
          <Link to="/" className="text-violet-400 hover:text-violet-300 transition-colors" style={{ fontWeight: 600 }}>
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
