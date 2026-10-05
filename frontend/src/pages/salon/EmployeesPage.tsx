import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDown,
  Banknote,
  Briefcase,
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Crown,
  Eye,
  EyeOff,
  Info,
  Key,
  Loader2,
  Lock,
  Mail,
  MoreVertical,
  Package,
  Pencil,
  Percent,
  Phone,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { appAlert } from '@/lib/app-alerts';
import { tenantApi, type Employee } from '@/api/tenant.api';
import { EmployeeProfileAvatar } from '@/components/EmployeeProfileAvatar';
import { resolveUploadUrl } from '@/lib/upload-url';
import { useDebouncedSearch } from '@/hooks/useDebounce';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import { formatMoneyAmount } from '@/lib/money';
import { FormError, getErrorMessage, SimpleForm } from './salon-ops-ui';
import './employees-page.css';

type EmployeeForm = {
  name: string;
  phone: string;
  email: string;
  designation: string;
  branchId: string;
  roleCode: string;
  password: string;
  basicSalary: string;
  commissionRate: string;
  epfEnabled: boolean;
  etfEnabled: boolean;
  maxAdvancePercentage: string;
  photoUrl?: string;
};

type AdvanceForm = {
  amount: string;
  startDate: string;
  notes: string;
};

const emptyAdvanceForm = (): AdvanceForm => ({
  amount: '',
  startDate: new Date().toISOString().slice(0, 10),
  notes: '',
});

const emptyForm: EmployeeForm = {
  name: '',
  phone: '',
  email: '',
  designation: '',
  branchId: '',
  roleCode: '',
  password: '',
  basicSalary: '',
  commissionRate: '0',
  epfEnabled: true,
  etfEnabled: true,
  maxAdvancePercentage: '100',
  photoUrl: '',
};

function isOwner(emp: Employee) {
  return (
    emp.systemRoles?.includes('SALON_ADMIN') ||
    emp.designation?.toLowerCase() === 'owner' ||
    emp.code === 'EMP-0001'
  );
}

function toCreatePayload(form: EmployeeForm) {
  const payload: Record<string, string | number | boolean> = {
    name: form.name.trim(),
    designation: form.designation.trim(),
    branchId: form.branchId,
    basicSalary: Number(form.basicSalary) || 0,
    commissionRate: Number(form.commissionRate) || 0,
    epfEnabled: form.epfEnabled,
    etfEnabled: form.etfEnabled,
    maxAdvancePercentage: form.maxAdvancePercentage ? Number(form.maxAdvancePercentage) : 100,
  };
  const phone = form.phone.trim();
  const email = form.email.trim();
  if (form.photoUrl) payload.photoUrl = form.photoUrl;
  if (phone) payload.phone = phone;
  if (form.roleCode) {
    payload.roleCode = form.roleCode;
    payload.email = email;
    payload.password = form.password;
  } else if (email) payload.email = email;
  return payload;
}

function toEditPayload(form: EmployeeForm, hasLogin: boolean) {
  const payload: Record<string, string | number | boolean> = {
    name: form.name.trim(),
    designation: form.designation.trim(),
    branchId: form.branchId,
    basicSalary: Number(form.basicSalary) || 0,
    commissionRate: Number(form.commissionRate) || 0,
    epfEnabled: form.epfEnabled,
    etfEnabled: form.etfEnabled,
    maxAdvancePercentage: form.maxAdvancePercentage ? Number(form.maxAdvancePercentage) : 100,
  };
  const phone = form.phone.trim();
  const email = form.email.trim();
  if (form.photoUrl) payload.photoUrl = form.photoUrl;
  if (phone) payload.phone = phone;
  if (email) payload.email = email;
  if (form.roleCode) {
    payload.roleCode = form.roleCode;
    if (!hasLogin && form.password) payload.password = form.password;
  }
  return payload;
}

function formatSalary(value: number | undefined) {
  return formatMoneyAmount(value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-pink-100 text-pink-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function EmployeeAvatar({ employee }: { employee: Employee }) {
  return (
    <EmployeeProfileAvatar
      name={employee.name}
      photoUrl={employee.photoUrl}
      className="h-9 w-9 shadow-sm"
      fallbackClassName={getAvatarColor(employee.name)}
    />
  );
}

function RoleBadge({ code }: { code: string }) {
  if (!code || code === 'STAFF' || code === '__none__') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <User className="h-3.5 w-3.5 text-slate-500" />
        <span>Staff</span>
      </span>
    );
  }

  if (code === 'SALON_ADMIN') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Crown className="h-3.5 w-3.5 text-amber-600" />
        <span>Salon Admin</span>
      </span>
    );
  }

  if (code === 'CASHIER') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
        <CreditCard className="h-3.5 w-3.5 text-blue-600" />
        <span>Cashier</span>
      </span>
    );
  }

  if (code === 'RECEPTIONIST') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
        <UserCheck className="h-3.5 w-3.5 text-purple-600" />
        <span>Receptionist</span>
      </span>
    );
  }

  if (code === 'STOCK_KEEPER') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Package className="h-3.5 w-3.5 text-amber-600" />
        <span>Stock Keeper</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
      <Lock className="h-3.5 w-3.5 text-slate-600" />
      <span>
        {code
          .split('_')
          .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
          .join(' ')}
      </span>
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const isActive = status === 'ACTIVE';

  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <span>Active</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      <span>Inactive</span>
    </span>
  );
}

