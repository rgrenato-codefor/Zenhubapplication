import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { signInWithGoogleGIS } from "../../lib/googleGIS";
import { getUserProfile, createUserProfile, type UserRole } from "../../lib/firestore";

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
  /** @deprecated use signIn() – kept for backwards compat with old pages */
  login: (user: AuthUser) => void;
  /** @deprecated use signOut() */
  logout: () => void;
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
  login: () => {},
  logout: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoViewAs, setDemoViewAs] = useState<DemoViewAs>("company_admin");

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
      if (!fbUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        let profile = await getUserProfile(fbUser.uid);

        // If no profile exists yet, create a basic one (e.g. first-time demo user)
        if (!profile) {
          const isDemo = fbUser.email === DEMO_EMAIL;
          const baseProfile = {
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuário",
            email: fbUser.email || "",
            role: (isDemo ? "demo" : "client") as UserRole,
          };
          await createUserProfile(fbUser.uid, baseProfile);
          profile = { uid: fbUser.uid, ...baseProfile };
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
  }, [buildEffectiveUser]);

  // ─── signIn ──────────────────────────────────────────────────────────────

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ route: string }> => {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const fbUser = cred.user;

      let profile = await getUserProfile(fbUser.uid);

      if (!profile) {
        const isDemo = fbUser.email === DEMO_EMAIL;
        const baseProfile = {
          name: fbUser.displayName || email.split("@")[0],
          email: fbUser.email || email,
          role: (isDemo ? "demo" : "client") as UserRole,
        };
        await createUserProfile(fbUser.uid, baseProfile);
        profile = { uid: fbUser.uid, ...baseProfile };
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
    [demoViewAs, buildEffectiveUser]
  );

  // ─── signInGoogle ────────────────────────────────────────────────────────

  const signInGoogle = useCallback(async (): Promise<{ route: string }> => {
    const cred = await signInWithGoogleGIS();
    const fbUser = cred.user;

    let profile = await getUserProfile(fbUser.uid);

    if (!profile) {
      const baseProfile = {
        name: fbUser.displayName || fbUser.email?.split("@")[0] || "Usuário",
        email: fbUser.email || "",
        role: "client" as UserRole,
        avatar: fbUser.photoURL ?? undefined,
      };
      await createUserProfile(fbUser.uid, baseProfile);
      profile = { uid: fbUser.uid, ...baseProfile };
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
  }, [buildEffectiveUser]);

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