import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { tenantApi, type Appointment, type Service } from '@/api/tenant.api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import {
  FormError,
  FormTextarea,
  getErrorMessage,
  OpsEditButton,
  OpsError,
  OpsLoading,
  OpsPageHeader,
} from './salon-ops-ui';
import { useSalonBranch } from '@/contexts/SalonBranchContext';
import './appointments-page.css';
import './employees-page.css';

type Tab = 'list' | 'calendar';

type AppointmentForm = {
  customerId: string;
  branchId: string;
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
  appointmentDate: '',
  startTime: '09:00',
  endTime: '10:00',
  serviceIds: [],
  notes: '',
  status: 'PENDING',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function startOfWeekIso(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function endOfWeekIso(date: string): string {
  return addDaysIso(startOfWeekIso(date), 6);
}

function formatDateLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatMoney(value: number): string {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrency(value: number): string {
  return `LKR ${formatMoney(value)}`;
}

function appointmentStatusClass(status: string): string {
  switch (status) {
    case 'CONFIRMED':
      return 'emp-badge emp-badge-active';
    case 'COMPLETED':
      return 'emp-badge emp-type-in';
    case 'CANCELLED':
    case 'NO_SHOW':
      return 'emp-badge emp-badge-resigned';
    default:
      return 'emp-badge emp-badge-inactive';
  }
}

function AppointmentStatusBadge({ status }: { status: string }) {
  return <span className={appointmentStatusClass(status)}>{status.replace('_', ' ')}</span>;
}

function computeEndTime(startTime: string, services: Service[], serviceIds: string[]): string {
  const totalMinutes = serviceIds.reduce((sum, id) => {
    const service = services.find((item) => item.id === id);
    return sum + (service?.durationMinutes ?? 30);
  }, 0);

  const [hours, minutes] = startTime.split(':').map(Number);
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);
  start.setMinutes(start.getMinutes() + Math.max(totalMinutes, 30));

  const hh = String(start.getHours()).padStart(2, '0');
  const mm = String(start.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function AppointmentFormFields({
  form,
  setForm,
  services,
  showStatus = false,
}: {
  form: AppointmentForm;
  setForm: (form: AppointmentForm) => void;
  services: Service[];
  showStatus?: boolean;
}) {
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => tenantApi.customers.list(),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: tenantApi.branches.list,
  });

  const toggleService = (serviceId: string) => {
    const nextIds = form.serviceIds.includes(serviceId)
      ? form.serviceIds.filter((id) => id !== serviceId)
      : [...form.serviceIds, serviceId];
    const endTime = computeEndTime(form.startTime, services, nextIds);
    setForm({ ...form, serviceIds: nextIds, endTime });
  };

  const selectedTotal = form.serviceIds.reduce((sum, id) => {
    const service = services.find((item) => item.id === id);
    return sum + (service?.price ?? 0);
  }, 0);

  return (
    <>
      <section className="apt-form-section">
        <h3 className="apt-section-title">Customer & Branch</h3>
        <div className="apt-form-grid">
          <div className="apt-field">
            <Label htmlFor="apt-customer">Customer</Label>
            <Select
              value={form.customerId}
              onValueChange={(value) => setForm({ ...form, customerId: value })}
            >
              <SelectTrigger id="apt-customer">
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="apt-field">
            <Label htmlFor="apt-branch">Branch</Label>
            <Select
              value={form.branchId}
              onValueChange={(value) => setForm({ ...form, branchId: value })}
            >
              <SelectTrigger id="apt-branch">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="apt-form-section">
        <h3 className="apt-section-title">Schedule</h3>
        <div className="apt-form-grid">
          <div className="apt-field apt-form-grid-span">
            <Label htmlFor="apt-date">Date</Label>
            <Input
              id="apt-date"
              type="date"
              value={form.appointmentDate}
              onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
              required
            />
          </div>

          <div className="apt-field">
            <Label htmlFor="apt-start">Start time</Label>
            <Input
              id="apt-start"
              type="time"
              value={form.startTime}
              onChange={(e) => {
                const startTime = e.target.value;
                setForm({
                  ...form,
                  startTime,
                  endTime: computeEndTime(startTime, services, form.serviceIds),
                });
              }}
              required
            />
          </div>

          <div className="apt-field">
            <Label htmlFor="apt-end">End time</Label>
            <Input
              id="apt-end"
              type="time"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              required
            />
          </div>

          {showStatus && (
            <div className="apt-field apt-form-grid-span">
              <Label htmlFor="apt-status">Status</Label>
              <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                <SelectTrigger id="apt-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </section>

      <section className="apt-form-section">
        <h3 className="apt-section-title">Services · Prices in LKR</h3>
        <div className="apt-service-grid">
          {services.length === 0 ? (
            <p className="emp-panel-desc">No active services available.</p>
          ) : (
            services.map((service) => {
              const selected = form.serviceIds.includes(service.id);
              return (
                <label
                  key={service.id}
                  className={`apt-service-card${selected ? ' is-selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleService(service.id)}
                  />
                  <span>
                    <span className="apt-service-name">{service.name}</span>
                    <span className="apt-service-meta">
                      {formatMoney(service.price)}
                      {service.durationMinutes ? ` · ${service.durationMinutes} min` : ''}
                    </span>
                  </span>
                </label>
              );
            })
          )}
        </div>
        {form.serviceIds.length > 0 && (
          <div className="apt-summary">
            <span className="apt-summary-label">
              {form.serviceIds.length} service{form.serviceIds.length === 1 ? '' : 's'} selected
            </span>
            <span className="apt-summary-value">{formatMoney(selectedTotal)}</span>
          </div>
        )}
      </section>

      <section className="apt-form-section">
        <h3 className="apt-section-title">Notes</h3>
        <div className="apt-field">
          <FormTextarea
            id="apt-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional special requests"
            rows={3}
          />
        </div>
      </section>
    </>
  );
}

function AppointmentFormDialog({
  open,
  onOpenChange,
  title,
  description,
  formError,
  pending,
  submitLabel,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  formError: string | null;
  pending: boolean;
  submitLabel: string;
  onSubmit: (e: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="apt-dialog-content">
        <div className="apt-dialog-header">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <form className="apt-dialog-body" onSubmit={onSubmit}>
          <FormError message={formError} />
          {children}
          <div className="apt-dialog-footer">
            <button
              type="button"
              className="apt-btn apt-btn-secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button type="submit" className="apt-btn apt-btn-primary" disabled={pending}>
              {pending ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function toCreatePayload(form: AppointmentForm) {
  const payload: Record<string, unknown> = {
    customerId: form.customerId,
    branchId: form.branchId,
    appointmentDate: form.appointmentDate,
    startTime: form.startTime,
    endTime: form.endTime,
    serviceIds: form.serviceIds,
  };
  if (form.notes.trim()) payload.notes = form.notes.trim();
  return payload;
}

function toUpdatePayload(form: AppointmentForm) {
  const payload = toCreatePayload(form);
  return payload;
}

export default function AppointmentsPage() {
  const qc = useQueryClient();
  const { branchId: ribbonBranchId, branches } = useSalonBranch();
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(addDaysIso(todayIso(), 30));
  const [branchFilter, setBranchFilter] = useState<string>(() =>
    ribbonBranchId !== 'all' ? ribbonBranchId : '',
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [form, setForm] = useState<AppointmentForm>(() => ({
    ...emptyForm,
    branchId: ribbonBranchId !== 'all' ? ribbonBranchId : '',
  }));
  const [editForm, setEditForm] = useState<AppointmentForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setBranchFilter(ribbonBranchId !== 'all' ? ribbonBranchId : '');
    setForm((prev) => ({
      ...prev,
      branchId: ribbonBranchId !== 'all' ? ribbonBranchId : prev.branchId,
    }));
  }, [ribbonBranchId]);

  const listParams = useMemo(() => {
    const params: Record<string, string> = {
      startDate,
      endDate,
    };
    if (branchFilter) params.branchId = branchFilter;
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [startDate, endDate, branchFilter, statusFilter]);

  const {
    data: appointments = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['appointments', listParams],
    queryFn: () => tenantApi.appointments.list(listParams),
    enabled: activeTab === 'list',
  });

  const {
    data: calendarDays = [],
    isLoading: calendarLoading,
    isError: calendarError,
    error: calendarQueryError,
    refetch: refetchCalendar,
  } = useQuery({
    queryKey: ['appointments-calendar', listParams],
    queryFn: () => tenantApi.appointments.calendar(listParams),
    enabled: activeTab === 'calendar',
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => tenantApi.services.list(),
  });


  const activeServices = useMemo(
    () => services.filter((service) => service.status === 'ACTIVE'),
    [services],
  );

  const stats = useMemo(() => {
    const today = todayIso();
    const weekStart = startOfWeekIso(today);
    const weekEnd = endOfWeekIso(today);
    const source = activeTab === 'calendar' ? calendarDays.flatMap((day) => day.appointments) : appointments;

    return {
      today: source.filter((apt) => apt.appointmentDate === today).length,
      week: source.filter(
        (apt) => apt.appointmentDate >= weekStart && apt.appointmentDate <= weekEnd,
      ).length,
      pending: source.filter((apt) => apt.status === 'PENDING').length,
    };
  }, [appointments, calendarDays, activeTab]);

  const createMutation = useMutation({
    mutationFn: tenantApi.appointments.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-calendar'] });
      setForm(emptyForm);
      setFormError(null);
      setCreateOpen(false);
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
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tenantApi.appointments.updateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-calendar'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: tenantApi.appointments.cancel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] });
      qc.invalidateQueries({ queryKey: ['appointments-calendar'] });
    },
  });

  const openCreate = () => {
    setFormError(null);
    setForm({
      ...emptyForm,
      appointmentDate: todayIso(),
      branchId: branches[0]?.id ?? '',
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
      serviceIds: appointment.services.map((service) => service.id),
      notes: appointment.notes ?? '',
      status: appointment.status,
    });
  };

  useEffect(() => {
    if (createOpen && !form.branchId && branches[0]?.id) {
      setForm((current) => ({ ...current, branchId: branches[0].id }));
    }
  }, [createOpen, form.branchId, branches]);

  if (isLoading || calendarLoading) return <OpsLoading />;
  if (isError) return <OpsError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  if (calendarError) {
    return (
      <OpsError
        message={getErrorMessage(calendarQueryError)}
        onRetry={() => void refetchCalendar()}
      />
    );
  }

  return (
    <div className="emp-page">
      <OpsPageHeader
        title="Appointments"
        subtitle="Book and manage customer appointments"
        action={
          <button type="button" className="emp-btn emp-btn-primary" onClick={openCreate}>
            + New Appointment
          </button>
        }
      />

      <div className="emp-stats">
        <div className="emp-stat">
          <div className="emp-stat-value">{stats.today}</div>
          <div className="emp-stat-label">Today</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{stats.week}</div>
          <div className="emp-stat-label">This Week</div>
        </div>
        <div className="emp-stat">
          <div className="emp-stat-value">{stats.pending}</div>
          <div className="emp-stat-label">Pending</div>
        </div>
      </div>

      <div className="emp-tabs emp-tabs-split">
        <button
          type="button"
          className={activeTab === 'list' ? 'emp-tab emp-tab-active' : 'emp-tab'}
          onClick={() => setActiveTab('list')}
        >
          List View
        </button>
        <button
          type="button"
          className={activeTab === 'calendar' ? 'emp-tab emp-tab-active' : 'emp-tab'}
          onClick={() => setActiveTab('calendar')}
        >
          Calendar View
        </button>
      </div>

      <div className="apt-filters-row">
        <div className="apt-filter-inline">
          <Label htmlFor="apt-filter-start">From</Label>
          <Input
            id="apt-filter-start"
            type="date"
            className="apt-filter-control"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="apt-filter-inline">
          <Label htmlFor="apt-filter-end">To</Label>
          <Input
            id="apt-filter-end"
            type="date"
            className="apt-filter-control"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="apt-filter-inline">
          <Label htmlFor="apt-filter-branch">Branch</Label>
          <Select
            value={branchFilter || 'all'}
            onValueChange={(value) => setBranchFilter(value === 'all' ? '' : value)}
          >
            <SelectTrigger id="apt-filter-branch" className="apt-filter-control">
              <SelectValue placeholder="All branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="apt-filter-inline">
          <Label htmlFor="apt-filter-status">Status</Label>
          <Select
            value={statusFilter || 'all'}
            onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}
          >
            <SelectTrigger id="apt-filter-status" className="apt-filter-control">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="emp-panel">
          <div className="emp-panel-header">
            <div>
              <h2 className="emp-panel-title">All Appointments</h2>
              <p className="emp-panel-desc">{appointments.length} appointment(s) in selected range</p>
            </div>
          </div>

          {appointments.length === 0 ? (
            <div className="emp-empty">No appointments found for the selected filters.</div>
          ) : (
            <>
              <div className="emp-cards">
                {appointments.map((appointment) => (
                  <article key={appointment.id} className="emp-card apt-card">
                    <div className="emp-card-top">
                      <div>
                        <div className="emp-name-cell">{appointment.customerName}</div>
                        <div className="emp-code">{appointment.code}</div>
                      </div>
                      <AppointmentStatusBadge status={appointment.status} />
                    </div>
                    <div className="apt-card-grid">
                      <div className="apt-card-field">
                        <span>When</span>
                        <strong>
                          {formatDateLabel(appointment.appointmentDate)} · {appointment.startTime}–
                          {appointment.endTime}
                        </strong>
                      </div>
                      <div className="apt-card-field">
                        <span>Branch</span>
                        <strong>{appointment.branchName}</strong>
                      </div>
                      <div className="apt-card-field apt-card-field-full">
                        <span>Services</span>
                        <strong>
                          {appointment.services.map((service) => service.name).join(', ') || '—'}
                        </strong>
                      </div>
                      <div className="apt-card-field">
                        <span>Total</span>
                        <strong className="emp-price">{formatCurrency(appointment.totalPrice)}</strong>
                      </div>
                    </div>
                    <div className="emp-card-actions emp-card-actions-mobile">
                      <OpsEditButton onClick={() => openEdit(appointment)} />
                      {appointment.status !== 'CANCELLED' && appointment.status !== 'COMPLETED' && (
                        <>
                          {appointment.status === 'PENDING' && (
                            <button
                              type="button"
                              className="emp-btn emp-btn-primary emp-btn-mobile"
                              onClick={() =>
                                statusMutation.mutate({ id: appointment.id, status: 'CONFIRMED' })
                              }
                            >
                              Confirm
                            </button>
                          )}
                          <button
                            type="button"
                            className="emp-btn emp-btn-secondary emp-btn-mobile"
                            onClick={() => cancelMutation.mutate(appointment.id)}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                ))}
              </div>

              <div className="emp-table-wrap">
                <table className="emp-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th>Branch</th>
                      <th>Services</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appointment) => (
                      <tr key={appointment.id}>
                        <td className="emp-code">{appointment.code}</td>
                        <td className="emp-name-cell">{appointment.customerName}</td>
                        <td>{formatDateLabel(appointment.appointmentDate)}</td>
                        <td>
                          {appointment.startTime}–{appointment.endTime}
                        </td>
                        <td>{appointment.branchName}</td>
                        <td>{appointment.services.map((service) => service.name).join(', ') || '—'}</td>
                        <td>{formatCurrency(appointment.totalPrice)}</td>
                        <td>
                          <AppointmentStatusBadge status={appointment.status} />
                        </td>
                        <td>
                          <div className="emp-actions">
                            <OpsEditButton onClick={() => openEdit(appointment)} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="emp-panel">
          <div className="emp-panel-header">
            <div>
              <h2 className="emp-panel-title">Calendar</h2>
              <p className="emp-panel-desc">Appointments grouped by date</p>
            </div>
          </div>

          {calendarDays.length === 0 ? (
            <div className="emp-empty">No appointments in the selected date range.</div>
          ) : (
            <div className="apt-calendar">
              {calendarDays.map((day) => (
                <section key={day.date} className="apt-calendar-day">
                  <header className="apt-calendar-day-header">
                    <h3>{formatDateLabel(day.date)}</h3>
                    <span>{day.appointments.length} appointment(s)</span>
                  </header>
                  <div className="apt-calendar-slots">
                    {day.appointments.map((appointment) => (
                      <button
                        key={appointment.id}
                        type="button"
                        className="apt-calendar-card"
                        onClick={() => openEdit(appointment)}
                      >
                        <div className="apt-calendar-card-top">
                          <strong>
                            {appointment.startTime}–{appointment.endTime}
                          </strong>
                          <AppointmentStatusBadge status={appointment.status} />
                        </div>
                        <div>{appointment.customerName}</div>
                        <div className="apt-service-meta">
                          {appointment.services.map((service) => service.name).join(', ')}
                        </div>
                        <div className="apt-service-meta">{appointment.branchName}</div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      <AppointmentFormDialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) setFormError(null);
          setCreateOpen(open);
        }}
        title="New Appointment"
        description="Book a customer visit with one or more services"
        formError={formError}
        pending={createMutation.isPending}
        submitLabel="Create Appointment"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.customerId || !form.branchId || form.serviceIds.length === 0) {
            setFormError('Customer, branch, and at least one service are required.');
            return;
          }
          setFormError(null);
          createMutation.mutate(toCreatePayload(form));
        }}
      >
        <AppointmentFormFields form={form} setForm={setForm} services={activeServices} />
      </AppointmentFormDialog>

      <AppointmentFormDialog
        open={editAppointment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditAppointment(null);
            setFormError(null);
          }
        }}
        title="Edit Appointment"
        description="Update schedule, services, or notes for this booking"
        formError={formError}
        pending={updateMutation.isPending}
        submitLabel="Save Changes"
        onSubmit={(e) => {
          e.preventDefault();
          if (!editAppointment) return;
          if (!editForm.customerId || !editForm.branchId || editForm.serviceIds.length === 0) {
            setFormError('Customer, branch, and at least one service are required.');
            return;
          }
          setFormError(null);
          void (async () => {
            try {
              await updateMutation.mutateAsync({
                  id: editAppointment.id,
                  data: toUpdatePayload(editForm),
                });
                if (editForm.status !== editAppointment.status) {
                  await statusMutation.mutateAsync({
                    id: editAppointment.id,
                    status: editForm.status,
                  });
                }
                setEditAppointment(null);
              } catch (err) {
                setFormError(getErrorMessage(err));
              }
            })();
          }}
      >
        <AppointmentFormFields
          form={editForm}
          setForm={setEditForm}
          services={activeServices}
          showStatus
        />
      </AppointmentFormDialog>
    </div>
  );
}
