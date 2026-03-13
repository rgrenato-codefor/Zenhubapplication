/**
 * CompanyDetailModal
 * Slide-in drawer showing full statistical details for a company in the Super Admin view.
 */

import { useMemo } from "react";
import {
  X,
  Building2,
  Users,
  DollarSign,
  CheckCircle,
  XCircle,
  TrendingUp,
  Mail,
  Phone,
  MapPin,
  Star,
  Calendar,
  CreditCard,
  Activity,
} from "../shared/icons";
import type { Company } from "../../context/DataContext";
import { useCompanyPlan } from "../../hooks/useCompanyPlan";
import {
  COMPANY_MODULES,
  type ModuleKey,
} from "../../lib/planConfig";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const planColorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  Premium:  { bg: "bg-amber-500/10",  text: "text-amber-400",   border: "border-amber-500/30",  glow: "#F59E0B" },
  Business: { bg: "bg-violet-500/10", text: "text-violet-400",  border: "border-violet-500/30", glow: "#8B5CF6" },
  Starter:  { bg: "bg-blue-500/10",   text: "text-blue-400",    border: "border-blue-500/30",   glow: "#3B82F6" },
  Gratuito: { bg: "bg-gray-500/10",   text: "text-gray-400",    border: "border-gray-500/30",   glow: "#6B7280" },
};