function EmployeeActionMenu({
  employee,
  payrollEnabled,
  onEdit,
  onAdvance,
}: {
  employee: Employee;
  payrollEnabled: boolean;
  onEdit: () => void;
  onAdvance: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const menuContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !menuContentRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    const closeOnScroll = () => setOpen(false);
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', closeOnScroll, true);
      window.addEventListener('resize', closeOnScroll);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', closeOnScroll, true);
      window.removeEventListener('resize', closeOnScroll);
    };
  }, [open]);

  const toggleMenu = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (open) {
      setOpen(false);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 176;
    const menuHeight = payrollEnabled && employee.status === 'ACTIVE' ? 126 : 92;
    const opensUp = window.innerHeight - rect.bottom < menuHeight + 8 && rect.top > menuHeight + 8;
    setMenuPosition({
      top: Math.max(8, Math.min(
        window.innerHeight - menuHeight - 8,
        opensUp ? rect.top - menuHeight - 4 : rect.bottom + 4,
      )),
      left: Math.max(8, Math.min(window.innerWidth - menuWidth - 8, rect.right - menuWidth)),
    });
    setOpen(true);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={toggleMenu}
        className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center shadow-xs"
        title="More actions"
        aria-label="More actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && createPortal(
        <div
          ref={menuContentRef}
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            zIndex: 1000,
          }}
          className="w-44 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl animate-in fade-in-0 zoom-in-95"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
            disabled={isOwner(employee)}
            className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium transition-colors text-left ${
              isOwner(employee)
                ? 'text-slate-300 cursor-not-allowed'
                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Pencil className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Edit</span>
          </button>

          <Link
            to={`/salon/sales-analytics?employeeId=${employee.id}&preset=this_month`}
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>Sales</span>
          </Link>

          {payrollEnabled && employee.status === 'ACTIVE' && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAdvance();
              }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors text-left"
            >
              <Banknote className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Advance</span>
            </button>
          )}
        </div>,
        document.body,
      )}
    </div>
  );
}

