/**
 * useTherapistPlan
 *
 * Resolves the active plan config for a therapist by plan name or ID.
 * 1. Tries to load live plans from Firestore (therapistPlans collection).
 * 2. Falls back to DEFAULT_THERAPIST_PLANS if Firestore returns nothing.
 *
 * Returns: planConfig, allPlans, isAtMonthlyLimit(), isLoading
 */

import { useState, useEffect, useMemo } from "react";
import {
  DEFAULT_THERAPIST_PLANS,
  type TherapistPlan,
} from "../lib/planConfig";

// Module-level cache so we fetch Firestore once per session
let _firestorePlans: TherapistPlan[] | null = null;
let _fetchPromise: Promise<TherapistPlan[]> | null = null;

async function fetchFirestoreTherapistPlans(): Promise<TherapistPlan[]> {
  if (_firestorePlans) return _firestorePlans;
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = import("../../lib/firestore")
    .then(({ getTherapistPlans }) => getTherapistPlans())
    .then((plans) => {
      _firestorePlans = plans.length > 0 ? plans : [];
      return _firestorePlans;
    })
    .catch(() => {
      _firestorePlans = [];
      return [] as TherapistPlan[];
    });
  return _fetchPromise;
}

export function useTherapistPlan(planNameOrId: string | null | undefined) {
  const [firestorePlans, setFirestorePlans] = useState<TherapistPlan[]>(
    _firestorePlans ?? []
  );
  const [isLoading, setIsLoading] = useState(_firestorePlans === null);

  useEffect(() => {
    if (_firestorePlans !== null) {
      setFirestorePlans(_firestorePlans);
      setIsLoading(false);
      return;
    }
    fetchFirestoreTherapistPlans().then((plans) => {
      setFirestorePlans(plans);
      setIsLoading(false);
    });
  }, []);

  /** Resolved plan config: Firestore first, then hardcoded defaults */
  const planConfig = useMemo((): TherapistPlan => {
    const key = (planNameOrId || "").toLowerCase();

    const hardcoded =
      DEFAULT_THERAPIST_PLANS.find(
        (p) => p.name.toLowerCase() === key || p.id.toLowerCase() === key
      ) ?? DEFAULT_THERAPIST_PLANS[0];

    if (firestorePlans.length > 0) {
      const found = firestorePlans.find(
        (p) =>
          p.name?.toLowerCase() === key || p.id?.toLowerCase() === key
      );
      if (found) {
        return {
          ...hardcoded,
          ...found,
          appointmentsPerMonth:
            found.appointmentsPerMonth !== undefined
              ? found.appointmentsPerMonth
              : hardcoded.appointmentsPerMonth,
        };
      }
    }

    return hardcoded;
  }, [planNameOrId, firestorePlans]);

  /**
   * Full list of therapist plans — Firestore is the source of truth.
   * Falls back to hardcoded defaults when Firestore returns nothing.
   */
  const allPlans = useMemo((): TherapistPlan[] => {
    if (firestorePlans.length === 0) {
      return [...DEFAULT_THERAPIST_PLANS].sort(
        (a, b) => a.price - b.price || (a.order ?? 99) - (b.order ?? 99)
      );
    }

    const merged: TherapistPlan[] = firestorePlans.map((fp) => {
      const hardcoded = DEFAULT_THERAPIST_PLANS.find(
        (p) =>
          p.name?.toLowerCase() === fp.name?.toLowerCase() ||
          p.id?.toLowerCase() === fp.id?.toLowerCase()
      );
      if (!hardcoded) return fp;
      return {
        ...hardcoded,
        ...fp,
        appointmentsPerMonth:
          fp.appointmentsPerMonth !== undefined
            ? fp.appointmentsPerMonth
            : hardcoded.appointmentsPerMonth,
      };
    });

    for (const hardcoded of DEFAULT_THERAPIST_PLANS) {
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

  /**
   * Returns true when the therapist has reached or exceeded their monthly limit.
   * Always false when the plan has no limit (null).
   */
  const isAtMonthlyLimit = (currentCount: number): boolean => {
    const limit = planConfig.appointmentsPerMonth;
    if (limit === null) return false;
    return currentCount >= limit;
  };

  return { planConfig, allPlans, isAtMonthlyLimit, isLoading };
}

/** Invalidate the module-level cache (useful after plan upgrade) */
export function invalidateTherapistPlanCache() {
  _firestorePlans = null;
  _fetchPromise = null;
}