function fmt(v: number): string {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(1)}k`;
  return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function formatDate(createdAt: any): string {
  if (!createdAt) return "—";
  try {
    const ms = createdAt.seconds ? createdAt.seconds * 1000 : Number(createdAt);
    return new Date(ms).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return "—";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
}

function StatCard({ label, value, sub, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-gray-750 rounded-xl border border-gray-700/60 p-4 flex flex-col gap-2">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-xl text-white mt-0.5" style={{ fontWeight: 700 }}>{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  company: Company | null;
  onClose: () => void;
}

export function CompanyDetailModal({ company, onClose }: Props) {
  // Use the same hook as the company panel — resolves from Firestore first
  // Must be called before any early returns (rules of hooks)
  const { planConfig, hasModule, getLimit } = useCompanyPlan(company?.plan);

  const allModules = useMemo(
    () =>
      (Object.entries(COMPANY_MODULES) as [ModuleKey, string][]).map(([key, label]) => ({
        key,
        label,
        included: hasModule(key),
      })),
    [hasModule]
  );

  if (!company) return null;

  const planColors = planColorMap[planConfig.name] ?? planColorMap.Gratuito;
  const mrr = planConfig.price;
  const registrationDate = formatDate(company.createdAt);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 border-b border-gray-700/60 shrink-0">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
              style={{ background: company.color || "#7C3AED", fontSize: 22, fontWeight: 700 }}
            >
              {company.logo || company.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-white">{company.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                {/* Plan badge */}
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full border ${planColors.bg} ${planColors.text} ${planColors.border}`}
                  style={{ fontWeight: 600 }}
                >
                  {planConfig.badge} {planConfig.name}
                </span>
                {/* Status */}
                {company.status === "active" ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span className="text-xs">Ativa</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-400">
                    <XCircle className="w-3.5 h-3.5" />
                    <span className="text-xs">Inativa</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── Stat grid ── */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>
              Métricas Gerais
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Profissionais"
                value={company.therapistsCount || 0}
                sub="vinculados"
                icon={Star}
                color="#0D9488"
              />
              <StatCard
                label="Clientes"
                value={company.clientsCount || 0}
                sub="cadastrados"
                icon={Users}
                color="#3B82F6"
              />
              <StatCard
                label="Receita este mês"
                value={fmt(company.monthRevenue || 0)}
                sub="receita operacional"
                icon={TrendingUp}
                color="#10B981"
              />
              <StatCard
                label="Receita total"
                value={fmt(company.totalRevenue || 0)}
                sub="acumulado histórico"
                icon={DollarSign}
                color="#F59E0B"
              />
            </div>
          </div>

          {/* ── Subscription info ── */}
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4 text-violet-400" />
              <p className="text-sm text-white" style={{ fontWeight: 600 }}>Assinatura ZEN HUB</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Plano contratado</p>
                <p className="text-white mt-0.5" style={{ fontWeight: 600 }}>{planConfig.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Valor mensal (MRR)</p>
                <p className="mt-0.5" style={{ color: planColors.glow, fontWeight: 700 }}>
                  {mrr === 0 ? "Gratuito" : fmt(mrr) + "/mês"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Limite de profissionais</p>
                <p className="text-white mt-0.5">
                  {getLimit("therapists") === null ? "Ilimitado" : getLimit("therapists")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Limite de clientes</p>
                <p className="text-white mt-0.5">
                  {getLimit("clients") === null ? "Ilimitado" : getLimit("clients")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Limite de unidades</p>
                <p className="text-white mt-0.5">
                  {getLimit("units") === null ? "Ilimitado" : getLimit("units")}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">ARR projetado</p>
                <p className="text-white mt-0.5">{mrr === 0 ? "—" : fmt(mrr * 12)}</p>
              </div>
            </div>
          </div>

          {/* ── Usage vs limits ── */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>
              Uso vs. Limites do Plano
            </p>
            <div className="space-y-3">
              {getLimit("therapists") !== null && (
                <UsageBar
                  label="Profissionais"
                  current={company.therapistsCount || 0}
                  max={getLimit("therapists")!}
                  color="#0D9488"
                />
              )}
              {getLimit("clients") !== null && (
                <UsageBar
                  label="Clientes"
                  current={company.clientsCount || 0}
                  max={getLimit("clients")!}
                  color="#3B82F6"
                />
              )}
              {getLimit("units") !== null && (
                <UsageBar
                  label="Unidades"
                  current={(company as any).unitsCount || 1}
                  max={getLimit("units")!}
                  color="#8B5CF6"
                />
              )}
              {getLimit("therapists") === null && getLimit("clients") === null && getLimit("units") === null && (
                <p className="text-xs text-gray-500">Plano sem limites — todos os recursos estão liberados.</p>
              )}
            </div>
          </div>

          {/* ── Modules ── */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>
              Módulos do Plano
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {allModules.map((m) => (
                <div
                  key={m.key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                    m.included
                      ? "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                      : "bg-gray-800/40 text-gray-600 border border-gray-700/40"
                  }`}
                >
                  {m.included ? (
                    <CheckCircle className="w-3 h-3 text-violet-400 shrink-0" />
                  ) : (
                    <XCircle className="w-3 h-3 text-gray-600 shrink-0" />
                  )}
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* ── Contact info ── */}
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-white" style={{ fontWeight: 600 }}>Informações de Contato</p>
            </div>
            <div className="space-y-2.5">
              {company.email && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-gray-300">{company.email}</span>
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-gray-300">{company.phone}</span>
                </div>
              )}
              {company.address && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                  <span className="text-gray-300">{company.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* ── Registration info ── */}
          <div className="bg-gray-800/60 rounded-xl border border-gray-700/60 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-white" style={{ fontWeight: 600 }}>Registro na Plataforma</p>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Código de convite</p>
                <p className="font-mono text-violet-400 mt-0.5" style={{ fontWeight: 600 }}>
                  {company.inviteCode || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">ID do documento</p>
                <p className="font-mono text-gray-500 mt-0.5 text-xs break-all">{company.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Data de cadastro</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-gray-300">{registrationDate}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400">Status operacional</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {company.status === "active" ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <p className="text-emerald-400">Ativa</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                      <p className="text-red-400">Inativa</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t border-gray-700/60 shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            Dados sincronizados do Firestore
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  );
}

// ─── UsageBar ─────────────────────────────────────────────────────────────────

function UsageBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const pct = Math.min((current / max) * 100, 100);
  const isWarning = pct >= 80;
  const isFull = pct >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-400">{label}</span>
        <span className={`text-xs ${isFull ? "text-red-400" : isWarning ? "text-amber-400" : "text-gray-400"}`} style={{ fontWeight: 600 }}>
          {current} / {max}
        </span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: isFull ? "#EF4444" : isWarning ? "#F59E0B" : color,
          }}
        />
      </div>
    </div>
  );
}