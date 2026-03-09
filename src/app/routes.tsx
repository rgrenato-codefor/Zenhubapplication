import { createBrowserRouter, Navigate } from "react-router";
import Login from "./pages/Login";
import RootLayout from "./components/shared/RootLayout";
import { ProtectedRoute } from "./components/shared/ProtectedRoute";
import RegisterSelect from "./pages/register/RegisterSelect";
import CompanyRegister from "./pages/register/CompanyRegister";
import ClientRegister from "./pages/register/ClientRegister";
import TherapistRegister from "./pages/register/TherapistRegister";
import TherapistPublicProfile from "./pages/therapist/TherapistPublicProfile";

// Layouts
import AdminLayout from "./components/layouts/AdminLayout";
import CompanyLayout from "./components/layouts/CompanyLayout";
import TherapistLayout from "./components/layouts/TherapistLayout";
import ClientLayout from "./components/layouts/ClientLayout";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminPlans from "./pages/admin/AdminPlans";

// Company Pages
import CompanyDashboard from "./pages/company/CompanyDashboard";
import CompanyTherapists from "./pages/company/CompanyTherapists";
import CompanySchedule from "./pages/company/CompanySchedule";
import CompanyClients from "./pages/company/CompanyClients";
import CompanyTherapies from "./pages/company/CompanyTherapies";
import CompanySales from "./pages/company/CompanySales";
import CompanyCommissions from "./pages/company/CompanyCommissions";
import CompanyReports from "./pages/company/CompanyReports";
import CompanySettings from "./pages/company/CompanySettings";
import CompanyRooms from "./pages/company/CompanyRooms";
import CompanyTherapistDetail from "./pages/company/CompanyTherapistDetail";

// Therapist Pages
import TherapistDashboard from "./pages/therapist/TherapistDashboard";
import TherapistSchedule from "./pages/therapist/TherapistSchedule";
import TherapistEarnings from "./pages/therapist/TherapistEarnings";
import TherapistProfile from "./pages/therapist/TherapistProfile";
import TherapistTherapies from "./pages/therapist/TherapistTherapies";
import TherapistNotifications from "./pages/therapist/TherapistNotifications";
import TherapistGallery from "./pages/therapist/TherapistGallery";

// Client Pages
import ClientHome from "./pages/client/ClientHome";
import ClientTherapists from "./pages/client/ClientTherapists";
import ClientBookings from "./pages/client/ClientBookings";
import ClientProfile from "./pages/client/ClientProfile";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      // Public
      { path: "/", Component: Login },
      { path: "/cadastro", Component: RegisterSelect },
      { path: "/cadastro/empresa", Component: CompanyRegister },
      { path: "/cadastro/cliente", Component: ClientRegister },
      { path: "/cadastro/cliente/:slug", Component: ClientRegister },
      { path: "/cadastro/terapeuta", Component: TherapistRegister },

      // Public therapist profile — friendly URL
      { path: "/:username", Component: TherapistPublicProfile },

      // ── Super Admin ────────────────────────────────────────────────────────
      {
        element: <ProtectedRoute allowed={["super_admin"]} />,
        children: [
          {
            path: "/admin",
            Component: AdminLayout,
            children: [
              { index: true, Component: AdminDashboard },
              { path: "empresas", Component: AdminCompanies },
              { path: "usuarios", Component: AdminUsers },
              { path: "relatorios", Component: AdminReports },
              { path: "planos", Component: AdminPlans },
              { path: "configuracoes", Component: AdminSettings },
            ],
          },
        ],
      },

      // ── Company (Admin + Sales) ────────────────────────────────────────────
      {
        element: <ProtectedRoute allowed={["company_admin", "sales"]} />,
        children: [
          {
            path: "/empresa",
            Component: CompanyLayout,
            children: [
              { index: true, Component: CompanyDashboard },
              { path: "terapeutas", Component: CompanyTherapists },
              { path: "agenda", Component: CompanySchedule },
              { path: "salas", Component: CompanyRooms },
              { path: "clientes", Component: CompanyClients },
              { path: "terapias", Component: CompanyTherapies },
              { path: "vendas", Component: CompanySales },
              { path: "comissoes", Component: CompanyCommissions },
              { path: "comissoes/terapeuta/:therapistId", Component: CompanyTherapistDetail },
              { path: "relatorios", Component: CompanyReports },
              { path: "configuracoes", Component: CompanySettings },
            ],
          },
        ],
      },

      // ── Therapist ──────────────────────────────────────────────────────────
      {
        element: <ProtectedRoute allowed={["therapist"]} />,
        children: [
          {
            path: "/terapeuta",
            Component: TherapistLayout,
            children: [
              { index: true, Component: TherapistDashboard },
              { path: "agenda",         Component: TherapistSchedule },
              { path: "terapias",       Component: TherapistTherapies },
              { path: "galeria",        Component: TherapistGallery },
              { path: "ganhos",         Component: TherapistEarnings },
              { path: "perfil",         Component: TherapistProfile },
              { path: "notificacoes",   Component: TherapistNotifications },
            ],
          },
        ],
      },

      // ── Client ────────────────────────────────────────────────────────────
      {
        element: <ProtectedRoute allowed={["client"]} />,
        children: [
          {
            path: "/cliente",
            Component: ClientLayout,
            children: [
              { index: true, Component: ClientHome },
              { path: "terapeutas", Component: ClientTherapists },
              { path: "reservas", Component: ClientBookings },
              { path: "perfil", Component: ClientProfile },
            ],
          },
        ],
      },

      // Catch-all
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);