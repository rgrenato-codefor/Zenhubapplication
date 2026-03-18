import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  increment,
  deleteField,
  Timestamp,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "super_admin" | "company_admin" | "sales" | "therapist" | "client";

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  therapistId?: string;
  clientId?: string;
  createdAt?: Timestamp;
  emailVerified?: boolean;
}

export interface Company {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  logo?: string | null;
  color?: string;
  plan: string;
  status: "active" | "inactive";
  inviteCode: string;
  therapistsCount: number;
  clientsCount: number;
  monthRevenue: number;
  totalRevenue: number;
  createdAt?: Timestamp;
}

export interface Unit {
  id: string;
  companyId: string;
  name: string;
  address: string;
  phone: string;
  therapistsCount: number;
  roomsCount: number;
  status: "active" | "inactive";
  createdAt?: Timestamp;
}

export interface Therapist {
  id: string;
  companyId?: string;
  userId?: string;
  unitId?: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  avatar?: string | null;
  bio?: string;
  username?: string;
  rating: number;
  status: "active" | "inactive";
  therapies: string[];
  schedule: Record<string, string[]>;
  monthSessions: number;
  monthEarnings: number;
  totalSessions: number;
  totalEarnings: number;
  commission?: number;   // % do valor da sessão (0–100)
  plan?: string;         // e.g. "therapist_free" | "therapist_basic" | ...
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
  status: "active" | "inactive";
  createdAt?: Timestamp;
}

export interface Room {
  id: string;
  companyId: string;
  unitId: string;
  name: string;
  color: string;
  status: "available" | "occupied" | "maintenance";
  createdAt?: Timestamp;
}

export interface Appointment {
  id: string;
  companyId?: string;
  unitId?: string;
  clientId?: string;
  clientName?: string;
  therapistId: string;
  therapyId?: string;
  therapyName?: string;
  catalogItemId?: string;
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
  paidByCompany?: boolean;
  createdAt?: Timestamp;
}

export interface CatalogItem {
  id: string;
  therapistId: string;
  name: string;
  description: string;
  duration: number;
  price: number;
  status: "active" | "inactive";
  createdAt?: Timestamp;
}

export interface TherapistAssociation {
  therapistId: string;
  companyId: string | null;
  /** "none" = autônomo, "pending" = aguardando aprovação, "active" = vinculado */
  status: "none" | "pending" | "active";
  commission?: number;
  unitId?: string | null;
  linkedAt?: string | null;
  associatedAt?: Timestamp;
  // Therapist metadata for display in company's pending list
  therapistName?: string;
  therapistAvatar?: string | null;
  therapistSpecialty?: string;
  therapistUsername?: string;
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? ({ ...snap.data(), uid: snap.id } as UserProfile) : null;
  } catch { return null; }
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, "uid">): Promise<void> {
  await setDoc(doc(db, "users", uid), { ...data, uid, createdAt: serverTimestamp() });
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  await updateDoc(doc(db, "users", uid), data);
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, "users"));
    return snap.docs.map((d) => ({ ...d.data(), uid: d.id } as UserProfile));
  } catch { return []; }
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}

export function subscribeUsersByCompanyAndRole(
  companyId: string,
  role: UserRole,
  callback: (users: UserProfile[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "users"),
    where("companyId", "==", companyId),
    where("role", "==", role)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), uid: d.id } as UserProfile)));
  });
}

/**
 * Migrate existing user profiles to add emailVerified field from Firebase Auth
 */
export async function migrateEmailVerifiedField(): Promise<void> {
  try {
    const { auth } = await import("./firebase");
    const profiles = await getAllUserProfiles();
    
    const updates = profiles.map(async (profile) => {
      // Check if emailVerified field already exists
      if (profile.emailVerified !== undefined) return;
      
      // Get current user from Firebase Auth to check email verification
      // Note: This only works for the currently logged in user
      // For a full migration, you'd need Firebase Admin SDK
      const currentUser = auth.currentUser;
      if (currentUser && currentUser.uid === profile.uid) {
        await updateUserProfile(profile.uid, { emailVerified: currentUser.emailVerified });
      } else {
        // Default to false for users we can't check
        await updateUserProfile(profile.uid, { emailVerified: false });
      }
    });
    
    await Promise.all(updates);
  } catch (error) {
    console.error("Failed to migrate emailVerified field:", error);
  }
}

// ─── Companies ────────────────────────────────────────────────────────────────

