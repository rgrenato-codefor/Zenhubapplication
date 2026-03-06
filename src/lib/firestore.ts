/**
 * Firestore service layer — full CRUD for all ZEN HUB collections.
 * Pages use isDemoMode to decide whether to call these or use mockData.
 */

import {
  doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, query, where, getDocs, addDoc,
  serverTimestamp, Timestamp, orderBy, limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type { CompanyPlan, TherapistPlan } from "../app/lib/planConfig";

// ─── Internal helper ─────────────────────────────────────────────────────────
/** Strip the `id` (and `createdAt`) fields before writing to Firestore so that
 *  the Firestore document ID is never shadowed by a stale client-generated field. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripMeta<T extends object>(data: T): Omit<T, "id" | "createdAt"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id: _id, createdAt: _ca, ...rest } = data as any;
  return rest;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole =
  | "super_admin" | "company_admin" | "sales"
  | "therapist" | "client" | "demo";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  therapistId?: string;
  clientId?: string;
  avatar?: string;
  createdAt?: Timestamp;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  color: string;
  email: string;
  phone: string;
  address: string;
  cnpj?: string;
  segment?: string;
  plan: "Starter" | "Business" | "Premium";
  status: "active" | "inactive";
  inviteCode: string;
  therapistsCount: number;
  clientsCount: number;
  totalRevenue: number;
  monthRevenue: number;
  createdAt?: Timestamp;
}

export interface Unit {
  id: string;
  companyId: string;
  name: string;
  fullName: string;
  address: string;
  phone: string;
  email: string;
  status: "active" | "inactive";
  isMain: boolean;
  therapistsCount?: number;
  roomsCount?: number;
  createdAt?: Timestamp;
}

export interface Therapist {
  id: string;
  companyId?: string;
  unitId?: string;
  userId?: string;
  username?: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  specialty: string;
  bio?: string;
  address?: string;
  photos?: string[];
  commission: number;
  rating: number;
  status: "active" | "inactive";
  therapies: string[];
  schedule: Record<string, string[]>;
  monthSessions: number;
  monthEarnings: number;
  totalSessions: number;
  totalEarnings: number;
  createdAt?: Timestamp;
}

export interface Client {
  id: string;
  companyId?: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string | null;
  birthdate?: string;
  address?: string;
  notes?: string;
  healthNotes?: string;
  totalSessions: number;
  totalSpent: number;
  lastSession?: string;
  status: "active" | "inactive";
  preferredTherapist?: string;
  registeredBy?: "self" | "company";
  registeredAt?: string;
  createdAt?: Timestamp;
}

export interface Therapy {
  id: string;
  companyId: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  category?: string;
  color: string;
  status?: "active" | "inactive";
  active?: boolean;
  totalBookings?: number;
  createdAt?: Timestamp;
}

export interface Room {
  id: string;
  companyId: string;
  unitId?: string;
  name: string;
  description: string;
  color: string;
  status: "active" | "inactive" | "maintenance";
  createdAt?: Timestamp;
}

export interface Appointment {
  id: string;
  companyId?: string;        // optional — autonomous therapists have no company
  unitId?: string;
  clientId?: string;         // optional — autonomous therapists use clientName instead
  clientName?: string;       // ad-hoc client name for autonomous bookings
  therapistId: string;
  therapyId?: string;        // optional — autonomous therapists use catalogItemId
  therapyName?: string;      // denormalised name for display without a join
  catalogItemId?: string;    // autonomous: catalog item used
  date: string;
  time: string;
  duration: number;
  price: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  roomId?: string;
  createdAt?: Timestamp;
}

export interface SessionRecord {
  id: string;
  appointmentId: string;
  therapistId: string;
  companyId: string | null;
  companyName: string | null;
  clientName: string;
  therapyName: string;
  duration: number;
  sessionPrice: number;
  extraCharge: number;
  totalCharged: number;
  therapistEarned: number;
  commissionPct: number;
  companyNet: number;
  completedAt: string;
  notes: string;
  extraNotes: string;
  date: string;
  time: string;
  closedBy: "therapist" | "company";
  /** Set to true by the company when the commission is paid to the therapist */
  paidByCompany?: boolean;
  createdAt?: Timestamp;
}

