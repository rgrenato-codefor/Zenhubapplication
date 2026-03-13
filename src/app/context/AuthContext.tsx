import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { signInWithGoogleGIS } from "../../lib/googleGIS";
import {
  getUserProfile,
  createUserProfile,
  updateUserProfile,
  createCompany,
  createUnit,
  createTherapist,
  createClient,
  getTherapistByUserId,
  getClientByUserId,
  type UserRole,
} from "../../lib/firestore";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Route associated with each role for automatic redirection */
export const ROLE_ROUTES: Record<UserRole, string> = {
  super_admin: "/admin",
  company_admin: "/empresa",
  sales: "/empresa",
  therapist: "/terapeuta",
  client: "/cliente",
};

// ─── Types ────────────────────────────────────────────────────────────────────

export type { UserRole };

export interface AuthUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  therapistId?: string;
  clientId?: string;
  avatar?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ route: string }>;
  signInGoogle: () => Promise<{ route: string }>;
  signOut: () => Promise<void>;
  registerCompany: (params: RegisterCompanyParams) => Promise<void>;
  registerTherapist: (params: RegisterTherapistParams) => Promise<void>;
  registerClient: (params: RegisterClientParams) => Promise<void>;
  /** @deprecated use signIn() – kept for backwards compat with old pages */
  login: (user: AuthUser) => void;
  /** @deprecated use signOut() */
  logout: () => void;
}

// ─── registerCompany param type ───────────────────────────────────────────────

export interface RegisterCompanyParams {
  companyName: string;
  cnpj: string;
  phone: string;
  segment: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  cep: string;
  responsibleName: string;
  responsibleEmail: string;
  responsiblePhone: string;
  role?: string;
  password: string;
  plan: string;
}

export interface RegisterTherapistParams {
  name: string;
  email: string;
  phone: string;
  specialty: string;
  username: string;
  password: string;
  // optional company link
  companyId?: string;
  unitId?: string;
  commission?: number;
}

