/**
 * DataContext — single source of truth for all app data.
 *
 * • isDemoMode = true  → returns filtered mockData + in-memory stores
 * • isDemoMode = false → fetches from Firestore, provides CRUD mutations
 *
 * All pages import `useData()` instead of mockData directly.
 */

import {
  createContext, useContext, useState, useEffect, useCallback,
  useRef, type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

// ── Mock data & stores (demo mode) ───────────────────────────────────────────
import {
  companies as mockCompanies,
  units as mockUnits,
  therapists as mockTherapists,
  clients as mockClients,
  appointments as mockAppointments,
  therapies as mockTherapies,
  rooms as mockRooms,
  revenueData as mockRevenueData,
  weeklyData as mockWeeklyData,
  unitRevenueData as mockUnitRevenueData,
  unitWeeklyData as mockUnitWeeklyData,
  therapistEarningsData as mockTherapistEarningsData,
} from "../data/mockData";
import { therapistStore, type SessionRecord, type CatalogItem } from "../store/therapistStore";
import type { MediaItem } from "../../lib/imagekit";
import { unitStore } from "../store/unitStore";
import { roomStore } from "../store/roomStore";

// ── Firestore functions ─────────────────────────────────────────────────────
import {
  getCompany, updateCompany as fsUpdateCompany,
  getUnitsByCompany, createUnit as fsCreateUnit,
  updateUnit as fsUpdateUnit, deleteUnit as fsDeleteUnit,
  getTherapistsByCompany, getTherapistByUserId,
  createTherapist as fsCreateTherapist, updateTherapist as fsUpdateTherapist,
  deleteTherapist as fsDeleteTherapist, getTherapistByUsername,
  getCompanyByInviteCode, searchCompaniesByName as fsSearchCompaniesByName,
  getTherapistAssociation, setTherapistAssociation,
  getCatalogByTherapist, saveCatalogItem, deleteCatalogItem,
  getAvailability, setAvailability as fsSetAvailability,
  getClientsByCompany, getClientByUserId,
  createClient as fsCreateClient, updateClient as fsUpdateClient,
  getTherapiesByCompany,
  createTherapy as fsCreateTherapy, updateTherapy as fsUpdateTherapy,
  deleteTherapy as fsDeleteTherapy,
  getRoomsByCompany,
  createRoom as fsCreateRoom, updateRoom as fsUpdateRoom, deleteRoom as fsDeleteRoom,
  getAppointmentsByCompany, getAppointmentsByTherapist, getAppointmentsByClient,
  createAppointment as fsCreateAppointment, updateAppointment as fsUpdateAppointment,
  getSessionRecordsByCompany, getSessionRecordsByTherapist,
  createSessionRecord as fsCreateSessionRecord,
  markSessionRecordsPaid as fsMarkSessionRecordsPaid,
  getRoomAssignmentsByCompany, setRoomAssignment, deleteRoomAssignment,
  getAllCompanies as fsGetAllCompanies,
  getAllTherapists as fsGetAllTherapists,
  getAllClients as fsGetAllClients,
  subscribeAppointmentsByCompany, subscribeAppointmentsByTherapist,
  subscribeSessionRecordsByCompany, subscribeSessionRecordsByTherapist,
  type Company, type Unit, type Therapist, type Client,
  type Therapy, type Room, type Appointment, type TherapistAssociation,
} from "../../lib/firestore";

// ─── Re-export types so pages can import from DataContext ─────────────────────
export type { Company, Unit, Therapist, Client, Therapy, Room, Appointment, SessionRecord, CatalogItem, MediaItem };

// ─── Context type ─────────────────────────────────────────────────────────────

interface DataContextValue {
  // Lists (pre-filtered for current user's scope)
  company: Company | null;
  units: Unit[];
  therapists: Therapist[];
  clients: Client[];
  appointments: Appointment[];
  therapies: Therapy[];
  rooms: Room[];
  sessionRecords: SessionRecord[];

  // Gallery
  myGallery: MediaItem[];
  companyGallery: MediaItem[];

  // Super Admin — platform-wide lists
  allAdminCompanies: Company[];
  allAdminTherapists: Therapist[];
  allAdminClients: Client[];

  // Per-role data
  myTherapist: Therapist | null;
  myCatalog: CatalogItem[];
  myAvailability: Record<string, string[]>;
  myClient: Client | null;

  // Chart data (mock for demo; computed/empty for real)
  revenueData: typeof mockRevenueData;
  weeklyData: typeof mockWeeklyData;
  unitRevenueData: typeof mockUnitRevenueData;
  unitWeeklyData: typeof mockUnitWeeklyData;
  therapistEarningsData: typeof mockTherapistEarningsData;

  // Store bridges for demo compatibility
  therapistStoreBridge: typeof therapistStore;
  unitStoreBridge: typeof unitStore;
  roomStoreBridge: typeof roomStore;

  // Room assignments
  roomAssignments: Record<string, string>;

  // Completed session ids
  completedSessionIds: Set<string>;

  loading: boolean;

  // ── Mutations ────────────────────────────────────────────────────────────

  // Company
  mutateCompany: (data: Partial<Company>) => Promise<void>;

  // Units
  mutateAddUnit: (data: Omit<Unit, "id" | "createdAt">) => Promise<Unit>;
  mutateUpdateUnit: (id: string, data: Partial<Unit>) => Promise<void>;
  mutateDeleteUnit: (id: string) => Promise<void>;

  // Therapists (company side)
  mutateInviteTherapist: (code: string, commission: number, unitId?: string | null) => Promise<Therapist | null>;
  mutateDissociateTherapist: (therapistId: string) => Promise<void>;
  mutateUpdateTherapistCommission: (therapistId: string, commission: number) => Promise<void>;
  mutateApproveAssociation: (therapistId: string, commission: number, unitId?: string | null) => Promise<void>;
  mutateRejectAssociation: (therapistId: string) => Promise<void>;

  // Clients
  mutateAddClient: (data: Omit<Client, "id" | "createdAt">) => Promise<Client>;
  mutateUpdateClient: (id: string, data: Partial<Client>) => Promise<void>;

  // Therapies
  mutateAddTherapy: (data: Omit<Therapy, "id" | "createdAt">) => Promise<Therapy>;
  mutateUpdateTherapy: (id: string, data: Partial<Therapy>) => Promise<void>;
  mutateDeleteTherapy: (id: string) => Promise<void>;

  // Rooms
  mutateAddRoom: (data: Omit<Room, "id" | "createdAt">) => Promise<Room>;
  mutateUpdateRoom: (id: string, data: Partial<Room>) => Promise<void>;
  mutateDeleteRoom: (id: string) => Promise<void>;

  // Appointments
  mutateAddAppointment: (data: Omit<Appointment, "id" | "createdAt">) => Promise<Appointment>;
  mutateUpdateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;

  // Session records
  mutateCompleteSession: (record: SessionRecord) => Promise<void>;

  /** Mark a batch of session records as paid by the company */
  mutateMarkCommissionPaid: (recordIds: string[]) => Promise<void>;

  // Room assignments
  mutateAssignRoom: (appointmentId: string, roomId: string) => void;
  mutateUnassignRoom: (appointmentId: string) => void;

  // Therapist profile (therapist side)
  mutateMyTherapistProfile: (data: Partial<Therapist>) => Promise<void>;
  mutateMyCatalog: (catalog: CatalogItem[]) => Promise<void>;
  mutateMyAvailability: (schedule: Record<string, string[]>) => Promise<void>;
  mutateLinkToCompany: (inviteCode: string) => Promise<Company | null>;
  mutateUnlinkFromCompany: () => Promise<void>;
  mutateAddMyGalleryItem: (item: MediaItem) => Promise<void>;
  mutateRemoveMyGalleryItem: (itemId: string) => Promise<void>;
  mutateAddCompanyGalleryItem: (item: MediaItem) => Promise<void>;
  mutateRemoveCompanyGalleryItem: (itemId: string) => Promise<void>;

  // Client profile (client side)
  mutateMyClientProfile: (data: Partial<Client>) => Promise<void>;

  // Search
  searchCompaniesByName: (query: string) => Promise<Company[]>;
  fetchCompanyByInviteCode: (code: string) => Promise<Company | null>;
  fetchUnitsByCompany: (companyId: string) => Promise<Unit[]>;

  // Refresh
  refresh: () => void;
}

// ─── Context (singleton — survives React Fast Refresh / HMR) ─────────────────
// Storing the context object on globalThis ensures that when this module is
// hot-reloaded a new createContext() is NOT called, keeping the identity stable
// so already-mounted DataProvider instances continue to satisfy useData().

const CTX_KEY = Symbol.for("zen_hub:DataContext");
if (!(globalThis as any)[CTX_KEY]) {
  (globalThis as any)[CTX_KEY] = createContext<DataContextValue | null>(null);
}
const DataContext: React.Context<DataContextValue | null> = (globalThis as any)[CTX_KEY];

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, isDemoMode } = useAuth();

  const [company, setCompany] = useState<Company | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [therapies, setTherapies] = useState<Therapy[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [sessionRecords, setSessionRecords] = useState<SessionRecord[]>([]);
  const [myTherapist, setMyTherapist] = useState<Therapist | null>(null);
  const [myCatalog, setMyCatalog] = useState<CatalogItem[]>([]);
  const [myAvailability, setMyAvailability] = useState<Record<string, string[]>>({});
  const [myClient, setMyClient] = useState<Client | null>(null);
  const [roomAssignments, setRoomAssignments] = useState<Record<string, string>>({});
  const [completedSessionIds, setCompletedSessionIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Super Admin — platform-wide lists
  const [allAdminCompanies, setAllAdminCompanies] = useState<Company[]>([]);
  const [allAdminTherapists, setAllAdminTherapists] = useState<Therapist[]>([]);
  const [allAdminClients, setAllAdminClients] = useState<Client[]>([]);

  // Store subscription (demo mode)
  const [, forceRender] = useState(0);
  useEffect(() => {
    if (!isDemoMode) return;
    const u1 = therapistStore.subscribe(() => forceRender((n) => n + 1));
    const u2 = unitStore.subscribe(() => forceRender((n) => n + 1));
    const u3 = roomStore.subscribe(() => forceRender((n) => n + 1));
    return () => { u1(); u2(); u3(); };
  }, [isDemoMode]);

  // ── Real-time Firestore subscriptions (non-demo) ──────────────────────────
  // Keeps appointments and sessionRecords in sync across all browser sessions.
  // Company admins receive updates from therapists' bookings automatically.
  useEffect(() => {
    if (!user || isDemoMode) return;

    const role = user.role;
    const unsubs: Array<() => void> = [];

    if ((role === "company_admin" || role === "sales") && user.companyId) {
      const cid = user.companyId;
      unsubs.push(
        subscribeAppointmentsByCompany(cid, (apts) => setAppointments(apts)),
        subscribeSessionRecordsByCompany(cid, (recs) => {
          setSessionRecords(recs);
          setCompletedSessionIds(new Set(recs.map((r) => r.appointmentId)));
        }),
      );
    }

    if (role === "therapist" && myTherapist?.id) {
      const tid = myTherapist.id;
      unsubs.push(
        subscribeAppointmentsByTherapist(tid, (apts) => setAppointments(apts)),
        subscribeSessionRecordsByTherapist(tid, (recs) => {
          setSessionRecords(recs);
          setCompletedSessionIds(new Set(recs.map((r) => r.appointmentId)));
        }),
      );
    }

    return () => unsubs.forEach((u) => u());
  // myTherapist?.id is the stable key for the therapist subscription
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.role, user?.companyId, myTherapist?.id, isDemoMode]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  // ── Load data ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (isDemoMode) {
      // Demo: use filtered mockData
      setLoading(false);
      return;
    }

    // Real user: load from Firestore
    const load = async () => {
      setLoading(true);
      try {
        const role = user.role;

        if (role === "company_admin" || role === "sales") {
          const cid = user.companyId!;
          const [co, us, th, cl, ap, trh, rm, sr, ra] = await Promise.all([
            getCompany(cid),
            getUnitsByCompany(cid),
            getTherapistsByCompany(cid),
            getClientsByCompany(cid),
            getAppointmentsByCompany(cid),
            getTherapiesByCompany(cid),
            getRoomsByCompany(cid),
            getSessionRecordsByCompany(cid),
            getRoomAssignmentsByCompany(cid),
          ]);
          setCompany(co);
          setUnits(us);
          setTherapists(th);
          setClients(cl);
          setAppointments(ap);
          setTherapies(trh);
          setRooms(rm);
          setSessionRecords(sr);
          setRoomAssignments(ra);
          setCompletedSessionIds(new Set(sr.map((r) => r.appointmentId)));
        }

        if (role === "therapist") {
          const t = await getTherapistByUserId(user.uid);
          setMyTherapist(t);
          if (t) {
            const cid = t.companyId;
            const [ap, sr, cat, avail] = await Promise.all([
              getAppointmentsByTherapist(t.id),
              getSessionRecordsByTherapist(t.id),
              getCatalogByTherapist(t.id),
              getAvailability(t.id),
            ]);
            setAppointments(ap);
            setSessionRecords(sr);
            setMyCatalog(cat);
            setMyAvailability(avail ?? t.schedule ?? {});
            setCompletedSessionIds(new Set(sr.map((r) => r.appointmentId)));
            if (cid) {
              const [co, cl, trh, th] = await Promise.all([
                getCompany(cid),
                getClientsByCompany(cid),
                getTherapiesByCompany(cid),
                getTherapistsByCompany(cid),
              ]);
              setCompany(co);
              setClients(cl);
              setTherapies(trh);
              setTherapists(th);
            }
          }
        }

        if (role === "client") {
          const c = await getClientByUserId(user.uid);
          setMyClient(c);
          if (c) {
            const cid = c.companyId;
            const [ap, co] = await Promise.all([
              getAppointmentsByClient(c.id),
              cid ? getCompany(cid) : Promise.resolve(null),
            ]);
            setAppointments(ap);
            if (co) {
              setCompany(co);
              const [th, trh] = await Promise.all([
                getTherapistsByCompany(cid!),
                getTherapiesByCompany(cid!),
              ]);
              setTherapists(th);
              setTherapies(trh);
            }
          }
        }

        if (role === "super_admin") {
          const [allCompanies, allTherapists, allClients] = await Promise.all([
            fsGetAllCompanies(),
            fsGetAllTherapists(),
            fsGetAllClients(),
          ]);
          setCompany(null);
          setUnits([]);
          setTherapists([]);
          setClients([]);
          setAppointments([]);
          setTherapies([]);
          setRooms([]);
          setSessionRecords([]);
          setRoomAssignments({});
          setCompletedSessionIds(new Set());
          setMyTherapist(null);
          setMyCatalog([]);
          setMyAvailability({});
          setMyClient(null);
          setAllAdminCompanies(allCompanies);
          setAllAdminTherapists(allTherapists);
          setAllAdminClients(allClients);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, isDemoMode, tick]);

  // ── Demo-mode computed values ─────────────────────────────────────────────

  const demoCompanyId = user?.companyId;

  // In demo mode: prefer the mutable `company` state (updated by mutateCompany)
  // and fall back to the static mock only when state is still null (initial load).
  const demoCompany = isDemoMode
    ? (() => {
        // Therapist role: ALWAYS derive from the live association store so that
        // unlink / rejectAssociation is reflected immediately.
        if (user?.role === "demo" || user?.role === "therapist") {
          const therapistId = user?.therapistId;
          if (therapistId) {
            const assoc = therapistStore.getAssociation(therapistId);
            if (assoc.companyId) {
              const found = mockCompanies.find((c) => c.id === assoc.companyId);
              if (found) return found as unknown as Company;
            }
          }
          return null;
        }
        // Company / admin roles: prefer mutable state, fallback to mock
        if (company) return company;
        if (demoCompanyId) {
          const found = mockCompanies.find((c) => c.id === demoCompanyId);
          if (found) return found as unknown as Company;
        }
        return null;
      })()
    : company;

  const demoUnits = isDemoMode
    ? (unitStore.getUnits(demoCompanyId ?? "") as unknown as Unit[])
    : units;

  const demoTherapists = isDemoMode
    ? (() => {
        if (!demoCompanyId) return [] as unknown as Therapist[];
        // Use ONLY the store's active associations as source of truth.
        // Do NOT fall back to t.companyId from static mock data — that field
        // never changes and would keep showing dissociated therapists.
        const activeIds = new Set(
          therapistStore.getCompanyTherapists(demoCompanyId).map((a) => a.therapistId)
        );
        return mockTherapists.filter(
          (t) => activeIds.has(t.id)
        ) as unknown as Therapist[];
      })()
    : therapists;

  const demoClients = isDemoMode
    ? (mockClients.filter((c) => c.companyId === demoCompanyId) as unknown as Client[])
    : clients;

  const demoAppointments = isDemoMode
    ? (mockAppointments.filter((a) => a.companyId === demoCompanyId) as unknown as Appointment[])
    : appointments;

  const demoTherapies = isDemoMode
    ? (mockTherapies.filter((t) => t.companyId === demoCompanyId) as unknown as Therapy[])
    : therapies;

  const demoRooms = isDemoMode
    ? (roomStore.getRooms(demoCompanyId ?? "") as unknown as Room[])
    : rooms;

  const demoSessionRecords = isDemoMode
    ? (therapistStore.getAllRecords() as unknown as SessionRecord[])
    : sessionRecords;

  const demoMyTherapist = isDemoMode
    ? (() => {
        const t = mockTherapists.find((mt) => mt.id === user?.therapistId);
        if (!t) return null;
        // Reflect the current association state from the store
        const assoc = therapistStore.getAssociation(t.id);
        return {
          ...t,
          companyId: assoc.companyId ?? undefined,
          commission: assoc.status === "active" ? assoc.commission : t.commission,
        } as unknown as Therapist;
      })()
    : myTherapist;

  const demoMyClient = isDemoMode
    ? (mockClients.find((c) => c.id === user?.clientId) as unknown as Client | null ?? null)
    : myClient;

  const demoMyCatalog = isDemoMode
    ? (therapistStore.getCatalog(user?.therapistId ?? "") as CatalogItem[])
    : myCatalog;

  const demoRoomAssignments = isDemoMode
    ? (() => {
        // extract from roomStore
        const ra: Record<string, string> = {};
        const rms = roomStore.getRooms(demoCompanyId ?? "");
        return ra; // roomStore doesn't expose all assignments, handled via bridge
      })()
    : roomAssignments;

  const demoCompletedIds = isDemoMode
    ? new Set<string>([
        ...therapistStore.getAllRecords().map((r) => r.appointmentId),
      ])
    : completedSessionIds;

  const demoMyGallery = isDemoMode
    ? therapistStore.getGallery(user?.therapistId ?? "")
    : [];

  const demoCompanyGallery = isDemoMode
    ? therapistStore.getCompanyGallery(user?.companyId ?? demoCompanyId ?? "")
    : [];

  // Super Admin demo: expose all mock companies/therapists/clients
  const demoAdminCompanies = isDemoMode ? (mockCompanies as unknown as Company[]) : allAdminCompanies;
  const demoAdminTherapists = isDemoMode ? (mockTherapists as unknown as Therapist[]) : allAdminTherapists;
  const demoAdminClients = isDemoMode ? (mockClients as unknown as Client[]) : allAdminClients;

  // ── Chart data ────────────────────────────────────────────────────────────

  const chartRevenueData = isDemoMode ? mockRevenueData : [];
  const chartWeeklyData = isDemoMode ? mockWeeklyData : [];
  const chartUnitRevenueData = isDemoMode ? mockUnitRevenueData : {};
  const chartUnitWeeklyData = isDemoMode ? mockUnitWeeklyData : {};
  const chartTherapistEarningsData = isDemoMode ? mockTherapistEarningsData : [];

  // ── Mutations ────────────────────────────────────────────────────────────

  // Company
  const mutateCompany = useCallback(async (data: Partial<Company>) => {
    if (isDemoMode) {
      // Demo mode: persist color/settings in React state so all pages re-render
      setCompany((prev) => {
        const base = prev
          ?? (mockCompanies.find((c) => c.id === user?.companyId) as unknown as Company ?? null);
        return base ? { ...base, ...data } : null;
      });
      return;
    }
    const cid = user?.companyId;
    if (!cid) return;
    await fsUpdateCompany(cid, data);
    setCompany((prev) => prev ? { ...prev, ...data } : prev);
  }, [isDemoMode, user]);

  // Units
  const mutateAddUnit = useCallback(async (data: Omit<Unit, "id" | "createdAt">): Promise<Unit> => {
    if (isDemoMode) {
      const newUnit = { ...data, id: `un_${Date.now()}`, therapistsCount: 0, roomsCount: 0 } as any;
      unitStore.addUnit(newUnit);
      return newUnit as Unit;
    }
    const id = await fsCreateUnit(data);
    const newUnit: Unit = { ...data, id };
    setUnits((prev) => [...prev, newUnit]);
    return newUnit;
  }, [isDemoMode]);

  const mutateUpdateUnit = useCallback(async (id: string, data: Partial<Unit>) => {
    if (isDemoMode) {
      const existing = unitStore.getUnit(id);
      if (existing) unitStore.updateUnit({ ...existing, ...data } as any);
      return;
    }
    await fsUpdateUnit(id, data);
    setUnits((prev) => prev.map((u) => u.id === id ? { ...u, ...data } : u));
  }, [isDemoMode]);

  const mutateDeleteUnit = useCallback(async (id: string) => {
    if (isDemoMode) { unitStore.deleteUnit(id); return; }
    await fsDeleteUnit(id);
    setUnits((prev) => prev.filter((u) => u.id !== id));
  }, [isDemoMode]);

  // Therapists (company side: invite/associate)
  const mutateInviteTherapist = useCallback(async (code: string, commission: number, unitId?: string | null): Promise<Therapist | null> => {
    if (isDemoMode) {
      // Demo: look up in mockTherapists catalog by username or invite code pattern
      const found = mockTherapists.find(
        (t) => t.username === code.toLowerCase() || t.id === code
      );
      if (!found) return null;
      therapistStore.associateTherapist(found.id, demoCompanyId!, commission, unitId);
      return found as unknown as Therapist;
    }
    // Real: find therapist by username
    const t = await getTherapistByUsername(code.toLowerCase());
    if (!t) return null;
    // Associate
    await fsUpdateTherapist(t.id, { companyId: user!.companyId!, commission, unitId: unitId ?? undefined });
    await setTherapistAssociation({
      therapistId: t.id,
      companyId: user!.companyId!,
      unitId: unitId ?? null,
      commission,
      linkedAt: new Date().toISOString(),
    });
    const updated = { ...t, companyId: user!.companyId!, commission, unitId: unitId ?? undefined };
    setTherapists((prev) =>
      prev.find((p) => p.id === t.id) ? prev.map((p) => p.id === t.id ? updated : p) : [...prev, updated]
    );
    return updated;
  }, [isDemoMode, demoCompanyId, user]);

  const mutateDissociateTherapist = useCallback(async (therapistId: string) => {
    if (isDemoMode) { therapistStore.dissociateTherapist(therapistId); return; }
    await fsUpdateTherapist(therapistId, { companyId: undefined });
    await setTherapistAssociation({ therapistId, companyId: null, unitId: null, commission: 50, linkedAt: null });
    setTherapists((prev) => prev.filter((t) => t.id !== therapistId));
  }, [isDemoMode]);

  const mutateUpdateTherapistCommission = useCallback(async (therapistId: string, commission: number) => {
    if (isDemoMode) { therapistStore.updateCommission(therapistId, commission); return; }
    await fsUpdateTherapist(therapistId, { commission });
    setTherapists((prev) => prev.map((t) => t.id === therapistId ? { ...t, commission } : t));
  }, [isDemoMode]);

  const mutateApproveAssociation = useCallback(async (therapistId: string, commission: number, unitId?: string | null) => {
    if (isDemoMode) {
      therapistStore.approveAssociation(therapistId, commission, unitId);
      return;
    }
    // Real: update therapist record + association document
    await fsUpdateTherapist(therapistId, { companyId: user!.companyId!, commission, unitId: unitId ?? undefined });
    await setTherapistAssociation({
      therapistId,
      companyId: user!.companyId!,
      unitId: unitId ?? null,
      commission,
      linkedAt: new Date().toISOString(),
    });
    setTherapists((prev) =>
      prev.some((p) => p.id === therapistId)
        ? prev.map((p) => p.id === therapistId ? { ...p, companyId: user!.companyId!, commission } : p)
        : prev
    );
  }, [isDemoMode, user]);

  const mutateRejectAssociation = useCallback(async (therapistId: string) => {
    if (isDemoMode) {
      therapistStore.rejectAssociation(therapistId);
      return;
    }
    await setTherapistAssociation({ therapistId, companyId: null, unitId: null, commission: 0, linkedAt: null });
  }, [isDemoMode]);

  // Clients
  const mutateAddClient = useCallback(async (data: Omit<Client, "id" | "createdAt">): Promise<Client> => {
    if (isDemoMode) {
      const newC = { ...data, id: `cl_${Date.now()}` } as Client;
      // mockClients is read-only, but demo mode sees it via the filter above
      return newC;
    }
    const id = await fsCreateClient(data);
    const newC: Client = { ...data, id };
    setClients((prev) => [...prev, newC]);
    return newC;
  }, [isDemoMode]);

  const mutateUpdateClient = useCallback(async (id: string, data: Partial<Client>) => {
    if (isDemoMode) return;
    await fsUpdateClient(id, data);
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    if (myClient?.id === id) setMyClient((prev) => prev ? { ...prev, ...data } : prev);
  }, [isDemoMode, myClient]);

  // Therapies
  const mutateAddTherapy = useCallback(async (data: Omit<Therapy, "id" | "createdAt">): Promise<Therapy> => {
    if (isDemoMode) {
      const newT = { ...data, id: `th_${Date.now()}` } as Therapy;
      return newT;
    }
    const id = await fsCreateTherapy(data);
    const newT: Therapy = { ...data, id };
    setTherapies((prev) => [...prev, newT]);
    return newT;
  }, [isDemoMode]);

  const mutateUpdateTherapy = useCallback(async (id: string, data: Partial<Therapy>) => {
    if (isDemoMode) return;
    await fsUpdateTherapy(id, data);
    setTherapies((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  }, [isDemoMode]);

  const mutateDeleteTherapy = useCallback(async (id: string) => {
    if (isDemoMode) return;
    await fsDeleteTherapy(id);
    setTherapies((prev) => prev.filter((t) => t.id !== id));
  }, [isDemoMode]);

  // Rooms
  const mutateAddRoom = useCallback(async (data: Omit<Room, "id" | "createdAt">): Promise<Room> => {
    if (isDemoMode) {
      const newR = { ...data, id: `r_${Date.now()}` } as Room;
      roomStore.addRoom(newR as any);
      return newR;
    }
    const id = await fsCreateRoom(data);
    const newR: Room = { ...data, id };
    setRooms((prev) => [...prev, newR]);
    return newR;
  }, [isDemoMode]);

  const mutateUpdateRoom = useCallback(async (id: string, data: Partial<Room>) => {
    if (isDemoMode) {
      const existing = roomStore.getRoom(id);
      if (existing) roomStore.updateRoom({ ...existing, ...data } as any);
      return;
    }
    // Use setDoc (merge: true) so it works even if the document was previously
    // stored with a wrong client-generated id field and the doc doesn't exist yet.
    const { setDoc: fsSetDoc, doc: fsDoc, serverTimestamp: fsST } = await import("firebase/firestore");
    const { db: fsDb } = await import("../../lib/firebase");
    await fsSetDoc(fsDoc(fsDb, "rooms", id), { ...data, updatedAt: fsST() }, { merge: true });
    setRooms((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
  }, [isDemoMode]);

  const mutateDeleteRoom = useCallback(async (id: string) => {
    if (isDemoMode) { roomStore.deleteRoom(id); return; }
    await fsDeleteRoom(id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }, [isDemoMode]);

  // Appointments
  const mutateAddAppointment = useCallback(async (data: Omit<Appointment, "id" | "createdAt">): Promise<Appointment> => {
    if (isDemoMode) {
      const newA = { ...data, id: `a_${Date.now()}` } as Appointment;
      return newA;
    }
    const id = await fsCreateAppointment(data);
    const newA: Appointment = { ...data, id };
    setAppointments((prev) => [...prev, newA]);
    return newA;
  }, [isDemoMode]);

  const mutateUpdateAppointment = useCallback(async (id: string, data: Partial<Appointment>) => {
    if (isDemoMode) return;
    await fsUpdateAppointment(id, data);
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, ...data } : a));
  }, [isDemoMode]);

  // Session records
  const mutateCompleteSession = useCallback(async (record: SessionRecord) => {
    if (isDemoMode) {
      therapistStore.completeSession(record as any);
      return;
    }
    await fsCreateSessionRecord(record);
    await fsUpdateAppointment(record.appointmentId, { status: "completed" });
    setSessionRecords((prev) => [record, ...prev]);
    setCompletedSessionIds((prev) => new Set([...prev, record.appointmentId]));
    setAppointments((prev) =>
      prev.map((a) => a.id === record.appointmentId ? { ...a, status: "completed" } : a)
    );
  }, [isDemoMode]);

  const mutateMarkCommissionPaid = useCallback(async (recordIds: string[]) => {
    if (isDemoMode) {
      therapistStore.markRecordsPaid(recordIds);
      return;
    }
    await fsMarkSessionRecordsPaid(recordIds);
    setSessionRecords((prev) =>
      prev.map((r) => recordIds.includes(r.id) ? { ...r, paidByCompany: true } : r)
    );
  }, [isDemoMode]);

  // Room assignments
  const mutateAssignRoom = useCallback((appointmentId: string, roomId: string) => {
    if (isDemoMode) { roomStore.assignRoom(appointmentId, roomId); return; }
    setRoomAssignment(appointmentId, roomId, user?.companyId ?? "");
    setRoomAssignments((prev) => ({ ...prev, [appointmentId]: roomId }));
  }, [isDemoMode, user]);

  const mutateUnassignRoom = useCallback((appointmentId: string) => {
    if (isDemoMode) { roomStore.unassignRoom(appointmentId); return; }
    deleteRoomAssignment(appointmentId);
    setRoomAssignments((prev) => { const n = { ...prev }; delete n[appointmentId]; return n; });
  }, [isDemoMode]);

  // Therapist profile mutations
  const mutateMyTherapistProfile = useCallback(async (data: Partial<Therapist>) => {
    if (isDemoMode) return;
    if (!myTherapist) return;
    await fsUpdateTherapist(myTherapist.id, data);
    setMyTherapist((prev) => prev ? { ...prev, ...data } : prev);
  }, [isDemoMode, myTherapist]);

  const mutateMyCatalog = useCallback(async (catalog: CatalogItem[]) => {
    if (isDemoMode) { therapistStore.setCatalog(user?.therapistId ?? "", catalog as any); return; }
    if (!myTherapist) return;
    // Delete items that were removed from the catalog
    const newIds = new Set(catalog.map((i) => i.id));
    const toDelete = myCatalog.filter((i) => !newIds.has(i.id));
    await Promise.all(toDelete.map((i) => deleteCatalogItem(i.id)));
    // Upsert all remaining/new items
    await Promise.all(
      catalog.map((item) => saveCatalogItem({ ...item, therapistId: myTherapist.id }))
    );
    setMyCatalog(catalog);
  }, [isDemoMode, user, myTherapist, myCatalog]);

  const mutateMyAvailability = useCallback(async (schedule: Record<string, string[]>) => {
    if (isDemoMode) {
      therapistStore.setAvailability(user?.therapistId ?? "", schedule);
      setMyAvailability(schedule); // atualiza React state para re-render imediato
      return;
    }
    if (!myTherapist) return;
    await fsSetAvailability(myTherapist.id, schedule);
    setMyAvailability(schedule);
  }, [isDemoMode, user, myTherapist]);

  const mutateLinkToCompany = useCallback(async (inviteCode: string): Promise<Company | null> => {
    if (isDemoMode) {
      const co = mockCompanies.find((c) => c.inviteCode === inviteCode.toUpperCase());
      if (!co) return null;
      const therapistId = user?.therapistId;
      if (!therapistId) return null;
      const t = mockTherapists.find((mt) => mt.id === therapistId);
      therapistStore.requestLink(therapistId, co.id, co.name, {
        name: t?.name ?? "Terapeuta",
        avatar: t?.avatar ?? "",
        specialty: t?.specialty ?? "",
        username: t?.username ?? therapistId,
      });
      return co as unknown as Company;
    }
    const co = await getCompanyByInviteCode(inviteCode);
    if (!co || !myTherapist) return null;
    await fsUpdateTherapist(myTherapist.id, { companyId: co.id });
    await setTherapistAssociation({
      therapistId: myTherapist.id,
      companyId: co.id,
      unitId: null,
      commission: 50,
      linkedAt: new Date().toISOString(),
    });
    setMyTherapist((prev) => prev ? { ...prev, companyId: co.id } : prev);
    setCompany(co);
    return co;
  }, [isDemoMode, user, myTherapist]);

  const mutateUnlinkFromCompany = useCallback(async () => {
    if (isDemoMode) {
      const therapistId = user?.therapistId;
      if (therapistId) therapistStore.rejectAssociation(therapistId);
      return;
    }
    if (!myTherapist) return;
    await fsUpdateTherapist(myTherapist.id, { companyId: undefined });
    await setTherapistAssociation({ therapistId: myTherapist.id, companyId: null, unitId: null, commission: 50, linkedAt: null });
    setMyTherapist((prev) => prev ? { ...prev, companyId: undefined } : prev);
    setCompany(null);
  }, [isDemoMode, user, myTherapist]);

  const mutateAddMyGalleryItem = useCallback(async (item: MediaItem) => {
    if (isDemoMode) {
      therapistStore.addGalleryItem(user?.therapistId ?? "", item);
      return;
    }
    if (!myTherapist) return;
    const gallery = [...(myTherapist.gallery ?? []), item];
    await fsUpdateTherapist(myTherapist.id, { gallery } as any);
    setMyTherapist((prev) => prev ? { ...prev, gallery } as any : prev);
  }, [isDemoMode, user, myTherapist]);

  const mutateRemoveMyGalleryItem = useCallback(async (itemId: string) => {
    if (isDemoMode) {
      therapistStore.removeGalleryItem(user?.therapistId ?? "", itemId);
      return;
    }
    if (!myTherapist) return;
    const gallery = ((myTherapist as any).gallery ?? []).filter((m: MediaItem) => m.id !== itemId);
    await fsUpdateTherapist(myTherapist.id, { gallery } as any);
    setMyTherapist((prev) => prev ? { ...prev, gallery } as any : prev);
  }, [isDemoMode, user, myTherapist]);

  const mutateAddCompanyGalleryItem = useCallback(async (item: MediaItem) => {
    if (isDemoMode) {
      therapistStore.addCompanyGalleryItem(user?.companyId ?? demoCompanyId ?? "", item);
      return;
    }
    const cid = user?.companyId;
    if (!cid) return;
    const gallery = [...(company as any)?.gallery ?? [], item];
    await fsUpdateCompany(cid, { gallery } as any);
    setCompany((prev) => prev ? { ...prev, gallery } as any : prev);
  }, [isDemoMode, user, demoCompanyId, company]);

  const mutateRemoveCompanyGalleryItem = useCallback(async (itemId: string) => {
    if (isDemoMode) {
      therapistStore.removeCompanyGalleryItem(user?.companyId ?? demoCompanyId ?? "", itemId);
      return;
    }
    const cid = user?.companyId;
    if (!cid) return;
    const gallery = ((company as any)?.gallery ?? []).filter((m: MediaItem) => m.id !== itemId);
    await fsUpdateCompany(cid, { gallery } as any);
    setCompany((prev) => prev ? { ...prev, gallery } as any : prev);
  }, [isDemoMode, user, demoCompanyId, company]);

  // Client profile
  const mutateMyClientProfile = useCallback(async (data: Partial<Client>) => {
    if (isDemoMode) return;
    if (!myClient) return;
    await fsUpdateClient(myClient.id, data);
    setMyClient((prev) => prev ? { ...prev, ...data } : prev);
  }, [isDemoMode, myClient]);

  // Search
  const searchCompaniesByName = useCallback(async (q: string): Promise<Company[]> => {
    if (isDemoMode) {
      return mockCompanies
        .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()) && c.status === "active") as unknown as Company[];
    }
    return fsSearchCompaniesByName(q);
  }, [isDemoMode]);

  const fetchCompanyByInviteCode = useCallback(async (code: string): Promise<Company | null> => {
    if (isDemoMode) {
      const c = mockCompanies.find((c) => c.inviteCode === code.toUpperCase());
      return c ? (c as unknown as Company) : null;
    }
    return getCompanyByInviteCode(code);
  }, [isDemoMode]);

  const fetchUnitsByCompany = useCallback(async (companyId: string): Promise<Unit[]> => {
    if (isDemoMode) {
      return mockUnits.filter((u) => u.companyId === companyId) as unknown as Unit[];
    }
    return getUnitsByCompany(companyId);
  }, [isDemoMode]);

  // ── Assemble value ────────────────────────────────────────────────────────

  const value: DataContextValue = {
    company: demoCompany,
    units: demoUnits,
    therapists: demoTherapists,
    clients: demoClients,
    appointments: demoAppointments,
    therapies: demoTherapies,
    rooms: demoRooms,
    sessionRecords: demoSessionRecords,
    allAdminCompanies: demoAdminCompanies,
    allAdminTherapists: demoAdminTherapists,
    allAdminClients: demoAdminClients,
    myTherapist: demoMyTherapist,
    myCatalog: demoMyCatalog,
    myAvailability,
    myClient: demoMyClient,
    revenueData: chartRevenueData,
    weeklyData: chartWeeklyData,
    unitRevenueData: chartUnitRevenueData,
    unitWeeklyData: chartUnitWeeklyData,
    therapistEarningsData: chartTherapistEarningsData,
    therapistStoreBridge: therapistStore,
    unitStoreBridge: unitStore,
    roomStoreBridge: roomStore,
    roomAssignments: isDemoMode ? demoRoomAssignments : roomAssignments,
    completedSessionIds: demoCompletedIds,
    myGallery: demoMyGallery,
    companyGallery: demoCompanyGallery,
    loading,
    mutateCompany,
    mutateAddUnit, mutateUpdateUnit, mutateDeleteUnit,
    mutateInviteTherapist, mutateDissociateTherapist, mutateUpdateTherapistCommission,
    mutateApproveAssociation, mutateRejectAssociation,
    mutateAddClient, mutateUpdateClient,
    mutateAddTherapy, mutateUpdateTherapy, mutateDeleteTherapy,
    mutateAddRoom, mutateUpdateRoom, mutateDeleteRoom,
    mutateAddAppointment, mutateUpdateAppointment,
    mutateCompleteSession,
    mutateMarkCommissionPaid,
    mutateAssignRoom, mutateUnassignRoom,
    mutateMyTherapistProfile, mutateMyCatalog, mutateMyAvailability,
    mutateLinkToCompany, mutateUnlinkFromCompany,
    mutateAddMyGalleryItem, mutateRemoveMyGalleryItem,
    mutateAddCompanyGalleryItem, mutateRemoveCompanyGalleryItem,
    mutateMyClientProfile,
    searchCompaniesByName, fetchCompanyByInviteCode, fetchUnitsByCompany,
    refresh,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}