export interface CatalogItem {
  id: string;
  therapistId: string;
  name: string;
  duration: number;
  myPrice: number;
  category: string;
  color: string;
  active: boolean;
}

export interface TherapistAssociation {
  therapistId: string;
  companyId: string | null;
  unitId: string | null;
  commission: number;
  linkedAt: string | null;
}

export interface RoomAssignment {
  appointmentId: string;
  roomId: string;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as UserProfile;
  } catch { return null; }
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, "uid" | "createdAt">): Promise<void> {
  await setDoc(doc(db, "users", uid), { ...data, createdAt: serverTimestamp() });
}

export async function updateUserProfile(uid: string, data: Partial<Omit<UserProfile, "uid">>): Promise<void> {
  await updateDoc(doc(db, "users", uid), data);
}

// ─── Companies ────────────────────────────────────────────────────────────────

export async function getCompany(id: string): Promise<Company | null> {
  try {
    const snap = await getDoc(doc(db, "companies", id));
    if (!snap.exists()) return null;
    return { id, ...snap.data() } as Company;
  } catch { return null; }
}

export async function getAllCompanies(): Promise<Company[]> {
  try {
    const snap = await getDocs(collection(db, "companies"));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Company));
  } catch { return []; }
}

export async function getAllTherapists(): Promise<Therapist[]> {
  try {
    const snap = await getDocs(collection(db, "therapists"));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Therapist));
  } catch { return []; }
}

export async function getAllClients(): Promise<Client[]> {
  try {
    const snap = await getDocs(collection(db, "clients"));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Client));
  } catch { return []; }
}

export async function createCompany(data: Omit<Company, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "companies"), { ...data, createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateCompany(id: string, data: Partial<Omit<Company, "id">>): Promise<void> {
  await updateDoc(doc(db, "companies", id), data);
}

export async function searchCompaniesByName(q: string): Promise<Company[]> {
  try {
    const snap = await getDocs(query(collection(db, "companies"), where("status", "==", "active")));
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Company))
      .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  } catch { return []; }
}