export interface RegisterClientParams {
  name: string;
  email: string;
  phone: string;
  birthdate?: string;
  password: string;
  companyId?: string;
  slug?: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ route: "/" }),
  signInGoogle: async () => ({ route: "/" }),
  signOut: async () => {},
  registerCompany: async () => {},
  registerTherapist: async () => {},
  registerClient: async () => {},
  login: () => {},
  logout: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  // When true, the next onAuthStateChanged event is swallowed so that
  // registerCompany can set the user state itself without a race condition.
  const skipNextAuthEvent = useRef(false);

  /**
   * When a real user logs in but has no profile in Firestore (e.g. incomplete
   * registration where Auth succeeded but Firestore writes failed), we try to
   * recover by looking up existing sub-collection documents (therapists / clients).
   * If found, we recreate the missing profile with the correct role.
   * Returns the recovered UserProfile, or null if nothing was found.
   */
  const recoverProfileFromSubCollections = useCallback(
    async (uid: string, email: string): Promise<import("../../lib/firestore").UserProfile | null> => {
      try {
        const [therapist, client] = await Promise.all([
          getTherapistByUserId(uid),
          getClientByUserId(uid),
        ]);

        if (therapist) {
          const recovered = {
            uid,
            name: therapist.name,
            email: therapist.email || email,
            role: "therapist" as UserRole,
            therapistId: therapist.id,
            companyId: therapist.companyId,
          };
          await createUserProfile(uid, recovered);
          console.info("[AuthContext] Recovered missing profile as therapist for uid:", uid);
          return recovered;
        }

        if (client) {
          const recovered = {
            uid,
            name: client.name,
            email: client.email || email,
            role: "client" as UserRole,
            clientId: client.id,
            companyId: client.companyId,
          };
          await createUserProfile(uid, recovered);
          console.info("[AuthContext] Recovered missing profile as client for uid:", uid);
          return recovered;
        }
      } catch (err) {
        console.warn("[AuthContext] recoverProfileFromSubCollections failed:", err);
      }
      return null;
    },
    []
  );

  // Firebase Auth listener — runs once on mount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (skipNextAuthEvent.current) {
        skipNextAuthEvent.current = false;
        return;
      }

      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        let profile = await getUserProfile(fbUser.uid);

        if (!profile) {
          const recovered = await recoverProfileFromSubCollections(fbUser.uid, fbUser.email || "");
          if (recovered) {
            profile = recovered;
          } else {
            setLoading(false);
            return;
          }
        }

        const baseUser: AuthUser = {
          uid: fbUser.uid,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          companyId: profile.companyId,
          therapistId: profile.therapistId,
          clientId: profile.clientId,
          avatar: profile.avatar ?? fbUser.photoURL ?? undefined,
        };

        setUser(baseUser);
      } catch (err) {
        console.error("Error loading user profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, [recoverProfileFromSubCollections]);

  // ─── signIn ──────────────────────────────────────────────────────────────

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ route: string }> => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = cred.user;

      // Check if email is verified
      if (!fbUser.emailVerified) {
        await firebaseSignOut(auth);
        throw Object.assign(
          new Error("Por favor, verifique seu e-mail antes de fazer login."),
          { code: "auth/email-not-verified", email: fbUser.email }
        );
      }

      let profile = await getUserProfile(fbUser.uid);

      if (!profile) {
        const recovered = await recoverProfileFromSubCollections(fbUser.uid, fbUser.email || email);
        if (recovered) {
          profile = recovered;
        } else {
          await firebaseSignOut(auth);
          throw Object.assign(
            new Error("Nenhum cadastro encontrado para este e-mail. Por favor, faça o registro."),
            { code: "auth/user-not-registered" }
          );
        }
      }

      // Update emailVerified status in Firestore
      if (fbUser.emailVerified && profile.emailVerified !== true) {
        await updateUserProfile(fbUser.uid, { emailVerified: true });
      }

      const baseUser: AuthUser = {
        uid: fbUser.uid,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        companyId: profile.companyId,
        therapistId: profile.therapistId,
        clientId: profile.clientId,
        avatar: profile.avatar ?? fbUser.photoURL ?? undefined,
      };

      const route = ROLE_ROUTES[baseUser.role] ?? "/";
      setUser(baseUser);
      return { route };
    },
    [recoverProfileFromSubCollections]
  );

  // ─── signInGoogle ────────────────────────────────────────────────────────

  const signInGoogle = useCallback(async (): Promise<{ route: string }> => {
    const cred = await signInWithGoogleGIS();
    const fbUser = cred.user;

    let profile = await getUserProfile(fbUser.uid);

    if (!profile) {
      const recovered = await recoverProfileFromSubCollections(fbUser.uid, fbUser.email || "");
      if (recovered) {
        profile = recovered;
      } else {
        const baseProfile = {
          name: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuário",
          email: fbUser.email || "",
          role: "client" as UserRole,
          avatar: fbUser.photoURL ?? undefined,
        };
        await createUserProfile(fbUser.uid, baseProfile);
        profile = { uid: fbUser.uid, ...baseProfile };
      }
    }

    const baseUser: AuthUser = {
      uid: fbUser.uid,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      companyId: profile.companyId,
      therapistId: profile.therapistId,
      clientId: profile.clientId,
      avatar: profile.avatar ?? fbUser.photoURL ?? undefined,
    };

    const route = ROLE_ROUTES[baseUser.role] ?? "/";
    setUser(baseUser);
    return { route };
  }, [recoverProfileFromSubCollections]);

  // ─── registerCompany ──────────────────────────────────────────────────────

  const registerCompany = useCallback(async (params: RegisterCompanyParams): Promise<void> => {
    // plan is passed by name directly (e.g. "Business", "Premium") from the registration form
    const plan = params.plan || "Business";

    // Tell the onAuthStateChanged listener to skip the next event so we can
    // set the user ourselves after all Firestore writes complete.
    skipNextAuthEvent.current = true;

    // 1. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, params.responsibleEmail, params.password);
    const uid = cred.user.uid;

    try {
      // 2. Build invite code
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      // 3. Create company document
      const address = [
        params.street,
        params.number,
        params.complement,
        params.neighborhood ? `- ${params.neighborhood}` : "",
        `${params.city} - ${params.state}`,
        params.cep,
      ].filter(Boolean).join(", ");

      const companyId = await createCompany({
        name: params.companyName,
        logo: "",
        color: "#0D9488",
        email: params.responsibleEmail,
        phone: params.phone,
        address,
        cnpj: params.cnpj,
        segment: params.segment,
        plan,
        status: "active",
        inviteCode,
        therapistsCount: 0,
        clientsCount: 0,
        totalRevenue: 0,
        monthRevenue: 0,
      });

      // 4. Create default unit (first location = the address provided)
      await createUnit({
        companyId,
        name: params.city,
        fullName: `Unidade ${params.city}`,
        address,
        phone: params.phone,
        email: params.responsibleEmail,
        status: "active",
        isMain: true,
      });

      // 5. Create user profile
      await createUserProfile(uid, {
        name: params.responsibleName,
        email: params.responsibleEmail,
        role: "company_admin",
        companyId,
      });

      // 6. Send email verification
      await sendEmailVerification(cred.user);

      // 7. Sign out - user needs to verify email first
      await firebaseSignOut(auth);
      setLoading(false);
    } catch (err) {
      // Rollback on failure
      try {
        await cred.user.delete();
      } catch (deleteErr) {
        console.warn("[registerCompany] Could not delete orphaned Auth user:", deleteErr);
      }
      skipNextAuthEvent.current = false;
      throw err;
    }
  }, []);

  // ─── registerTherapist ────────────────────────────────────────────────────

  const registerTherapist = useCallback(async (params: RegisterTherapistParams): Promise<void> => {
    skipNextAuthEvent.current = true;

    // 1. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, params.email, params.password);
    const uid = cred.user.uid;

    try {
      // 2. Create therapist document — strip undefined to avoid Firestore rejection
      const therapistData: Record<string, unknown> = {
        userId: uid,
        name: params.name,
        email: params.email,
        phone: params.phone,
        specialty: params.specialty,
        username: params.username,
        commission: params.commission ?? 100,
        rating: 5.0,
        status: "active",
        therapies: [],
        schedule: {},
        monthSessions: 0,
        monthEarnings: 0,
        totalSessions: 0,
        totalEarnings: 0,
      };
      if (params.companyId) therapistData.companyId = params.companyId;
      if (params.unitId) therapistData.unitId = params.unitId;

      const therapistId = await createTherapist(therapistData as Parameters<typeof createTherapist>[0]);

      // 3. Create user profile — also strip undefined
      const profileData: Parameters<typeof createUserProfile>[1] = {
        name: params.name,
        email: params.email,
        role: "therapist",
        therapistId,
      };
      if (params.companyId) profileData.companyId = params.companyId;
      await createUserProfile(uid, profileData);

      // 4. Send email verification
      await sendEmailVerification(cred.user);

      // 5. Sign out - user needs to verify email first
      await firebaseSignOut(auth);
      setLoading(false);
    } catch (err) {
      // Firestore write(s) failed — delete the Auth user to avoid orphaned account
      // that would be mistakenly assigned role "client" on next login attempt.
      try {
        await cred.user.delete();
      } catch (deleteErr) {
        console.warn("[registerTherapist] Could not delete orphaned Auth user:", deleteErr);
      }
      // Reset the skip flag so onAuthStateChanged works normally again
      skipNextAuthEvent.current = false;
      throw err;
    }
  }, []);

  // ─── registerClient ───────────────────────────────────────────────────────

  const registerClient = useCallback(async (params: RegisterClientParams): Promise<void> => {
    skipNextAuthEvent.current = true;

    // 1. Create Firebase Auth user
    const cred = await createUserWithEmailAndPassword(auth, params.email, params.password);
    const uid = cred.user.uid;

    try {
      // 2. Create client document
      const clientId = await createClient({
        userId: uid,
        name: params.name,
        email: params.email,
        phone: params.phone,
        birthdate: params.birthdate,
        ...(params.companyId ? { companyId: params.companyId } : {}),
        totalSessions: 0,
        totalSpent: 0,
        status: "active",
        registeredBy: "self",
        registeredAt: new Date().toISOString().split("T")[0],
      });

      // 3. Create user profile
      await createUserProfile(uid, {
        name: params.name,
        email: params.email,
        role: "client",
        clientId,
        ...(params.companyId ? { companyId: params.companyId } : {}),
      });

      // 4. Send email verification
      await sendEmailVerification(cred.user);

      // 5. Sign out - user needs to verify email first
      await firebaseSignOut(auth);
      setLoading(false);
    } catch (err) {
      // Firestore write(s) failed — rollback Auth user
      try {
        await cred.user.delete();
      } catch (deleteErr) {
        console.warn("[registerClient] Could not delete orphaned Auth user:", deleteErr);
      }
      skipNextAuthEvent.current = false;
      throw err;
    }
  }, []);

  // ─── signOut ─────────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
  }, []);

  // ─── Legacy shims ─────────────────────────────────────────────────────────

  const login = useCallback((u: AuthUser) => setUser(u), []);
  const logout = useCallback(async () => {
    await firebaseSignOut(auth).catch(() => {});
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signInGoogle,
        signOut,
        registerCompany,
        registerTherapist,
        registerClient,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}