/**
 * Firestore service layer
 * All DB interactions go through here.
 * Pages use isDemoMode to decide whether to call these or use mockData.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole =
  | "super_admin"
  | "company_admin"
  | "sales"
  | "therapist"
  | "client"
  | "demo";

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
  plan: "Starter" | "Business" | "Premium";
  status: "active" | "inactive";
  inviteCode: string;
  therapistsCount: number;
  clientsCount: number;
  totalRevenue: number;
  monthRevenue: number;
  createdAt?: Timestamp;
}

export interface Therapist {
  id: string;
  companyId: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  specialty: string;
  commission: number;
  bio: string;
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
  companyId: string;
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
  color: string;
  status: "active" | "inactive";
  createdAt?: Timestamp;
}

export interface Appointment {
  id: string;
  companyId: string;
  clientId: string;
  therapistId: string;
  therapyId: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
  createdAt?: Timestamp;
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() } as UserProfile;
  } catch (err) {
    console.error("getUserProfile error:", err);
    return null;
  }
}

export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, "uid" | "createdAt">
): Promise<void> {
  await setDoc(doc(db, "users", uid), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Omit<UserProfile, "uid">>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), data);
}

// ─── Companies ────────────────────────────────────────────────────────────────

export async function getCompany(id: string): Promise<Company | null> {
  try {
    const snap = await getDoc(doc(db, "companies", id));
    if (!snap.exists()) return null;
    return { id, ...snap.data() } as Company;
  } catch (err) {
    console.error("getCompany error:", err);
    return null;
  }
}

export async function getAllCompanies(): Promise<Company[]> {
  try {
    const snap = await getDocs(collection(db, "companies"));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Company));
  } catch (err) {
    console.error("getAllCompanies error:", err);
    return [];
  }
}

export async function createCompany(
  data: Omit<Company, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "companies"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Therapists ───────────────────────────────────────────────────────────────

export async function getTherapistsByCompany(
  companyId: string
): Promise<Therapist[]> {
  try {
    const q = query(
      collection(db, "therapists"),
      where("companyId", "==", companyId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Therapist));
  } catch (err) {
    console.error("getTherapistsByCompany error:", err);
    return [];
  }
}

export async function getTherapist(id: string): Promise<Therapist | null> {
  try {
    const snap = await getDoc(doc(db, "therapists", id));
    if (!snap.exists()) return null;
    return { id, ...snap.data() } as Therapist;
  } catch (err) {
    return null;
  }
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export async function getClientsByCompany(companyId: string): Promise<Client[]> {
  try {
    const q = query(
      collection(db, "clients"),
      where("companyId", "==", companyId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client));
  } catch (err) {
    console.error("getClientsByCompany error:", err);
    return [];
  }
}

export async function createClient(
  data: Omit<Client, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "clients"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClient(
  id: string,
  data: Partial<Omit<Client, "id">>
): Promise<void> {
  await updateDoc(doc(db, "clients", id), data);
}

// ─── Therapies ────────────────────────────────────────────────────────────────

export async function getTherapiesByCompany(
  companyId: string
): Promise<Therapy[]> {
  try {
    const q = query(
      collection(db, "therapies"),
      where("companyId", "==", companyId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Therapy));
  } catch (err) {
    return [];
  }
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function getAppointmentsByCompany(
  companyId: string
): Promise<Appointment[]> {
  try {
    const q = query(
      collection(db, "appointments"),
      where("companyId", "==", companyId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
  } catch (err) {
    return [];
  }
}

export async function getAppointmentsByTherapist(
  therapistId: string
): Promise<Appointment[]> {
  try {
    const q = query(
      collection(db, "appointments"),
      where("therapistId", "==", therapistId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Appointment));
  } catch (err) {
    return [];
  }
}

export async function createAppointment(
  data: Omit<Appointment, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "appointments"), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── Invite Code Lookup ───────────────────────────────────────────────────────

export async function getCompanyByInviteCode(
  code: string
): Promise<Company | null> {
  try {
    const q = query(
      collection(db, "companies"),
      where("inviteCode", "==", code.toUpperCase())
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as Company;
  } catch (err) {
    return null;
  }
}
