import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tenantApi, type Branch } from '@/api/tenant.api';

const STORAGE_KEY = 'salon_selected_branch_id';

export type SalonBranchContextValue = {
  branchId: string;
  setBranchId: (id: string) => void;
  branches: Branch[];
  activeBranches: Branch[];
  selectedBranch: Branch | null;
  selectedBranchName: string;
  isAllBranches: boolean;
  isLoading: boolean;
};

const SalonBranchContext = createContext<SalonBranchContextValue | null>(null);

export function SalonBranchProvider({ children }: { children: ReactNode }) {
  const [branchId, setBranchIdState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'all';
    } catch {
      return 'all';
    }
  });

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const activeBranches = useMemo(
    () => branches.filter((b) => b.status === 'ACTIVE'),
    [branches],
  );

  const selectedBranch = useMemo(() => {
    if (branchId === 'all') return null;
    return branches.find((b) => b.id === branchId) ?? null;
  }, [branches, branchId]);

  const setBranchId = (id: string) => {
    setBranchIdState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  };

  // If a previously stored branchId is no longer in the branches list, reset to 'all'
  useEffect(() => {
    if (branchId !== 'all' && branches.length > 0 && !branches.some((b) => b.id === branchId)) {
      setBranchId('all');
    }
  }, [branches, branchId]);

  const value = useMemo(
    () => ({
      branchId,
      setBranchId,
      branches,
      activeBranches,
      selectedBranch,
      selectedBranchName: selectedBranch?.name ?? 'All Branches',
      isAllBranches: branchId === 'all',
      isLoading,
    }),
    [branchId, branches, activeBranches, selectedBranch, isLoading],
  );

  return <SalonBranchContext.Provider value={value}>{children}</SalonBranchContext.Provider>;
}

export function useSalonBranch() {
  const ctx = useContext(SalonBranchContext);
  if (!ctx) {
    throw new Error('useSalonBranch must be used within SalonBranchProvider');
  }
  return ctx;
}
