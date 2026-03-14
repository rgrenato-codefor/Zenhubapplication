/**
 * PlanGate
 * Shows a "upgrade required" overlay when a company tries to access a module
 * that is not included in their current plan.
 * Pass isLoading=true while plan data is being fetched to show a skeleton
 * instead of a false-positive locked screen.
 */

import { useNavigate } from "react-router";
import { Lock, ChevronRight, Star } from "./icons";
import type { CompanyPlan, ModuleKey } from "../../lib/planConfig";
import { COMPANY_MODULES } from "../../lib/planConfig";

interface PlanGateProps {
  /** The module key being blocked */
  module: ModuleKey;
  /** The company's current plan config */
  planConfig: CompanyPlan;
  /** Primary brand color */
  primaryColor?: string;
  /** While true, render a neutral skeleton instead of the lock screen */
  isLoading?: boolean;
}

export function PlanGate({ module, planConfig, primaryColor = "#7C3AED", isLoading = false }: PlanGateProps) {
  const navigate = useNavigate();
  const moduleName = COMPANY_MODULES[module];

  // ── Loading skeleton: never show a false-positive lock during Firestore fetch ──
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div
          className="w-12 h-12 rounded-full border-4 border-gray-100 animate-spin"
          style={{ borderTopColor: primaryColor }}
        />
        <p className="text-gray-400 text-sm animate-pulse">Verificando plano...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      {/* Lock icon */}
      <div
        className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6 shadow-lg"
        style={{ background: `${primaryColor}15`, border: `2px solid ${primaryColor}30` }}
      >
        <Lock className="w-9 h-9" style={{ color: primaryColor }} />
      </div>

      <h2 className="text-gray-900 mb-2">{moduleName}</h2>
      <p className="text-gray-500 text-sm max-w-sm mb-2">
        O módulo <strong className="text-gray-700">{moduleName}</strong> não está disponível no
        plano <strong className="text-gray-700">{planConfig.name}</strong>.
      </p>
      <p className="text-gray-400 text-xs max-w-xs mb-8">
        Faça um upgrade para desbloquear este e outros módulos avançados da plataforma.
      </p>

      {/* Current plan badge */}
      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ background: `${planConfig.color}20` }}
        >
          {planConfig.badge}
        </div>
        <div className="text-left">
          <p className="text-xs text-gray-400">Plano atual</p>
          <p className="text-sm text-gray-900" style={{ fontWeight: 700, color: planConfig.color }}>
            {planConfig.name}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-gray-300 ml-2" />
        <div className="text-left">
          <p className="text-xs text-gray-400">Para liberar</p>
          <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>
            Plano superior
          </p>
        </div>
      </div>

      {/* CTA */}
      <p className="text-xs text-gray-400 mt-4">
        Entre em contato com o suporte ZEN HUB em{" "}
        <a href="https://zenhub.online" className="text-violet-500 hover:underline">
          zenhub.online
        </a>{" "}
        para fazer upgrade.
      </p>
    </div>
  );
}

// ─── Compact inline variant (for banners, cards, etc.) ───────────────────────

interface PlanLimitBannerProps {
  resourceLabel: string;
  current: number;
  limit: number;
  planName: string;
  planColor: string;
  planBadge: string;
}

export function PlanLimitBanner({
  resourceLabel, current, limit, planName, planColor, planBadge,
}: PlanLimitBannerProps) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border p-4 mb-4"
      style={{
        background: `${planColor}0D`,
        borderColor: `${planColor}30`,
      }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-sm"
        style={{ background: `${planColor}20` }}
      >
        {planBadge}
      </div>
      <div className="flex-1">
        <p className="text-sm" style={{ fontWeight: 600, color: planColor }}>
          Limite do plano {planName} atingido
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          Seu plano permite até <strong>{limit}</strong> {resourceLabel}. Você já tem{" "}
          <strong>{current}</strong>. Faça upgrade para adicionar mais.
        </p>
      </div>
      <div
        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg shrink-0"
        style={{ background: `${planColor}20`, color: planColor, fontWeight: 600 }}
      >
        <Star className="w-3 h-3" />
        Upgrade
      </div>
    </div>
  );
}