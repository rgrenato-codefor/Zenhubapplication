import { useState, useEffect } from "react";
import { therapistCatalog as initialCatalog, therapists as initialTherapists } from "../data/mockData";

// ── Types ────────────────────────────────────────────────────────────────────

export type SessionRecord = {
  id: string;
  appointmentId: string;
  therapistId: string;
  clientName: string;
  therapyName: string;
  duration: number;
  sessionPrice: number;      // preço base (definido pela empresa se vinculado)
  extraCharge: number;       // cobrança extra adicionada durante o atendimento
  totalCharged: number;      // sessionPrice + extraCharge
  therapistEarned: number;   // quanto o terapeuta recebe (comissão sobre totalCharged)
  commissionPct: number;     // % de comissão (100 se autônomo, empresa define se vinculado)
  companyNet: number;        // receita líquida da empresa = totalCharged - therapistEarned
  companyId: string | null;
  companyName: string | null;
  completedAt: string;
  notes: string;
  extraNotes: string;        // observações sobre cobrança extra
  date: string;
  time: string;
  closedBy: "therapist" | "company";
};

export type CatalogItem = {
  id: string;
  name: string;
  duration: number;
  myPrice: number;
  category: string;
  color: string;
  active: boolean;
};

export type TherapistAssociation = {
  therapistId: string;
  companyId: string | null;
  commission: number;
  linkedAt: string | null;
};

// ── Seed data ────────────────────────────────────────────────────────────────

function seedRecords(): SessionRecord[] {
  return [
    {
      id: "sr_a7", appointmentId: "a7", therapistId: "t1",
      clientName: "Patrícia Lima", therapyName: "Massagem Relaxante",
      duration: 60, sessionPrice: 150, extraCharge: 0, totalCharged: 150,
      therapistEarned: 75, commissionPct: 50,
      companyNet: 75, companyId: "c1", companyName: "Espaço Zen Massagens",
      completedAt: "2026-03-03T10:55:00", notes: "", extraNotes: "",
      date: "2026-03-03", time: "10:00", closedBy: "therapist",
    },
    {
      id: "sr_a8", appointmentId: "a8", therapistId: "t2",
      clientName: "Mariana Oliveira", therapyName: "Massagem Desportiva",
      duration: 60, sessionPrice: 170, extraCharge: 20, totalCharged: 190,
      therapistEarned: 85.5, commissionPct: 45,
      companyNet: 104.5, companyId: "c1", companyName: "Espaço Zen Massagens",
      completedAt: "2026-03-03T15:05:00",
      notes: "Cliente pediu mais pressão nos ombros.",
      extraNotes: "Produto de aromaterapia adicional utilizado.",
      date: "2026-03-03", time: "14:00", closedBy: "company",
    },
  ];
}

function seedAssociations(): Record<string, TherapistAssociation> {
  const result: Record<string, TherapistAssociation> = {};
  initialTherapists.forEach((t) => {
    result[t.id] = {
      therapistId: t.id,
      companyId: t.companyId ?? null,
      commission: t.commission,
      linkedAt: t.companyId ? "2024-01-15" : null,
    };
  });
  return result;
}

// ── In-memory state ──────────────────────────────────────────────────────────

let completedIds = new Set<string>(["a7", "a8"]);
let sessionRecords: SessionRecord[] = seedRecords();
let catalogs: Record<string, CatalogItem[]> = {};
let associations: Record<string, TherapistAssociation> = seedAssociations();
let availabilityMap: Record<string, Record<string, string[]>> = {};

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

// ── Store API ────────────────────────────────────────────────────────────────

export const therapistStore = {
  // ── Sessions ──────────────────────────────────────────────────────────────

  isCompleted: (appointmentId: string) => completedIds.has(appointmentId),

  getAllRecords: () => sessionRecords,

  getTherapistRecords: (therapistId: string) =>
    sessionRecords.filter((r) => r.therapistId === therapistId),

  getCompanyRecords: (companyId: string) =>
    sessionRecords.filter((r) => r.companyId === companyId),

  completeSession: (record: SessionRecord) => {
    completedIds = new Set([...completedIds, record.appointmentId]);
    sessionRecords = [record, ...sessionRecords];
    notify();
  },

  // ── Association ───────────────────────────────────────────────────────────

  getAssociation: (therapistId: string): TherapistAssociation => {
    if (!associations[therapistId]) {
      const t = initialTherapists.find((t) => t.id === therapistId);
      associations[therapistId] = {
        therapistId, companyId: t?.companyId ?? null,
        commission: t?.commission ?? 50, linkedAt: null,
      };
    }
    return associations[therapistId];
  },

  getCompanyId: (therapistId: string): string | null =>
    therapistStore.getAssociation(therapistId).companyId,

  getCommission: (therapistId: string): number =>
    therapistStore.getAssociation(therapistId).commission,

  associateTherapist: (therapistId: string, companyId: string, commission: number) => {
    associations[therapistId] = {
      therapistId, companyId, commission,
      linkedAt: new Date().toISOString(),
    };
    notify();
  },

  dissociateTherapist: (therapistId: string) => {
    associations[therapistId] = {
      ...associations[therapistId],
      companyId: null,
      linkedAt: null,
    };
    notify();
  },

  updateCommission: (therapistId: string, commission: number) => {
    associations[therapistId] = { ...associations[therapistId], commission };
    notify();
  },

  getCompanyTherapists: (companyId: string) =>
    Object.values(associations).filter((a) => a.companyId === companyId),

  // ── Catalog ───────────────────────────────────────────────────────────────

  getCatalog: (therapistId: string): CatalogItem[] => {
    if (!catalogs[therapistId]) {
      catalogs[therapistId] = initialCatalog
        .filter((c) => c.therapistId === therapistId)
        .map((c) => ({ ...c }));
    }
    return catalogs[therapistId];
  },

  setCatalog: (therapistId: string, items: CatalogItem[]) => {
    catalogs[therapistId] = items;
    notify();
  },

  addCatalogItem: (therapistId: string, item: CatalogItem) => {
    const current = therapistStore.getCatalog(therapistId);
    catalogs[therapistId] = [...current, item];
    notify();
  },

  updateCatalogItem: (therapistId: string, updated: CatalogItem) => {
    catalogs[therapistId] = therapistStore
      .getCatalog(therapistId)
      .map((c) => (c.id === updated.id ? updated : c));
    notify();
  },

  removeCatalogItem: (therapistId: string, itemId: string) => {
    catalogs[therapistId] = therapistStore
      .getCatalog(therapistId)
      .filter((c) => c.id !== itemId);
    notify();
  },

  // ── Availability ──────────────────────────────────────────────────────────

  getAvailability: (therapistId: string, defaultSchedule: Record<string, string[]>): Record<string, string[]> => {
    if (!availabilityMap[therapistId]) {
      availabilityMap[therapistId] = { ...defaultSchedule };
    }
    return availabilityMap[therapistId];
  },

  setAvailability: (therapistId: string, schedule: Record<string, string[]>) => {
    availabilityMap[therapistId] = schedule;
    notify();
  },

  // ── Subscribe ─────────────────────────────────────────────────────────────

  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// ── React hook ───────────────────────────────────────────────────────────────

export function useTherapistStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = therapistStore.subscribe(() => setTick((n) => n + 1));
    return unsub;
  }, []);
  return therapistStore;
}
