/**
 * ProtectedRoute
 * Wraps layout routes to enforce authentication and role-based access.
 * - While Firebase is restoring the session → show a loading spinner (prevents
 *   a premature redirect to "/" that would lose the original URL on refresh).
 * - If not logged in after auth resolves → redirect to /
 * - If logged in but wrong environment → redirect to the correct one
 */

import { Navigate, Outlet } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { ROLE_ROUTES } from "../../context/AuthContext";

interface Props {
  /** Which roles are allowed to view this layout */
  allowed: string[];
}

export function ProtectedRoute({ allowed }: Props) {
  const { user, loading } = useAuth();

  // Firebase is still restoring the session — render nothing (or a spinner)
  // so we don't redirect away from the current URL prematurely.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#7C3AED", borderTopColor: "transparent" }} />
          <p className="text-sm text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not authenticated → go to login
  if (!user) return <Navigate to="/" replace />;

  // User in the correct environment
  if (allowed.includes(user.role)) return <Outlet />;

  // Wrong environment → redirect to the right one
  const correctRoute = ROLE_ROUTES[user.role] ?? "/";
  return <Navigate to={correctRoute} replace />;
}