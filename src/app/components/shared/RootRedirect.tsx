/**
 * RootRedirect
 *
 * Componente que protege a rota raiz "/":
 * - Enquanto o Firebase ainda resolve a sessão → spinner neutro
 * - Usuário autenticado → redireciona direto para a home do seu perfil
 * - Sem sessão → renderiza a página de Login normalmente
 */

import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { ROLE_ROUTES } from "../../context/AuthContext";
import Login from "../../pages/Login";

export function RootRedirect() {
  const { user, loading } = useAuth();

  // Firebase ainda está resolvendo a sessão persistida — aguarda sem piscar
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <svg
          className="animate-spin h-8 w-8 text-violet-500"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      </div>
    );
  }

  // Já autenticado → vai direto para a home do perfil
  if (user) {
    const destination = ROLE_ROUTES[user.role] ?? "/";
    return <Navigate to={destination} replace />;
  }

  // Sem sessão → renderiza o Login normalmente
  return <Login />;
}
