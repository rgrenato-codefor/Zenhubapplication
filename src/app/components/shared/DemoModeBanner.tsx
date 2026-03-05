/**
 * DemoModeBanner
 * Floating bar shown at the bottom of the screen when the user is in demo mode.
 * Lets the user switch between environments (super_admin, company, therapist, client)
 * without logging out.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { Sparkles, ChevronUp, ChevronDown, Shield, Building2, Star, User, LogOut, X } from "lucide-react";
import { useAuth, DEMO_VIEW_OPTIONS, type DemoViewAs } from "../../context/AuthContext";

const ICONS: Record<DemoViewAs, React.ElementType> = {
  super_admin: Shield,
  company_admin: Building2,
  sales: Building2,
  therapist: Star,
  client: User,
};

const COLORS: Record<DemoViewAs, string> = {
  super_admin: "#7C3AED",
  company_admin: "#7C3AED",
  sales: "#0EA5E9",
  therapist: "#0D9488",
  client: "#EC4899",
};

export function DemoModeBanner() {
  const { isDemoMode, demoViewAs, setDemoViewAs, signOut } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (!isDemoMode || dismissed) return null;

  const current = DEMO_VIEW_OPTIONS.find((o) => o.role === demoViewAs) ?? DEMO_VIEW_OPTIONS[0];
  const CurrentIcon = ICONS[demoViewAs];
  const currentColor = COLORS[demoViewAs];

  const handleSwitch = (option: typeof DEMO_VIEW_OPTIONS[0]) => {
    setDemoViewAs(option.role as DemoViewAs);
    navigate(option.route);
    setExpanded(false);
  };

  const handleExit = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <>
      {/* Backdrop when expanded */}
      {expanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setExpanded(false)}
        />
      )}

      {/* Banner */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1">
        {/* Options panel */}
        {expanded && (
          <div className="bg-gray-900 rounded-2xl p-2 shadow-2xl border border-white/10 flex items-center gap-1.5">
            {DEMO_VIEW_OPTIONS.map((option) => {
              const Icon = ICONS[option.role];
              const color = COLORS[option.role];
              const isActive = option.role === demoViewAs;
              return (
                <button
                  key={option.role}
                  onClick={() => handleSwitch(option)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                    isActive
                      ? "text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  }`}
                  style={isActive ? { background: color, fontWeight: 700 } : {}}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}

            <div className="w-px h-6 bg-white/10 mx-1" />

            <button
              onClick={handleExit}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        )}

        {/* Main pill */}
        <div className="flex items-center gap-1 bg-gray-900 rounded-full pl-3 pr-2 py-1.5 shadow-2xl border border-white/10">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-xs text-amber-300 mr-1" style={{ fontWeight: 700 }}>
            MODO DEMO
          </span>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs text-white transition-all"
            style={{ background: currentColor, fontWeight: 600 }}
          >
            <CurrentIcon className="w-3 h-3 shrink-0" />
            {current.label}
            {expanded ? (
              <ChevronDown className="w-3 h-3 ml-0.5" />
            ) : (
              <ChevronUp className="w-3 h-3 ml-0.5" />
            )}
          </button>

          <button
            onClick={() => setDismissed(true)}
            className="ml-1 w-5 h-5 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-300 hover:bg-white/10 transition-colors"
            title="Esconder barra"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    </>
  );
}
