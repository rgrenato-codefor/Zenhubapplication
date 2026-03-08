/**
 * ProtectedRoute
 * Wraps layout routes to enforce authentication and role-based access.
 * - If not logged in → redirect to /
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
  const { user } = useAuth();

  // Not authenticated → go to login
  if (!user) return <Navigate to="/" replace />;

  // User in the correct environment
  if (allowed.includes(user.role)) return <Outlet />;

  // Wrong environment → redirect to the right one
  const correctRoute = ROLE_ROUTES[user.role] ?? "/";
  return <Navigate to={correctRoute} replace />;
}