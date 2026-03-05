import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router";
import {
  LayoutDashboard, CalendarDays, DollarSign, UserCircle,
  LogOut, Menu, X, Bell, ChevronDown, Sparkles, Layers,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { therapists } from "../../data/mockData";

const navItems = [
  { path: "/terapeuta", icon: LayoutDashboard, label: "Dashboard", end: true },
  { path: "/terapeuta/agenda", icon: CalendarDays, label: "Minha Agenda" },
  { path: "/terapeuta/terapias", icon: Layers, label: "Minhas Terapias" },
  { path: "/terapeuta/ganhos", icon: DollarSign, label: "Ganhos" },
  { path: "/terapeuta/perfil", icon: UserCircle, label: "Meu Perfil" },
];

export default function TherapistLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const therapist = therapists.find((t) => t.id === user?.therapistId);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-16"} flex flex-col bg-white border-r border-violet-100 transition-all duration-300 shrink-0 shadow-sm`}
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
              <img
                src={therapist.avatar}
                alt={therapist.name}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
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

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-violet-100 flex items-center justify-between px-6 shrink-0 shadow-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-gray-400 hover:text-gray-700 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-3">
            <button className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center text-violet-500 hover:text-violet-700 transition-colors relative">
              <Bell className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 cursor-pointer">
              <img
                src={user?.avatar || ""}
                alt={user?.name}
                className="w-8 h-8 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-sm text-gray-700 hidden sm:block">{user?.name}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}