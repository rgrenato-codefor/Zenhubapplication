import { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard, Users, Sparkles, CalendarDays, UserCircle,
  DollarSign, BarChart3, Settings, LogOut, Menu, X, Bell,
  ChevronDown, ChevronRight, DoorOpen, MapPin, Check, Building2,
  UserCircle as UserIcon,
} from "../shared/icons";
import { NotificationsDropdown } from "../shared/NotificationsDropdown";
import { useAuth } from "../../context/AuthContext";
import { usePageData } from "../../hooks/usePageData";
import { CompanyProvider, useCompanyUnit } from "../../context/CompanyContext";

// ── Dashboard sub-items ──────────────────────────────────────────────────────

const dashboardChildren = [
  { path: "/empresa",            label: "Painel Geral",  end: true },
  { path: "/empresa/vendas",     label: "Vendas" },
  { path: "/empresa/comissoes",  label: "Comissões" },
  { path: "/empresa/relatorios", label: "Relatórios" },
];

// ── Flat nav items ───────────────────────────────────────────────────────────

const getFlatItems = (role: string) => {
  const base = [
    { path: "/empresa/agenda",       icon: CalendarDays, label: "Agenda" },
    { path: "/empresa/clientes",     icon: UserCircle,   label: "Clientes" },
    { path: "/empresa/terapeutas",   icon: Users,        label: "Terapeutas" },
    { path: "/empresa/salas",        icon: DoorOpen,     label: "Salas" },
    { path: "/empresa/terapias",     icon: Sparkles,     label: "Terapias" },
  ];
  if (role === "company_admin") {
    return [...base, { path: "/empresa/configuracoes", icon: Settings, label: "Configurações" }];
  }
  return base;
};

// ── Unit Switcher dropdown ───────────────────────────────────────────────────

