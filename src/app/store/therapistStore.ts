import { useState, useEffect } from "react";
import { therapistCatalog as initialCatalog, therapists as initialTherapists } from "../data/mockData";
import type { MediaItem } from "../../lib/imagekit";

// Re-export so pages can import from one place
export type { MediaItem };

// ── Types ────────────────────────────────────────────────────────────────────

export type SessionRecord = {
  id: string;
  appointmentId: string;
  therapistId: string;
  clientName: string;
  therapyName: string;
  duration: number;
  sessionPrice: number;
  extraCharge: number;
  totalCharged: number;
  therapistEarned: number;
  commissionPct: number;
  companyNet: number;
  companyId: string | null;
  companyName: string | null;
  completedAt: string;
  notes: string;
  extraNotes: string;
  date: string;
  time: string;
  closedBy: "therapist" | "company";
  /** Set to true by the company when commission is paid to the therapist */
  paidByCompany?: boolean;
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
  companyName?: string | null;
  unitId?: string | null;
  commission: number;
  linkedAt: string | null;
  /** "none" = autônomo, "pending" = aguardando aprovação da empresa, "active" = vinculado */
  status: "none" | "pending" | "active";
  // Dados do terapeuta para exibição na fila de pendentes (lado empresa)
  therapistName?: string;
  therapistAvatar?: string;
  therapistSpecialty?: string;
  therapistUsername?: string;
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
      paidByCompany: false,
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
      paidByCompany: false,
    },
  ];
}

