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

    // 1. Try Firestore plans
    if (firestorePlans.length > 0) {
      const found = firestorePlans.find(
        (p) =>
          p.name?.toLowerCase() === key ||
          p.id?.toLowerCase() === key
      );
      if (found) return found;
    }

    // 2. Fall back to hardcoded defaults
    return (
      getCompanyPlanConfig(planNameOrId || "") ??
      DEFAULT_COMPANY_PLANS[0]
    );
  }, [planNameOrId, firestorePlans]);

  /** Returns true if the current plan includes a module */
  const hasModule = (key: ModuleKey): boolean =>
    (planConfig.modules ?? []).includes(key);

  /**
   * Returns the numeric limit for a resource, or null if unlimited.
   * null means NO limit. 0 or positive = hard cap.
   */
  const getLimit = (type: "therapists" | "clients" | "units"): number | null =>
    planConfig.limits?.[type] ?? null;

  /**
   * Returns true if the company is at or above the plan limit.
   * If the limit is null (unlimited) always returns false.
   */
  const isAtLimit = (
    type: "therapists" | "clients" | "units",
    current: number
  ): boolean => {
    const lim = getLimit(type);
    if (lim === null) return false;
    return current >= lim;
  };

  return { planConfig, hasModule, getLimit, isAtLimit };
}

/** Invalidate the module-level cache (useful after plan migration) */
export function invalidatePlanCache() {
  _firestorePlans = null;
  _fetchPromise = null;
}
