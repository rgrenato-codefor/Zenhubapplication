/**
 * TherapistUpgradeModal
 *
 * Exibido quando o terapeuta atinge o limite mensal de atendimentos.
 * Permite upgrade direto de plano sem intermediário.
 *
 * Props:
 *  - currentPlan / allPlans / monthlyCount: dados do hook useTherapistPlan
 *  - onUpgrade(plan): callback async que persiste o novo plano
 *  - onClose: fecha o modal
 */

import { useState } from "react";
import { X, CheckCircle, Zap, ArrowRight, Lock, BadgeCheck } from "../shared/icons";
import type { TherapistPlan } from "../../lib/planConfig";

interface Props {
  currentPlan: TherapistPlan;
  allPlans: TherapistPlan[];
  monthlyCount: number;
  onUpgrade: (plan: TherapistPlan) => Promise<void>;
  onClose: () => void;
}

/** Gera a lista de features dinamicamente a partir dos dados reais do plano. */
function buildFeatures(plan: TherapistPlan, idx: number): string[] {
  const features: string[] = [];

  // Limite — derivado do campo real (Firestore-over-defaults)
  features.push(
    plan.appointmentsPerMonth === null
      ? "Atendimentos ilimitados"
      : `Até ${plan.appointmentsPerMonth} atendimentos/mês`
  );

  features.push("Agenda pessoal");
  features.push("Perfil público");
  if (idx >= 1) features.push("Histórico de ganhos");
  if (idx >= 2) features.push("Relatórios avançados");
  if (idx >= 2) features.push("Suporte prioritário");
  if (plan.appointmentsPerMonth === null) features.push("API de integração");
  if (plan.appointmentsPerMonth === null) features.push("Suporte premium");

  return features;
}

export function TherapistUpgradeModal({
  currentPlan,
  allPlans,
  monthlyCount,
  onUpgrade,
  onClose,
}: Props) {
  const limit = currentPlan.appointmentsPerMonth ?? 0;
  const pct   = limit > 0 ? Math.min(100, Math.round((monthlyCount / limit) * 100)) : 100;

  const [loadingId, setLoadingId]   = useState<string | null>(null);
  const [succeededId, setSucceeded] = useState<string | null>(null);

  // Todos os planos ativos exceto o atual, ordenados por preço
  const availablePlans = allPlans
    .filter((p) => p.isActive && p.id !== currentPlan.id)
    .sort((a, b) => a.price - b.price);

  // Plano do meio (ou único) entre os superiores = recomendado
  const higherPlans = availablePlans.filter(
    (p) =>
      p.appointmentsPerMonth === null ||
      (p.appointmentsPerMonth ?? 0) > (currentPlan.appointmentsPerMonth ?? 0)
  );
  const recommendedId =
    higherPlans.length >= 2 ? higherPlans[1]?.id : higherPlans[0]?.id;

  async function handleUpgrade(plan: TherapistPlan) {
    if (loadingId) return;
    setLoadingId(plan.id);
    try {
      await onUpgrade(plan);
      setSucceeded(plan.id);
      // Fecha o modal após breve feedback de sucesso
      setTimeout(() => onClose(), 1400);
    } catch {
      setLoadingId(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-t-2xl px-6 py-5 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">
              {currentPlan.badge}
            </div>
            <div>
              <p className="text-white/70 text-xs">Plano atual</p>
              <p className="text-white" style={{ fontWeight: 700 }}>
                Plano {currentPlan.name}
                {currentPlan.price === 0 && (
                  <span className="ml-1.5 text-xs opacity-70">(Gratuito)</span>
                )}
              </p>
            </div>
          </div>

          {/* Usage bar */}
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-white/80 text-xs">Atendimentos este mês</span>
              <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                {monthlyCount}/{limit > 0 ? limit : "∞"}
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  background: pct >= 100 ? "#F87171" : "white",
                }}
              />
            </div>
            <p className="text-white/70 text-xs mt-1.5">
              {pct >= 100
                ? "⛔ Limite atingido — faça upgrade para continuar agendando"
                : `${limit - monthlyCount} atendimento${limit - monthlyCount !== 1 ? "s" : ""} restante${limit - monthlyCount !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-gray-900 mb-0.5" style={{ fontWeight: 700 }}>
              Escolha o plano ideal para você
            </h3>
            <p className="text-gray-400 text-sm">
              Faça upgrade agora e continue atendendo sem interrupções.
            </p>
          </div>

          {availablePlans.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              Nenhum plano superior disponível no momento.
            </div>
          )}

          <div className="space-y-3">
            {availablePlans.map((plan, idx) => {
              const isHighlighted = plan.id === recommendedId;
              const isLoading     = loadingId === plan.id;
              const isSuccess     = succeededId === plan.id;
              const features      = buildFeatures(plan, idx);
              const priceStr      = plan.price.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              });
              const isDowngrade =
                plan.price < currentPlan.price ||
                (plan.appointmentsPerMonth !== null &&
                  currentPlan.appointmentsPerMonth !== null &&
                  plan.appointmentsPerMonth < currentPlan.appointmentsPerMonth) ||
                (plan.appointmentsPerMonth !== null &&
                  currentPlan.appointmentsPerMonth === null);

              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border-2 p-4 transition-all ${
                    isHighlighted
                      ? "border-violet-500 bg-violet-50"
                      : "border-gray-200 hover:border-violet-300"
                  }`}
                >
                  {isHighlighted && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <Zap className="w-3.5 h-3.5 text-violet-600" />
                      <span className="text-xs text-violet-700" style={{ fontWeight: 600 }}>
                        Recomendado
                      </span>
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl shrink-0">{plan.badge}</span>
                      <div className="min-w-0">
                        <p className="text-gray-900" style={{ fontWeight: 700 }}>
                          Plano {plan.name}
                        </p>
                        {/* description vem do Firestore (ou default) */}
                        <p className="text-gray-400 text-xs leading-snug">{plan.description}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-violet-600" style={{ fontWeight: 700 }}>
                        R$ {priceStr}
                      </p>
                      <p className="text-gray-400 text-xs">/mês</p>
                    </div>
                  </div>

                  {/* Features — derivadas dinamicamente */}
                  <ul className="space-y-1 mb-4">
                    {features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2 text-xs text-gray-600">
                        <CheckCircle className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>

                  {/* Upgrade button */}
                  <button
                    onClick={() => handleUpgrade(plan)}
                    disabled={!!loadingId || !!succeededId}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed ${
                      isSuccess
                        ? "bg-green-500 text-white"
                        : isHighlighted
                        ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:shadow-lg"
                        : isDowngrade
                        ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        : "bg-gray-100 text-gray-700 hover:bg-violet-100 hover:text-violet-700"
                    }`}
                    style={{ fontWeight: 600 }}
                  >
                    {isSuccess ? (
                      <>
                        <BadgeCheck className="w-4 h-4" />
                        Plano ativado!
                      </>
                    ) : isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Ativando…
                      </>
                    ) : isDowngrade ? (
                      <>
                        Mudar para {plan.name}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Fazer upgrade para {plan.name}
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Current plan note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <Lock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-gray-400 text-xs">
              Você está no plano{" "}
              <strong className="text-gray-600">{currentPlan.name}</strong>
              {limit > 0 && ` (${limit} atendimentos/mês)`}.{" "}
              Faça upgrade para continuar atendendo este mês.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}