export async function getCompany(id: string): Promise<Company | null> {
  try {
    const snap = await getDoc(doc(db, "companies", id));
    return snap.exists() ? ({ ...snap.data(), id: snap.id } as Company) : null;
  } catch { return null; }
}

export async function createCompany(data: Omit<Company, "id" | "createdAt">): Promise<string> {
  const docRef = doc(collection(db, "companies"));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<void> {
  await updateDoc(doc(db, "companies", id), data);
}

export async function getAllCompanies(): Promise<Company[]> {
  try {
    const snap = await getDocs(collection(db, "companies"));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Company));
  } catch (err) {
    console.error("[firestore] getAllCompanies failed:", err);
    return [];
  }
}

export async function getCompanyByInviteCode(code: string): Promise<Company | null> {
  try {
    const q = query(collection(db, "companies"), where("inviteCode", "==", code));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const first = snap.docs[0];
    return { ...first.data(), id: first.id } as Company;
  } catch { return null; }
}

export async function searchCompaniesByName(searchTerm: string): Promise<Company[]> {
  try {
    const snap = await getDocs(collection(db, "companies"));
    const all = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Company));
    const lower = searchTerm.toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(lower));
  } catch { return []; }
}

/**
 * Recalculate and sync company revenue based on existing session records.
 * Used for data repair/migration.
 */