export default function EmployeesPage() {
  const qc = useQueryClient();

  const {
    branchId: ribbonBranchId,
    setBranchId: setRibbonBranchId,
    branches,
    isLoading: branchesLoading,
  } = useSalonBranch();

  const [branchFilter, setBranchFilterState] = useState(ribbonBranchId);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedSearch(search, 400, 2);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [createOpen, setCreateOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [advanceEmployee, setAdvanceEmployee] = useState<Employee | null>(null);

  const [form, setForm] = useState<EmployeeForm>(() => ({
    ...emptyForm,
    branchId: ribbonBranchId !== 'all' ? ribbonBranchId : '',
  }));
  const [editForm, setEditForm] = useState<EmployeeForm>(emptyForm);
  const [advanceForm, setAdvanceForm] = useState<AdvanceForm>(emptyAdvanceForm());
  const [formError, setFormError] = useState<string | null>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [failedPhotoPreview, setFailedPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBranchFilterState(ribbonBranchId);
    if (ribbonBranchId !== 'all') {
      setForm((prev) => ({ ...prev, branchId: ribbonBranchId }));
    }
  }, [ribbonBranchId]);

  const setBranchFilter = (newBranchId: string) => {
    setBranchFilterState(newBranchId);
    setRibbonBranchId(newBranchId);
    setPage(1);
  };

  const { data: tenantFeatures = [] } = useQuery({
    queryKey: ['tenant-features'],
    queryFn: tenantApi.features,
  });

  // Employee CRUD is licensed by the EMPLOYEES feature. Staff role permissions
  // only control login accounts and must not hide employee management on Basic.
  const canManageEmployees = tenantFeatures.includes('EMPLOYEES');
  const roleManagementEnabled =
    tenantFeatures.includes('STAFF_MANAGEMENT') ||
    tenantFeatures.includes('ROLE_MANAGEMENT');
  const payrollEnabled = tenantFeatures.includes('PAYROLL');

  const { data: assignableRoles = [] } = useQuery({
    queryKey: ['employee-assignable-roles'],
    queryFn: tenantApi.employees.assignableRoles,
    enabled: roleManagementEnabled,
  });

  const listParams = useMemo(() => {
    const params: Record<string, string> = {};
    if (branchFilter !== 'all') params.branchId = branchFilter;
    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (statusFilter !== 'all') params.status = statusFilter;
    return Object.keys(params).length ? params : undefined;
  }, [branchFilter, debouncedSearch, statusFilter]);

  const {
    data: allEmployees = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['employees', branchFilter, debouncedSearch, statusFilter],
    queryFn: () => tenantApi.employees.list(listParams),
    placeholderData: (previousData) => previousData,
  });

  const { data: payrollSettings } = useQuery({
    queryKey: ['payroll-settings'],
    queryFn: tenantApi.payroll.getSettings,
    enabled: payrollEnabled,
    staleTime: 60_000,
  });

  const systemDefaultAdvancePct = Number(payrollSettings?.maxSalaryAdvancePercentage ?? 50);

  const filteredEmployees = useMemo(() => {
    if (roleFilter === 'all') return allEmployees;
    if (roleFilter === 'STAFF') {
      return allEmployees.filter(
        (emp) => !emp.systemRoles || emp.systemRoles.length === 0,
      );
    }
    return allEmployees.filter((emp) => emp.systemRoles?.includes(roleFilter));
  }, [allEmployees, roleFilter]);

  const totalItems = filteredEmployees.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, page, pageSize]);

  const clearFilters = () => {
    setSearch('');
    setBranchFilterState('all');
    setRibbonBranchId('all');
    setRoleFilter('all');
    setStatusFilter('all');
    setPage(1);
  };

  const hasActiveFilters =
    search ||
    branchFilter !== 'all' ||
    roleFilter !== 'all' ||
    statusFilter !== 'all';

  const createMutation = useMutation({
    mutationFn: tenantApi.employees.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setForm(emptyForm);
      setPhotoPreview(null);
      setFormError(null);
      setCreateOpen(false);
      appAlert({
        icon: 'success',
        title: 'Employee Created',
        text: 'New team member has been added successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.employees.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setEditEmployee(null);
      setPhotoPreview(null);
      setFormError(null);
      appAlert({
        icon: 'success',
        title: 'Changes Saved',
        text: 'Employee details updated successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.employees.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      appAlert({
        icon: 'success',
        title: variables.status === 'ACTIVE' ? 'Employee Activated' : 'Employee Deactivated',
        text:
          variables.status === 'ACTIVE'
            ? 'The employee is now active and can be assigned to tasks and sales.'
            : 'The employee has been deactivated.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      appAlert({
        icon: 'error',
        title: 'Action Failed',
        text: getErrorMessage(err),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tenantApi.employees.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      appAlert({
        icon: 'success',
        title: 'Employee Deleted',
        text: 'Employee record has been deleted.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      appAlert({
        icon: 'error',
        title: 'Cannot Delete Employee',
        text: getErrorMessage(err),
      });
    },
  });

  const handleToggleStatus = (emp: Employee) => {
    if (isOwner(emp) && emp.status === 'ACTIVE') {
      appAlert({
        icon: 'warning',
        title: 'Cannot Deactivate Owner',
        text: 'The salon owner account cannot be deactivated.',
        confirmButtonColor: 'var(--brand-primary, #0d5c3d)',
      });
      return;
    }

    const nextStatus = emp.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    appAlert({
      title: nextStatus === 'INACTIVE' ? 'Deactivate Employee?' : 'Activate Employee?',
      text: `Are you sure you want to ${nextStatus === 'INACTIVE' ? 'deactivate' : 'activate'} ${emp.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: nextStatus === 'INACTIVE' ? '#dc2626' : 'var(--brand-primary, #0d5c3d)',
      cancelButtonColor: '#6b7280',
      confirmButtonText: nextStatus === 'INACTIVE' ? 'Yes, deactivate' : 'Yes, activate',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    }).then((res) => {
      if (res.isConfirmed) {
        statusMutation.mutate({ id: emp.id, status: nextStatus });
      }
    });
  };

  const handleDeleteEmployee = (emp: Employee) => {
    if (isOwner(emp)) {
      appAlert({
        icon: 'warning',
        title: 'Cannot Delete Owner',
        text: 'The salon owner account cannot be deleted.',
        confirmButtonColor: 'var(--brand-primary, #0d5c3d)',
      });
      return;
    }

    appAlert({
      title: 'Delete Employee?',
      html: `
        <div style="text-align: center;">
          <p style="font-size: 15px; color: #475569; margin: 0 0 8px;">
            Are you sure you want to delete <strong>${emp.name}</strong> (${emp.code})?
          </p>
          <p style="font-size: 12.5px; color: #64748b; margin: 0;">
            This action cannot be undone. Employees with recorded sales or appointments cannot be deleted.
          </p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
    }).then((res) => {
      if (res.isConfirmed) {
        deleteMutation.mutate(emp.id);
      }
    });
  };

  const advanceMutation = useMutation({
    mutationFn: tenantApi.payroll.createAdvance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payroll-advances'] });
      setAdvanceEmployee(null);
      setAdvanceForm(emptyAdvanceForm());
      setFormError(null);
      appAlert({
        icon: 'success',
        title: 'Advance Recorded',
        text: 'Salary advance has been recorded successfully.',
        timer: 1800,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const openEdit = (emp: Employee) => {
    if (isOwner(emp)) {
      appAlert({
        icon: 'warning',
        title: 'Cannot Edit Salon Admin',
        text: 'The Salon Admin profile details cannot be modified from the staff management page. Please use Settings to update account details.',
        confirmButtonColor: 'var(--brand-primary, #0d5c3d)',
      });
      return;
    }
    setFormError(null);
    setPhotoPreview(resolveUploadUrl(emp.photoUrl));
    setEditEmployee(emp);
    setEditForm({
      name: emp.name,
      phone: emp.phone || '',
      email: emp.email || '',
      designation: emp.designation || '',
      branchId: emp.branchId,
      roleCode: emp.systemRoles?.[0] ?? '',
      password: '',
      basicSalary: String(emp.basicSalary ?? ''),
      commissionRate: String(emp.commissionRate ?? 0),
      epfEnabled: emp.epfEnabled ?? true,
      etfEnabled: emp.etfEnabled ?? true,
      maxAdvancePercentage: String(emp.maxAdvancePercentage ?? 100),
      photoUrl: emp.photoUrl ?? '',
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      appAlert({
        icon: 'error',
        title: 'File Too Large',
        text: 'Please select an image smaller than 2MB.',
      });
      return;
    }

    setPhotoUploading(true);
    setFormError(null);
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const { photoUrl } = await tenantApi.employees.uploadPhoto(file, editEmployee?.id);
      if (editEmployee) {
        setEditForm((current) => ({ ...current, photoUrl }));
      } else {
        setForm((current) => ({ ...current, photoUrl }));
      }
      setPhotoPreview(resolveUploadUrl(photoUrl));
    } catch (uploadError) {
      setPhotoPreview(editEmployee ? resolveUploadUrl(editEmployee.photoUrl) : null);
      setFormError(getErrorMessage(uploadError));
    } finally {
      setPhotoUploading(false);
    }
  };

  const defaultBranchId = branches[0]?.id ?? '';
  const isInitialLoading =
    branchesLoading || (isLoading && !allEmployees.length && !debouncedSearch);

  if (isInitialLoading) {
    return (
      <div className="p-6 space-y-4 max-w-7xl mx-auto">
        <div className="h-10 bg-slate-200 rounded-lg w-1/4 animate-pulse" />
        <div className="h-12 bg-slate-200 rounded-xl animate-pulse" />
        <div className="h-96 bg-slate-200 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError && !allEmployees.length) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-rose-700">
          <h3 className="font-bold text-lg">Could not load employees</h3>
          <p className="mt-1 text-sm">{getErrorMessage(error)}</p>
          <button
            type="button"
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
            onClick={() => void refetch()}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Top Header matching Screenshot 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Employees
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {payrollEnabled
              ? 'Manage staff profiles, basic salary, and EPF/ETF settings'
              : 'Manage staff profiles and assign system roles'}
          </p>
        </div>
        {canManageEmployees && (
          <button
            type="button"
            onClick={() => {
              setFormError(null);
              setPhotoPreview(null);
              setForm({ ...emptyForm, branchId: defaultBranchId });
              setCreateOpen(true);
            }}
            disabled={!branches.length}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] text-[var(--brand-foreground,#ffffff)] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* Filter Toolbar matching Screenshot 1 */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] sm:min-w-[280px]">
            {isFetching && debouncedSearch ? (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[var(--brand-primary,#0d5c3d)]" />
            ) : (
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            )}
            <input
              type="text"
              placeholder="Search by name, phone, designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
              className="w-full h-10 pl-9 pr-8 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] focus:border-[var(--brand-primary,#0d5c3d)] transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Branch Filter */}
          <div className="w-full sm:w-44">
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="All branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All branches</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Role Filter */}
          <div className="w-full sm:w-40">
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="SALON_ADMIN">Salon Admin</SelectItem>
                <SelectItem value="CASHIER">Cashier</SelectItem>
                <SelectItem value="RECEPTIONIST">Receptionist</SelectItem>
                <SelectItem value="STOCK_KEEPER">Stock Keeper</SelectItem>
                <SelectItem value="STAFF">Staff (No login)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-36">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as 'all' | 'ACTIVE' | 'INACTIVE');
                setPage(1);
              }}
            >
              <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                <SelectValue placeholder="All status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="ACTIVE">Active only</SelectItem>
                <SelectItem value="INACTIVE">Inactive only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shrink-0 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Clear Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Cards matching Screenshot 1 */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {totalItems === 0 ? (
          <div className="text-center py-16 px-4">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-800">No employees found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'Try adjusting your search or filters to find what you are looking for.'
                : 'Get started by creating your first employee profile.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-4 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop & Tablet Table (Screenshot 1 Exact Layout) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span>EMPLOYEE</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3">CODE</th>
                    <th className="py-3 px-3">DESIGNATION</th>
                    <th className="py-3 px-3">ROLE</th>
                    <th className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span>BRANCH</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="py-3 px-3">BASIC SALARY (LKR)</th>
                    {payrollEnabled && <th className="py-3 px-3">EPF / ETF</th>}
                    <th className="py-3 px-3">CONTACT</th>
                    <th className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <span>STATUS</span>
                        <ArrowUpDown className="h-3 w-3 text-slate-400" />
                      </div>
                    </th>
                    {canManageEmployees && <th className="py-3 px-4 text-right">ACTIONS</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedEmployees.map((emp) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Employee Avatar + Name + Phone */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar employee={emp} />
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">
                              {emp.name}
                            </div>
                            {emp.phone && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {emp.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-3 font-mono text-xs font-semibold text-slate-600">
                        {emp.code}
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-3 font-medium text-slate-700">
                        {emp.designation || '—'}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {emp.systemRoles && emp.systemRoles.length > 0 ? (
                            emp.systemRoles.map((code) => <RoleBadge key={code} code={code} />)
                          ) : (
                            <RoleBadge code="STAFF" />
                          )}
                        </div>
                      </td>

                      {/* Branch */}
                      <td className="py-3.5 px-3 text-slate-700">{emp.branchName}</td>

                      {/* Basic Salary */}
                      <td className="py-3.5 px-3 font-medium text-slate-900">
                        {formatSalary(emp.basicSalary)}
                      </td>

                      {/* EPF / ETF */}
                      {payrollEnabled && (
                        <td className="py-3.5 px-3 text-[11px] text-slate-600 whitespace-nowrap">
                          {emp.epfEnabled === false ? 'EPF off' : 'EPF on'} /{' '}
                          {emp.etfEnabled === false ? 'ETF off' : 'ETF on'}
                        </td>
                      )}

                      {/* Contact */}
                      <td className="py-3.5 px-3 text-slate-600">
                        {emp.email ? (
                          <span className="truncate max-w-[140px] block" title={emp.email}>
                            {emp.email}
                          </span>
                        ) : emp.phone ? (
                          <span>{emp.phone}</span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3">
                        <StatusPill status={emp.status} />
                      </td>

                      {/* Actions */}
                      {canManageEmployees && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle Status Button */}
                            <button
                              type="button"
                              disabled={statusMutation.isPending || isOwner(emp)}
                              onClick={() => handleToggleStatus(emp)}
                              className={`h-8 w-8 rounded-lg border transition-colors flex items-center justify-center ${
                                isOwner(emp)
                                  ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                  : 'border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-600 hover:border-amber-300 cursor-pointer'
                              }`}
                              title={
                                isOwner(emp)
                                  ? 'Salon owner cannot be deactivated'
                                  : emp.status === 'ACTIVE'
                                    ? 'Deactivate employee'
                                    : 'Activate employee'
                              }
                            >
                              {emp.status === 'ACTIVE' ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              disabled={deleteMutation.isPending || isOwner(emp)}
                              onClick={() => handleDeleteEmployee(emp)}
                              className={`h-8 w-8 rounded-lg border transition-colors flex items-center justify-center ${
                                isOwner(emp)
                                  ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                                  : 'border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-600 hover:border-rose-300 cursor-pointer'
                              }`}
                              title={
                                isOwner(emp)
                                  ? 'Salon owner cannot be deleted'
                                  : 'Delete employee'
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                            {/* More Options Dropdown */}
                            <EmployeeActionMenu
                              employee={emp}
                              payrollEnabled={payrollEnabled}
                              onEdit={() => openEdit(emp)}
                              onAdvance={() => {
                                setFormError(null);
                                setAdvanceForm(emptyAdvanceForm());
                                setAdvanceEmployee(emp);
                              }}
                            />
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Touch-friendly & Responsive for Phone Screens) */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedEmployees.map((emp) => (
                <div key={emp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <EmployeeAvatar employee={emp} />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm truncate">
                          {emp.name}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span className="font-mono font-semibold">{emp.code}</span>
                          <span>•</span>
                          <span className="truncate">{emp.designation || 'Staff'}</span>
                        </div>
                      </div>
                    </div>
                    <StatusPill status={emp.status} />
                  </div>

                  {/* Badges & Branch */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {emp.systemRoles && emp.systemRoles.length > 0 ? (
                      emp.systemRoles.map((code) => <RoleBadge key={code} code={code} />)
                    ) : (
                      <RoleBadge code="STAFF" />
                    )}
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium">{emp.branchName}</span>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Salary</span>
                      <span className="font-semibold text-slate-900">{formatSalary(emp.basicSalary)}</span>
                    </div>
                    {payrollEnabled && (
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">EPF / ETF</span>
                        <span className="text-slate-700">
                          {emp.epfEnabled === false ? 'EPF off' : 'EPF on'} / {emp.etfEnabled === false ? 'ETF off' : 'ETF on'}
                        </span>
                      </div>
                    )}
                    {emp.phone && (
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact</span>
                        <span className="text-slate-700">{emp.phone} {emp.email ? `(${emp.email})` : ''}</span>
                      </div>
                    )}
                  </div>

                  {/* Mobile Actions Toolbar */}
                  {canManageEmployees && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        disabled={statusMutation.isPending || isOwner(emp)}
                        onClick={() => handleToggleStatus(emp)}
                        className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          isOwner(emp)
                            ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        {emp.status === 'ACTIVE' ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        <span>{emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={deleteMutation.isPending || isOwner(emp)}
                        onClick={() => handleDeleteEmployee(emp)}
                        className={`h-8 px-3 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          isOwner(emp)
                            ? 'border-slate-200 bg-slate-50 text-slate-300 cursor-not-allowed'
                            : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Delete</span>
                      </button>

                      <EmployeeActionMenu
                        employee={emp}
                        payrollEnabled={payrollEnabled}
                        onEdit={() => openEdit(emp)}
                        onAdvance={() => {
                          setFormError(null);
                          setAdvanceForm(emptyAdvanceForm());
                          setAdvanceEmployee(emp);
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination Footer matching Screenshot 1 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-100 bg-white">
              <div className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                  {totalItems === 0 ? 0 : (page - 1) * pageSize + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-700">
                  {Math.min(page * pageSize, totalItems)}
                </span>{' '}
                of <span className="font-semibold text-slate-700">{totalItems}</span> employees
              </div>

              <div className="flex items-center gap-3">
                {/* Page Size Select */}
                <div className="w-32">
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs rounded-lg border-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="20">20 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - page) <= 1,
                    )
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const showEllipsis = prev && p - prev > 1;

                      return (
                        <div key={p} className="flex items-center gap-1">
                          {showEllipsis && (
                            <span className="px-1 text-slate-400 text-xs">...</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setPage(p)}
                            className={`h-8 w-8 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center ${
                              page === p
                                ? 'border border-[var(--brand-primary,#0d5c3d)] text-[var(--brand-primary,#0d5c3d)] bg-[var(--brand-soft,#f0fdf4)]'
                                : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        </div>
                      );
                    })}

                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-600 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create / Edit Employee Modal matching Screenshot 2 */}
      <Dialog
        open={createOpen || editEmployee !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditEmployee(null);
            setFormError(null);
            setPhotoPreview(null);
          }
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl p-0 rounded-2xl border-0 shadow-2xl">
          {/* Modal Header matching Screenshot 2 */}
          <div className="p-6 border-b border-slate-100 bg-white">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {editEmployee ? 'Edit Employee' : 'Create Employee'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {editEmployee
                ? 'Update staff member profile and settings'
                : 'Add a new staff member to your salon'}
            </p>
          </div>

          <SimpleForm
            onSubmit={(e) => {
              e.preventDefault();
              setFormError(null);
              if (editEmployee) {
                updateMutation.mutate({
                  id: editEmployee.id,
                  data: toEditPayload(editForm, !!editEmployee.userId),
                });
              } else {
                createMutation.mutate(toCreatePayload(form));
              }
            }}
            className="p-6 space-y-5 bg-slate-50/40"
          >
            <FormError message={formError} />

            {/* Profile Photo Section matching Screenshot 2 */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center border-2 border-slate-200 overflow-hidden">
                    {photoPreview && failedPhotoPreview !== photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                        onError={() => setFailedPhotoPreview(photoPreview)}
                      />
                    ) : (
                      <User className="h-8 w-8 text-slate-400" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] text-[var(--brand-foreground,#ffffff)] flex items-center justify-center shadow-sm transition-colors cursor-pointer disabled:opacity-60"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={photoUploading}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Profile Photo</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload a profile photo for the employee
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)] text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {photoUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>{photoUploading ? 'Uploading...' : 'Choose Image'}</span>
                  </button>
                  <p className="text-[10px] text-slate-400 mt-1">
                    JPG, PNG or WEBP (Max 2MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Card Section 1: Basic Information */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900">
                <div className="h-6 w-6 rounded-full bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)] flex items-center justify-center">
                  <User className="h-3.5 w-3.5" />
                </div>
                <span>Basic Information</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="emp-fullname"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Full name <span className="text-rose-500">*</span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="emp-fullname"
                      value={editEmployee ? editForm.name : form.name}
                      onChange={(e) =>
                        editEmployee
                          ? setEditForm({ ...editForm, name: e.target.value })
                          : setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Employee name"
                      className="pl-9 h-10 rounded-xl text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-desig"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Designation <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="emp-desig"
                        value={editEmployee ? editForm.designation : form.designation}
                        onChange={(e) =>
                          editEmployee
                            ? setEditForm({ ...editForm, designation: e.target.value })
                            : setForm({ ...form, designation: e.target.value })
                        }
                        placeholder="e.g. Stylist"
                        className="pl-9 h-10 rounded-xl text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Branch <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={editEmployee ? editForm.branchId : form.branchId}
                      onValueChange={(v) =>
                        editEmployee
                          ? setEditForm({ ...editForm, branchId: v })
                          : setForm({ ...form, branchId: v })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-xl text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                          <SelectValue placeholder="Select branch" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="emp-tel" className="text-xs font-semibold text-slate-700">
                      Phone
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="emp-tel"
                        value={editEmployee ? editForm.phone : form.phone}
                        onChange={(e) =>
                          editEmployee
                            ? setEditForm({ ...editForm, phone: e.target.value })
                            : setForm({ ...form, phone: e.target.value })
                        }
                        placeholder="Optional"
                        className="pl-9 h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="emp-mail" className="text-xs font-semibold text-slate-700">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        id="emp-mail"
                        type="email"
                        value={editEmployee ? editForm.email : form.email}
                        onChange={(e) =>
                          editEmployee
                            ? setEditForm({ ...editForm, email: e.target.value })
                            : setForm({ ...form, email: e.target.value })
                        }
                        placeholder="Optional"
                        className="pl-9 h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Section 2: Payroll Settings */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900">
                <div className="h-6 w-6 rounded-full bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)] flex items-center justify-center">
                  <Wallet className="h-3.5 w-3.5" />
                </div>
                <span>Payroll Settings</span>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-bsal"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Basic Salary (LKR) <span className="text-rose-500">*</span>
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                        Rs.
                      </span>
                      <Input
                        id="emp-bsal"
                        type="number"
                        min="0"
                        step="0.01"
                        value={editEmployee ? editForm.basicSalary : form.basicSalary}
                        onChange={(e) =>
                          editEmployee
                            ? setEditForm({ ...editForm, basicSalary: e.target.value })
                            : setForm({ ...form, basicSalary: e.target.value })
                        }
                        placeholder="0.00"
                        className="pl-10 h-10 rounded-xl text-xs"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label
                      htmlFor="emp-comm"
                      className="text-xs font-semibold text-slate-700"
                    >
                      Commission Rate (%)
                    </Label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        id="emp-comm"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={
                          editEmployee ? editForm.commissionRate : form.commissionRate
                        }
                        onChange={(e) =>
                          editEmployee
                            ? setEditForm({ ...editForm, commissionRate: e.target.value })
                            : setForm({ ...form, commissionRate: e.target.value })
                        }
                        placeholder="0.00"
                        className="pl-9 h-10 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                </div>

                {payrollEnabled && (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          EPF Enabled
                        </Label>
                        <Select
                          value={
                            (editEmployee ? editForm.epfEnabled : form.epfEnabled)
                              ? 'yes'
                              : 'no'
                          }
                          onValueChange={(v) =>
                            editEmployee
                              ? setEditForm({ ...editForm, epfEnabled: v === 'yes' })
                              : setForm({ ...form, epfEnabled: v === 'yes' })
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-slate-400" />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700">
                          ETF Enabled
                        </Label>
                        <Select
                          value={
                            (editEmployee ? editForm.etfEnabled : form.etfEnabled)
                              ? 'yes'
                              : 'no'
                          }
                          onValueChange={(v) =>
                            editEmployee
                              ? setEditForm({ ...editForm, etfEnabled: v === 'yes' })
                              : setForm({ ...form, etfEnabled: v === 'yes' })
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl text-xs">
                            <div className="flex items-center gap-2">
                              <ShieldCheck className="h-4 w-4 text-slate-400" />
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="emp-maxadv" className="text-xs font-semibold text-slate-700">
                        Max Advance Limit (% of Basic Salary)
                      </Label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <Input
                          id="emp-maxadv"
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={
                            editEmployee
                              ? editForm.maxAdvancePercentage
                              : form.maxAdvancePercentage
                          }
                          onChange={(e) =>
                            editEmployee
                              ? setEditForm({ ...editForm, maxAdvancePercentage: e.target.value })
                              : setForm({ ...form, maxAdvancePercentage: e.target.value })
                          }
                          placeholder="100"
                          className="pl-9 h-10 rounded-xl text-xs"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Maximum percentage of basic salary that can be requested as salary advance (e.g. 50% or 100%).
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Card Section 3: System Role (Staff Management) */}
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-xs font-bold text-slate-900">
                <div className="h-6 w-6 rounded-full bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)] flex items-center justify-center">
                  <Key className="h-3.5 w-3.5" />
                </div>
                <span>System Role (Staff Management)</span>
              </div>

              {roleManagementEnabled ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      System role <span className="text-rose-500">*</span>
                    </Label>
                    <Select
                      value={
                        (editEmployee ? editForm.roleCode : form.roleCode) || '__none__'
                      }
                      onValueChange={(v) => {
                        const val = v === '__none__' ? '' : v;
                        if (editEmployee) {
                          setEditForm({
                            ...editForm,
                            roleCode: val,
                            password: val ? editForm.password : '',
                          });
                        } else {
                          setForm({
                            ...form,
                            roleCode: val,
                            password: val ? form.password : '',
                          });
                        }
                      }}
                    >
                      <SelectTrigger className="h-10 rounded-xl text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <Users className="h-4 w-4 text-slate-400 shrink-0" />
                          <SelectValue placeholder="Staff only (no login)" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Staff only (no login)</SelectItem>
                        {assignableRoles.map((role) => (
                          <SelectItem key={role.id} value={role.code}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Informational callout box matching Screenshot 2 */}
                  {!(editEmployee ? editForm.roleCode : form.roleCode) ? (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl border border-[var(--brand-border,#bbf7d0)] bg-[var(--brand-soft,#f0fdf4)] text-xs text-[var(--brand-primary,#0d5c3d)]">
                      <Info className="h-4 w-4 text-[var(--brand-primary,#0d5c3d)] shrink-0" />
                      <span>Staff only role will not have system login access.</span>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 pt-1">
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="emp-login-email"
                          className="text-xs font-semibold text-slate-700"
                        >
                          Login email <span className="text-rose-500">*</span>
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input
                            id="emp-login-email"
                            type="email"
                            value={editEmployee ? editForm.email : form.email}
                            onChange={(e) =>
                              editEmployee
                                ? setEditForm({ ...editForm, email: e.target.value })
                                : setForm({ ...form, email: e.target.value })
                            }
                            placeholder="name@example.com"
                            className="pl-9 h-10 rounded-xl text-xs"
                            required
                          />
                        </div>
                      </div>

                      {(!editEmployee || !editEmployee.userId) && (
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="emp-login-pwd"
                            className="text-xs font-semibold text-slate-700"
                          >
                            Password <span className="text-rose-500">*</span>
                          </Label>
                          <PasswordInput
                            id="emp-login-pwd"
                            value={editEmployee ? editForm.password : form.password}
                            onChange={(e) =>
                              editEmployee
                                ? setEditForm({ ...editForm, password: e.target.value })
                                : setForm({ ...form, password: e.target.value })
                            }
                            placeholder="Minimum 8 characters"
                            minLength={8}
                            className="h-10 rounded-xl text-xs"
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <span>Staff Management Feature</span>
                  </div>
                  <p className="text-amber-700">
                    Assigning system roles requires the Staff Management plan feature.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer matching Screenshot 2 */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setEditEmployee(null);
                  setPhotoPreview(null);
                  setFormError(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending || photoUploading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] disabled:opacity-50 text-[var(--brand-foreground,#ffffff)] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="h-4 w-4" />
                <span>
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editEmployee
                      ? 'Save Changes'
                      : 'Create Employee'}
                </span>
              </button>
            </div>
          </SimpleForm>
        </DialogContent>
      </Dialog>

      {/* Advance Payment Modal */}
      <Dialog
        open={advanceEmployee !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAdvanceEmployee(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-[var(--brand-primary,#0d5c3d)]" />
              <span>Record Salary Advance</span>
            </DialogTitle>
          </DialogHeader>

          <SimpleForm
            onSubmit={(e) => {
              e.preventDefault();
              if (!advanceEmployee) return;
              setFormError(null);
              const amount = Number(advanceForm.amount);
              const basicSalary = Number(advanceEmployee.basicSalary || 0);
              const maxPct = systemDefaultAdvancePct;
              const maxAllowed = Math.round((basicSalary * maxPct) / 100 * 100) / 100;

              if (basicSalary <= 0) {
                setFormError('Employee has no basic salary set. Cannot issue advance.');
                return;
              }
              if (amount > basicSalary) {
                setFormError(`Advance amount cannot exceed basic salary of LKR ${formatSalary(basicSalary)}.`);
                return;
              }
              if (amount > maxAllowed) {
                setFormError(`Advance amount cannot exceed maximum allowed limit of LKR ${formatSalary(maxAllowed)} (${maxPct}% of basic salary).`);
                return;
              }

              advanceMutation.mutate({
                employeeId: advanceEmployee.id,
                amount,
                notes: advanceForm.notes || undefined,
              });
            }}
            className="space-y-4 pt-2"
          >
            <FormError message={formError} />

            {advanceEmployee && (() => {
              const basicSalary = Number(advanceEmployee.basicSalary || 0);
              const maxPct = systemDefaultAdvancePct;
              const maxAllowed = Math.round((basicSalary * maxPct) / 100 * 100) / 100;

              return (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="font-semibold text-slate-900">
                    {advanceEmployee.name} ({advanceEmployee.code})
                  </p>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-slate-600">
                    <span>Basic Salary: <strong className="text-slate-900">LKR {formatSalary(basicSalary)}</strong></span>
                    <span>Max Advance ({maxPct}%): <strong className="text-emerald-700">LKR {formatSalary(maxAllowed)}</strong></span>
                  </div>
                </div>
              );
            })()}

            <div className="space-y-1.5">
              <Label htmlFor="adv-amount" className="text-xs font-semibold">
                Advance Amount (LKR) *
              </Label>
              <Input
                id="adv-amount"
                type="number"
                min="1"
                step="0.01"
                value={advanceForm.amount}
                onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                placeholder="e.g. 5000"
                className="h-10 rounded-xl text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adv-notes" className="text-xs font-semibold">
                Reason / Note
              </Label>
              <Input
                id="adv-notes"
                value={advanceForm.notes}
                onChange={(e) => setAdvanceForm({ ...advanceForm, notes: e.target.value })}
                placeholder="Optional explanation"
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAdvanceEmployee(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={advanceMutation.isPending}
                className="px-4 py-2 rounded-xl bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] text-[var(--brand-foreground,#ffffff)] text-xs font-semibold"
              >
                {advanceMutation.isPending ? 'Saving...' : 'Record Advance'}
              </button>
            </div>
          </SimpleForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}