export async function getCompanyByInviteCode(code: string): Promise<Company | null> {
  try {
    const q = query(collection(db, "companies"), where("inviteCode", "==", code.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { ...d.data(), id: d.id } as Company;
  } catch { return null; }
}

// ─── Units ────────────────────────────────────────────────────────────────────

export async function getUnitsByCompany(companyId: string): Promise<Unit[]> {
  try {
    const q = query(collection(db, "units"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Unit));
  } catch { return []; }
}

export async function createUnit(data: Omit<Unit, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "units"), { ...stripMeta(data), createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateUnit(id: string, data: Partial<Omit<Unit, "id">>): Promise<void> {
  await updateDoc(doc(db, "units", id), data);
}

export async function deleteUnit(id: string): Promise<void> {
  await deleteDoc(doc(db, "units", id));
}

// ─── Therapists ───────────────────────────────────────────────────────────────

export async function getTherapistsByCompany(companyId: string): Promise<Therapist[]> {
  try {
    const q = query(collection(db, "therapists"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Therapist));
  } catch { return []; }
}

export async function getTherapist(id: string): Promise<Therapist | null> {
  try {
    const snap = await getDoc(doc(db, "therapists", id));
    if (!snap.exists()) return null;
    return { ...snap.data(), id } as Therapist;
  } catch { return null; }
}

export async function getTherapistByUserId(userId: string): Promise<Therapist | null> {
  try {
    const q = query(collection(db, "therapists"), where("userId", "==", userId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { ...d.data(), id: d.id } as Therapist;
  } catch { return null; }
}

export async function getTherapistByUsername(username: string): Promise<Therapist | null> {
  try {
    const q = query(collection(db, "therapists"), where("username", "==", username));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { ...d.data(), id: d.id } as Therapist;
  } catch { return null; }
}

export async function createTherapist(data: Omit<Therapist, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "therapists"), { ...stripMeta(data), createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateTherapist(id: string, data: Partial<Omit<Therapist, "id">>): Promise<void> {
  await updateDoc(doc(db, "therapists", id), data);
}

export async function deleteTherapist(id: string): Promise<void> {
  await deleteDoc(doc(db, "therapists", id));
}

// ─── Therapist Associations ───────────────────────────────────────────────────

export async function getTherapistAssociation(therapistId: string): Promise<TherapistAssociation | null> {
  try {
    const snap = await getDoc(doc(db, "therapistAssociations", therapistId));
    if (!snap.exists()) return null;
    return snap.data() as TherapistAssociation;
  } catch { return null; }
}

export async function setTherapistAssociation(data: TherapistAssociation): Promise<void> {
  await setDoc(doc(db, "therapistAssociations", data.therapistId), data);
}

// ─── Therapist Catalog ────────────────────────────────────────────────────────

export async function getCatalogByTherapist(therapistId: string): Promise<CatalogItem[]> {
  try {
    const q = query(collection(db, "therapistCatalog"), where("therapistId", "==", therapistId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as CatalogItem));
  } catch { return []; }
}

export async function saveCatalogItem(item: CatalogItem): Promise<string> {
  if (item.id && item.id !== "new") {
    await setDoc(doc(db, "therapistCatalog", item.id), item);
    return item.id;
  }
  const ref = await addDoc(collection(db, "therapistCatalog"), item);
  return ref.id;
}

export async function deleteCatalogItem(id: string): Promise<void> {
  await deleteDoc(doc(db, "therapistCatalog", id));
}

// ─── Therapist Availability ───────────────────────────────────────────────────

export async function getAvailability(therapistId: string): Promise<Record<string, string[]> | null> {
  try {
    const snap = await getDoc(doc(db, "therapistAvailability", therapistId));
    if (!snap.exists()) return null;
    return snap.data() as Record<string, string[]>;
  } catch { return null; }
}

export async function setAvailability(therapistId: string, schedule: Record<string, string[]>): Promise<void> {
  await setDoc(doc(db, "therapistAvailability", therapistId), schedule);
}

// ─── Clients ─────────────────────────────────────────────────────────────────

export async function getClientsByCompany(companyId: string): Promise<Client[]> {
  try {
    const q = query(collection(db, "clients"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Client));
  } catch { return []; }
}

export async function getClientByUserId(userId: string): Promise<Client | null> {
  try {
    const q = query(collection(db, "clients"), where("userId", "==", userId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { ...d.data(), id: d.id } as Client;
  } catch { return null; }
}

export async function createClient(data: Omit<Client, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "clients"), { ...stripMeta(data), createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateClient(id: string, data: Partial<Omit<Client, "id">>): Promise<void> {
  await updateDoc(doc(db, "clients", id), data);
}

// ─── Therapies ────────────────────────────────────────────────────────────────

export async function getTherapiesByCompany(companyId: string): Promise<Therapy[]> {
  try {
    const q = query(collection(db, "therapies"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Therapy));
  } catch { return []; }
}

export async function createTherapy(data: Omit<Therapy, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "therapies"), { ...stripMeta(data), createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateTherapy(id: string, data: Partial<Omit<Therapy, "id">>): Promise<void> {
  await updateDoc(doc(db, "therapies", id), data);
}

export async function deleteTherapy(id: string): Promise<void> {
  await deleteDoc(doc(db, "therapies", id));
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function getRoomsByCompany(companyId: string): Promise<Room[]> {
  try {
    const q = query(collection(db, "rooms"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Room));
  } catch { return []; }
}

export async function createRoom(data: Omit<Room, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "rooms"), { ...stripMeta(data), createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateRoom(id: string, data: Partial<Omit<Room, "id">>): Promise<void> {
  await updateDoc(doc(db, "rooms", id), data);
}

export async function deleteRoom(id: string): Promise<void> {
  await deleteDoc(doc(db, "rooms", id));
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function getAppointmentsByCompany(companyId: string): Promise<Appointment[]> {
  try {
    const q = query(collection(db, "appointments"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Appointment));
  } catch { return []; }
}

export async function getAppointmentsByTherapist(therapistId: string): Promise<Appointment[]> {
  try {
    const q = query(collection(db, "appointments"), where("therapistId", "==", therapistId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Appointment));
  } catch { return []; }
}

export async function getAppointmentsByClient(clientId: string): Promise<Appointment[]> {
  try {
    const q = query(collection(db, "appointments"), where("clientId", "==", clientId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Appointment));
  } catch { return []; }
}

export async function createAppointment(data: Omit<Appointment, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "appointments"), { ...stripMeta(data), createdAt: serverTimestamp() });
  return ref.id;
}

export async function updateAppointment(id: string, data: Partial<Omit<Appointment, "id">>): Promise<void> {
  await updateDoc(doc(db, "appointments", id), data);
}

export async function deleteAppointment(id: string): Promise<void> {
  await deleteDoc(doc(db, "appointments", id));
}

// ─── Session Records ──────────────────────────────────────────────────────────

export async function getSessionRecordsByTherapist(therapistId: string): Promise<SessionRecord[]> {
  try {
    const q = query(collection(db, "sessionRecords"), where("therapistId", "==", therapistId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as SessionRecord));
  } catch { return []; }
}

export async function getSessionRecordsByCompany(companyId: string): Promise<SessionRecord[]> {
  try {
    const q = query(collection(db, "sessionRecords"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as SessionRecord));
  } catch { return []; }
}

export async function createSessionRecord(data: Omit<SessionRecord, "createdAt">): Promise<void> {
  await setDoc(doc(db, "sessionRecords", data.id), { ...data, createdAt: serverTimestamp() });
}

/** Mark a list of session records as paid by the company */
export async function markSessionRecordsPaid(ids: string[]): Promise<void> {
  await Promise.all(
    ids.map((id) => updateDoc(doc(db, "sessionRecords", id), { paidByCompany: true }))
  );
}

// ─── Room Assignments ─────────────────────────────────────────────────────────

export async function getRoomAssignmentsByCompany(companyId: string): Promise<Record<string, string>> {
  try {
    const q = query(collection(db, "roomAssignments"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    const result: Record<string, string> = {};
    snap.docs.forEach((d) => {
      const data = d.data() as { appointmentId: string; roomId: string };
      result[data.appointmentId] = data.roomId;
    });
    return result;
  } catch { return {}; }
}

export async function setRoomAssignment(appointmentId: string, roomId: string, companyId: string): Promise<void> {
  await setDoc(doc(db, "roomAssignments", appointmentId), { appointmentId, roomId, companyId });
}

export async function deleteRoomAssignment(appointmentId: string): Promise<void> {
  await deleteDoc(doc(db, "roomAssignments", appointmentId));
}

// ─── Completed Sessions (flags) ───────────────────────────────────────────────

export async function getCompletedSessionIds(companyId: string): Promise<Set<string>> {
  try {
    const records = await getSessionRecordsByCompany(companyId);
    return new Set(records.map((r) => r.appointmentId));
  } catch { return new Set(); }
}

// ─── Plans ────────────────────────────────────────────────────────────────────
// Collections: "companyPlans" and "therapistPlans"
// Each document ID = plan.id (deterministic, enables safe upserts)

// -- Company Plans --

export async function getCompanyPlans(): Promise<CompanyPlan[]> {
  try {
    const snap = await getDocs(query(collection(db, "companyPlans"), orderBy("order")));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as CompanyPlan));
  } catch { return []; }
}

export async function setCompanyPlan(plan: CompanyPlan): Promise<void> {
  const { id, ...data } = plan;
  await setDoc(doc(db, "companyPlans", id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteCompanyPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, "companyPlans", id));
}

export async function deleteAllCompanyPlans(): Promise<void> {
  const snap = await getDocs(collection(db, "companyPlans"));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

// -- Therapist Plans --

export async function getTherapistPlans(): Promise<TherapistPlan[]> {
  try {
    const snap = await getDocs(query(collection(db, "therapistPlans"), orderBy("order")));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as TherapistPlan));
  } catch { return []; }
}

export async function setTherapistPlan(plan: TherapistPlan): Promise<void> {
  const { id, ...data } = plan;
  await setDoc(doc(db, "therapistPlans", id), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteTherapistPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, "therapistPlans", id));
}

export async function deleteAllTherapistPlans(): Promise<void> {
  const snap = await getDocs(collection(db, "therapistPlans"));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

// -- Seed (reset + recreate defaults) --

export async function seedDefaultPlans(
  companyPlans: CompanyPlan[],
  therapistPlans: TherapistPlan[]
): Promise<void> {
  await Promise.all([deleteAllCompanyPlans(), deleteAllTherapistPlans()]);
  await Promise.all([
    ...companyPlans.map(setCompanyPlan),
    ...therapistPlans.map(setTherapistPlan),
  ]);
}