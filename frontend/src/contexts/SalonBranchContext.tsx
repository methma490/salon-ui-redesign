import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type SalonBranchContextValue = {
  branchId: string;
  setBranchId: (id: string) => void;
};

const SalonBranchContext = createContext<SalonBranchContextValue | null>(null);

export function SalonBranchProvider({ children }: { children: ReactNode }) {
  const [branchId, setBranchId] = useState('all');

  const value = useMemo(() => ({ branchId, setBranchId }), [branchId]);

  return <SalonBranchContext.Provider value={value}>{children}</SalonBranchContext.Provider>;
}

export function useSalonBranch() {
  const ctx = useContext(SalonBranchContext);
  if (!ctx) {
    throw new Error('useSalonBranch must be used within SalonBranchProvider');
  }
  return ctx;
}
