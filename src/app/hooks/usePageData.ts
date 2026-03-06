/**
 * usePageData — backward-compatible data access hook.
 *
 * Pages replace:
 *   import { therapists, clients, ... } from "../../data/mockData"
 *   import { useTherapistStore } from "../../store/therapistStore"
 * with:
 *   const { therapists, clients, ..., therapistStore } = usePageData()
 *
 * For demo users → returns filtered mockData (same as before).
 * For real users → returns Firestore data from DataContext.
 */

import { useData } from "../context/DataContext";

export function usePageData() {
  const data = useData();

  // Expose company as both `company` and as an array `companies` (pages use both forms)
  const companies = data.company ? [data.company] : [];

  return {
    // ── Data arrays ──────────────────────────────────────────────────────────
    company: data.company,
    companies,
    units: data.units,
    therapists: data.therapists,
    clients: data.clients,
    appointments: data.appointments,
    therapies: data.therapies,
    rooms: data.rooms,
    sessionRecords: data.sessionRecords,
    myTherapist: data.myTherapist,
    myCatalog: data.myCatalog,
    myAvailability: data.myAvailability,
    myClient: data.myClient,

    // ── Store bridges (same API as the original stores) ───────────────────────
    therapistStore: data.therapistStoreBridge,
    unitStore: data.unitStoreBridge,
    roomStore: data.roomStoreBridge,

    // ── Room assignments ──────────────────────────────────────────────────────
    roomAssignments: data.roomAssignments,
    completedSessionIds: data.completedSessionIds,

    // ── Chart data ────────────────────────────────────────────────────────────
    revenueData: data.revenueData,
    weeklyData: data.weeklyData,
    unitRevenueData: data.unitRevenueData,
    unitWeeklyData: data.unitWeeklyData,
    therapistEarningsData: data.therapistEarningsData,

    // ── Mutations ─────────────────────────────────────────────────────────────
    mutateCompany: data.mutateCompany,
    mutateAddUnit: data.mutateAddUnit,
    mutateUpdateUnit: data.mutateUpdateUnit,
    mutateDeleteUnit: data.mutateDeleteUnit,
    mutateInviteTherapist: data.mutateInviteTherapist,
    mutateDissociateTherapist: data.mutateDissociateTherapist,
    mutateUpdateTherapistCommission: data.mutateUpdateTherapistCommission,
    mutateAddClient: data.mutateAddClient,
    mutateUpdateClient: data.mutateUpdateClient,
    mutateAddTherapy: data.mutateAddTherapy,
    mutateUpdateTherapy: data.mutateUpdateTherapy,
    mutateDeleteTherapy: data.mutateDeleteTherapy,
    mutateAddRoom: data.mutateAddRoom,
    mutateUpdateRoom: data.mutateUpdateRoom,
    mutateDeleteRoom: data.mutateDeleteRoom,
    mutateAddAppointment: data.mutateAddAppointment,
    mutateUpdateAppointment: data.mutateUpdateAppointment,
    mutateCompleteSession: data.mutateCompleteSession,
    mutateMarkCommissionPaid: data.mutateMarkCommissionPaid,
    mutateAssignRoom: data.mutateAssignRoom,
    mutateUnassignRoom: data.mutateUnassignRoom,
    mutateMyTherapistProfile: data.mutateMyTherapistProfile,
    mutateMyCatalog: data.mutateMyCatalog,
    mutateMyAvailability: data.mutateMyAvailability,
    mutateLinkToCompany: data.mutateLinkToCompany,
    mutateUnlinkFromCompany: data.mutateUnlinkFromCompany,
    mutateMyClientProfile: data.mutateMyClientProfile,

    // ── Search ────────────────────────────────────────────────────────────────
    searchCompaniesByName: data.searchCompaniesByName,
    fetchCompanyByInviteCode: data.fetchCompanyByInviteCode,
    fetchUnitsByCompany: data.fetchUnitsByCompany,

    // ── Loading ───────────────────────────────────────────────────────────────
    loading: data.loading,
    refresh: data.refresh,
  };
}