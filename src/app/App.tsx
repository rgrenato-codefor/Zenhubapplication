import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Loader2, Sparkles } from "lucide-react";

function AppLoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center gap-4">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center shadow-lg">
        <Sparkles className="w-7 h-7 text-white" />
      </div>
      <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
      <p className="text-gray-400 text-sm">Carregando ZEN HUB…</p>
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