export async function syncCompanyRevenues(): Promise<void> {
  try {
    console.log("🔄 Starting company revenue sync...");
    
    // Get all session records
    const allRecords = await getAllSessionRecords();
    console.log(`📊 Found ${allRecords.length} session records`);
    
    if (allRecords.length > 0) {
      console.log("🔍 Sample record:", allRecords[0]);
    }
    
    // Group by companyId and calculate totals
    const revenueByCompany: Record<string, { month: number; total: number }> = {};
    
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    console.log(`📅 Current month: ${currentMonth}`);
    
    allRecords.forEach((record) => {
      console.log(`Processing record:`, {
        id: record.id,
        companyId: record.companyId,
        totalCharged: record.totalCharged,
        completedAt: record.completedAt
      });
      
      if (!record.companyId || !record.totalCharged) {
        console.log(`⚠️ Skipping record ${record.id} - missing companyId or totalCharged`);
        return;
      }
      
      if (!revenueByCompany[record.companyId]) {
        revenueByCompany[record.companyId] = { month: 0, total: 0 };
      }
      
      // Add to total revenue
      revenueByCompany[record.companyId].total += record.totalCharged;
      
      // Add to month revenue if it's from current month
      const recordDate = new Date(record.completedAt);
      const recordMonth = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}`;
      console.log(`  📅 Record month: ${recordMonth}, matches current: ${recordMonth === currentMonth}`);
      
      if (recordMonth === currentMonth) {
        revenueByCompany[record.companyId].month += record.totalCharged;
      }
    });
    
    console.log("💰 Revenue by company:", revenueByCompany);
    
    // Update each company
    const updates = Object.entries(revenueByCompany).map(([companyId, revenue]) => {
      console.log(`Updating company ${companyId}:`, revenue);
      return updateDoc(doc(db, "companies", companyId), {
        monthRevenue: revenue.month,
        totalRevenue: revenue.total,
      });
    });
    
    await Promise.all(updates);
    
    console.log(`✅ Synced revenues for ${updates.length} companies`);
  } catch (error) {
    console.error("❌ Failed to sync company revenues:", error);
    throw error;
  }
}

/**
 * Normalize company plan fields: converts plan IDs ("company_free") to plan names ("Gratuito").
 * Run once to migrate legacy data, safe to run multiple times.
 */
export async function syncCompanyPlanNames(): Promise<{ fixed: number; total: number }> {
  const PLAN_ID_TO_NAME: Record<string, string> = {
    company_free: "Gratuito",
    company_starter: "Starter",
    company_business: "Business",
    company_premium: "Premium",
  };

  console.log("🔄 Starting company plan name normalization...");
  const companies = await getAllCompanies();
  console.log(`📦 Found ${companies.length} companies`);

  let fixed = 0;
  const updates: Promise<void>[] = [];

  companies.forEach((c) => {
    const planIdNormalized = PLAN_ID_TO_NAME[c.plan];
    if (planIdNormalized) {
      console.log(`  ✏️ ${c.name}: plan "${c.plan}" → "${planIdNormalized}"`);
      updates.push(updateDoc(doc(db, "companies", c.id), { plan: planIdNormalized }));
      fixed++;
    }
  });

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  console.log(`✅ Plan names normalized: ${fixed} companies updated out of ${companies.length}`);
  return { fixed, total: companies.length };
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
  const docRef = doc(collection(db, "units"));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateUnit(id: string, data: Partial<Unit>): Promise<void> {
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

export async function getTherapistByUserId(userId: string): Promise<Therapist | null> {
  try {
    const q = query(collection(db, "therapists"), where("userId", "==", userId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const first = snap.docs[0];
    return { ...first.data(), id: first.id } as Therapist;
  } catch { return null; }
}

export async function getTherapistByUsername(username: string): Promise<Therapist | null> {
  try {
    const q = query(collection(db, "therapists"), where("username", "==", username));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const first = snap.docs[0];
    return { ...first.data(), id: first.id } as Therapist;
  } catch { return null; }
}

export async function createTherapist(data: Omit<Therapist, "id" | "createdAt">): Promise<string> {
  const docRef = doc(collection(db, "therapists"));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateTherapist(id: string, data: Partial<Therapist>): Promise<void> {
  await updateDoc(doc(db, "therapists", id), data);
}

/**
 * Removes the companyId field from a therapist document.
 * Must use deleteField() — passing companyId: undefined is silently ignored
 * by Firestore when ignoreUndefinedProperties: true is set.
 * Without this, dissociation never actually clears the field and the therapist
 * keeps appearing in subscribeTherapistsByCompany results.
 */
export async function clearTherapistCompanyId(id: string): Promise<void> {
  await updateDoc(doc(db, "therapists", id), { companyId: deleteField() });
}

export async function deleteTherapist(id: string): Promise<void> {
  await deleteDoc(doc(db, "therapists", id));
}

export async function getAllTherapists(): Promise<Therapist[]> {
  try {
    const snap = await getDocs(collection(db, "therapists"));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Therapist));
  } catch (err) {
    console.error("[firestore] getAllTherapists failed:", err);
    return [];
  }
}

/**
 * Real-time listener: fires immediately with the current list and again whenever
 * a therapist document with this companyId is added, updated, or removed.
 * This ensures the company's therapist list stays in sync even when a therapist
 * self-associates by entering an invite code from their own profile.
 */
export function subscribeTherapistsByCompany(
  companyId: string,
  callback: (therapists: Therapist[]) => void
): Unsubscribe {
  const q = query(collection(db, "therapists"), where("companyId", "==", companyId));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ ...d.data(), id: d.id } as Therapist)));
  }, (err) => {
    console.error("[firestore] subscribeTherapistsByCompany error:", err);
  });
}

// ─── Therapist Association ────────────────────────────────────────────────────

export async function getTherapistAssociation(therapistId: string): Promise<TherapistAssociation | null> {
  try {
    const snap = await getDoc(doc(db, "therapistAssociations", therapistId));
    return snap.exists() ? (snap.data() as TherapistAssociation) : null;
  } catch { return null; }
}

export async function setTherapistAssociation(data: TherapistAssociation): Promise<void> {
  await setDoc(doc(db, "therapistAssociations", data.therapistId), {
    ...data,
    associatedAt: serverTimestamp(),
  });
}

/**
 * Real-time listener for all therapist association records that belong to a
 * given company (any status). Filter by status on the consumer side to avoid
 * requiring a Firestore composite index.
 */
export function subscribeTherapistAssociationsByCompany(
  companyId: string,
  callback: (associations: TherapistAssociation[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "therapistAssociations"),
    where("companyId", "==", companyId),
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => d.data() as TherapistAssociation));
  }, (err) => {
    console.error("[firestore] subscribeTherapistAssociationsByCompany error:", err);
  });
}

/**
 * Real-time listener for a therapist's own association record.
 * Used by the therapist profile to show pending/active status after a refresh.
 */
export function subscribeTherapistOwnAssociation(
  therapistId: string,
  callback: (association: TherapistAssociation | null) => void
): Unsubscribe {
  return onSnapshot(doc(db, "therapistAssociations", therapistId), (snap) => {
    callback(snap.exists() ? (snap.data() as TherapistAssociation) : null);
  }, (err) => {
    console.error("[firestore] subscribeTherapistOwnAssociation error:", err);
  });
}

// ─── Clients ──────────────────────────────────────────────────────────────────

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
    const first = snap.docs[0];
    return { ...first.data(), id: first.id } as Client;
  } catch { return null; }
}

export async function createClient(data: Omit<Client, "id" | "createdAt">): Promise<string> {
  const docRef = doc(collection(db, "clients"));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateClient(id: string, data: Partial<Client>): Promise<void> {
  await updateDoc(doc(db, "clients", id), data);
}

export async function getAllClients(): Promise<Client[]> {
  try {
    const snap = await getDocs(collection(db, "clients"));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Client));
  } catch (err) {
    console.error("[firestore] getAllClients failed:", err);
    return [];
  }
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
  const docRef = doc(collection(db, "therapies"));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateTherapy(id: string, data: Partial<Therapy>): Promise<void> {
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
  const docRef = doc(collection(db, "rooms"));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateRoom(id: string, data: Partial<Room>): Promise<void> {
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
  const docRef = doc(collection(db, "appointments"));
  await setDoc(docRef, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function updateAppointment(id: string, data: Partial<Appointment>): Promise<void> {
  await updateDoc(doc(db, "appointments", id), data);
}

export function subscribeAppointmentsByCompany(
  companyId: string,
  callback: (appointments: Appointment[]) => void
): Unsubscribe {
  const q = query(collection(db, "appointments"), where("companyId", "==", companyId));
  return onSnapshot(q, (snap) => {
    const appointments = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Appointment));
    callback(appointments);
  });
}

export function subscribeAppointmentsByTherapist(
  therapistId: string,
  callback: (appointments: Appointment[]) => void
): Unsubscribe {
  const q = query(collection(db, "appointments"), where("therapistId", "==", therapistId));
  return onSnapshot(q, (snap) => {
    const appointments = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Appointment));
    callback(appointments);
  });
}

// ─── Catalog (Autonomous Therapist) ───────────────────────────────────────────

export async function getCatalogByTherapist(therapistId: string): Promise<CatalogItem[]> {
  try {
    const q = query(collection(db, "catalog"), where("therapistId", "==", therapistId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as CatalogItem));
  } catch { return []; }
}

export async function saveCatalogItem(data: Omit<CatalogItem, "createdAt">): Promise<void> {
  await setDoc(doc(db, "catalog", data.id), { ...data, createdAt: serverTimestamp() });
}

export async function deleteCatalogItem(id: string): Promise<void> {
  await deleteDoc(doc(db, "catalog", id));
}

// ─── Availability ─────────────────────────────────────────────────────────────

export async function getAvailability(therapistId: string): Promise<Record<string, string[]>> {
  try {
    const snap = await getDoc(doc(db, "availability", therapistId));
    return snap.exists() ? (snap.data() as Record<string, string[]>) : {};
  } catch { return {}; }
}

export async function setAvailability(therapistId: string, schedule: Record<string, string[]>): Promise<void> {
  await setDoc(doc(db, "availability", therapistId), schedule);
}

// ─── Session Records ─────────────────────────────────────────────────────────

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

export async function getAllSessionRecords(): Promise<SessionRecord[]> {
  try {
    const snap = await getDocs(collection(db, "sessionRecords"));
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

export function subscribeSessionRecordsByCompany(
  companyId: string,
  callback: (records: SessionRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, "sessionRecords"), where("companyId", "==", companyId));
  return onSnapshot(q, (snap) => {
    const records = snap.docs.map((d) => ({ ...d.data(), id: d.id } as SessionRecord));
    callback(records);
  });
}

export function subscribeSessionRecordsByTherapist(
  therapistId: string,
  callback: (records: SessionRecord[]) => void
): Unsubscribe {
  const q = query(collection(db, "sessionRecords"), where("therapistId", "==", therapistId));
  return onSnapshot(q, (snap) => {
    const records = snap.docs.map((d) => ({ ...d.data(), id: d.id } as SessionRecord));
    callback(records);
  });
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

export async function setRoomAssignment(
  companyId: string,
  appointmentId: string,
  roomId: string
): Promise<void> {
  await setDoc(doc(db, "roomAssignments", appointmentId), {
    companyId,
    appointmentId,
    roomId,
  });
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

// ─── Notification State ───────────────────────────────────────────────────────

export interface NotificationState {
  readIds: string[];
  dismissedIds: string[];
}

export async function getNotificationState(userId: string): Promise<NotificationState> {
  try {
    const snap = await getDoc(doc(db, "notificationStates", userId));
    return snap.exists() 
      ? (snap.data() as NotificationState) 
      : { readIds: [], dismissedIds: [] };
  } catch {
    return { readIds: [], dismissedIds: [] };
  }
}

export async function saveNotificationState(userId: string, state: NotificationState): Promise<void> {
  await setDoc(doc(db, "notificationStates", userId), state);
}

// ─── Financial Transactions ───────────────────────────────────────────────────

export type FinancialTxType = "entrada" | "saida";

export interface FinancialTransaction {
  id: string;
  companyId: string;
  type: FinancialTxType;
  category: string;
  description: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: string;
  notes?: string;
  autoGenerated?: boolean;
  createdAt?: Timestamp;
}

export async function createFinancialTransaction(
  tx: Omit<FinancialTransaction, "createdAt">
): Promise<void> {
  await setDoc(doc(db, "financialTransactions", tx.id), {
    ...tx,
    createdAt: serverTimestamp(),
  });
}

export async function updateFinancialTransaction(
  id: string,
  patch: Partial<Omit<FinancialTransaction, "id" | "companyId" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, "financialTransactions", id), patch);
}

export async function deleteFinancialTransaction(id: string): Promise<void> {
  await deleteDoc(doc(db, "financialTransactions", id));
}

export function subscribeFinancialTransactionsByCompany(
  companyId: string,
  callback: (txs: FinancialTransaction[]) => void
): Unsubscribe {
  const q = query(
    collection(db, "financialTransactions"),
    where("companyId", "==", companyId)
  );
  return onSnapshot(q, (snap) => {
    const txs = snap.docs
      .map((d) => ({ ...d.data(), id: d.id } as FinancialTransaction))
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    callback(txs);
  });
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export interface CompanyPlan {
  id: string;
  name: string;
  price: number;
  color: string;
  badge: string;
  description: string;
  modules: string[];
  limits: {
    therapists: number | null;
    clients: number | null;
    appointments_monthly: number | null; // atendimentos/mês; null = ilimitado
    units: number | null;
  };
  isDefault: boolean;
  isActive: boolean;
  order: number;
}

export interface TherapistPlan {
  id: string;
  name: string;
  price: number;
  color: string;
  badge: string;
  description: string;
  appointmentsPerMonth: number | null;
  isDefault: boolean;
  isActive: boolean;
  order: number;
}

export async function getCompanyPlans(): Promise<CompanyPlan[]> {
  try {
    const snap = await getDocs(collection(db, "companyPlans"));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as CompanyPlan));
  } catch { return []; }
}

export async function getTherapistPlans(): Promise<TherapistPlan[]> {
  try {
    const snap = await getDocs(collection(db, "therapistPlans"));
    return snap.docs.map((d) => ({ ...d.data(), id: d.id } as TherapistPlan));
  } catch { return []; }
}

export async function setCompanyPlan(plan: CompanyPlan): Promise<void> {
  await setDoc(doc(db, "companyPlans", plan.id), plan);
}

export async function setTherapistPlan(plan: TherapistPlan): Promise<void> {
  await setDoc(doc(db, "therapistPlans", plan.id), plan);
}

export async function deleteCompanyPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, "companyPlans", id));
}

export async function deleteTherapistPlan(id: string): Promise<void> {
  await deleteDoc(doc(db, "therapistPlans", id));
}

export async function seedDefaultPlans(
  companyPlans: CompanyPlan[],
  therapistPlans: TherapistPlan[]
): Promise<void> {
  const batch = [];
  
  for (const plan of companyPlans) {
    batch.push(setCompanyPlan(plan));
  }
  
  for (const plan of therapistPlans) {
    batch.push(setTherapistPlan(plan));
  }
  
  await Promise.all(batch);
}

// ─── Platform Settings ────────────────────────────────────────────────────────

export interface PlatformSettings {
  platformName: string;
  domain: string;
  supportEmail: string;
  timezone: string;
  language: string;
  notifications: {
    newCompany: boolean;
    weeklyReport: boolean;
    paymentAlerts: boolean;
    newUsers: boolean;
    planUpgrades: boolean;
  };
  updatedAt?: Timestamp;
}

export async function getPlatformSettings(): Promise<PlatformSettings | null> {
  try {
    const snap = await getDoc(doc(db, "platformSettings", "global"));
    return snap.exists() ? (snap.data() as PlatformSettings) : null;
  } catch { return null; }
}

export async function savePlatformSettings(settings: Omit<PlatformSettings, "updatedAt">): Promise<void> {
  await setDoc(doc(db, "platformSettings", "global"), {
    ...settings,
    updatedAt: serverTimestamp(),
  });
}