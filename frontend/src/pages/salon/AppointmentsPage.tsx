import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Crown,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Printer,
  Plus,
  User,
  UserRound,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { appAlert } from '@/lib/app-alerts';
import { EmployeeProfileAvatar } from '@/components/EmployeeProfileAvatar';
import {
  tenantApi,
  type Appointment,
  type Customer,
  type Service,
} from '@/api/tenant.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import { useTenantTheme } from '@/contexts/TenantThemeContext';
import { formatMoneyAmount } from '@/lib/money';
import { printReceipt } from '@/lib/print-receipt';
import { resolveUploadUrl } from '@/lib/upload-url';
import { FormError, getErrorMessage, OpsError, OpsLoading, OpsPagination } from './salon-ops-ui';
import './appointments-page.css';
import './employees-page.css';

type Tab = 'calendar' | 'list';

type AppointmentForm = {
  customerId: string;
  branchId: string;
  employeeId?: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  serviceIds: string[];
  notes: string;
  status: string;
};

const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'] as const;
const UNASSIGNED_EMPLOYEE_ID = '__unassigned__';

const emptyForm: AppointmentForm = {
  customerId: '',
  branchId: '',
  employeeId: '',
  appointmentDate: '',
  startTime: '09:00',
  endTime: '09:45',
  serviceIds: [],
  notes: '',
  status: 'CONFIRMED',
};

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

type QuickCustomerForm = {
  name: string;
  phone: string;
  email: string;
  birthDate: string;
  birthMonth: string;
  birthYear: string;
  notes: string;
};

const emptyQuickCustomer: QuickCustomerForm = {
  name: '',
  phone: '',
  email: '',
  birthDate: '',
  birthMonth: '',
  birthYear: '',
  notes: '',
};

