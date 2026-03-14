/**
 * useCompanyPlan
 *
 * Resolves the active plan config for a company by its plan name or ID.
 * 1. Tries to load live plans from Firestore (companyPlans collection).
 * 2. Falls back to DEFAULT_COMPANY_PLANS if Firestore returns nothing.
 *
 * Returns helpers: hasModule(), isAtLimit(), getLimit(), planConfig
 */

import { useState, useEffect, useMemo } from "react";
import {
  DEFAULT_COMPANY_PLANS,
  getCompanyPlanConfig,
  type CompanyPlan,
  type ModuleKey,
} from "../lib/planConfig";

// Module-level cache so we fetch Firestore once per session
let _firestorePlans: CompanyPlan[] | null = null;
let _fetchPromise: Promise<CompanyPlan[]> | null = null;

async function fetchFirestorePlans(): Promise<CompanyPlan[]> {
  if (_firestorePlans) return _firestorePlans;
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = import("../../lib/firestore")
    .then(({ getCompanyPlans }) => getCompanyPlans())
    .then((plans) => {
      _firestorePlans = plans.length > 0 ? plans : [];
      return _firestorePlans;
    })
    .catch(() => {
      _firestorePlans = [];
      return [] as CompanyPlan[];
    });
  return _fetchPromise;
}

export function useCompanyPlan(planNameOrId: string | null | undefined) {
  const [firestorePlans, setFirestorePlans] = useState<CompanyPlan[]>(
    _firestorePlans ?? []
  );

  useEffect(() => {
    if (_firestorePlans !== null) {
      setFirestorePlans(_firestorePlans);
      return;
    }
    fetchFirestorePlans().then((plans) => setFirestorePlans(plans));
  }, []);

  /** Resolved plan config: Firestore first, then hardcoded defaults */
  const planConfig = useMemo((): CompanyPlan => {
    const key = (planNameOrId || "").toLowerCase();

    // Always resolve the hardcoded default for this plan (used as fallback for missing fields)
    const hardcoded =
      getCompanyPlanConfig(planNameOrId || "") ?? DEFAULT_COMPANY_PLANS[0];

    // 1. Try Firestore plans
    if (firestorePlans.length > 0) {
      const found = firestorePlans.find(
        (p) =>
          p.name?.toLowerCase() === key ||
          p.id?.toLowerCase() === key
      );
      if (found) {
        // Deep-merge limits: Firestore wins when the field is explicitly set (including null),
        // but falls back to the hardcoded default when the field is undefined (legacy doc).
        return {
          ...hardcoded,
          ...found,
          limits: {
            ...hardcoded.limits,
            ...found.limits,
            appointments_monthly:
              found.limits?.appointments_monthly !== undefined
                ? found.limits.appointments_monthly
                : hardcoded.limits?.appointments_monthly ?? null,
          },
        };
      }
    }

    // 2. Fall back to hardcoded defaults
    return hardcoded;
  }, [planNameOrId, firestorePlans]);

  /**
   * Full list of company plans — Firestore is the source of truth.
   * Each Firestore plan is deep-merged with its hardcoded counterpart (for missing fields).
   * Plans existing only in the hardcoded defaults are appended as fallback.
   * Final list is sorted by price then order.
   */
  const allPlans = useMemo((): CompanyPlan[] => {
    if (firestorePlans.length === 0) {
      return [...DEFAULT_COMPANY_PLANS].sort(
        (a, b) => a.price - b.price || (a.order ?? 99) - (b.order ?? 99)
      );
    }

    // Build merged list starting from Firestore (source of truth)
    const merged: CompanyPlan[] = firestorePlans.map((fp) => {
      const hardcoded = DEFAULT_COMPANY_PLANS.find(
        (p) =>
          p.name?.toLowerCase() === fp.name?.toLowerCase() ||
          p.id?.toLowerCase() === fp.id?.toLowerCase()
      );
      if (!hardcoded) return fp; // pure Firestore plan, no default counterpart
      return {
        ...hardcoded,
        ...fp,
        limits: {
          ...hardcoded.limits,
          ...fp.limits,
          appointments_monthly:
            fp.limits?.appointments_monthly !== undefined
              ? fp.limits.appointments_monthly
              : hardcoded.limits?.appointments_monthly ?? null,
        },
      };
    });

    // Append hardcoded defaults not represented in Firestore (safety fallback)
    for (const hardcoded of DEFAULT_COMPANY_PLANS) {
      const alreadyIn = merged.some(
        (p) =>
          p.name?.toLowerCase() === hardcoded.name.toLowerCase() ||
          p.id?.toLowerCase() === hardcoded.id.toLowerCase()
      );
      if (!alreadyIn) merged.push(hardcoded);
    }

    return merged.sort(
      (a, b) => a.price - b.price || (a.order ?? 99) - (b.order ?? 99)
    );
  }, [firestorePlans]);

  /** Returns true if the current plan includes a module */
  const hasModule = (key: ModuleKey): boolean =>
    (planConfig.modules ?? []).includes(key);

  /**
   * Returns the numeric limit for a resource, or null if unlimited.
   * null means NO limit. 0 or positive = hard cap.
   */
  const getLimit = (type: "therapists" | "clients" | "appointments_monthly" | "units"): number | null =>
    planConfig.limits?.[type] ?? null;

  /**
   * Returns true if the company is at or above the plan limit.
   * If the limit is null (unlimited) always returns false.
   */
  const isAtLimit = (
    type: "therapists" | "clients" | "appointments_monthly" | "units",
    current: number
  ): boolean => {
    const lim = getLimit(type);
    if (lim === null) return false;
    return current >= lim;
  };

  return { planConfig, allPlans, hasModule, getLimit, isAtLimit };
}

/** Invalidate the module-level cache (useful after plan migration) */
export function invalidatePlanCache() {
  _firestorePlans = null;
  _fetchPromise = null;
}