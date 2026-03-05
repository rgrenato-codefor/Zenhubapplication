import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { unitStore, type Unit } from "../store/unitStore";

export type { Unit as CompanyUnit };

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
  companyId,
}: {
  children: ReactNode;
  companyId: string;
}) {
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsub = unitStore.subscribe(() => forceRender((n) => n + 1));
    return unsub;
  }, []);

  const companyUnits = unitStore.getUnits(companyId);
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