function todayIso(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysIso(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(year, month - 1, day);
  next.setDate(next.getDate() + days);
  const nextMonth = String(next.getMonth() + 1).padStart(2, '0');
  const nextDay = String(next.getDate()).padStart(2, '0');
  return `${next.getFullYear()}-${nextMonth}-${nextDay}`;
}

function formatDateDisplay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatFullDateHeader(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function snapTimelineMinutes(ratio: number, totalMinutes: number, step: number): number {
  const raw = Math.max(0, Math.min(0.999, ratio)) * totalMinutes;
  return Math.floor(raw / step) * step;
}

function minutesFromStartToLabel(startHour: number, minutesFromStart: number): string {
  const total = startHour * 60 + minutesFromStart;
  const d = new Date();
  d.setHours(Math.floor(total / 60), total % 60, 0, 0);
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function unwrapCreatedCustomer(payload: unknown): Customer | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.id === 'string' && typeof record.name === 'string') {
    return payload as Customer;
  }
  const nested = record.data;
  if (nested && typeof nested === 'object' && typeof (nested as Customer).id === 'string') {
    return nested as Customer;
  }
  return null;
}

function appointmentStatusClass(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'bg-blue-50 text-blue-700 border border-blue-200';
    case 'COMPLETED':
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
}

function computeEndTime(startTime: string, services: Service[], serviceIds: string[]): string {
  const totalMinutes = serviceIds.reduce((sum, id) => {
    const service = services.find((item) => item.id === id);
    return sum + (service?.durationMinutes ?? 30);
  }, 0);

  const [hours, minutes] = startTime.split(':').map(Number);
  const start = new Date();
  start.setHours(hours || 9, minutes || 0, 0, 0);
  start.setMinutes(start.getMinutes() + Math.max(totalMinutes, 30));

  const hh = String(start.getHours()).padStart(2, '0');
  const mm = String(start.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const { branchId: ribbonBranchId, activeBranches } = useSalonBranch();
  const { data: settings } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: tenantApi.settings.get,
  });

  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [listPage, setListPage] = useState(1);
  const [listLimit, setListLimit] = useState(10);
  const [listStatusFilter, setListStatusFilter] = useState('all');
  const [listEmployeeFilter, setListEmployeeFilter] = useState('all');
  const [interval, setInterval] = useState<'15' | '30' | '60'>('15');
  const [hoverSlot, setHoverSlot] = useState<{
    empId: string;
    percent: number;
    widthPct: number;
    label: string;
  } | null>(null);
  const [branchFilter, setBranchFilter] = useState<string>(() =>
    ribbonBranchId !== 'all' ? ribbonBranchId : activeBranches[0]?.id || '',
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [invoiceAppointment, setInvoiceAppointment] = useState<Appointment | null>(null);
  const [form, setForm] = useState<AppointmentForm>(() => ({
    ...emptyForm,
    branchId: branchFilter || activeBranches[0]?.id || '',
    appointmentDate: selectedDate,
  }));
  const [editForm, setEditForm] = useState<AppointmentForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Customer Creation Modal inside Appointment Popup
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState<QuickCustomerForm>(emptyQuickCustomer);
  const [quickCustomerError, setQuickCustomerError] = useState<string | null>(null);
  const [createdCustomer, setCreatedCustomer] = useState<Customer | null>(null);
  const quickCustomerOpenRef = useRef(false);
  quickCustomerOpenRef.current = quickCustomerOpen;

  // Synchronize branch selection
  useEffect(() => {
    if (ribbonBranchId !== 'all' && activeBranches.some((branch) => branch.id === ribbonBranchId)) {
      setBranchFilter(ribbonBranchId);
    } else {
      setBranchFilter(activeBranches[0]?.id || '');
    }
  }, [ribbonBranchId, activeBranches]);

  const activeBranchId = branchFilter || activeBranches[0]?.id || '';
  const activeBranchObj = activeBranches.find((b) => b.id === activeBranchId);

  useEffect(() => {
    setListPage(1);
  }, [selectedDate, activeBranchId, listStatusFilter, listEmployeeFilter]);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'appointment-options'],
    queryFn: () => tenantApi.customers.list({ status: 'ACTIVE' }),
  });

  const { data: editingCustomer } = useQuery({
    queryKey: ['customer', editAppointment?.customerId],
    queryFn: () => tenantApi.customers.get(editAppointment!.customerId),
    enabled: Boolean(editAppointment?.customerId)
      && !customers.some((customer) => customer.id === editAppointment?.customerId),
  });

  const customerOptions = useMemo(() => {
    const activeCustomers = customers.filter((customer) => customer.status === 'ACTIVE');
    const options = [...activeCustomers];
    if (createdCustomer?.status === 'ACTIVE' && !options.some((customer) => customer.id === createdCustomer.id)) {
      options.unshift(createdCustomer);
    }
    if (editingCustomer && !options.some((customer) => customer.id === editingCustomer.id)) {
      options.unshift(editingCustomer);
    }
    return options;
  }, [customers, createdCustomer, editingCustomer]);

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => tenantApi.services.list(),
  });

  const activeServices = useMemo(
    () => services.filter((s) => s.status === 'ACTIVE'),
    [services],
  );

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => tenantApi.employees.list(),
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'ACTIVE' && e.branchId === activeBranchId),
    [employees, activeBranchId],
  );

  const listFilterEmployees = useMemo(
    () => employees.filter((employee) => employee.branchId === activeBranchId),
    [employees, activeBranchId],
  );

  const formEmployees = useMemo(() => {
    const branchId = editAppointment ? editForm.branchId : form.branchId;
    return employees.filter((employee) => employee.status === 'ACTIVE' && employee.branchId === branchId);
  }, [employees, editAppointment, editForm.branchId, form.branchId]);

  const listParams = useMemo(() => {
    const params: Record<string, string> = {
      startDate: selectedDate,
      endDate: selectedDate,
    };
    if (activeBranchId) params.branchId = activeBranchId;
    return params;
  }, [selectedDate, activeBranchId]);

  const listViewParams = useMemo(() => ({
    ...listParams,
    ...(listStatusFilter !== 'all' ? { status: listStatusFilter } : {}),
    ...(listEmployeeFilter !== 'all' ? { employeeId: listEmployeeFilter } : {}),
  }), [listParams, listStatusFilter, listEmployeeFilter]);

  const {
    data: appointments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['appointments', listParams],
    queryFn: () => tenantApi.appointments.list(listParams),
    enabled: Boolean(activeBranchId),
  });

  const { data: paginatedList, isLoading: isListLoading } = useQuery({
    queryKey: ['appointments', 'list-view', listViewParams, listPage, listLimit],
    queryFn: () =>
      tenantApi.appointments.listPaginated({
      ...listViewParams,
        page: String(listPage),
        limit: String(listLimit),
      }),
    enabled: activeTab === 'list' && Boolean(activeBranchId),
  });
  const listAppointments = paginatedList?.data ?? [];
  const listMeta = paginatedList?.meta;

  // Create Quick Customer Mutation
  const quickCustomerMutation = useMutation({
    mutationFn: tenantApi.customers.create,
    onSuccess: (payload: unknown) => {
      const newCust = unwrapCreatedCustomer(payload);
      if (!newCust?.id) return;
      setCreatedCustomer(newCust);
      qc.setQueryData<Customer[]>(['customers'], (old) => {
        const list = old ?? [];
        if (list.some((c) => c.id === newCust.id)) return list;
        return [newCust, ...list];
      });
      setQuickCustomerOpen(false);
      setQuickCustomerForm(emptyQuickCustomer);
      setQuickCustomerError(null);
      if (editAppointment) {
        setEditForm((prev) => ({ ...prev, customerId: newCust.id }));
      } else {
        setForm((prev) => ({ ...prev, customerId: newCust.id }));
      }
      void qc.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (err: any) => {
      setQuickCustomerError(getErrorMessage(err));
    },
  });

  // Appointment Mutations
  const createMutation = useMutation({
    mutationFn: tenantApi.appointments.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-calendar'] });
      qc.invalidateQueries({ queryKey: ['dashboard-comprehensive'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
      toast.success('Appointment was scheduled successfully.');
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.appointments.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-calendar'] });
      qc.invalidateQueries({ queryKey: ['dashboard-comprehensive'] });
      setFormError(null);
      setEditAppointment(null);
      toast.success('Appointment details updated.');
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.appointments.updateStatus(id, status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-calendar'] });
      qc.invalidateQueries({ queryKey: ['dashboard-comprehensive'] });
      qc.invalidateQueries({ queryKey: ['report-employee-performance'] });
      appAlert({
        icon: 'success',
        title: 'Status Updated',
        text: `Appointment marked as ${vars.status}.`,
        timer: 1600,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      appAlert({
        icon: 'error',
        title: 'Cannot Update Status',
        text: getErrorMessage(err),
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: tenantApi.appointments.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-calendar'] });
      qc.invalidateQueries({ queryKey: ['dashboard-comprehensive'] });
      appAlert({
        icon: 'success',
        title: 'Appointment Cancelled',
        timer: 1600,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      appAlert({
        icon: 'error',
        title: 'Cannot Cancel',
        text: getErrorMessage(err),
      });
    },
  });

  const openCreate = (prefill?: { employeeId?: string; startTime?: string }) => {
    setFormError(null);
    const start = prefill?.startTime || '09:00';
    setForm({
      ...emptyForm,
      appointmentDate: selectedDate,
      branchId: activeBranchId,
      employeeId: prefill?.employeeId || '',
      startTime: start,
      endTime: computeEndTime(start, activeServices, []),
      serviceIds: [],
    });
    setCreateOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    if (appointment.status === 'COMPLETED') {
      setInvoiceAppointment(appointment);
      return;
    }
    setFormError(null);
    setEditAppointment(appointment);
    setEditForm({
      customerId: appointment.customerId,
      branchId: appointment.branchId,
      employeeId: appointment.employeeId || '',
      appointmentDate: appointment.appointmentDate,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      serviceIds: appointment.services.map((s) => s.id),
      notes: appointment.notes || '',
      status: appointment.status,
    });
  };

  // Quick Customer Submit
  const handleQuickCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickCustomerError(null);
    if (!quickCustomerForm.name.trim() || !quickCustomerForm.phone.trim()) {
      setQuickCustomerError('Name and phone are required.');
      return;
    }

    const payload: Record<string, string> = {
      name: quickCustomerForm.name.trim(),
      phone: quickCustomerForm.phone.trim(),
    };
    if (quickCustomerForm.email.trim()) payload.email = quickCustomerForm.email.trim();
    if (quickCustomerForm.notes.trim()) payload.notes = quickCustomerForm.notes.trim();

    if (
      quickCustomerForm.birthYear &&
      quickCustomerForm.birthMonth &&
      quickCustomerForm.birthDate
    ) {
      payload.birthday = `${quickCustomerForm.birthYear}-${quickCustomerForm.birthMonth}-${quickCustomerForm.birthDate}`;
    }

    quickCustomerMutation.mutate(payload);
  };

  // Timeline Calculation (9 AM - 6 PM = 9 hours = 540 min)
  const TIMELINE_START_HOUR = 9;
  const TIMELINE_END_HOUR = 18;
  const TOTAL_MINUTES = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60; // 540

  const timeColumns = useMemo(() => {
    const cols = [];
    for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR - 1; h++) {
      const ampm = h >= 12 ? 'PM' : 'AM';
      const displayH = h > 12 ? h - 12 : h;
      cols.push(`${displayH} ${ampm}`);
    }
    return cols;
  }, []);

  // Live Current Time Indicator
  const currentTimeInfo = useMemo(() => {
    const isToday = selectedDate === todayIso();
    if (!isToday) return null;
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const elapsed = (h - TIMELINE_START_HOUR) * 60 + m;
    if (elapsed < 0 || elapsed > TOTAL_MINUTES) return null;
    const percent = (elapsed / TOTAL_MINUTES) * 100;
    const timeLabel = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return { percent, timeLabel };
  }, [selectedDate]);

  // Distribute appointments to employee tracks
  const employeeAppointmentsMap = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    activeEmployees.forEach((emp) => map.set(emp.id, []));
    map.set(UNASSIGNED_EMPLOYEE_ID, []);

    appointments.filter((apt) => apt.status !== 'CANCELLED').forEach((apt) => {
      const assignedEmployeeId = apt.employeeId && map.has(apt.employeeId)
        ? apt.employeeId
        : UNASSIGNED_EMPLOYEE_ID;

      const list = map.get(assignedEmployeeId) || [];
      list.push(apt);
      map.set(assignedEmployeeId, list);
    });

    return map;
  }, [activeEmployees, appointments]);
  const hasUnassignedAppointments = (employeeAppointmentsMap.get(UNASSIGNED_EMPLOYEE_ID)?.length ?? 0) > 0;
  const timelineEmployees = [
    ...activeEmployees,
    ...(hasUnassignedAppointments
      ? [{ id: UNASSIGNED_EMPLOYEE_ID, name: 'Unassigned', designation: 'No employee assigned' }]
      : []),
  ];

  if (isLoading && !appointments.length) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className={`appointments-page mx-auto w-full max-w-[1500px] space-y-6 ${activeTab === 'calendar' ? 'appointments-calendar-page' : ''}`}>
      {/* Top Header matching screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Appointments
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Book and manage customer appointments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto">
          {/* Branch Selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Branch</span>
            <Select
              value={activeBranchId}
              onValueChange={(val) => setBranchFilter(val)}
            >
              <SelectTrigger className="h-10 px-3 rounded-xl border-slate-200 bg-white text-xs font-semibold flex-1 sm:flex-initial sm:min-w-[200px] flex items-center gap-2 shadow-xs">
                <Building2 className="h-4 w-4 text-[var(--brand-primary,#0d5c3d)] shrink-0" />
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {activeBranches.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs font-medium">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selector */}
          <div className="flex shrink-0 items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Date</span>
            <div className="flex h-10 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 shadow-xs">
              <label className="relative flex h-full min-w-[142px] cursor-pointer items-center gap-1.5 rounded-lg focus-within:ring-2 focus-within:ring-[var(--brand-ring,#d4af7c)]">
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="pointer-events-none whitespace-nowrap text-xs font-bold text-slate-800">
                  {formatDateDisplay(selectedDate)}
                </span>
                <input
                  type="date"
                  aria-label="Choose appointment date"
                  value={selectedDate}
                  onClick={(event) => {
                    const input = event.currentTarget as HTMLInputElement & {
                      showPicker?: () => void;
                    };
                    input.showPicker?.();
                  }}
                  onChange={(event) => {
                    if (event.target.value) setSelectedDate(event.target.value);
                  }}
                  className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                />
              </label>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysIso(selectedDate, -1))}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysIso(selectedDate, 1))}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(todayIso())}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition-colors cursor-pointer"
            >
              Today
            </button>
          </div>

          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => openCreate()}
            className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="appointments-card rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Subheader bar inside card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5 text-slate-800 font-bold text-sm">
            <Calendar className="h-4 w-4 text-[var(--brand-primary,#0d5c3d)]" />
            <span>{formatFullDateHeader(selectedDate)}</span>
            {activeTab === 'calendar' && (
              <Select value={interval} onValueChange={(v) => setInterval(v as '15' | '30' | '60')}>
                <SelectTrigger className="h-8 w-[5.75rem] px-2 rounded-lg border-slate-200 text-xs font-medium bg-slate-50/50 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 mins</SelectItem>
                  <SelectItem value="30">30 mins</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* View switcher tabs */}
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'calendar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Timeline View
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('list')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  activeTab === 'list'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                List View
              </button>
            </div>

          </div>
        </div>

        {/* Timeline View */}
        {activeTab === 'calendar' ? (
          <div className="apt-timeline-scroll relative">
            <div className="apt-timeline-container">
              {/* Header Row */}
              <div className="apt-timeline-header-row">
                <div className="apt-timeline-emp-head">
                  <span>
                    Employees ({activeEmployees.length}{hasUnassignedAppointments ? ' + unassigned' : ''})
                  </span>
                </div>
                <div className="apt-timeline-time-head">
                  {timeColumns.map((timeLabel) => (
                    <div key={timeLabel} className="apt-timeline-time-col">
                      {timeLabel}
                    </div>
                  ))}
                  {/* Live Time Badge Marker in header */}
                  {currentTimeInfo && (
                    <div
                      className="apt-live-time-indicator"
                      style={{ left: `${currentTimeInfo.percent}%` }}
                    >
                      <span className="apt-live-time-badge">{currentTimeInfo.timeLabel}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Employee Rows */}
              {activeEmployees.length === 0 && !hasUnassignedAppointments ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No active employees in {activeBranchObj?.name || 'this branch'}.
                </div>
              ) : (
                timelineEmployees.map((emp) => {
                  const empApts = employeeAppointmentsMap.get(emp.id) || [];
                  const laneEnds: number[] = [];
                  const appointmentLanes = new Map<string, number>();
                  [...empApts]
                    .sort((a, b) => a.startTime.localeCompare(b.startTime))
                    .forEach((apt) => {
                      const [startHour, startMinute] = apt.startTime.split(':').map(Number);
                      const [endHour, endMinute] = apt.endTime.split(':').map(Number);
                      const start = startHour * 60 + startMinute;
                      const end = endHour * 60 + endMinute;
                      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
                      if (lane < 0) lane = laneEnds.length;
                      laneEnds[lane] = end;
                      appointmentLanes.set(apt.id, lane);
                    });
                  const rowHeight = Math.max(76, laneEnds.length * 58 + 16);
                  return (
                    <div key={emp.id} className="apt-timeline-row" style={{ height: rowHeight }}>
                      {/* Employee Info Card Left */}
                      <div className="apt-timeline-emp-cell">
                        <div className="relative">
                          <EmployeeProfileAvatar
                            name={emp.name}
                            photoUrl={'photoUrl' in emp ? emp.photoUrl : null}
                            className="h-12 w-12 border border-slate-200 shadow-xs"
                          />
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate" title={emp.name}>
                            {emp.name.trim().split(/\s+/)[0] || emp.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {emp.designation || 'Staff'}
                          </div>
                        </div>
                      </div>

                      {/* Timeline Track Right */}
                      <div
                        className="apt-timeline-track"
                        onMouseMove={(e) => {
                          if ((e.target as HTMLElement).closest('.apt-appointment-chip')) {
                            setHoverSlot(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          const ratio = (e.clientX - rect.left) / rect.width;
                          const step = Number(interval);
                          const snapped = snapTimelineMinutes(ratio, TOTAL_MINUTES, step);
                          setHoverSlot({
                            empId: emp.id,
                            percent: (snapped / TOTAL_MINUTES) * 100,
                            widthPct: (step / TOTAL_MINUTES) * 100,
                            label: minutesFromStartToLabel(TIMELINE_START_HOUR, snapped),
                          });
                        }}
                        onMouseLeave={() => setHoverSlot(null)}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                          const step = Number(interval);
                          const clickedMin = snapTimelineMinutes(ratio, TOTAL_MINUTES, step);
                          const h = TIMELINE_START_HOUR + Math.floor(clickedMin / 60);
                          const m = clickedMin % 60;
                          const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          openCreate({
                            employeeId: emp.id === UNASSIGNED_EMPLOYEE_ID ? undefined : emp.id,
                            startTime: startStr,
                          });
                        }}
                      >
                        {hoverSlot?.empId === emp.id && (
                          <div
                            className="apt-slot-hover"
                            style={{ left: `${hoverSlot.percent}%`, width: `${hoverSlot.widthPct}%` }}
                          >
                            <span className="apt-slot-hover-label">{hoverSlot.label}</span>
                          </div>
                        )}
                        {/* Live Time Line Span */}
                        {currentTimeInfo && (
                          <div
                            className="apt-live-time-indicator"
                            style={{ left: `${currentTimeInfo.percent}%` }}
                          />
                        )}

                        {/* Render Appointments */}
                        {empApts.map((apt) => {
                          const [sh, sm] = apt.startTime.split(':').map(Number);
                          const [eh, em] = apt.endTime.split(':').map(Number);
                          const startMin = (sh - TIMELINE_START_HOUR) * 60 + (sm || 0);
                          const endMin = (eh - TIMELINE_START_HOUR) * 60 + (em || 0);
                          const durationMin = Math.max(20, endMin - startMin);

                          const leftPct = Math.max(0, (startMin / TOTAL_MINUTES) * 100);
                          const widthPct = Math.min(
                            100 - leftPct,
                            (durationMin / TOTAL_MINUTES) * 100,
                          );
                          const serviceNames =
                            apt.services.map((s) => s.name).join(', ') || 'Service';

                          return (
                            <div
                              key={apt.id}
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                                top: `${8 + (appointmentLanes.get(apt.id) ?? 0) * 58}px`,
                                height: '52px',
                              }}
                              className={`apt-appointment-chip apt-chip-${apt.status.toLowerCase()}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(apt);
                              }}
                              title={`${apt.customerName} (${apt.startTime} - ${apt.endTime}): ${serviceNames}`}
                            >
                              <div className="flex items-center justify-between gap-1 w-full">
                                <span className="font-bold text-[11px] text-slate-900 truncate">
                                  {apt.customerName}
                                </span>
                                <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                                  {apt.startTime} – {apt.endTime}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-600 truncate mt-0.5">
                                {serviceNames}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          /* List View */
          <div className="divide-y divide-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 px-3.5 sm:px-4 py-3 bg-slate-50/60">
              <Select
                value={listStatusFilter}
                onValueChange={setListStatusFilter}
              >
                <SelectTrigger
                  aria-label="Filter appointments by status"
                  className="h-9 w-full sm:w-48 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={listEmployeeFilter}
                onValueChange={setListEmployeeFilter}
              >
                <SelectTrigger
                  aria-label="Filter appointments by employee"
                  className="h-9 w-full sm:w-56 rounded-lg border-slate-200 bg-white text-xs font-medium text-slate-700"
                >
                  <SelectValue placeholder="All employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {listFilterEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}{employee.status !== 'ACTIVE' ? ' (Inactive)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {listMeta?.total === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                {listStatusFilter !== 'all' || listEmployeeFilter !== 'all'
                  ? 'No appointments match the selected filters.'
                  : `No appointments booked for ${formatDateDisplay(selectedDate)}.`}
              </div>
            ) : isListLoading && !paginatedList ? (
              <div className="py-12">
                <OpsLoading />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Branch</th>
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Services</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {listAppointments.map((apt) => {
                      const isCompleted = apt.status === 'COMPLETED';
                      return (
                        <tr key={apt.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-800">
                            {apt.code}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{apt.customerName}</div>
                            <div className="text-[11px] text-slate-500">{apt.customerPhone || '—'}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {apt.startTime} – {apt.endTime}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{apt.branchName}</td>
                          <td className="py-3 px-4 text-slate-600">
                            {apt.employeeName || 'Unassigned'}
                          </td>
                          <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate">
                            {apt.services.map((s) => s.name).join(', ') || '—'}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {formatMoneyAmount(apt.totalPrice)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${appointmentStatusClass(
                                apt.status,
                              )}`}
                            >
                              {apt.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEdit(apt)}
                                className="h-7 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1"
                              >
                                <Pencil className="h-3 w-3" />
                                <span>{isCompleted ? 'View' : 'Edit'}</span>
                              </button>

                              {!isCompleted && apt.status !== 'CANCELLED' && (
                                <>
                                  {apt.status === 'PENDING' && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        statusMutation.mutate({ id: apt.id, status: 'CONFIRMED' })
                                      }
                                      className="h-7 px-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-semibold"
                                    >
                                      Confirm
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      statusMutation.mutate({ id: apt.id, status: 'COMPLETED' })
                                    }
                                    className="h-7 px-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold"
                                  >
                                    Complete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => cancelMutation.mutate(apt.id)}
                                    className="h-7 px-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-semibold"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {listMeta && listMeta.total > 0 && (
              <div className="px-4 py-3">
                <OpsPagination
                  page={listMeta.page}
                  limit={listMeta.limit}
                  total={listMeta.total}
                  totalPages={listMeta.totalPages}
                  onPageChange={setListPage}
                  onLimitChange={setListLimit}
                  itemLabel="appointments"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Completed appointments open a read-only invoice view. */}
      <Dialog
        open={invoiceAppointment !== null}
        onOpenChange={(open) => {
          if (!open) setInvoiceAppointment(null);
        }}
      >
        <DialogContent className="apt-invoice-dialog max-h-[86vh] overflow-y-auto rounded-2xl bg-white p-3.5 shadow-lg sm:max-w-2xl sm:p-4">
          {invoiceAppointment && (
            <div className="apt-invoice-wrap">
              <div className="apt-invoice-toolbar">
                <div>
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-lg font-extrabold tracking-tight text-slate-900">Service receipt</DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      <span className="apt-invoice-complete"><span>✓</span>Completed appointment</span>
                    </DialogDescription>
                  </DialogHeader>
                </div>
                <button
                  type="button"
                  className="apt-invoice-print-btn"
                  onClick={() => printReceipt('appointment-printable-invoice')}
                  aria-label="Print invoice"
                  title="Print receipt"
                >
                  <Printer size={18} />
                </button>
              </div>

              <article className="sale-inv-document apt-invoice-document" id="appointment-printable-invoice">
                <header className="apt-invoice-brand-row">
                  <div className="apt-invoice-brand">
                    {settings?.salon.logoUrl ? (
                      <img src={resolveUploadUrl(settings.salon.logoUrl) || settings.salon.logoUrl} alt="" className="apt-invoice-logo" />
                    ) : (
                      <span className="apt-invoice-logo-fallback" aria-hidden="true">✂</span>
                    )}
                    <div className="apt-invoice-brand-text">
                      <h2>{settings?.salon.name || 'Salon'}</h2>
                      <p>SALON &amp; BEAUTY CARE</p>
                      {settings?.salon.phone && <span>{settings.salon.phone}</span>}
                    </div>
                  </div>
                  <div className="apt-invoice-ref">
                    <p>SERVICE RECEIPT</p>
                    <strong>{invoiceAppointment.code}</strong>
                  </div>
                </header>

                <section className="apt-invoice-details">
                  <div className="apt-invoice-detail-column">
                    <div className="apt-invoice-detail"><UserRound /><span>Customer</span><strong>{invoiceAppointment.customerName}</strong></div>
                    <div className="apt-invoice-detail"><CalendarDays /><span>Date</span><strong>{formatDateDisplay(invoiceAppointment.appointmentDate)}</strong></div>
                    <div className="apt-invoice-detail"><Clock3 /><span>Time</span><strong>{invoiceAppointment.startTime} – {invoiceAppointment.endTime}</strong></div>
                  </div>
                  <div className="apt-invoice-detail-column">
                    <div className="apt-invoice-detail"><MapPin /><span>Branch</span><strong>{invoiceAppointment.branchName}</strong></div>
                    <div className="apt-invoice-detail"><UsersRound /><span>Staff</span><strong>{invoiceAppointment.employeeName || '—'}</strong></div>
                  </div>
                </section>

                <div className="apt-invoice-lines">
                  <div className="apt-invoice-lines-head"><span>Service</span><span>Amount</span></div>
                  <div className="apt-invoice-lines-body">
                    {invoiceAppointment.services.map((service) => (
                      <div className="apt-invoice-line" key={service.id}>
                        <span>{service.name}</span>
                        <strong>{formatMoneyAmount(service.price)}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="apt-invoice-total">
                  <span>Total</span>
                  <strong>{formatMoneyAmount(invoiceAppointment.totalPrice)}</strong>
                </div>

                <footer className="apt-invoice-footer">
                  <span className="apt-invoice-crown"><Crown /></span>
                  <p>Thank you for visiting!</p>
                  <span>Appointment record · {invoiceAppointment.code}</span>
                </footer>
              </article>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Appointment Form Dialog (Create / Edit) */}
      <Dialog
        open={createOpen || editAppointment !== null}
        onOpenChange={(open) => {
          if (!open && quickCustomerOpenRef.current) {
            setQuickCustomerOpen(false);
            return;
          }
          if (!open) {
            setCreateOpen(false);
            setEditAppointment(null);
            setFormError(null);
            setCreatedCustomer(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-white shadow-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {quickCustomerOpen
                ? 'Create Customer'
                : editAppointment
                  ? 'Edit Appointment'
                  : 'New Appointment'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {quickCustomerOpen
                ? 'Add a customer and they will be selected on this appointment.'
                : editAppointment
                  ? 'Update booking details, schedule or services.'
                  : 'Schedule a visit with selected services and stylist.'}
            </DialogDescription>
          </DialogHeader>

          {/* Locked Status Banner for Completed Appointments */}
          {editAppointment?.status === 'COMPLETED' && !quickCustomerOpen && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <Lock className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                <strong>This appointment is completed and locked.</strong> Its status and details
                cannot be modified.
              </span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const activeF = editAppointment ? editForm : form;
              if (!activeF.customerId) {
                setFormError('Please select or create a customer.');
                return;
              }
              if (!activeF.branchId) {
                setFormError('Please select a branch.');
                return;
              }
              if (!activeF.employeeId) {
                setFormError('Please select an employee.');
                return;
              }
              setFormError(null);

              if (editAppointment) {
                if (editAppointment.status === 'COMPLETED') return;
                updateMutation.mutate({
                  id: editAppointment.id,
                  data: {
                    customerId: activeF.customerId,
                    branchId: activeF.branchId,
                    employeeId: activeF.employeeId || undefined,
                    appointmentDate: activeF.appointmentDate,
                    startTime: activeF.startTime,
                    endTime: activeF.endTime,
                    serviceIds: activeF.serviceIds,
                    notes: activeF.notes || null,
                  },
                });
                if (activeF.status !== editAppointment.status) {
                  statusMutation.mutate({
                    id: editAppointment.id,
                    status: activeF.status,
                  });
                }
              } else {
                createMutation.mutate({
                  customerId: activeF.customerId,
                  branchId: activeF.branchId,
                  employeeId: activeF.employeeId || undefined,
                  appointmentDate: activeF.appointmentDate,
                  startTime: activeF.startTime,
                  endTime: activeF.endTime,
                  serviceIds: activeF.serviceIds,
                  notes: activeF.notes || undefined,
                });
              }
            }}
            className={`space-y-4 pt-2 ${quickCustomerOpen ? 'hidden' : ''}`}
          >
            <FormError message={formError} />

            {/* Customer Field with Quick-Create Customer Action */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="apt-customer-select"
                  className="text-xs font-semibold text-slate-800"
                >
                  Customer <span className="text-rose-500">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setQuickCustomerForm(emptyQuickCustomer);
                    setQuickCustomerError(null);
                    setQuickCustomerOpen(true);
                  }}
                  className="text-xs font-bold text-[var(--brand-primary,#0d5c3d)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Customer</span>
                </button>
              </div>

              <select
                id="apt-customer-select"
                value={editAppointment ? editForm.customerId : form.customerId}
                disabled={editAppointment?.status === 'COMPLETED'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (editAppointment) setEditForm({ ...editForm, customerId: val });
                  else setForm({ ...form, customerId: val });
                }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-[var(--brand-ring,#34d399)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select customer</option>
                {customerOptions.map((c) => (
                  <option
                    key={c.id}
                    value={c.id}
                    disabled={c.status !== 'ACTIVE' && c.id !== editAppointment?.customerId}
                  >
                    {c.name}
                    {c.status !== 'ACTIVE' ? ' (inactive — current appointment)' : ''}
                    {c.phone ? ` (${c.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Branch and Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Branch</Label>
                <Select
                  value={editAppointment ? editForm.branchId : form.branchId}
                  disabled={editAppointment?.status === 'COMPLETED'}
                  onValueChange={(val) => {
                    if (editAppointment) setEditForm({ ...editForm, branchId: val, employeeId: '' });
                    else setForm({ ...form, branchId: val, employeeId: '' });
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Date</Label>
                <Input
                  type="date"
                  value={editAppointment ? editForm.appointmentDate : form.appointmentDate}
                  disabled={editAppointment?.status === 'COMPLETED'}
                  onChange={(e) => {
                    if (editAppointment)
                      setEditForm({ ...editForm, appointmentDate: e.target.value });
                    else setForm({ ...form, appointmentDate: e.target.value });
                  }}
                  className="h-10 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Employee</Label>
              <Select
                value={editAppointment ? editForm.employeeId : form.employeeId}
                disabled={editAppointment?.status === 'COMPLETED'}
                onValueChange={(value) => {
                  if (editAppointment) setEditForm({ ...editForm, employeeId: value });
                  else setForm({ ...form, employeeId: value });
                }}
              >
                <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {formEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id} className="text-xs">
                      {employee.name}{employee.designation ? ` · ${employee.designation}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start and End Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Start Time</Label>
                <Input
                  type="time"
                  value={editAppointment ? editForm.startTime : form.startTime}
                  disabled={editAppointment?.status === 'COMPLETED'}
                  onChange={(e) => {
                    const st = e.target.value;
                    const activeF = editAppointment ? editForm : form;
                    const endT = computeEndTime(st, activeServices, activeF.serviceIds);
                    if (editAppointment) setEditForm({ ...editForm, startTime: st, endTime: endT });
                    else setForm({ ...form, startTime: st, endTime: endT });
                  }}
                  className="h-10 rounded-xl border-slate-200 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">End Time</Label>
                <Input
                  type="time"
                  value={editAppointment ? editForm.endTime : form.endTime}
                  disabled={editAppointment?.status === 'COMPLETED'}
                  onChange={(e) => {
                    if (editAppointment) setEditForm({ ...editForm, endTime: e.target.value });
                    else setForm({ ...form, endTime: e.target.value });
                  }}
                  className="h-10 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Status (Only when editing and NOT completed) */}
            {editAppointment && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Status</Label>
                <Select
                  value={editForm.status}
                  disabled={editAppointment.status === 'COMPLETED'}
                  onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((st) => (
                      <SelectItem key={st} value={st} className="text-xs">
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Services Checklist */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Services <span className="text-slate-400 font-normal">(optional)</span>
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 border border-slate-200 rounded-xl bg-slate-50/50">
                {activeServices.map((svc) => {
                  const activeF = editAppointment ? editForm : form;
                  const isChecked = activeF.serviceIds.includes(svc.id);
                  return (
                    <label
                      key={svc.id}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-[var(--brand-primary,#0d5c3d)] bg-emerald-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      } ${editAppointment?.status === 'COMPLETED' ? 'opacity-60 pointer-events-none' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={editAppointment?.status === 'COMPLETED'}
                        onChange={() => {
                          const nextIds = isChecked
                            ? activeF.serviceIds.filter((id) => id !== svc.id)
                            : [...activeF.serviceIds, svc.id];
                          const endTime = computeEndTime(activeF.startTime, activeServices, nextIds);
                          if (editAppointment)
                            setEditForm({ ...editForm, serviceIds: nextIds, endTime });
                          else setForm({ ...form, serviceIds: nextIds, endTime });
                        }}
                        className="mt-0.5 accent-[var(--brand-primary,#0d5c3d)]"
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{svc.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatMoneyAmount(svc.price)}{' '}
                          {svc.durationMinutes ? `• ${svc.durationMinutes}m` : ''}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">Notes</Label>
              <textarea
                value={editAppointment ? editForm.notes : form.notes}
                disabled={editAppointment?.status === 'COMPLETED'}
                onChange={(e) => {
                  if (editAppointment) setEditForm({ ...editForm, notes: e.target.value });
                  else setForm({ ...form, notes: e.target.value });
                }}
                placeholder="Optional special preferences, allergies, or requests..."
                rows={2}
                className="w-full rounded-xl border border-slate-200 p-2.5 text-xs focus:ring-1 focus:ring-[var(--brand-primary,#0d5c3d)] focus:border-[var(--brand-primary,#0d5c3d)]"
              />
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center gap-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  setEditAppointment(null);
                }}
                className="flex-1 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Close
              </button>
              {editAppointment?.status !== 'COMPLETED' && (
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 h-10 rounded-xl bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  <span>{editAppointment ? 'Save Changes' : 'Create Appointment'}</span>
                </button>
              )}
            </div>
          </form>

          <form
            onSubmit={handleQuickCustomerSubmit}
            className={`space-y-3.5 pt-2 ${quickCustomerOpen ? '' : 'hidden'}`}
          >
            <FormError message={quickCustomerError} />

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">
                Full name <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  value={quickCustomerForm.name}
                  onChange={(e) =>
                    setQuickCustomerForm({ ...quickCustomerForm, name: e.target.value })
                  }
                  placeholder="Customer name"
                  required={quickCustomerOpen}
                  className="h-9 pl-9 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">
                  Phone <span className="text-rose-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    value={quickCustomerForm.phone}
                    onChange={(e) =>
                      setQuickCustomerForm({ ...quickCustomerForm, phone: e.target.value })
                    }
                    placeholder="0771234567"
                    required={quickCustomerOpen}
                    className="h-9 pl-9 rounded-xl border-slate-200 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-800">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    type="email"
                    value={quickCustomerForm.email}
                    onChange={(e) =>
                      setQuickCustomerForm({ ...quickCustomerForm, email: e.target.value })
                    }
                    placeholder="Optional"
                    className="h-9 pl-9 rounded-xl border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">Birthday</Label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={quickCustomerForm.birthDate}
                  onChange={(e) =>
                    setQuickCustomerForm({
                      ...quickCustomerForm,
                      birthDate: e.target.value.replace(/\D/g, '').slice(0, 2),
                    })
                  }
                  placeholder="DD"
                  maxLength={2}
                  className="h-9 text-xs rounded-xl border-slate-200"
                />
                <Select
                  value={quickCustomerForm.birthMonth || undefined}
                  onValueChange={(val) =>
                    setQuickCustomerForm({ ...quickCustomerForm, birthMonth: val })
                  }
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl border-slate-200">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={quickCustomerForm.birthYear}
                  onChange={(e) =>
                    setQuickCustomerForm({
                      ...quickCustomerForm,
                      birthYear: e.target.value.replace(/\D/g, '').slice(0, 4),
                    })
                  }
                  placeholder="YYYY"
                  maxLength={4}
                  className="h-9 text-xs rounded-xl border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-800">Notes</Label>
              <Input
                value={quickCustomerForm.notes}
                onChange={(e) =>
                  setQuickCustomerForm({ ...quickCustomerForm, notes: e.target.value })
                }
                placeholder="Optional notes or preferences"
                className="h-9 rounded-xl border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickCustomerOpen(false)}
                className="flex-1 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={quickCustomerMutation.isPending}
                className="flex-1 h-9 rounded-xl bg-[var(--brand-primary,#0d5c3d)] hover:bg-[var(--brand-hover,#0a4a31)] text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {quickCustomerMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Add Customer</span>
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