function UnitSwitcher({ primaryColor }: { primaryColor: string }) {
  const { selectedUnitId, setSelectedUnitId, companyUnits, selectedUnit } = useCompanyUnit();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Só mostra o switcher se há mais de 1 unidade
  if (companyUnits.length <= 1) return null;

  const label = selectedUnit ? selectedUnit.name : "Todas as unidades";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
      >
        <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: primaryColor }} />
        <span style={{ fontWeight: 600 }}>{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          {/* Todas as unidades */}
          <button
            onClick={() => { setSelectedUnitId(null); setOpen(false); }}
            className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              <span style={{ fontWeight: selectedUnitId === null ? 700 : 400 }}>
                Todas as unidades
              </span>
            </div>
            {selectedUnitId === null && <Check className="w-3.5 h-3.5" style={{ color: primaryColor }} />}
          </button>

          {/* Lista de unidades */}
          {companyUnits.map((unit) => (
            <button
              key={unit.id}
              onClick={() => { setSelectedUnitId(unit.id); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: unit.status === "active" ? primaryColor : "#9CA3AF" }}
                />
                <div className="min-w-0 text-left">
                  <p style={{ fontWeight: selectedUnitId === unit.id ? 700 : 400 }} className="truncate">
                    {unit.name}
                    {unit.isMain && (
                      <span className="ml-1.5 text-xs text-gray-400" style={{ fontWeight: 400 }}>(principal)</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{unit.address.split(" - ")[0]}</p>
                </div>
              </div>
              {selectedUnitId === unit.id && <Check className="w-3.5 h-3.5 shrink-0 ml-2" style={{ color: primaryColor }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inner Layout (uses CompanyContext) ───────────────────────────────────────

function CompanyLayoutInner() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dashOpen, setDashOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { company } = usePageData();
  const { selectedUnitId, setSelectedUnitId, companyUnits } = useCompanyUnit();
  const navigate = useNavigate();
  const location = useLocation();

  const primaryColor = company?.color || "#0D9488";
  const flatItems = getFlatItems(user?.role ?? "sales");

  const dashActive = dashboardChildren.some((c) =>
    c.end ? location.pathname === c.path : location.pathname.startsWith(c.path)
  );

  const handleLogout = () => { signOut(); navigate("/"); };

  // Close user menu on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-16"} flex flex-col bg-white border-r border-gray-200 transition-all duration-300 shrink-0 shadow-sm`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 h-16">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs"
            style={{ background: primaryColor, fontWeight: 700 }}
          >
            {company?.logo ?? "EM"}
          </div>
          {sidebarOpen && (
            <div className="min-w-0">
              <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 700 }}>
                {company?.name}
              </p>
              <p className="text-xs text-gray-400 capitalize">
                {user?.role === "company_admin" ? "Admin da Empresa" : "Vendas"}
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">

          {/* ── Dashboard group ───────────────────────────────────────────── */}
          {sidebarOpen ? (
            <div>
              <button
                onClick={() => setDashOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  dashActive && !dashOpen
                    ? "text-white"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
                style={dashActive && !dashOpen ? { background: primaryColor } : {}}
              >
                <div className="flex items-center gap-3">
                  <LayoutDashboard className="w-5 h-5 shrink-0" />
                  <span className="text-sm">Dashboard</span>
                </div>
                {dashOpen
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {dashOpen && (
                <div className="ml-3 mt-0.5 border-l-2 pl-3 space-y-0.5" style={{ borderColor: `${primaryColor}40` }}>
                  {dashboardChildren.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        `flex items-center px-2 py-2 rounded-lg text-sm transition-colors ${
                          isActive ? "text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                        }`
                      }
                      style={({ isActive }) =>
                        isActive ? { background: primaryColor, fontWeight: 600 } : {}
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className={`w-full flex items-center justify-center px-3 py-2.5 rounded-lg transition-colors ${
                dashActive ? "text-white" : "text-gray-500 hover:bg-gray-50"
              }`}
              style={dashActive ? { background: primaryColor } : {}}
              title="Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
          )}

          {/* ── Divider ───────────────────────────────────────────────────── */}
          <div className="h-px bg-gray-100 my-1" />

          {/* ── Flat items ────────────────────────────────────────────────── */}
          {flatItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive ? "text-white" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
              style={({ isActive }) =>
                isActive ? { background: primaryColor } : {}
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white text-sm"
              style={{ background: primaryColor, fontWeight: 700 }}
            >
              {user?.name?.charAt(0)}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors mt-1"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span className="text-sm">Sair</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {/* ── Unit Switcher ── */}
            <UnitSwitcher primaryColor={primaryColor} />
          </div>

          <div className="flex items-center gap-3">
            <NotificationsDropdown
              variant="company"
              triggerClass="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors"
              bellClass="w-4 h-4"
            />

            {/* ── User menu ── */}
            <div ref={userMenuRef} className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm shrink-0"
                  style={{ background: primaryColor, fontWeight: 700 }}
                >
                  {user?.name?.charAt(0)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm text-gray-900 leading-tight">{user?.name}</p>
                  <p className="text-xs text-gray-400">
                    {user?.role === "company_admin" ? "Admin" : "Vendas"}
                  </p>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-4 border-b border-gray-100" style={{ background: `${primaryColor}08` }}>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0"
                        style={{ background: primaryColor, fontWeight: 700 }}
                      >
                        {user?.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-900 truncate" style={{ fontWeight: 700 }}>
                          {user?.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <span
                          className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
                          style={{ background: `${primaryColor}20`, color: primaryColor, fontWeight: 600 }}
                        >
                          {user?.role === "company_admin" ? "Admin da Empresa" : "Vendas"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-1.5 space-y-0.5">
                    {user?.role === "company_admin" && (
                      <button
                        onClick={() => { navigate("/empresa/configuracoes"); setUserMenuOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: `${primaryColor}15` }}
                        >
                          <Settings className="w-3.5 h-3.5" style={{ color: primaryColor }} />
                        </div>
                        <span>Configurações da empresa</span>
                      </button>
                    )}
                    <button
                      onClick={() => { navigate("/empresa/configuracoes"); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
                        <UserIcon className="w-3.5 h-3.5 text-gray-500" />
                      </div>
                      <span>Meu perfil</span>
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="p-1.5 border-t border-gray-100">
                    <button
                      onClick={() => { handleLogout(); setUserMenuOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
                        <LogOut className="w-3.5 h-3.5 text-red-500" />
                      </div>
                      <span style={{ fontWeight: 600 }}>Sair da conta</span>
                    </button>
                  </div>
                </div>
              )}
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

// ── Default export wraps inner layout with the unit context ──────────────────

export default function CompanyLayout() {
  const { user } = useAuth();
  return (
    <CompanyProvider companyId={user?.companyId ?? ""}>
      <CompanyLayoutInner />
    </CompanyProvider>
  );
}