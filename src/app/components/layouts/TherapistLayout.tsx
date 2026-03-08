import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, CalendarDays, DollarSign, UserCircle,
  LogOut, Menu, X, Bell, Sparkles, Layers,
} from "../shared/icons";
import { NotificationsDropdown } from "../shared/NotificationsDropdown";

const navItems = [
  { path: "/terapeuta",          icon: LayoutDashboard, label: "Dashboard",  end: true },
  { path: "/terapeuta/agenda",   icon: CalendarDays,    label: "Agenda" },
  { path: "/terapeuta/terapias", icon: Layers,          label: "Terapias" },
  { path: "/terapeuta/ganhos",   icon: DollarSign,      label: "Ganhos" },
  { path: "/terapeuta/perfil",   icon: UserCircle,      label: "Perfil" },
];

export default function TherapistLayout() {
  const { user, signOut } = useAuth();
  const { myTherapist: therapist, refresh } = usePageData();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // One-time refresh when entering the therapist area so stale company state
  // (e.g. dissociation done in another session) is reflected immediately.
  const didRefresh = useRef(false);
  useEffect(() => {
    if (didRefresh.current) return;
    didRefresh.current = true;
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex ${sidebarOpen ? "w-64" : "w-16"} flex-col bg-white border-r border-violet-100 transition-all duration-300 shrink-0 shadow-sm`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-violet-100 h-16">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>ZEN HUB</p>
              <p className="text-xs text-violet-500">Portal do Terapeuta</p>
            </div>
          )}
        </div>

        {/* Therapist Card */}
        {sidebarOpen && therapist && (
          <div className="mx-3 mt-3 p-3 bg-violet-50 rounded-xl border border-violet-100">
            <div className="flex items-center gap-3">
              {therapist.avatar ? (
                <img
                  src={therapist.avatar}
                  alt={therapist.name}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-violet-200 flex items-center justify-center shrink-0 text-violet-700" style={{ fontWeight: 700 }}>
                  {therapist.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs text-gray-900 truncate" style={{ fontWeight: 600 }}>{therapist.name}</p>
                <p className="text-xs text-violet-500 truncate">{therapist.specialty}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-yellow-400 text-xs">★</span>
                  <span className="text-xs text-gray-500">{therapist.rating}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto mt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                    : "text-gray-500 hover:bg-violet-50 hover:text-gray-900"
                }`
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-violet-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-gray-500 hover:bg-violet-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <header className="h-14 md:h-16 bg-white border-b border-violet-100 flex items-center justify-between px-4 md:px-6 shrink-0 shadow-sm z-30">
          {/* Desktop: toggle sidebar | Mobile: logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden md:flex text-gray-400 hover:text-gray-700 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm text-gray-900" style={{ fontWeight: 700 }}>ZEN HUB</span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            <NotificationsDropdown
              variant="therapist"
              triggerClass="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-500 hover:text-violet-700 transition-colors"
              bellClass="w-4 h-4"
            />
            <div className="flex items-center gap-2">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-violet-200 flex items-center justify-center text-violet-700 text-xs" style={{ fontWeight: 700 }}>
                  {user?.name?.charAt(0) ?? "T"}
                </div>
              )}
              <span className="text-sm text-gray-700 hidden sm:block">{user?.name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-6 pb-24 md:pb-6">
          <div className="max-w-2xl mx-auto md:mx-0">
            <Outlet />
          </div>
        </main>

        {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-violet-100 z-40 safe-area-pb">
          <div className="flex items-stretch h-16">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive ? "text-violet-600" : "text-gray-400"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${isActive ? "bg-violet-100" : ""}`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px]" style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

      </div>
    </div>
  );
}