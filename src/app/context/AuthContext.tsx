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
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { signInWithGoogleGIS } from "../../lib/googleGIS";
import {
  getUserProfile,
  createUserProfile,
  createCompany,
  createUnit,
  createTherapist,
  createClient,
  getTherapistByUserId,
  getClientByUserId,
  type UserRole,
} from "../../lib/firestore";

// ─── Constants ────────────────────────────────────────────────────────────────

export const DEMO_EMAIL = "teste@teste.com.br";

/** Route associated with each role for automatic redirection */
export const ROLE_ROUTES: Record<UserRole, string> = {
  super_admin: "/admin",
  company_admin: "/empresa",
  sales: "/empresa",
  therapist: "/terapeuta",
  client: "/cliente",
  demo: "/admin", // default demo view
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

/**
 * When isDemoMode is true, demoViewAs controls which environment
 * the demo user is currently previewing.
 */
export type DemoViewAs = Exclude<UserRole, "demo">;

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isDemoMode: boolean;
  demoViewAs: DemoViewAs;
  setDemoViewAs: (role: DemoViewAs) => void;
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

// ─── Mock DEMO users (used only when isDemoMode === true) ─────────────────────

export const DEMO_USERS: AuthUser[] = [
  {
    uid: "demo-superadmin",
    name: "Admin Master",
    email: DEMO_EMAIL,
    role: "super_admin",
  },
  {
    uid: "demo-company",
    name: "Juliana Santos",
    email: DEMO_EMAIL,
    role: "company_admin",
    companyId: "c1",
  },
  {
    uid: "demo-sales",
    name: "Pedro Alves",
    email: DEMO_EMAIL,
    role: "sales",
    companyId: "c1",
  },
  {
    uid: "demo-therapist",
    name: "Ana Carolina Silva",
    email: DEMO_EMAIL,
    role: "therapist",
    companyId: "c1",
    therapistId: "t1",
    avatar:
      "https://images.unsplash.com/photo-1706087467429-2096dbdcb477?w=150&h=150&fit=crop&crop=face",
  },
  {
    uid: "demo-client",
    name: "Mariana Oliveira",
    email: DEMO_EMAIL,
    role: "client",
    companyId: "c1",
    clientId: "cl1",
    avatar:
      "https://images.unsplash.com/photo-1630595633877-9918ee257288?w=150&h=150&fit=crop&crop=face",
  },
];

export const DEMO_VIEW_OPTIONS: { role: DemoViewAs; label: string; route: string }[] = [
  { role: "company_admin", label: "Empresa", route: "/empresa" },
  { role: "therapist", label: "Terapeuta", route: "/terapeuta" },
  { role: "client", label: "Cliente", route: "/cliente" },
];

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isDemoMode: false,
  demoViewAs: "company_admin",
  setDemoViewAs: () => {},
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
  const [demoViewAs, setDemoViewAs] = useState<DemoViewAs>("company_admin");
  // When true, the next onAuthStateChanged event is swallowed so that
  // registerCompany can set the user state itself without a race condition.
  const skipNextAuthEvent = useRef(false);

  const isDemoMode = user?.email === DEMO_EMAIL;

  /**
   * Build the AuthUser that the rest of the app sees.
   * For demo mode: use the DEMO_USERS entry matching demoViewAs.
   * For real users: use the Firestore profile.
   */
  const buildEffectiveUser = useCallback(
    (base: AuthUser): AuthUser => {
      if (base.email !== DEMO_EMAIL) return base;
      const demoUser = DEMO_USERS.find((u) => u.role === demoViewAs) ?? DEMO_USERS[0];
      // Keep the real Firebase uid so Auth still works
      return { ...demoUser, uid: base.uid, email: DEMO_EMAIL };
    },
    [demoViewAs]
  );

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

  // Re-compute effective user whenever demoViewAs changes
  useEffect(() => {
    if (!user) return;
    if (user.email !== DEMO_EMAIL) return;
    const effective = buildEffectiveUser(user);
    setUser(effective);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoViewAs]);

  // Firebase Auth listener — runs once on mount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      // Let register* functions manage their own user state update
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

        // If no profile exists yet:
        if (!profile) {
          const isDemo = fbUser.email === DEMO_EMAIL;
          if (!isDemo) {
            // Try to recover from sub-collections (handles incomplete registration)
            const recovered = await recoverProfileFromSubCollections(fbUser.uid, fbUser.email || "");
            if (recovered) {
              profile = recovered;
            } else {
              // Truly no data — user is mid-registration or something went wrong.
              // Don't create a wrong profile; just wait.
              setLoading(false);
              return;
            }
          } else {
            // Demo user: auto-create demo profile
            const baseProfile = {
              name: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuário",
              email: fbUser.email || "",
              role: "demo" as UserRole,
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

        const effective = buildEffectiveUser(baseUser);
        setUser(effective);
      } catch (err) {
        console.error("Error loading user profile:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, [buildEffectiveUser, recoverProfileFromSubCollections]);

  // ─── signIn ──────────────────────────────────────────────────────────────

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ route: string }> => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = cred.user;

      let profile = await getUserProfile(fbUser.uid);

      if (!profile) {
        const isDemo = fbUser.email === DEMO_EMAIL;
        if (isDemo) {
          const baseProfile = {
            name: fbUser.displayName || email.split("@")[0],
            email: fbUser.email || email,
            role: "demo" as UserRole,
          };
          await createUserProfile(fbUser.uid, baseProfile);
          profile = { uid: fbUser.uid, ...baseProfile };
        } else {
          // Real user with no profile: try to recover from sub-collections.
          // This handles the case where registration failed mid-way (Auth created
          // but Firestore writes didn't complete).
          const recovered = await recoverProfileFromSubCollections(fbUser.uid, fbUser.email || email);
          if (recovered) {
            profile = recovered;
          } else {
            // No sub-collection documents either — this is a fresh unregistered user.
            // Throw so the UI can show a meaningful message instead of silently
            // creating a wrong role.
            await firebaseSignOut(auth);
            throw Object.assign(
              new Error("Nenhum cadastro encontrado para este e-mail. Por favor, faça o registro."),
              { code: "auth/user-not-registered" }
            );
          }
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

      const isDemo = baseUser.email === DEMO_EMAIL;
      const effectiveRole: UserRole = isDemo ? demoViewAs : baseUser.role;
      const route = ROLE_ROUTES[effectiveRole] ?? "/";

      const effective = buildEffectiveUser(baseUser);
      setUser(effective);

      return { route };
    },
    [demoViewAs, buildEffectiveUser, recoverProfileFromSubCollections]
  );

  // ─── signInGoogle ────────────────────────────────────────────────────────

  const signInGoogle = useCallback(async (): Promise<{ route: string }> => {
    const cred = await signInWithGoogleGIS();
    const fbUser = cred.user;

    let profile = await getUserProfile(fbUser.uid);

    if (!profile) {
      // For Google sign-in, new users default to client (correct behaviour).
      // Try sub-collections first in case they registered elsewhere.
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
    const effective = buildEffectiveUser(baseUser);
    setUser(effective);

    return { route };
  }, [buildEffectiveUser, recoverProfileFromSubCollections]);

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

    // 6. Set user state directly — no round-trip needed
    const newUser: AuthUser = {
      uid,
      name: params.responsibleName,
      email: params.responsibleEmail,
      role: "company_admin",
      companyId,
    };
    setUser(newUser);
    setLoading(false);
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

      // 4. Set user state
      const newUser: AuthUser = {
        uid,
        name: params.name,
        email: params.email,
        role: "therapist",
        therapistId,
        companyId: params.companyId,
      };
      setUser(newUser);
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

      // 4. Set user state
      const newUser: AuthUser = {
        uid,
        name: params.name,
        email: params.email,
        role: "client",
        clientId,
        companyId: params.companyId,
      };
      setUser(newUser);
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
    setDemoViewAs("company_admin");
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
        isDemoMode,
        demoViewAs,
        setDemoViewAs,
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