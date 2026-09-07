import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  branchesApi,
  type CreateBranchPayload,
  type UpdateBranchPayload,
} from '../api/branches.api';
import { branchKeys } from './query-keys';

export function useBranches() {
  return useQuery({
    queryKey: branchKeys.all,
    queryFn: branchesApi.list,
  });
}

export function useCreateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBranchPayload) => branchesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
  });
}

export function useUpdateBranch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateBranchPayload }) =>
      branchesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
  });
}

export function useUpdateBranchStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      branchesApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: branchKeys.all }),
  });
}
