import { useState, useEffect } from "react";
import { units as initialUnits } from "../data/mockData";

// ── Types ────────────────────────────────────────────────────────────────────

export type UnitStatus = "active" | "inactive";

export type Unit = {
  id: string;
  companyId: string;
  name: string;
  fullName: string;
  address: string;
  phone: string;
  email: string;
  status: UnitStatus;
  isMain: boolean;
  therapistsCount: number;
  roomsCount: number;
};

// ── In-memory state ──────────────────────────────────────────────────────────

let unitsState: Unit[] = initialUnits.map((u) => ({ ...u }));

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

// ── Store API ────────────────────────────────────────────────────────────────

export const unitStore = {
  getUnits: (companyId: string): Unit[] =>
    unitsState.filter((u) => u.companyId === companyId),

  getUnit: (unitId: string): Unit | undefined =>
    unitsState.find((u) => u.id === unitId),

  addUnit: (unit: Unit) => {
    // If first unit for this company, make it main
    const existing = unitsState.filter((u) => u.companyId === unit.companyId);
    const isFirst = existing.length === 0;
    unitsState = [...unitsState, { ...unit, isMain: isFirst || unit.isMain }];
    notify();
  },

  updateUnit: (updated: Unit) => {
    // If marking as main, un-main all others in same company
    if (updated.isMain) {
      unitsState = unitsState.map((u) =>
        u.companyId === updated.companyId
          ? { ...u, isMain: u.id === updated.id }
          : u
      );
    } else {
      unitsState = unitsState.map((u) => (u.id === updated.id ? updated : u));
    }
    notify();
  },

  deleteUnit: (unitId: string) => {
    const unit = unitsState.find((u) => u.id === unitId);
    if (!unit) return;
    unitsState = unitsState.filter((u) => u.id !== unitId);
    // If deleted unit was main, promote the first remaining unit of same company
    if (unit.isMain) {
      const remaining = unitsState.filter((u) => u.companyId === unit.companyId);
      if (remaining.length > 0) {
        unitsState = unitsState.map((u) =>
          u.id === remaining[0].id ? { ...u, isMain: true } : u
        );
      }
    }
    notify();
  },

  setMain: (unitId: string, companyId: string) => {
    unitsState = unitsState.map((u) =>
      u.companyId === companyId ? { ...u, isMain: u.id === unitId } : u
    );
    notify();
  },

  subscribe: (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

// ── React hook ───────────────────────────────────────────────────────────────

export function useUnitStore() {
  const [, forceRender] = useState(0);
  useEffect(() => {
    const unsub = unitStore.subscribe(() => forceRender((n) => n + 1));
    return unsub;
  }, []);
  return unitStore;
}