function seedAssociations(): Record<string, TherapistAssociation> {
  const result: Record<string, TherapistAssociation> = {};
  initialTherapists.forEach((t) => {
    // t1 = terapeuta demo (Ana Carolina Silva) — inicia como AUTÔNOMO para
    // que o usuário possa testar o fluxo completo: solicitar → pendente → aprovação
    const isDemoTherapist = t.id === "t1";
    result[t.id] = {
      therapistId: t.id,
      companyId: isDemoTherapist ? null : (t.companyId ?? null),
      unitId: isDemoTherapist ? null : ((t as any).unitId ?? null),
      commission: t.commission,
      linkedAt: isDemoTherapist ? null : (t.companyId ? "2024-01-15" : null),
      status: isDemoTherapist ? "none" : (t.companyId ? "active" : "none"),
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

// ── Gallery state ─────────────────────────────────────────────────────────────

function seedGalleries(): Record<string, MediaItem[]> {
  const result: Record<string, MediaItem[]> = {};
  initialTherapists.forEach((t) => {
    const photos: string[] = (t as any).photos ?? [];
    if (photos.length) {
      result[t.id] = photos.map((url, i) => ({
        id: `seed_${t.id}_${i}`,
        type: "image" as const,
        url,
        thumbnailUrl: url,
        uploadedAt: "2024-01-15",
      }));
    }
  });
  return result;
}

let therapistGalleries: Record<string, MediaItem[]> = seedGalleries();
let companyGalleries:   Record<string, MediaItem[]> = {};

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

  /** Mark a list of session record IDs as paid by the company */
  markRecordsPaid: (ids: string[]) => {
    const idSet = new Set(ids);
    sessionRecords = sessionRecords.map((r) =>
      idSet.has(r.id) ? { ...r, paidByCompany: true } : r
    );
    notify();
  },

  // ── Association ───────────────────────────────────────────────────────────

  getAssociation: (therapistId: string): TherapistAssociation => {
    if (!associations[therapistId]) {
      const t = initialTherapists.find((t) => t.id === therapistId);
      associations[therapistId] = {
        therapistId, companyId: t?.companyId ?? null,
        unitId: (t as any)?.unitId ?? null,
        commission: t?.commission ?? 50, linkedAt: null,
        status: "none",
      };
    }
    return associations[therapistId];
  },

  getCompanyId: (therapistId: string): string | null =>
    therapistStore.getAssociation(therapistId).companyId,

  getCommission: (therapistId: string): number =>
    therapistStore.getAssociation(therapistId).commission,

  associateTherapist: (therapistId: string, companyId: string, commission: number, unitId?: string | null) => {
    associations[therapistId] = {
      ...(associations[therapistId] ?? { therapistId }),
      companyId, commission,
      unitId: unitId ?? null,
      linkedAt: new Date().toISOString(),
      status: "active",
    };
    notify();
  },

  /** Terapeuta solicita vínculo — cria associação com status "pending" */
  requestLink: (
    therapistId: string,
    companyId: string,
    companyName?: string,
    meta?: { name?: string; avatar?: string; specialty?: string; username?: string },
  ) => {
    associations[therapistId] = {
      ...(associations[therapistId] ?? { therapistId }),
      companyId,
      companyName: companyName ?? null,
      unitId: null,
      commission: 0,
      linkedAt: null,
      status: "pending",
      therapistName: meta?.name,
      therapistAvatar: meta?.avatar,
      therapistSpecialty: meta?.specialty,
      therapistUsername: meta?.username,
    };
    notify();
  },

  /** Empresa aprova a solicitação e define comissão */
  approveAssociation: (therapistId: string, commission: number, unitId?: string | null) => {
    associations[therapistId] = {
      ...(associations[therapistId] ?? { therapistId }),
      commission,
      unitId: unitId ?? null,
      linkedAt: new Date().toISOString(),
      status: "active",
    };
    notify();
  },

  /** Empresa rejeita ou terapeuta desvincula */
  rejectAssociation: (therapistId: string) => {
    associations[therapistId] = {
      therapistId,
      companyId: null,
      companyName: null,
      unitId: null,
      commission: 0,
      linkedAt: null,
      status: "none",
    };
    notify();
  },

  dissociateTherapist: (therapistId: string) => {
    associations[therapistId] = {
      ...associations[therapistId],
      companyId: null,
      linkedAt: null,
      status: "none",
    };
    notify();
  },

  updateCommission: (therapistId: string, commission: number) => {
    associations[therapistId] = { ...associations[therapistId], commission };
    notify();
  },

  /** Retorna apenas associações ATIVAS para a empresa */
  getCompanyTherapists: (companyId: string) =>
    Object.values(associations).filter((a) => a.companyId === companyId && a.status === "active"),

  /** Retorna solicitações PENDENTES de aprovação para a empresa */
  getPendingForCompany: (companyId: string) =>
    Object.values(associations).filter((a) => a.companyId === companyId && a.status === "pending"),

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

  // ── Gallery ───────────────────────────────────────────────────────────────

  getGallery: (therapistId: string): MediaItem[] =>
    therapistGalleries[therapistId] ?? [],

  addGalleryItem: (therapistId: string, item: MediaItem) => {
    therapistGalleries[therapistId] = [
      ...(therapistGalleries[therapistId] ?? []),
      item,
    ];
    notify();
  },

  removeGalleryItem: (therapistId: string, itemId: string) => {
    therapistGalleries[therapistId] = (therapistGalleries[therapistId] ?? [])
      .filter((m) => m.id !== itemId);
    notify();
  },

  updateGalleryCaption: (therapistId: string, itemId: string, caption: string) => {
    therapistGalleries[therapistId] = (therapistGalleries[therapistId] ?? [])
      .map((m) => m.id === itemId ? { ...m, caption } : m);
    notify();
  },

  // ── Company Gallery ───────────────────────────────────────────────────────

  getCompanyGallery: (companyId: string): MediaItem[] =>
    companyGalleries[companyId] ?? [],

  addCompanyGalleryItem: (companyId: string, item: MediaItem) => {
    companyGalleries[companyId] = [
      ...(companyGalleries[companyId] ?? []),
      item,
    ];
    notify();
  },

  removeCompanyGalleryItem: (companyId: string, itemId: string) => {
    companyGalleries[companyId] = (companyGalleries[companyId] ?? [])
      .filter((m) => m.id !== itemId);
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