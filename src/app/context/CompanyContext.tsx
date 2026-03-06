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

  // companyUnits comes from DataContext (already filtered for current company)
  const companyUnits = units;
  const selectedUnit = companyUnits.find((u) => u.id === selectedUnitId) ?? null;

  // Reset selected unit if it no longer exists (e.g. deleted)
  useEffect(() => {
    if (selectedUnitId && !companyUnits.find((u) => u.id === selectedUnitId)) {
      setSelectedUnitId(null);
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
