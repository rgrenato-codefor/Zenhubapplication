/**
 * planConfig.ts
 * Central definition of ZEN HUB plans.
 *
 * • Company plans   → unlock platform modules and set hard limits
 * • Therapist plans → define monthly appointment volume tiers
 *
 * These defaults can later be overridden by documents stored in Firestore
 * (collection: "plans"). For now they live here as the single source of truth.
 */

// ── Module catalogue ──────────────────────────────────────────────────────────

export const COMPANY_MODULES = {
  dashboard:         "Dashboard",
  schedule:          "Agenda",
  clients:           "Clientes",
  services:          "Serviços / Terapias",
  therapists_multi:  "Múltiplos Terapeutas",
  sales:             "Vendas",
  commissions:       "Comissões",
  units:             "Múltiplas Unidades",
  rooms:             "Salas",
  reports_basic:     "Relatórios Básicos",
  reports_advanced:  "Relatórios Avançados",
  api:               "API / Integrações",
} as const;

export type ModuleKey = keyof typeof COMPANY_MODULES;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompanyPlan {
  id: string;
  name: string;
  price: number;           // R$/mês
  color: string;
  badge: string;           // emoji or short label
  description: string;
  modules: ModuleKey[];
  limits: {
    therapists: number | null;  // null = ilimitado
    clients: number | null;
    units: number | null;
  };
  isDefault: boolean;      // true = plano gratuito aplicado no cadastro
  isActive: boolean;
  order: number;           // display order
}

export interface TherapistPlan {
  id: string;
  name: string;
  price: number;
  color: string;
  badge: string;
  description: string;
  appointmentsPerMonth: number | null;   // null = ilimitado
  isDefault: boolean;
  isActive: boolean;
  order: number;
}

// ── Default Company Plans ─────────────────────────────────────────────────────

export const DEFAULT_COMPANY_PLANS: CompanyPlan[] = [
  {
    id: "company_free",
    name: "Gratuito",
    price: 0,
    color: "#6B7280",
    badge: "🆓",
    description: "Para começar a explorar a plataforma sem compromisso.",
    modules: ["dashboard", "schedule", "clients", "services"],
    limits: { therapists: 1, clients: 50, units: 1 },
    isDefault: true,
    isActive: true,
    order: 0,
  },
  {
    id: "company_starter",
    name: "Starter",
    price: 97,
    color: "#3B82F6",
    badge: "🚀",
    description: "Ideal para estúdios pequenos em crescimento.",
    modules: ["dashboard", "schedule", "clients", "services", "therapists_multi", "sales", "reports_basic"],
    limits: { therapists: 5, clients: 200, units: 1 },
    isDefault: false,
    isActive: true,
    order: 1,
  },
  {
    id: "company_business",
    name: "Business",
    price: 197,
    color: "#8B5CF6",
    badge: "💼",
    description: "Para empresas com múltiplos profissionais e unidades.",
    modules: [
      "dashboard", "schedule", "clients", "services",
      "therapists_multi", "sales", "commissions",
      "units", "rooms", "reports_basic", "reports_advanced",
    ],
    limits: { therapists: 20, clients: 1000, units: 3 },
    isDefault: false,
    isActive: true,
    order: 2,
  },
  {
    id: "company_premium",
    name: "Premium",
    price: 397,
    color: "#F59E0B",
    badge: "⭐",
    description: "Tudo liberado. Para redes e grandes operações.",
    modules: [
      "dashboard", "schedule", "clients", "services",
      "therapists_multi", "sales", "commissions",
      "units", "rooms", "reports_basic", "reports_advanced", "api",
    ],
    limits: { therapists: null, clients: null, units: null },
    isDefault: false,
    isActive: true,
    order: 3,
  },
];

// ── Default Therapist Plans ───────────────────────────────────────────────────

export const DEFAULT_THERAPIST_PLANS: TherapistPlan[] = [
  {
    id: "therapist_free",
    name: "Gratuito",
    price: 0,
    color: "#6B7280",
    badge: "🆓",
    description: "Até 20 atendimentos/mês para começar.",
    appointmentsPerMonth: 20,
    isDefault: true,
    isActive: true,
    order: 0,
  },
  {
    id: "therapist_basic",
    name: "Básico",
    price: 29,
    color: "#10B981",
    badge: "🌿",
    description: "Até 60 atendimentos/mês para uma agenda em crescimento.",
    appointmentsPerMonth: 60,
    isDefault: false,
    isActive: true,
    order: 1,
  },
  {
    id: "therapist_pro",
    name: "Profissional",
    price: 59,
    color: "#8B5CF6",
    badge: "💜",
    description: "Até 150 atendimentos/mês para terapeutas dedicados.",
    appointmentsPerMonth: 150,
    isDefault: false,
    isActive: true,
    order: 2,
  },
  {
    id: "therapist_unlimited",
    name: "Ilimitado",
    price: 99,
    color: "#F59E0B",
    badge: "♾️",
    description: "Sem limite de atendimentos. Foco total na sua prática.",
    appointmentsPerMonth: null,
    isDefault: false,
    isActive: true,
    order: 3,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a company's plan name (stored in Firestore) to its config object. */
export function getCompanyPlanByName(name: string): CompanyPlan | undefined {
  return DEFAULT_COMPANY_PLANS.find(
    (p) => p.name.toLowerCase() === (name || "").toLowerCase()
  );
}

/** Estimated MRR contribution from a company based on its plan name. */
export function companyPlanMRR(planName: string): number {
  return getCompanyPlanByName(planName)?.price ?? 0;
}
