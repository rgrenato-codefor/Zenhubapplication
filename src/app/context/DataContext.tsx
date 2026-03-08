/**
 * DataContext — single source of truth for all app data.
 * Fetches from Firestore and provides CRUD mutations.
 * All pages import `useData()` instead of mockData directly.
 */

import {
  createContext, useContext, useState, useEffect, useCallback,
  useRef, type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

// ── Store types (bridges kept for page compatibility) ────────────────────────
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

  // Chart data (empty for real users)
  revenueData: any[];
  weeklyData: any[];
  unitRevenueData: Record<string, any>;
  unitWeeklyData: Record<string, any>;
  therapistEarningsData: any[];

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
  const { user } = useAuth();

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

  // Store subscription (demo mode) — no longer needed but preserved as stub
  const [, forceRender] = useState(0);

  // ── Real-time Firestore subscriptions ─────────────────────────────────────
  useEffect(() => {
    if (!user) return;

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.role, user?.companyId, myTherapist?.id]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  // ── Load data ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Load from Firestore
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
  }, [user, tick]);

  // ── Computed values ───────────────────────────────────────────────────────

  // Chart data — empty for real users (computed from real records on each page)
  const chartRevenueData: any[] = [];
  const chartWeeklyData: any[] = [];
  const chartUnitRevenueData: Record<string, any> = {};
  const chartUnitWeeklyData: Record<string, any> = {};
  const chartTherapistEarningsData: any[] = [];

  // ── Mutations ───────────────────────────────────────��────────────────────

  // Company
  const mutateCompany = useCallback(async (data: Partial<Company>) => {
    const cid = user?.companyId;
    if (!cid) return;
    await fsUpdateCompany(cid, data);
    setCompany((prev) => prev ? { ...prev, ...data } : prev);
  }, [user]);

  // Units
  const mutateAddUnit = useCallback(async (data: Omit<Unit, "id" | "createdAt">): Promise<Unit> => {
    const id = await fsCreateUnit(data);
    const newUnit: Unit = { ...data, id };
    setUnits((prev) => [...prev, newUnit]);
    return newUnit;
  }, []);

  const mutateUpdateUnit = useCallback(async (id: string, data: Partial<Unit>) => {
    await fsUpdateUnit(id, data);
    setUnits((prev) => prev.map((u) => u.id === id ? { ...u, ...data } : u));
  }, []);

  const mutateDeleteUnit = useCallback(async (id: string) => {
    await fsDeleteUnit(id);
    setUnits((prev) => prev.filter((u) => u.id !== id));
  }, []);

  // Therapists (company side: invite/associate)
  const mutateInviteTherapist = useCallback(async (code: string, commission: number, unitId?: string | null): Promise<Therapist | null> => {
    const t = await getTherapistByUsername(code.toLowerCase());
    if (!t) return null;
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
  }, [user]);

  const mutateDissociateTherapist = useCallback(async (therapistId: string) => {
    await fsUpdateTherapist(therapistId, { companyId: undefined });
    await setTherapistAssociation({ therapistId, companyId: null, unitId: null, commission: 50, linkedAt: null });
    setTherapists((prev) => prev.filter((t) => t.id !== therapistId));
  }, []);

  const mutateUpdateTherapistCommission = useCallback(async (therapistId: string, commission: number) => {
    await fsUpdateTherapist(therapistId, { commission });
    setTherapists((prev) => prev.map((t) => t.id === therapistId ? { ...t, commission } : t));
  }, []);

  const mutateApproveAssociation = useCallback(async (therapistId: string, commission: number, unitId?: string | null) => {
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
  }, [user]);

  const mutateRejectAssociation = useCallback(async (therapistId: string) => {
    await setTherapistAssociation({ therapistId, companyId: null, unitId: null, commission: 0, linkedAt: null });
  }, []);

  // Clients
  const mutateAddClient = useCallback(async (data: Omit<Client, "id" | "createdAt">): Promise<Client> => {
    const id = await fsCreateClient(data);
    const newC: Client = { ...data, id };
    setClients((prev) => [...prev, newC]);
    return newC;
  }, []);

  const mutateUpdateClient = useCallback(async (id: string, data: Partial<Client>) => {
    await fsUpdateClient(id, data);
    setClients((prev) => prev.map((c) => c.id === id ? { ...c, ...data } : c));
    if (myClient?.id === id) setMyClient((prev) => prev ? { ...prev, ...data } : prev);
  }, [myClient]);

  // Therapies
  const mutateAddTherapy = useCallback(async (data: Omit<Therapy, "id" | "createdAt">): Promise<Therapy> => {
    const id = await fsCreateTherapy(data);
    const newT: Therapy = { ...data, id };
    setTherapies((prev) => [...prev, newT]);
    return newT;
  }, []);

  const mutateUpdateTherapy = useCallback(async (id: string, data: Partial<Therapy>) => {
    await fsUpdateTherapy(id, data);
    setTherapies((prev) => prev.map((t) => t.id === id ? { ...t, ...data } : t));
  }, []);

  const mutateDeleteTherapy = useCallback(async (id: string) => {
    await fsDeleteTherapy(id);
    setTherapies((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Rooms
  const mutateAddRoom = useCallback(async (data: Omit<Room, "id" | "createdAt">): Promise<Room> => {
    const id = await fsCreateRoom(data);
    const newR: Room = { ...data, id };
    setRooms((prev) => [...prev, newR]);
    return newR;
  }, []);

  const mutateUpdateRoom = useCallback(async (id: string, data: Partial<Room>) => {
    const { setDoc: fsSetDoc, doc: fsDoc, serverTimestamp: fsST } = await import("firebase/firestore");
    const { db: fsDb } = await import("../../lib/firebase");
    await fsSetDoc(fsDoc(fsDb, "rooms", id), { ...data, updatedAt: fsST() }, { merge: true });
    setRooms((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
  }, []);

  const mutateDeleteRoom = useCallback(async (id: string) => {
    await fsDeleteRoom(id);
    setRooms((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Appointments
  const mutateAddAppointment = useCallback(async (data: Omit<Appointment, "id" | "createdAt">): Promise<Appointment> => {
    const id = await fsCreateAppointment(data);
    const newA: Appointment = { ...data, id };
    setAppointments((prev) => [...prev, newA]);
    return newA;
  }, []);

  const mutateUpdateAppointment = useCallback(async (id: string, data: Partial<Appointment>) => {
    await fsUpdateAppointment(id, data);
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, ...data } : a));
  }, []);

  // Session records
  const mutateCompleteSession = useCallback(async (record: SessionRecord) => {
    await fsCreateSessionRecord(record);
    await fsUpdateAppointment(record.appointmentId, { status: "completed" });
    setSessionRecords((prev) => [record, ...prev]);
    setCompletedSessionIds((prev) => new Set([...prev, record.appointmentId]));
    setAppointments((prev) =>
      prev.map((a) => a.id === record.appointmentId ? { ...a, status: "completed" } : a)
    );
  }, []);

  const mutateMarkCommissionPaid = useCallback(async (recordIds: string[]) => {
    await fsMarkSessionRecordsPaid(recordIds);
    setSessionRecords((prev) =>
      prev.map((r) => recordIds.includes(r.id) ? { ...r, paidByCompany: true } : r)
    );
  }, []);

  // Room assignments
  const mutateAssignRoom = useCallback((appointmentId: string, roomId: string) => {
    setRoomAssignment(appointmentId, roomId, user?.companyId ?? "");
    setRoomAssignments((prev) => ({ ...prev, [appointmentId]: roomId }));
  }, [user]);

  const mutateUnassignRoom = useCallback((appointmentId: string) => {
    deleteRoomAssignment(appointmentId);
    setRoomAssignments((prev) => { const n = { ...prev }; delete n[appointmentId]; return n; });
  }, []);

  // Therapist profile mutations
  const mutateMyTherapistProfile = useCallback(async (data: Partial<Therapist>) => {
    if (!myTherapist) return;
    await fsUpdateTherapist(myTherapist.id, data);
    setMyTherapist((prev) => prev ? { ...prev, ...data } : prev);
  }, [myTherapist]);

  const mutateMyCatalog = useCallback(async (catalog: CatalogItem[]) => {
    if (!myTherapist) return;
    const newIds = new Set(catalog.map((i) => i.id));
    const toDelete = myCatalog.filter((i) => !newIds.has(i.id));
    await Promise.all(toDelete.map((i) => deleteCatalogItem(i.id)));
    await Promise.all(
      catalog.map((item) => saveCatalogItem({ ...item, therapistId: myTherapist.id }))
    );
    setMyCatalog(catalog);
  }, [myTherapist, myCatalog]);

  const mutateMyAvailability = useCallback(async (schedule: Record<string, string[]>) => {
    if (!myTherapist) return;
    await fsSetAvailability(myTherapist.id, schedule);
    setMyAvailability(schedule);
  }, [myTherapist]);

  const mutateLinkToCompany = useCallback(async (inviteCode: string): Promise<Company | null> => {
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
  }, [myTherapist]);

  const mutateUnlinkFromCompany = useCallback(async () => {
    if (!myTherapist) return;
    await fsUpdateTherapist(myTherapist.id, { companyId: undefined });
    await setTherapistAssociation({ therapistId: myTherapist.id, companyId: null, unitId: null, commission: 50, linkedAt: null });
    setMyTherapist((prev) => prev ? { ...prev, companyId: undefined } : prev);
    setCompany(null);
  }, [myTherapist]);

  const mutateAddMyGalleryItem = useCallback(async (item: MediaItem) => {
    if (!myTherapist) return;
    const gallery = [...(myTherapist.gallery ?? []), item];
    await fsUpdateTherapist(myTherapist.id, { gallery } as any);
    setMyTherapist((prev) => prev ? { ...prev, gallery } as any : prev);
  }, [myTherapist]);

  const mutateRemoveMyGalleryItem = useCallback(async (itemId: string) => {
    if (!myTherapist) return;
    const gallery = ((myTherapist as any).gallery ?? []).filter((m: MediaItem) => m.id !== itemId);
    await fsUpdateTherapist(myTherapist.id, { gallery } as any);
    setMyTherapist((prev) => prev ? { ...prev, gallery } as any : prev);
  }, [myTherapist]);

  const mutateAddCompanyGalleryItem = useCallback(async (item: MediaItem) => {
    const cid = user?.companyId;
    if (!cid) return;
    const gallery = [...(company as any)?.gallery ?? [], item];
    await fsUpdateCompany(cid, { gallery } as any);
    setCompany((prev) => prev ? { ...prev, gallery } as any : prev);
  }, [user, company]);

  const mutateRemoveCompanyGalleryItem = useCallback(async (itemId: string) => {
    const cid = user?.companyId;
    if (!cid) return;
    const gallery = ((company as any)?.gallery ?? []).filter((m: MediaItem) => m.id !== itemId);
    await fsUpdateCompany(cid, { gallery } as any);
    setCompany((prev) => prev ? { ...prev, gallery } as any : prev);
  }, [user, company]);

  // Client profile
  const mutateMyClientProfile = useCallback(async (data: Partial<Client>) => {
    if (!myClient) return;
    await fsUpdateClient(myClient.id, data);
    setMyClient((prev) => prev ? { ...prev, ...data } : prev);
  }, [myClient]);

  // Search
  const searchCompaniesByName = useCallback(async (q: string): Promise<Company[]> => {
    return fsSearchCompaniesByName(q);
  }, []);

  const fetchCompanyByInviteCode = useCallback(async (code: string): Promise<Company | null> => {
    return getCompanyByInviteCode(code);
  }, []);

  const fetchUnitsByCompany = useCallback(async (companyId: string): Promise<Unit[]> => {
    return getUnitsByCompany(companyId);
  }, []);

  // ── Assemble value ────────────────────────────────────────────────────────

  const value: DataContextValue = {
    company,
    units,
    therapists,
    clients,
    appointments,
    therapies,
    rooms,
    sessionRecords,
    allAdminCompanies,
    allAdminTherapists,
    allAdminClients,
    myTherapist,
    myCatalog,
    myAvailability,
    myClient,
    revenueData: chartRevenueData,
    weeklyData: chartWeeklyData,
    unitRevenueData: chartUnitRevenueData,
    unitWeeklyData: chartUnitWeeklyData,
    therapistEarningsData: chartTherapistEarningsData,
    therapistStoreBridge: therapistStore,
    unitStoreBridge: unitStore,
    roomStoreBridge: roomStore,
    roomAssignments,
    completedSessionIds,
    myGallery: [],
    companyGallery: [],
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