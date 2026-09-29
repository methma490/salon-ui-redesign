import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Mail,
  Pencil,
  Phone,
  Plus,
  User,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Swal from 'sweetalert2';
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
import { formatMoneyAmount } from '@/lib/money';
import { FormError, getErrorMessage, OpsError, OpsLoading } from './salon-ops-ui';
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

const CHIP_COLORS = [
  'apt-chip-blue',
  'apt-chip-pink',
  'apt-chip-green',
  'apt-chip-purple',
  'apt-chip-amber',
  'apt-chip-rose',
  'apt-chip-emerald',
];

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
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
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
  const { branchId: ribbonBranchId, branches } = useSalonBranch();

  const [activeTab, setActiveTab] = useState<Tab>('calendar');
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [interval, setInterval] = useState<'15' | '30' | '60'>('15');
  const [branchFilter, setBranchFilter] = useState<string>(() =>
    ribbonBranchId !== 'all' ? ribbonBranchId : branches[0]?.id || '',
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [form, setForm] = useState<AppointmentForm>(() => ({
    ...emptyForm,
    branchId: branchFilter || branches[0]?.id || '',
    appointmentDate: selectedDate,
  }));
  const [editForm, setEditForm] = useState<AppointmentForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Quick Customer Creation Modal inside Appointment Popup
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [quickCustomerForm, setQuickCustomerForm] = useState<QuickCustomerForm>(emptyQuickCustomer);
  const [quickCustomerError, setQuickCustomerError] = useState<string | null>(null);

  // Synchronize branch selection
  useEffect(() => {
    if (ribbonBranchId !== 'all') {
      setBranchFilter(ribbonBranchId);
    } else if (!branchFilter && branches.length > 0) {
      setBranchFilter(branches[0].id);
    }
  }, [ribbonBranchId, branches]);

  const activeBranchId = branchFilter || branches[0]?.id || '';
  const activeBranchObj = branches.find((b) => b.id === activeBranchId);

  // Queries
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => tenantApi.customers.list(),
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => tenantApi.services.list(),
  });

  const activeServices = useMemo(
    () => services.filter((s) => s.status === 'ACTIVE'),
    [services],
  );

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', activeBranchId],
    queryFn: () =>
      tenantApi.employees.list(activeBranchId ? { branchId: activeBranchId } : undefined),
  });

  const activeEmployees = useMemo(
    () => employees.filter((e) => e.status === 'ACTIVE'),
    [employees],
  );

  const listParams = useMemo(() => {
    const params: Record<string, string> = {
      startDate: selectedDate,
      endDate: selectedDate,
    };
    if (activeBranchId) params.branchId = activeBranchId;
    return params;
  }, [selectedDate, activeBranchId]);

  const {
    data: appointments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['appointments', listParams],
    queryFn: () => tenantApi.appointments.list(listParams),
  });

  // Create Quick Customer Mutation
  const quickCustomerMutation = useMutation({
    mutationFn: tenantApi.customers.create,
    onSuccess: (newCust: Customer) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setQuickCustomerOpen(false);
      setQuickCustomerForm(emptyQuickCustomer);
      setQuickCustomerError(null);
      // Auto-select in current form
      if (createOpen) {
        setForm((prev) => ({ ...prev, customerId: newCust.id }));
      } else if (editAppointment) {
        setEditForm((prev) => ({ ...prev, customerId: newCust.id }));
      }
      Swal.fire({
        icon: 'success',
        title: 'Customer Created',
        text: `${newCust.name} was added and selected.`,
        timer: 1600,
        showConfirmButton: false,
      });
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
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Appointment Booked',
        text: 'Appointment was scheduled successfully.',
        timer: 1600,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      tenantApi.appointments.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-calendar'] });
      setFormError(null);
      setEditAppointment(null);
      Swal.fire({
        icon: 'success',
        title: 'Appointment Updated',
        text: 'Appointment details updated.',
        timer: 1600,
        showConfirmButton: false,
      });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.appointments.updateStatus(id, status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-calendar'] });
      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: `Appointment marked as ${vars.status}.`,
        timer: 1600,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      Swal.fire({
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
      Swal.fire({
        icon: 'success',
        title: 'Appointment Cancelled',
        timer: 1600,
        showConfirmButton: false,
      });
    },
    onError: (err) => {
      Swal.fire({
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
      endTime: computeEndTime(start, activeServices, activeServices[0] ? [activeServices[0].id] : []),
      serviceIds: activeServices[0] ? [activeServices[0].id] : [],
    });
    setCreateOpen(true);
  };

  const openEdit = (appointment: Appointment) => {
    setFormError(null);
    setEditAppointment(appointment);
    setEditForm({
      customerId: appointment.customerId,
      branchId: appointment.branchId,
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

    // Distribute appointments
    appointments.forEach((apt, idx) => {
      // If employee list exists, place on employee row
      if (activeEmployees.length > 0) {
        const targetEmp = activeEmployees[idx % activeEmployees.length];
        const list = map.get(targetEmp.id) || [];
        list.push(apt);
        map.set(targetEmp.id, list);
      }
    });

    return map;
  }, [activeEmployees, appointments]);

  if (isLoading && !appointments.length) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1500px] mx-auto space-y-6">
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
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id} className="text-xs font-medium">
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Date</span>
            <div className="flex items-center bg-white border border-slate-200 rounded-xl h-10 px-2 gap-1 shadow-xs">
              <Calendar className="h-4 w-4 text-slate-400 mr-1 shrink-0" />
              <span className="text-xs font-bold text-slate-800 min-w-[80px] sm:min-w-[92px]">
                {formatDateDisplay(selectedDate)}
              </span>
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
            <span>+ New Appointment</span>
          </button>
        </div>
      </div>

      {/* Main Card Container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Subheader bar inside card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-3.5 sm:px-5 py-3 sm:py-3.5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Calendar className="h-4 w-4 text-[var(--brand-primary,#0d5c3d)]" />
            <span>{formatFullDateHeader(selectedDate)}</span>
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

            {/* Interval Selector */}
            {activeTab === 'calendar' && (
              <Select value={interval} onValueChange={(v) => setInterval(v as '15' | '30' | '60')}>
                <SelectTrigger className="h-8 px-2.5 rounded-lg border-slate-200 text-xs font-medium bg-slate-50/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 mins</SelectItem>
                  <SelectItem value="30">30 mins</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                </SelectContent>
              </Select>
            )}

            {/* Date Nav Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysIso(selectedDate, -1))}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(addDaysIso(selectedDate, 1))}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(todayIso())}
                className="h-8 px-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Timeline View */}
        {activeTab === 'calendar' ? (
          <div className="overflow-x-auto relative min-h-[460px]">
            <div className="apt-timeline-container">
              {/* Header Row */}
              <div className="apt-timeline-header-row">
                <div className="apt-timeline-emp-head">
                  <span>Employees ({activeEmployees.length})</span>
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
              {activeEmployees.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  No active employees in {activeBranchObj?.name || 'this branch'}.
                </div>
              ) : (
                activeEmployees.map((emp) => {
                  const empApts = employeeAppointmentsMap.get(emp.id) || [];
                  return (
                    <div key={emp.id} className="apt-timeline-row">
                      {/* Employee Info Card Left */}
                      <div className="apt-timeline-emp-cell">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-full bg-[var(--brand-soft,#f0fdf4)] text-[var(--brand-primary,#0d5c3d)] border border-slate-200 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {emp.name}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {emp.designation || 'Staff'}
                          </div>
                        </div>
                      </div>

                      {/* Timeline Track Right */}
                      <div
                        className="apt-timeline-track"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                          const clickedMin = Math.floor((ratio * TOTAL_MINUTES) / 15) * 15;
                          const h = TIMELINE_START_HOUR + Math.floor(clickedMin / 60);
                          const m = clickedMin % 60;
                          const startStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          openCreate({ employeeId: emp.id, startTime: startStr });
                        }}
                      >
                        {/* Live Time Line Span */}
                        {currentTimeInfo && (
                          <div
                            className="apt-live-time-indicator"
                            style={{ left: `${currentTimeInfo.percent}%` }}
                          />
                        )}

                        {/* Render Appointments */}
                        {empApts.map((apt, aptIdx) => {
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
                          const colorClass = CHIP_COLORS[aptIdx % CHIP_COLORS.length];
                          const serviceNames =
                            apt.services.map((s) => s.name).join(', ') || 'Service';

                          return (
                            <div
                              key={apt.id}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              className={`apt-appointment-chip ${colorClass}`}
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
            {appointments.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">
                No appointments booked for {formatDateDisplay(selectedDate)}.
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
                      <th className="py-3 px-4">Services</th>
                      <th className="py-3 px-4">Total</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {appointments.map((apt) => {
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
          </div>
        )}
      </div>

      {/* Appointment Form Dialog (Create / Edit) */}
      <Dialog
        open={createOpen || editAppointment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setEditAppointment(null);
            setFormError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-white shadow-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-bold text-slate-900">
              {editAppointment ? 'Edit Appointment' : 'New Appointment'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {editAppointment
                ? 'Update booking details, schedule or services.'
                : 'Schedule a visit with selected services and stylist.'}
            </DialogDescription>
          </DialogHeader>

          {/* Locked Status Banner for Completed Appointments */}
          {editAppointment?.status === 'COMPLETED' && (
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
              if (activeF.serviceIds.length === 0) {
                setFormError('Please select at least one service.');
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
                  appointmentDate: activeF.appointmentDate,
                  startTime: activeF.startTime,
                  endTime: activeF.endTime,
                  serviceIds: activeF.serviceIds,
                  notes: activeF.notes || undefined,
                });
              }
            }}
            className="space-y-4 pt-2"
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

              <Select
                value={editAppointment ? editForm.customerId : form.customerId}
                disabled={editAppointment?.status === 'COMPLETED'}
                onValueChange={(val) => {
                  if (editAppointment) setEditForm({ ...editForm, customerId: val });
                  else setForm({ ...form, customerId: val });
                }}
              >
                <SelectTrigger id="apt-customer-select" className="h-10 rounded-xl border-slate-200 text-xs">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch and Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">Branch</Label>
                <Select
                  value={editAppointment ? editForm.branchId : form.branchId}
                  disabled={editAppointment?.status === 'COMPLETED'}
                  onValueChange={(val) => {
                    if (editAppointment) setEditForm({ ...editForm, branchId: val });
                    else setForm({ ...form, branchId: val });
                  }}
                >
                  <SelectTrigger className="h-10 rounded-xl border-slate-200 text-xs">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
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
                Services <span className="text-rose-500">*</span>
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
        </DialogContent>
      </Dialog>

      {/* Quick Customer Creation Modal */}
      <Dialog open={quickCustomerOpen} onOpenChange={setQuickCustomerOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-6 rounded-2xl bg-white shadow-2xl z-50">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-bold text-slate-900">
              Create Customer
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Add a new customer to your records and select them automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleQuickCustomerSubmit} className="space-y-3.5 pt-2">
            <FormError message={quickCustomerError} />

            {/* Name */}
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
                  required
                  className="h-9 pl-9 rounded-xl border-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Phone & Email */}
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
                    required
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

            {/* Birthday */}
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

            {/* Notes */}
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

            {/* Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setQuickCustomerOpen(false)}
                className="flex-1 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
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
