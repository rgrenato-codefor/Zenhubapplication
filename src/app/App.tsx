import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Loader2 } from "./components/shared/icons";
import { ZenHubLogo } from "./components/shared/ZenHubLogo";

function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-4">
      <ZenHubLogo variant="full" textColor="#ffffff" height={44} />
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      <p className="text-gray-400 text-sm">Carregando…</p>
    </div>
  );
}

function InnerApp() {
  const { loading } = useAuth();
  if (loading) return <AppLoadingScreen />;
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  );
}