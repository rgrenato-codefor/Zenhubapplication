import { Outlet, NavLink, useNavigate } from "react-router";
import {
  Home, Users, CalendarDays, UserCircle, LogOut, Grid,
} from "../shared/icons";
import { NotificationsDropdown } from "../shared/NotificationsDropdown";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { FeedProvider } from "../../context/FeedContext";

const navItems = [
  { path: "/cliente",         icon: Grid,        label: "Feed",         end: true },
  { path: "/cliente/painel",  icon: Home,        label: "Painel" },
  { path: "/cliente/terapeutas", icon: Users,    label: "Profissionais" },
  { path: "/cliente/reservas",   icon: CalendarDays, label: "Reservas" },
  { path: "/cliente/perfil",     icon: UserCircle,  label: "Perfil" },
];

export default function ClientLayout() {
  const { user, signOut } = useAuth();
  const { company } = usePageData();
  const navigate = useNavigate();
  const primaryColor = company?.color || "#7C3AED";

  const handleLogout = () => {
    signOut();
    navigate("/");
  };

  return (
    <FeedProvider>
      <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs"
              style={{ background: primaryColor, fontWeight: 700 }}
            >
              {company?.logo || "TF"}
            </div>
            <div>
              <p className="text-sm text-gray-900" style={{ fontWeight: 700 }}>{company?.name || "ZEN HUB"}</p>
              <p className="text-xs text-gray-400">Seu espaço de bem-estar</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NotificationsDropdown
              variant="client"
              triggerClass="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
              bellClass="w-4 h-4"
            />
            <button onClick={handleLogout} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover border-2 border-purple-200" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm" style={{ fontWeight: 700 }}>
                {user?.name?.charAt(0)}
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-20">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around py-2 px-2 z-50">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors ${
                  isActive ? "text-purple-600" : "text-gray-400"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                    isActive ? "bg-purple-50" : ""
                  }`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px]" style={{ fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </FeedProvider>
  );
}