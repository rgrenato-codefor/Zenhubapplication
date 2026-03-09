import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Globe, Bell, Shield, CreditCard, User,
  Save, Loader2, CheckCheck, AlertTriangle,
  Eye, EyeOff, Lock, ChevronRight, RefreshCw,
  Mail, Clock, Languages,
} from "../../components/shared/icons";
import { useAuth } from "../../context/AuthContext";
import {
  getPlatformSettings, savePlatformSettings,
  updateUserProfile,
  type PlatformSettings,
} from "../../../lib/firestore";
import {
  updatePassword, EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth } from "../../../lib/firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULTS: Omit<PlatformSettings, "updatedAt"> = {
  platformName: "ZEN HUB",
  domain: "zenhub.online",
  supportEmail: "suporte@zenhub.online",
  timezone: "America/Sao_Paulo",
  language: "pt-BR",
  notifications: {
    newCompany:    true,
    weeklyReport:  true,
    paymentAlerts: false,
    newUsers:      false,
    planUpgrades:  true,
  },
};

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-violet-600" : "bg-gray-600"}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${on ? "left-5" : "left-0.5"}`}
      />
    </button>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon: Icon, iconColor, title, subtitle, children,
}: {
  icon: React.ElementType;
  iconColor: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ background: `${iconColor}22` }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <div>
          <h3 className="text-white">{title}</h3>
          {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AdminSettings() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  // ── Load state ─────────────────────────────────────────────────────────────
  const [loadingSettings, setLoadingSettings] = useState(true);

  // ── Platform fields ────────────────────────────────────────────────────────
  const [platformName, setPlatformName] = useState(DEFAULTS.platformName);
  const [domain,       setDomain]       = useState(DEFAULTS.domain);
  const [supportEmail, setSupportEmail] = useState(DEFAULTS.supportEmail);
  const [timezone,     setTimezone]     = useState(DEFAULTS.timezone);
  const [language,     setLanguage]     = useState(DEFAULTS.language);

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifs, setNotifs] = useState(DEFAULTS.notifications);

  // ── Admin profile ──────────────────────────────────────────────────────────
  const [adminName,  setAdminName]  = useState(user?.name  || "");
  const [adminEmail, setAdminEmail] = useState(user?.email || "");

  // ── Password change ────────────────────────────────────────────────────────
  const [currentPwd,  setCurrentPwd]  = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [confirmPwd,  setConfirmPwd]  = useState("");
  const [showPwds,    setShowPwds]    = useState(false);
  const [pwdError,    setPwdError]    = useState("");
  const [savingPwd,   setSavingPwd]   = useState(false);

  // ── Save states ────────────────────────────────────────────────────────────
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [savingProfile,  setSavingProfile]  = useState(false);

  // ── Toast ──────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load from Firestore ────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      setLoadingSettings(true);
      const saved = await getPlatformSettings();
      if (saved) {
        setPlatformName(saved.platformName  || DEFAULTS.platformName);
        setDomain(saved.domain              || DEFAULTS.domain);
        setSupportEmail(saved.supportEmail  || DEFAULTS.supportEmail);
        setTimezone(saved.timezone          || DEFAULTS.timezone);
        setLanguage(saved.language          || DEFAULTS.language);
        setNotifs({ ...DEFAULTS.notifications, ...saved.notifications });
      }
      setLoadingSettings(false);
    })();
  }, []);

  useEffect(() => {
    setAdminName(user?.name  || "");
    setAdminEmail(user?.email || "");
  }, [user]);

  // ── Save platform settings ─────────────────────────────────────────────────

  const handleSavePlatform = async () => {
    setSavingPlatform(true);
    try {
      await savePlatformSettings({ platformName, domain, supportEmail, timezone, language, notifications: notifs });
      showToast("success", "Configurações da plataforma salvas!");
    } catch {
      showToast("error", "Erro ao salvar configurações. Verifique as permissões do Firestore.");
    } finally {
      setSavingPlatform(false);
    }
  };

  // ── Save admin profile ─────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSavingProfile(true);
    try {
      await updateUserProfile(user.uid, { name: adminName });
      showToast("success", "Perfil atualizado!");
    } catch {
      showToast("error", "Erro ao atualizar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    setPwdError("");
    if (newPwd.length < 6) { setPwdError("A nova senha deve ter ao menos 6 caracteres."); return; }
    if (newPwd !== confirmPwd) { setPwdError("As senhas não coincidem."); return; }
    if (!currentPwd) { setPwdError("Informe a senha atual."); return; }

    setSavingPwd(true);
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser || !firebaseUser.email) throw new Error("Usuário não autenticado.");
      const cred = EmailAuthProvider.credential(firebaseUser.email, currentPwd);
      await reauthenticateWithCredential(firebaseUser, cred);
      await updatePassword(firebaseUser, newPwd);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      showToast("success", "Senha alterada com sucesso!");
    } catch (e: any) {
      const msg = e?.code === "auth/wrong-password" || e?.code === "auth/invalid-credential"
        ? "Senha atual incorreta."
        : "Erro ao alterar senha. Tente novamente.";
      setPwdError(msg);
    } finally {
      setSavingPwd(false);
    }
  };

  const toggleNotif = (key: keyof typeof notifs) =>
    setNotifs((prev) => ({ ...prev, [key]: !prev[key] }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm ${
          toast.type === "success"
            ? "bg-emerald-900/90 border-emerald-700 text-emerald-300"
            : "bg-red-900/90 border-red-700 text-red-300"
        }`}>
          {toast.type === "success"
            ? <CheckCheck className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white">Configurações</h1>
          <p className="text-gray-400 text-sm mt-0.5">Configurações gerais da plataforma ZEN HUB</p>
        </div>
        {loadingSettings && (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando...
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column (2/3) ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Perfil do Administrador */}
          <Section icon={User} iconColor="#7C3AED" title="Perfil do Administrador" subtitle="Seus dados como super admin">
            <div className="flex items-center gap-4 mb-5">
              <div
                className="w-14 h-14 rounded-xl bg-violet-600 flex items-center justify-center text-white shrink-0"
                style={{ fontSize: 22, fontWeight: 700 }}
              >
                {(adminName || user?.name || "A").charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-white text-sm" style={{ fontWeight: 600 }}>{user?.name}</p>
                <p className="text-gray-400 text-xs">{user?.email}</p>
                <span className="inline-block mt-1 text-xs bg-violet-900/40 text-violet-400 border border-violet-700/40 px-2 py-0.5 rounded-full">
                  Super Admin
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Nome de exibição</label>
                <input
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">E-mail</label>
                <input
                  value={adminEmail}
                  disabled
                  className="w-full px-3 py-2.5 bg-gray-700/50 border border-gray-700 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-600 mt-1">E-mail não pode ser alterado aqui.</p>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile || !adminName.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Perfil
              </button>
            </div>
          </Section>

          {/* Informações Gerais da Plataforma */}
          <Section icon={Globe} iconColor="#3B82F6" title="Plataforma" subtitle="Dados gerais exibidos na plataforma">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Nome da Plataforma
                </label>
                <input
                  value={platformName}
                  onChange={(e) => setPlatformName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Domínio
                </label>
                <input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> E-mail de Suporte
                </label>
                <input
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  type="email"
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Fuso Horário
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="America/Sao_Paulo">America/Sao_Paulo (BRT −3)</option>
                  <option value="America/Manaus">America/Manaus (AMT −4)</option>
                  <option value="America/Fortaleza">America/Fortaleza (BRT −3)</option>
                  <option value="America/Belem">America/Belem (BRT −3)</option>
                  <option value="America/Noronha">America/Noronha (FNT −2)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Languages className="w-3.5 h-3.5" /> Idioma Padrão
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en-US">English (US)</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={handleSavePlatform}
                disabled={savingPlatform || loadingSettings}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {savingPlatform ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Plataforma
              </button>
            </div>
          </Section>

          {/* Notificações */}
          <Section icon={Bell} iconColor="#F59E0B" title="Notificações" subtitle="Alertas recebidos pelo super admin">
            <div className="space-y-1">
              {([
                { key: "newCompany",    label: "Novas empresas cadastradas",    desc: "Alerta quando uma nova empresa se registrar na plataforma" },
                { key: "weeklyReport",  label: "Relatório semanal",              desc: "Resumo consolidado enviado toda segunda-feira" },
                { key: "paymentAlerts", label: "Alertas de pagamento",           desc: "Notificações sobre assinaturas vencidas ou falhas de cobrança" },
                { key: "newUsers",      label: "Novos usuários",                 desc: "Alerta de novos cadastros de profissionais e clientes" },
                { key: "planUpgrades",  label: "Upgrades de plano",              desc: "Quando uma empresa ou profissional muda de plano" },
              ] as { key: keyof typeof notifs; label: string; desc: string }[]).map((item) => (
                <div key={item.key} className="flex items-center justify-between py-3.5 border-b border-gray-700/60 last:border-0 gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{item.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle on={notifs[item.key]} onChange={() => toggleNotif(item.key)} />
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSavePlatform}
                disabled={savingPlatform || loadingSettings}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{ fontWeight: 600 }}
              >
                {savingPlatform ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Notificações
              </button>
            </div>
          </Section>

          {/* Segurança */}
          <Section icon={Shield} iconColor="#10B981" title="Segurança" subtitle="Altere sua senha de acesso">
            <div className="space-y-4">
              {[
                { label: "Senha atual",    val: currentPwd, set: setCurrentPwd },
                { label: "Nova senha",     val: newPwd,     set: setNewPwd     },
                { label: "Confirmar nova", val: confirmPwd, set: setConfirmPwd },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-xs text-gray-400 mb-1.5">{f.label}</label>
                  <div className="relative">
                    <input
                      type={showPwds ? "text" : "password"}
                      value={f.val}
                      onChange={(e) => f.set(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2.5 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500 placeholder-gray-600"
                    />
                    <button
                      onClick={() => setShowPwds(!showPwds)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                      type="button"
                    >
                      {showPwds ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}

              {pwdError && (
                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {pwdError}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-gray-500">Mínimo de 6 caracteres.</p>
                <button
                  onClick={handleChangePassword}
                  disabled={savingPwd || !currentPwd || !newPwd || !confirmPwd}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm transition-colors disabled:opacity-40"
                  style={{ fontWeight: 600 }}
                >
                  {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Alterar Senha
                </button>
              </div>
            </div>
          </Section>

        </div>

        {/* ── Right column (1/3) ── */}
        <div className="space-y-5">

          {/* Planos — atalho */}
          <Section icon={CreditCard} iconColor="#F59E0B" title="Planos" subtitle="Gerenciamento de planos e preços">
            <p className="text-xs text-gray-400 mb-4">
              Configure planos de empresa e profissional, preços, módulos liberados e limites de uso na página dedicada.
            </p>
            <button
              onClick={() => navigate("/admin/planos")}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-700/60 hover:bg-gray-700 border border-gray-600 rounded-xl text-sm text-white transition-colors"
            >
              <span>Gerenciar Planos</span>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </Section>

          {/* Sessão atual */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-5">
            <h4 className="text-white text-sm mb-3" style={{ fontWeight: 600 }}>Sessão Atual</h4>
            <div className="space-y-2">
              {[
                { label: "Usuário",   value: user?.name  || "—" },
                { label: "E-mail",    value: user?.email || "—" },
                { label: "Papel",     value: "Super Admin"       },
                { label: "Projeto Firebase", value: "zen-hub-f61be" },
              ].map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-2">
                  <span className="text-xs text-gray-500 shrink-0">{row.label}</span>
                  <span className="text-xs text-gray-300 text-right break-all">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zona de perigo */}
          <div className="bg-red-900/10 border border-red-700/30 rounded-xl p-5">
            <h4 className="text-red-400 text-sm mb-2" style={{ fontWeight: 600 }}>Zona de Perigo</h4>
            <p className="text-xs text-gray-500 mb-4">Ações irreversíveis. Prossiga com cuidado.</p>
            <button
              disabled
              className="w-full py-2 border border-red-700/50 text-red-500/60 rounded-lg text-xs cursor-not-allowed"
            >
              Resetar dados da plataforma
            </button>
            <p className="text-xs text-gray-600 mt-2 text-center">Disponível em versões futuras.</p>
          </div>

        </div>
      </div>
    </div>
  );
}