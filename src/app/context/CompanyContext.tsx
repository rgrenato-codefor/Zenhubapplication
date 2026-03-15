import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useData, type Unit } from "./DataContext";

export type CompanyUnit = Unit;

interface CompanyContextType {
  selectedUnitId: string | null;       // null = todas as unidades
  setSelectedUnitId: (id: string | null) => void;
  companyUnits: Unit[];
  selectedUnit: Unit | null;
}

const CompanyContext = createContext<CompanyContextType>({
  selectedUnitId: null,
  setSelectedUnitId: () => {},
  companyUnits: [],
  selectedUnit: null,
});

export function CompanyProvider({
  children,
  companyId: _companyId,
}: {
  children: ReactNode;
  companyId: string;
}) {
  const { units } = useData();
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // companyUnits: only ACTIVE units (inactive units are excluded from
  // navigation and filtering but remain accessible via DataContext for admin)
  const companyUnits = units.filter((u) => u.status === "active");
  const selectedUnit = companyUnits.find((u) => u.id === selectedUnitId) ?? null;

  // Reset selected unit if it no longer exists or became inactive
  useEffect(() => {
    if (selectedUnitId && !companyUnits.find((u) => u.id === selectedUnitId)) {
      setSelectedUnitId(null);
    }
  }, [companyUnits, selectedUnitId]);

  // Auto-select the only active unit when there is exactly one
  useEffect(() => {
    if (!selectedUnitId && companyUnits.length === 1) {
      setSelectedUnitId(companyUnits[0].id);
    }
  }, [companyUnits, selectedUnitId]);

  return (
    <CompanyContext.Provider
      value={{ selectedUnitId, setSelectedUnitId, companyUnits, selectedUnit }}
    >
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompanyUnit() {
  return useContext(CompanyContext);
}